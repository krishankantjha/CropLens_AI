"""
Authentication and User Profile REST Router for CropLens AI.
Provides endpoints for mobile registration, password/OTP login, JWT issuing, and profile preferences.
Backed by Redis (with robust in-memory fallback) for OTP storage and distributed rate limiting.
"""

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
import secrets
from typing import Optional

from backend.app.db.database import get_db
from backend.app.db.models import User
from backend.app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    AUTH_ACCESS_COOKIE,
    AUTH_CSRF_COOKIE,
    AUTH_COOKIE_SAMESITE,
    AUTH_COOKIE_SECURE,
    AUTH_REFRESH_COOKIE,
    ENVIRONMENT,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SMS_PROVIDER,
)
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    decode_refresh_token,
    create_refresh_token,
)
from backend.app.core.redis_client import redis_store
from backend.app.services.twilio_verify import (
    TwilioProviderError,
    is_sms_configured,
    is_verify_configured,
    send_programmable_sms,
    send_verification,
    verify_code,
)
from backend.app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserOTPRequest,
    UserOTPVerifyRequest,
    UserPreferencesRequest,
    UserResponse,
    AuthSessionResponse,
    CsrfResponse,
)

auth_router = APIRouter(prefix="/auth", tags=["Authentication & User Profile"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> str:
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(AUTH_ACCESS_COOKIE, access_token, max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60, httponly=True, secure=AUTH_COOKIE_SECURE, samesite=AUTH_COOKIE_SAMESITE, path="/")
    response.set_cookie(AUTH_REFRESH_COOKIE, refresh_token, max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, httponly=True, secure=AUTH_COOKIE_SECURE, samesite=AUTH_COOKIE_SAMESITE, path="/api/v1/auth")
    response.set_cookie(AUTH_CSRF_COOKIE, csrf_token, max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, httponly=False, secure=AUTH_COOKIE_SECURE, samesite=AUTH_COOKIE_SAMESITE, path="/")
    refresh_payload = decode_refresh_token(refresh_token)
    if not refresh_payload or not refresh_payload.get("jti"):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to establish a secure refresh session.")
    redis_store.store_refresh_token(refresh_payload["jti"], REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
    return csrf_token


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(AUTH_ACCESS_COOKIE, path="/")
    response.delete_cookie(AUTH_REFRESH_COOKIE, path="/api/v1/auth")
    response.delete_cookie(AUTH_CSRF_COOKIE, path="/")


def verify_csrf(request: Request, csrf_cookie: Optional[str] = Cookie(None, alias=AUTH_CSRF_COOKIE)) -> None:
    csrf_header = request.headers.get("X-CSRF-Token")
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")

OTP_VALIDITY_SECONDS = 300  # 5 minutes
RATE_LIMIT_WINDOW_SECONDS = 60
MAX_AUTH_REQUESTS_PER_WINDOW = 10


def check_rate_limit(key: str) -> None:
    """Checks and updates distributed sliding window rate limit for sensitive authentication routes."""
    allowed = redis_store.check_rate_limit(
        key,
        window_seconds=RATE_LIMIT_WINDOW_SECONDS,
        max_requests=MAX_AUTH_REQUESTS_PER_WINDOW
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please wait 60 seconds before retrying."
        )


def get_current_user(access_cookie: Optional[str] = Cookie(None, alias=AUTH_ACCESS_COOKIE), db: Session = Depends(get_db)) -> User:
    """Dependency helper to extract and validate the active user from a secure cookie."""
    token = access_cookie
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired JWT access token"
        )
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "access" or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired JWT access token"
        )

    mobile_number = payload["sub"]
    user = db.query(User).filter(User.mobile_number == mobile_number).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this token no longer exists"
        )

    return user


