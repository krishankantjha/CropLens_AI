"""
Authentication and User Profile REST Router for CropLens AI.
Provides endpoints for mobile registration, password/OTP login, JWT issuing, and profile preferences.
Backed by Redis (with robust in-memory fallback) for OTP storage and distributed rate limiting.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
import secrets
from typing import Optional

from backend.app.db.database import get_db
from backend.app.db.models import User
from backend.app.core.config import ENVIRONMENT
from backend.app.core.security import hash_password, verify_password, create_access_token, decode_access_token, create_refresh_token
from backend.app.core.redis_client import redis_store
from backend.app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserOTPRequest,
    UserOTPVerifyRequest,
    UserPreferencesRequest,
    UserResponse,
    TokenResponse,
    TokenRefreshRequest,
)

auth_router = APIRouter(prefix="/auth", tags=["Authentication & User Profile"])

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


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Dependency helper to extract and validate active user from JWT Bearer header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header format. Expected 'Bearer <token>'"
        )

    token = authorization.removeprefix("Bearer ").strip()
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


@auth_router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user account in SQLite and returns JWT access token."""
    clean_mobile = "".join(filter(str.isdigit, payload.mobile_number))[-10:]
    check_rate_limit(f"reg_{clean_mobile}")
    existing_user = db.query(User).filter(User.mobile_number == clean_mobile).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with mobile number '{clean_mobile}' is already registered."
        )

    hashed_pwd = hash_password(payload.password)
    new_user = User(
        mobile_number=clean_mobile,
        full_name=payload.full_name,
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
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": new_user.to_dict()
    }


@auth_router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates mobile number & password, issuing JWT access token."""
    clean_mobile = "".join(filter(str.isdigit, payload.mobile_number))[-10:]
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
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@auth_router.post("/otp/send")
def send_otp(payload: UserOTPRequest):
    """Sends 6-digit OTP code to mobile number for passwordless login."""
    clean_mobile = "".join(filter(str.isdigit, payload.mobile_number))[-10:]
    if len(clean_mobile) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 10-digit mobile number."
        )

    check_rate_limit(f"otp_{clean_mobile}")

    if ENVIRONMENT == "production":
        otp_code = str(secrets.randbelow(900000) + 100000)
    else:
        otp_code = "123456"  # Standard demo/test OTP in dev & testing

    redis_store.set_otp(clean_mobile, otp_code, ttl_seconds=OTP_VALIDITY_SECONDS)

    return {
        "message": f"OTP successfully sent to +91 {clean_mobile}",
        "expires_in_seconds": OTP_VALIDITY_SECONDS
    }


@auth_router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(payload: UserOTPVerifyRequest, db: Session = Depends(get_db)):
    """Verifies OTP code with expiration check, consumes OTP once, and logs in user."""
    clean_mobile = "".join(filter(str.isdigit, payload.mobile_number))[-10:]
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
        # Auto-register new farmer user on first OTP login
        hashed_pwd = hash_password("otp_default_pass_123")
        user = User(
            mobile_number=clean_mobile,
            full_name=f"Farmer ({clean_mobile[-4:]})",
            hashed_password=hashed_pwd,
            role="farmer",
            home_mandi="Azadpur",
            preferred_commodity="Tomato",
            language="en"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token_data = {"sub": user.mobile_number, "role": user.role}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@auth_router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Issues new access token using a valid refresh token."""
    decoded = decode_access_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    mobile_number = decoded.get("sub")
    user = db.query(User).filter(User.mobile_number == mobile_number).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists"
        )
        
    token_data = {"sub": user.mobile_number, "role": user.role}
    new_access_token = create_access_token(data=token_data)
    
    return {
        "access_token": new_access_token,
        "refresh_token": payload.refresh_token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@auth_router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile and preferences of the authenticated user."""
    return current_user.to_dict()


@auth_router.put("/preferences", response_model=UserResponse)
def update_preferences(payload: UserPreferencesRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Updates home mandi, preferred crop, or language code for current user."""
    if payload.home_mandi:
        current_user.home_mandi = payload.home_mandi
    if payload.preferred_commodity:
        current_user.preferred_commodity = payload.preferred_commodity
    if payload.language:
        current_user.language = payload.language

    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()
