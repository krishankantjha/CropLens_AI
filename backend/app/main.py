"""
CropLens AI - FastAPI Application Entry Point.
Pre-loads Phase 3 ML model binaries and master dataset into application state on startup.
Exposes root documentation and health check endpoints.
"""

import os
import time
import warnings
from requests.exceptions import RequestsDependencyWarning
warnings.simplefilter('ignore', RequestsDependencyWarning)
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

import joblib
import pandas as pd

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


import sys

def get_base_dir() -> str:
    """Returns absolute base directory path for project root."""
    # Start from the location of this file: backend/app/main.py
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    # The project root is two levels up from backend/app/
    project_root = os.path.abspath(os.path.join(current_file_dir, "..", ".."))
    return project_root

# Add project root to sys.path so 'backend.app...' imports succeed anywhere
base_dir = get_base_dir()
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

try:
    from backend.app.api.api_router import api_router
    from backend.app.core.config import ENVIRONMENT
    from backend.app.core.model_registry import ModelRegistry
except ModuleNotFoundError:
    from app.api.api_router import api_router
    from app.core.config import ENVIRONMENT
    from app.core.model_registry import ModelRegistry


def load_model_artifacts() -> Dict[str, Any]:
    """
    Finds and loads all Phase 3 ML model binaries, metadata JSON, and master parquet dataset.
    Raises RuntimeError if any required artifact is missing or corrupted.
    """
    base_dir = get_base_dir()

    configured_registry_path = os.getenv("MODEL_REGISTRY_PATH", "").strip()
    registry_path = configured_registry_path or os.path.join(
        base_dir, "backend", "app", "models", "registry.json"
    )
    if not os.path.isabs(registry_path):
        registry_path = os.path.abspath(os.path.join(base_dir, registry_path))
    registry = ModelRegistry(registry_path=registry_path)
    try:
        registry_artifacts = registry.load_model()
    except Exception as e:
        raise RuntimeError(f"Versioned production model bundle could not be loaded: {e}") from e

    model_dir = registry.models_dir
    loaded_models = dict(registry_artifacts["models"])
    metadata = registry_artifacts["metadata"]

    # Isolation Forest remains an operational auxiliary model. It is loaded
    # from the same model root and must be present for the anomaly endpoint.
    anomaly_path = os.path.join(model_dir, "isolation_forest.pkl")
    if not os.path.isfile(anomaly_path):
        raise RuntimeError(f"Missing required model artifact: {anomaly_path}")
    try:
        loaded_models["isolation_forest"] = joblib.load(anomaly_path)
    except Exception as e:
        raise RuntimeError(f"Failed to load model artifact isolation_forest.pkl: {e}") from e

    # Dataset path resolution
    possible_dataset_paths = [
        os.path.join(base_dir, "data", "processed", "features_master.parquet"),
        os.path.abspath(os.path.join(os.getcwd(), "data", "processed", "features_master.parquet"))
    ]

    dataset_path = None
    for p in possible_dataset_paths:
        if os.path.exists(p):
            dataset_path = p
            break

    if dataset_path is None:
        raise RuntimeError("Master dataset parquet file not found at data/processed/features_master.parquet")

    try:
        df = pd.read_parquet(dataset_path)
    except Exception as e:
        raise RuntimeError(f"Failed to load master dataset parquet: {str(e)}") from e
    if df.empty:
        raise RuntimeError(f"Master dataset is empty: {dataset_path}")
    required_dataset_columns = {
        'date', 'market', 'commodity', 'modal_price', *metadata['feature_cols']
    }
    missing_dataset_columns = sorted(required_dataset_columns.difference(df.columns))
    if missing_dataset_columns:
        raise RuntimeError(
            'Master dataset is missing serving columns: ' + ', '.join(missing_dataset_columns)
        )
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    if df['date'].isna().any():
        raise RuntimeError('Master dataset contains invalid dates.')

    return {
        "models": loaded_models,
        "metadata": metadata,
        "dataset": df,
        "dataset_path": dataset_path,
        "model_dir": model_dir,
        "model_version": registry_artifacts['version'],
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to handle startup resource loading and shutdown cleanup."""
    start_time = time.time()
    try:
        # Run Alembic database migrations programmatically (or fallback to create_all)
        alembic_ini_path = os.path.join(base_dir, "backend", "alembic.ini")
        if not os.path.exists(alembic_ini_path):
            alembic_ini_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
        if os.path.exists(alembic_ini_path):
            from alembic.config import Config
            from alembic import command
            alembic_cfg = Config(alembic_ini_path)
            alembic_cfg.set_main_option(
                "script_location",
                os.path.join(os.path.dirname(alembic_ini_path), "alembic")
            )
            from backend.app.db.database import DATABASE_URL
            alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
            try:
                command.upgrade(alembic_cfg, "head")
            except Exception as migration_error:
                # If migration fails because tables already exist, try to 'stamp' it as current
                # and then upgrade. This handles the transition from static mocks to Alembic.
                if "already exists" in str(migration_error).lower():
                    try:
                        command.stamp(alembic_cfg, "001_initial")
                        command.upgrade(alembic_cfg, "head")
                    except Exception:
                        raise migration_error
                else:
                    raise migration_error
        else:
            from backend.app.db.database import engine, Base
            Base.metadata.create_all(bind=engine)

        artifacts = load_model_artifacts()
        app.state.models = artifacts["models"]
        app.state.metadata = artifacts["metadata"]
        app.state.dataset = artifacts["dataset"]
        app.state.model_version = artifacts["model_version"]
        app.state.models_loaded = True
        app.state.dataset_loaded = True
        app.state.startup_error = None
        app.state.startup_timestamp = datetime.now(timezone.utc).isoformat()
        app.state.startup_duration_ms = round((time.time() - start_time) * 1000, 2)

        # Initialize and start APScheduler background worker
        from backend.app.services.scheduler_service import init_scheduler, warm_prediction_cache, trigger_manual_sync
        init_scheduler(app)
        warm_prediction_cache(app)

        # Run live Agmarknet & NASA sync in the background so FastAPI starts immediately without blocking
        import threading
        def _bg_startup_sync():
            try:
                sync_res = trigger_manual_sync(app)
                print(f"[INFO] Startup live sync result: {sync_res.get('status', 'unknown')}")
            except Exception as sync_err:
                print(f"[WARNING] Startup live sync skipped or failed: {str(sync_err)}")

        threading.Thread(target=_bg_startup_sync, daemon=True, name="startup-sync-worker").start()
    except Exception as e:
        # DEGRADED MODE: Log the error but allow the server to start so /docs and /health are accessible.
        app.state.models = {}
        app.state.metadata = {"feature_cols": []}
        app.state.dataset = pd.DataFrame()
        app.state.model_version = "unavailable"
        app.state.models_loaded = False
        app.state.dataset_loaded = False
        app.state.startup_error = str(e)
        app.state.startup_timestamp = datetime.now(timezone.utc).isoformat()
        app.state.startup_duration_ms = round((time.time() - start_time) * 1000, 2)
        print(f"WARNING: CropLens AI started in DEGRADED MODE. Resource initialization failed: {str(e)}")

    yield

    # Clean shutdown
    try:
        from backend.app.services.scheduler_service import scheduler as bg_scheduler
        if bg_scheduler is not None and bg_scheduler.running:
            bg_scheduler.shutdown(wait=False)
    except Exception:
        pass

    app.state.models = None
    app.state.metadata = None
    app.state.dataset = None


# CORS configuration
allowed_origins_env = os.getenv("CORS_ORIGINS", "")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [] if ENVIRONMENT == "production" else [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

if ENVIRONMENT == "production" and "*" in allowed_origins:
    raise RuntimeError("CORS_ORIGINS must list explicit origins when production credentials are enabled")


enable_docs = ENVIRONMENT != "production" or os.getenv("ENABLE_PRODUCTION_DOCS", "false").lower() == "true"

app = FastAPI(
    title="CropLens AI: APMC Market Intelligence Platform",
    description="Enterprise-grade agricultural market price forecasting, supply shock detection, and procurement intelligence API service.",
    version="1.0.0",
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


class RootResponse(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "CropLens AI: APMC Market Intelligence Platform"})
    version: str = Field(..., json_schema_extra={"example": "1.0.0"})
    status: str = Field(..., json_schema_extra={"example": "operational"})
    documentation: str = Field(..., json_schema_extra={"example": "/docs"})
    redoc: str = Field(..., json_schema_extra={"example": "/redoc"})


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    version: str = Field(..., json_schema_extra={"example": "v1.0.0"})
    models_loaded: bool = Field(..., json_schema_extra={"example": True})
    dataset_loaded: bool = Field(..., json_schema_extra={"example": True})
    loaded_models: List[str] = Field(..., json_schema_extra={"example": ["p10", "p50", "p90", "isolation_forest"]})
    dataset_rows: int = Field(..., json_schema_extra={"example": 38355})
    feature_count: int = Field(..., json_schema_extra={"example": 47})
    startup_timestamp: str = Field(...)
    startup_duration_ms: float = Field(..., json_schema_extra={"example": 120.45})
    startup_error: Optional[str] = Field(default=None, description="Sanitized startup diagnostic when the service is degraded")


@app.get("/", response_model=RootResponse, tags=["General"])
def read_root() -> RootResponse:
    """Root Endpoint welcoming users and providing documentation links."""
    models_loaded = getattr(app.state, "models_loaded", False)
    dataset_loaded = getattr(app.state, "dataset_loaded", False)
    return RootResponse(
        name="CropLens AI: APMC Market Intelligence Platform",
        version="1.0.0",
        status="operational" if models_loaded and dataset_loaded else "degraded",
        documentation="/docs" if enable_docs else "",
        redoc="/redoc" if enable_docs else ""
    )


@app.get("/health", response_model=HealthResponse, tags=["General"])
def health_check() -> HealthResponse:
    """System Health Check Endpoint verifying model and dataset readiness."""
    models_loaded = getattr(app.state, "models_loaded", False)
    dataset_loaded = getattr(app.state, "dataset_loaded", False)
    
    status_str = "healthy" if (models_loaded and dataset_loaded) else "degraded"
    
    models = getattr(app.state, "models", None) or {}
    metadata = getattr(app.state, "metadata", None) or {}
    dataset = getattr(app.state, "dataset", None)
    loaded_model_names = list(models.keys())
    dataset_rows = len(dataset) if dataset is not None else 0
    feature_count = len(metadata.get("feature_cols", []))

    return HealthResponse(
        status=status_str,
        version=getattr(app.state, "model_version", "unavailable"),
        models_loaded=models_loaded,
        dataset_loaded=dataset_loaded,
        loaded_models=loaded_model_names,
        dataset_rows=dataset_rows,
        feature_count=feature_count,
        startup_timestamp=getattr(app.state, "startup_timestamp", ""),
        startup_duration_ms=getattr(app.state, "startup_duration_ms", 0.0),
        startup_error=getattr(app.state, "startup_error", None)
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
