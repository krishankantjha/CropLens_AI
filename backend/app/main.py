"""
CropLens AI - FastAPI Application Entry Point.
Pre-loads Phase 3 ML model binaries and master dataset into application state on startup.
Exposes root documentation and health check endpoints.
"""

import os
import json
import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Dict, Any, List

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, status
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
except ModuleNotFoundError:
    from app.api.api_router import api_router


def load_model_artifacts() -> Dict[str, Any]:
    """
    Finds and loads all Phase 3 ML model binaries, metadata JSON, and master parquet dataset.
    Raises RuntimeError if any required artifact is missing or corrupted.
    """
    base_dir = get_base_dir()

    # Model directory path resolution
    possible_model_dirs = [
        os.path.join(base_dir, "backend", "app", "models"),
        os.path.join(base_dir, "app", "models"),
        os.path.abspath(os.path.join(os.getcwd(), "backend", "app", "models")),
        os.path.abspath(os.path.join(os.getcwd(), "models"))
    ]

    model_dir = None
    for d in possible_model_dirs:
        if os.path.exists(d) and os.path.exists(os.path.join(d, "p50.pkl")):
            model_dir = d
            break

    if model_dir is None:
        raise RuntimeError("Model artifacts directory not found. Expected trained .pkl files in backend/app/models/")

    # Required model files
    required_models = {
        "p10": "p10.pkl",
        "p50": "p50.pkl",
        "p90": "p90.pkl",
        "isolation_forest": "isolation_forest.pkl"
    }

    loaded_models = {}
    for key, filename in required_models.items():
        filepath = os.path.join(model_dir, filename)
        if not os.path.exists(filepath):
            raise RuntimeError(f"Missing required model artifact: {filename} at {filepath}")
        try:
            loaded_models[key] = joblib.load(filepath)
        except Exception as e:
            raise RuntimeError(f"Failed to load model artifact {filename}: {str(e)}")

    # Load metadata JSON
    meta_path = os.path.join(model_dir, "model_metadata.json")
    if not os.path.exists(meta_path):
        raise RuntimeError(f"Model metadata file missing: model_metadata.json at {meta_path}")

    try:
        with open(meta_path, "r") as f:
            metadata = json.load(f)
    except Exception as e:
        raise RuntimeError(f"Failed to read model metadata JSON: {str(e)}")

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
        raise RuntimeError(f"Failed to load master dataset parquet: {str(e)}")

    return {
        "models": loaded_models,
        "metadata": metadata,
        "dataset": df,
        "dataset_path": dataset_path,
        "model_dir": model_dir
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to handle startup resource loading and shutdown cleanup."""
    start_time = time.time()
    try:
        # Initialize SQLite database tables (croplens.db)
        from backend.app.db.database import engine, Base
        from backend.app.db.models import User
        Base.metadata.create_all(bind=engine)

        artifacts = load_model_artifacts()
        app.state.models = artifacts["models"]
        app.state.metadata = artifacts["metadata"]
        app.state.dataset = artifacts["dataset"]
        app.state.models_loaded = True
        app.state.dataset_loaded = True
        app.state.startup_timestamp = datetime.now(timezone.utc).isoformat()
        app.state.startup_duration_ms = round((time.time() - start_time) * 1000, 2)

        # Initialize and start APScheduler background worker
        from backend.app.services.scheduler_service import init_scheduler, warm_prediction_cache, scheduler as bg_scheduler
        init_scheduler(app)
        warm_prediction_cache(app)
    except Exception as e:
        # DEGRADED MODE: Log the error but allow the server to start so /docs and /health are accessible.
        app.state.models = {}
        app.state.metadata = {"feature_cols": []}
        app.state.dataset = pd.DataFrame()
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
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]


app = FastAPI(
    title="CropLens AI: APMC Market Intelligence Platform",
    description="Enterprise-grade agricultural market price forecasting, supply shock detection, and procurement intelligence API service.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
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
    version: str = Field(..., json_schema_extra={"example": "1.0.0"})
    models_loaded: bool = Field(..., json_schema_extra={"example": True})
    dataset_loaded: bool = Field(..., json_schema_extra={"example": True})
    loaded_models: List[str] = Field(..., json_schema_extra={"example": ["p10", "p50", "p90", "isolation_forest"]})
    dataset_rows: int = Field(..., json_schema_extra={"example": 38355})
    feature_count: int = Field(..., json_schema_extra={"example": 39})
    startup_timestamp: str = Field(...)
    startup_duration_ms: float = Field(..., json_schema_extra={"example": 120.45})


@app.get("/", response_model=RootResponse, tags=["General"])
def read_root() -> RootResponse:
    """Root Endpoint welcoming users and providing documentation links."""
    return RootResponse(
        name="CropLens AI: APMC Market Intelligence Platform",
        version="1.0.0",
        status="operational",
        documentation="/docs",
        redoc="/redoc"
    )


@app.get("/health", response_model=HealthResponse, tags=["General"])
def health_check() -> HealthResponse:
    """System Health Check Endpoint verifying model and dataset readiness."""
    models_loaded = getattr(app.state, "models_loaded", False)
    dataset_loaded = getattr(app.state, "dataset_loaded", False)
    
    status_str = "healthy" if (models_loaded and dataset_loaded) else "degraded"
    
    loaded_model_names = list(app.state.models.keys()) if app.state.models else []
    dataset_rows = len(app.state.dataset)
    feature_count = len(app.state.metadata.get("feature_cols", []))

    return HealthResponse(
        status=status_str,
        version="1.0.0",
        models_loaded=models_loaded,
        dataset_loaded=dataset_loaded,
        loaded_models=loaded_model_names,
        dataset_rows=dataset_rows,
        feature_count=feature_count,
        startup_timestamp=getattr(app.state, "startup_timestamp", ""),
        startup_duration_ms=getattr(app.state, "startup_duration_ms", 0.0)
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
