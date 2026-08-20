"""
Central configuration for CropLens AI backend.
All environment variables are read here so every other module can simply
import from this file instead of calling os.getenv() directly.
"""

import os

# --- Environment Mode ---
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()

# --- JWT / Auth ---
DEFAULT_DEV_JWT_SECRET = "croplens_ai_jwt_secret_key_super_secure_btech_thesis_2026"
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", DEFAULT_DEV_JWT_SECRET)

# Strict production enforcement: prevent using known fallback secret in production
if ENVIRONMENT == "production" and (not JWT_SECRET_KEY or JWT_SECRET_KEY == DEFAULT_DEV_JWT_SECRET):
    raise RuntimeError(
        "CRITICAL SECURITY CONFIGURATION ERROR: In production environment (ENVIRONMENT=production), "
        "JWT_SECRET_KEY must be explicitly defined in environment variables and cannot use the development fallback key."
    )

JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# --- CORS ---
CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")

# --- Google OAuth ---
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

# --- Database ---
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./croplens.db")

# --- Redis ---
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
