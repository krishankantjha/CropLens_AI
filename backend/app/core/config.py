"""
Central configuration for CropLens AI backend.
All environment variables are read here so every other module can simply
import from this file instead of calling os.getenv() directly.
"""

import os
import warnings
from requests.exceptions import RequestsDependencyWarning
warnings.simplefilter('ignore', RequestsDependencyWarning)

from dotenv import load_dotenv

# Load environment variables from backend/.env file if present
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
loaded = load_dotenv(env_path)
if loaded or os.path.exists(env_path):
    print(f"[INFO] Loaded environment variables from {os.path.abspath(env_path)}")
else:
    print(f"[WARNING] .env file not found at {os.path.abspath(env_path)}")

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
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# --- CORS ---
CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")

# --- Google OAuth ---
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

# --- Database ---
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{os.path.join(BACKEND_DIR, 'app', 'croplens.db')}",
)

# --- Redis ---
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# --- Live data providers ---
AGMARKNET_API_KEY: str = os.getenv("AGMARKNET_API_KEY", "").strip()
AGMARKNET_API_PAGE_SIZE: int = min(
    max(int(os.getenv("AGMARKNET_API_PAGE_SIZE", "1000")), 1),
    1000,
)
AGMARKNET_MAX_PAGES: int = max(int(os.getenv("AGMARKNET_MAX_PAGES", "10")), 1)
AGMARKNET_TIMEOUT_SECONDS: int = max(
    int(os.getenv("AGMARKNET_TIMEOUT_SECONDS", "40")),
    5,
)
NASA_POWER_TIMEOUT_SECONDS: int = max(
    int(os.getenv("NASA_POWER_TIMEOUT_SECONDS", "20")),
    5,
)

# --- Sentinel Hub Live NDVI ---
SENTINEL_HUB_API_KEY: str = os.getenv("SENTINEL_HUB_API_KEY", "").strip()
SENTINEL_HUB_TIMEOUT_SECONDS: int = max(
    int(os.getenv("SENTINEL_HUB_TIMEOUT_SECONDS", "25")),
    5,
)
