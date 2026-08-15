"""
Authentication and User Profile REST Router for CropLens AI.
Provides endpoints for mobile registration, password/OTP login, JWT issuing, and profile preferences.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.db.database import get_db
from backend.app.db.models import User
from backend.app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from backend.app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserOTPRequest,
    UserOTPVerifyRequest,
    UserPreferencesRequest,
    UserResponse,
    TokenResponse,
)

auth_router = APIRouter(prefix="/auth", tags=["Authentication & User Profile"])

# In-memory store for demo OTP codes (mobile_number -> "123456")
DEMO_OTP_STORE = {}


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Dependency helper to extract and validate active user from JWT Bearer header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header format. Expected 'Bearer <token>'"
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
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
    existing_user = db.query(User).filter(User.mobile_number == payload.mobile_number).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with mobile number '{payload.mobile_number}' is already registered."
        )

    hashed_pwd = hash_password(payload.password)
    new_user = User(
        mobile_number=payload.mobile_number,
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

    token = create_access_token(data={"sub": new_user.mobile_number, "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user.to_dict()
    }


@auth_router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates mobile number & password, issuing JWT access token."""
    user = db.query(User).filter(User.mobile_number == payload.mobile_number).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password."
        )

    token = create_access_token(data={"sub": user.mobile_number, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@auth_router.post("/otp/send")
def send_otp(payload: UserOTPRequest):
    """Sends 6-digit OTP code to mobile number for passwordless login."""
    # For local demo purposes, default OTP code is "123456"
    DEMO_OTP_STORE[payload.mobile_number] = "123456"
    return {
        "message": f"OTP successfully sent to +91 {payload.mobile_number}",
        "demo_otp": "123456"
    }


@auth_router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(payload: UserOTPVerifyRequest, db: Session = Depends(get_db)):
    """Verifies OTP code and auto-creates / logs in user with JWT token."""
    stored_otp = DEMO_OTP_STORE.get(payload.mobile_number, "123456")
    if payload.otp_code != stored_otp and payload.otp_code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code entered."
        )

    user = db.query(User).filter(User.mobile_number == payload.mobile_number).first()
    if not user:
        # Auto-register new farmer user on first OTP login
        hashed_pwd = hash_password("otp_default_pass_123")
        user = User(
            mobile_number=payload.mobile_number,
            full_name=f"Farmer ({payload.mobile_number[-4:]})",
            hashed_password=hashed_pwd,
            role="farmer",
            home_mandi="Azadpur",
            preferred_commodity="Tomato",
            language="en"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": user.mobile_number, "role": user.role})
    return {
        "access_token": token,
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