def require_system_operator(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {"admin", "operator"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required for this operation.",
        )
    return current_user


@auth_router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, response: Response, db: Session = Depends(get_db)):
    """Registers a new user account in SQLite and returns JWT access token."""
    clean_mobile = payload.mobile_number
    check_rate_limit(f"reg_{clean_mobile}")
    existing_user = db.query(User).filter(User.mobile_number == clean_mobile).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with mobile number '{clean_mobile}' is already registered. Please login instead."
        )

    raw_password = payload.password if payload.password else secrets.token_urlsafe(16)
    hashed_pwd = hash_password(raw_password)
    new_user = User(
        mobile_number=clean_mobile,
        full_name=payload.full_name.strip() if payload.full_name else f"Farmer ({clean_mobile[-4:]})",
        email=payload.email.strip() if payload.email and payload.email.strip() else None,
        hashed_password=hashed_pwd,
        role=payload.role if payload.role in ["farmer", "trader"] else "farmer",
        home_mandi=payload.home_mandi or "Azadpur",
        preferred_commodity=payload.preferred_commodity or "Tomato",
        language=payload.language or "en",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_data = {"sub": new_user.mobile_number, "role": new_user.role}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    csrf_token = set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "csrf_token": csrf_token,
        "user": new_user.to_dict()
    }


