"""
Model Registry Service for CropLens AI.
Manages versioned model artifacts, metadata, and production deployment state.
Allows switching production models via configuration without code changes.
"""

import os
import json
import logging
import joblib
from typing import Dict, Any, Optional
from backend.app.core.config import BACKEND_DIR

logger = logging.getLogger("croplens.registry")

class ModelRegistry:
    def __init__(self, registry_path: Optional[str] = None):
        self.registry_path = registry_path or os.path.join(BACKEND_DIR, "app", "models", "registry.json")
        self.models_dir = os.path.dirname(self.registry_path)
        self._registry_cache: Dict[str, Any] = {}
        self._load_registry()

    def _load_registry(self):
        """Loads the registry index from disk."""
        if os.path.exists(self.registry_path):
            try:
                with open(self.registry_path, 'r') as f:
                    self._registry_cache = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load model registry: {e}")
                self._registry_cache = {"versions": {}, "active_version": "v1.0.0"}
        else:
            # Default registry if none exists
            self._registry_cache = {
                "versions": {
                    "v1.0.0": {
                        "path": "v1.0.0",
                        "description": "Initial production LightGBM model",
                        "metrics": {"mae": 142.5, "rmse": 210.2}
                    }
                },
                "active_version": "v1.0.0"
            }
            self._save_registry()

    def _save_registry(self):
        """Persists the registry index to disk."""
        try:
            with open(self.registry_path, 'w') as f:
                json.dump(self._registry_cache, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save model registry: {e}")

    def get_active_version(self) -> str:
        """Returns the current production model version string."""
        return os.getenv("PROD_MODEL_VERSION", self._registry_cache.get("active_version", "v1.0.0"))

    def load_model(self, version: Optional[str] = None) -> Dict[str, Any]:
        """
        Loads the specified model version (or active version) and its metadata.
        Returns a dictionary of model binaries and metadata.
        """
        ver = version or self.get_active_version()
        ver_info = self._registry_cache.get("versions", {}).get(ver)
        
        if not ver_info:
            logger.error(f"Model version {ver} not found in registry. Falling back to default.")
            ver = "v1.0.0"
            ver_info = self._registry_cache.get("versions", {}).get(ver, {})

        ver_path = os.path.join(self.models_dir, ver_info.get("path", ver))
        
        artifacts = {
            "version": ver,
            "models": {},
            "metadata": {}
        }

        # Load LightGBM Quantile Models
        for q in ["p10", "p50", "p90"]:
            model_file = os.path.join(ver_path, f"lgb_quantile_{q}.pkl")
            if os.path.exists(model_file):
                artifacts["models"][q] = joblib.load(model_file)
            else:
                logger.warning(f"Model file {model_file} missing for version {ver}")

        # Load Metadata
        meta_file = os.path.join(ver_path, "model_metadata.json")
        if os.path.exists(meta_file):
            with open(meta_file, 'r') as f:
                artifacts["metadata"] = json.load(f)
        
        return artifacts

model_registry = ModelRegistry()
