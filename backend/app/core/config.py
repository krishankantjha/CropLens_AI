"""
Central configuration for CropLens AI backend.
All environment variables are read here so every other module can simply
import from this file instead of calling os.getenv() directly.
"""

import os

# --- JWT / Auth ---
JWT_SECRET_KEY: str = os.getenv(
    "JWT_SECRET_KEY",
    "croplens_ai_jwt_secret_key_super_secure_btech_thesis_2026"
)
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# --- CORS ---
CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")

# --- Google OAuth ---
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

# --- Twilio (kept for future upgrade; not used in current wa.me implementation) ---
TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_API_KEY: str = os.getenv("TWILIO_API_KEY", "")
TWILIO_API_SECRET: str = os.getenv("TWILIO_API_SECRET", "")
TWILIO_WHATSAPP_NUMBER: str = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

# --- Database ---
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./croplens.db")