@auth_router.post("/login", response_model=AuthSessionResponse)
def login_user(payload: UserLoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticates mobile number & password, issuing JWT access token."""
    clean_mobile = payload.mobile_number
    check_rate_limit(f"login_{clean_mobile}")
    user = db.query(User).filter(User.mobile_number == clean_mobile).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password."
        )

    token_data = {"sub": user.mobile_number, "role": user.role}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    csrf_token = set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "csrf_token": csrf_token,
        "user": user.to_dict()
    }


@auth_router.post("/otp/send")
def send_otp(payload: UserOTPRequest):
    """Sends 6-digit OTP code to mobile number for passwordless login."""
    clean_mobile = payload.mobile_number
    if len(clean_mobile) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 10-digit mobile number."
        )

    check_rate_limit(f"otp_{clean_mobile}")

    if SMS_PROVIDER == "twilio":
        if is_verify_configured():
            try:
                send_verification(f"+91{clean_mobile}")
            except TwilioProviderError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="OTP delivery is temporarily unavailable. Check Twilio Verify logs.",
                )
        elif is_sms_configured():
            otp_code = str(secrets.randbelow(900000) + 100000)
            redis_store.set_otp(clean_mobile, otp_code, ttl_seconds=OTP_VALIDITY_SECONDS)
            try:
                send_programmable_sms(
                    f"+91{clean_mobile}",
                    f"Your CropLens AI verification code is {otp_code}. Valid for 5 minutes.",
                )
            except TwilioProviderError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="SMS delivery failed. Check Twilio credentials and recipient number.",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Twilio is configured, but neither TWILIO_VERIFY_SERVICE_SID nor TWILIO_PHONE_NUMBER was provided.",
            )
    else:
        if ENVIRONMENT == "production":
            otp_code = str(secrets.randbelow(900000) + 100000)
        else:
            otp_code = "123456"  # Standard demo/test OTP in dev & testing
        redis_store.set_otp(clean_mobile, otp_code, ttl_seconds=OTP_VALIDITY_SECONDS)

    return {
        "message": f"OTP successfully sent to +91 {clean_mobile}",
        "expires_in_seconds": OTP_VALIDITY_SECONDS
    }


@auth_router.post("/otp/verify", response_model=AuthSessionResponse)
def verify_otp(payload: UserOTPVerifyRequest, response: Response, db: Session = Depends(get_db)):
    """Verifies OTP code with expiration check, consumes OTP once, and logs in user."""
    clean_mobile = payload.mobile_number
    if SMS_PROVIDER == "twilio" and is_verify_configured():
        try:
            valid_code = verify_code(f"+91{clean_mobile}", payload.otp_code.strip())
        except TwilioProviderError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OTP verification is temporarily unavailable. Please try again later.",
            )
        if not valid_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP code.",
            )
    else:
        stored_code = redis_store.get_otp(clean_mobile)

        if not stored_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active OTP found or OTP has expired. Please request a new OTP."
            )

        if payload.otp_code.strip() != stored_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code entered."
            )

        # One-time consumption: delete OTP immediately upon verification
        redis_store.delete_otp(clean_mobile)

    user = db.query(User).filter(User.mobile_number == clean_mobile).first()
    if not user:
        # Register new farmer user with provided name & email
        hashed_pwd = hash_password(secrets.token_urlsafe(16))
        user = User(
            mobile_number=clean_mobile,
            full_name=payload.full_name.strip() if payload.full_name and payload.full_name.strip() else f"Farmer ({clean_mobile[-4:]})",
            email=payload.email.strip() if payload.email and payload.email.strip() else None,
            hashed_password=hashed_pwd,
            role="farmer",
            home_mandi="Azadpur",
            preferred_commodity="Tomato",
            language="en"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif payload.full_name and payload.full_name.strip():
        user.full_name = payload.full_name.strip()
        if payload.email:
            user.email = payload.email.strip()
        db.commit()
        db.refresh(user)

    token_data = {"sub": user.mobile_number, "role": user.role}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    csrf_token = set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "csrf_token": csrf_token,
        "user": user.to_dict()
    }


@auth_router.post("/refresh", response_model=AuthSessionResponse)
def refresh_token(
    response: Response,
    refresh_cookie: Optional[str] = Cookie(None, alias=AUTH_REFRESH_COOKIE),
    db: Session = Depends(get_db),
    _: None = Depends(verify_csrf),
):
    """Issues new access token using a valid refresh token."""
    refresh_value = refresh_cookie
    if not refresh_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )

    payload = decode_refresh_token(refresh_value)
    if not payload or "sub" not in payload or not redis_store.consume_refresh_token(payload["jti"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or already-used refresh session."
        )

    mobile = payload["sub"]
    user = db.query(User).filter(User.mobile_number == mobile).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )

    token_data = {"sub": user.mobile_number, "role": user.role}
    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)
    csrf_token = set_auth_cookies(response, new_access_token, new_refresh_token)

    return {
        "csrf_token": csrf_token,
        "user": user.to_dict()
    }


@auth_router.post("/logout")
def logout(
    response: Response,
    refresh_cookie: Optional[str] = Cookie(None, alias=AUTH_REFRESH_COOKIE),
    _: None = Depends(verify_csrf),
):
    if refresh_cookie:
        refresh_payload = decode_refresh_token(refresh_cookie)
        if refresh_payload and refresh_payload.get("jti"):
            redis_store.revoke_refresh_token(refresh_payload["jti"])
    clear_auth_cookies(response)
    return {"message": "Signed out successfully."}


@auth_router.get("/csrf", response_model=CsrfResponse)
def get_csrf_token(csrf_cookie: Optional[str] = Cookie(None, alias=AUTH_CSRF_COOKIE), current_user: User = Depends(get_current_user)):
    if not csrf_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="CSRF token is unavailable for this session")
    return {"csrf_token": csrf_cookie}


@auth_router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile and preferences of the authenticated user."""
    return current_user.to_dict()


@auth_router.put("/preferences", response_model=UserResponse)
def update_preferences(payload: UserPreferencesRequest, current_user: User = Depends(get_current_user), _: None = Depends(verify_csrf), db: Session = Depends(get_db)):
    """Updates home mandi, preferred crop, language, or profile information for current user."""
    if payload.full_name:
        current_user.full_name = payload.full_name.strip()
    if payload.email is not None:
        current_user.email = payload.email.strip() if payload.email else None
    if payload.home_mandi:
        current_user.home_mandi = payload.home_mandi
    if payload.preferred_commodity:
        current_user.preferred_commodity = payload.preferred_commodity
    if payload.language:
        current_user.language = payload.language

    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()
