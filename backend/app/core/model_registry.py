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
from backend.app.services.canonical_features import MODEL_FEATURE_COLUMNS

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
            # Do not create a placeholder production version at runtime. A
            # missing registry must remain an explicit missing-artifact state.
            self._registry_cache = {"versions": {}, "active_version": None}

    def _save_registry(self):
        """Persists the registry index to disk."""
        try:
            with open(self.registry_path, 'w') as f:
                json.dump(self._registry_cache, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save model registry: {e}")

    def get_active_version(self) -> str:
        """Returns the current production model version string."""
        return (
            os.getenv("PROD_MODEL_VERSION")
            or self._registry_cache.get("active_version")
            or "v1.0.0"
        )

    def load_model(self, version: Optional[str] = None) -> Dict[str, Any]:
        """
        Loads the specified model version (or active version) and its metadata.
        Returns a dictionary of model binaries and metadata.
        """
        ver = version or self.get_active_version()
        ver_info = self._registry_cache.get("versions", {}).get(ver)
        
        if not ver_info:
            raise FileNotFoundError(f"Model version {ver!r} is not registered in {self.registry_path}")

        configured_path = ver_info.get("path", ver)
        ver_path = os.path.abspath(os.path.join(self.models_dir, configured_path))
        models_root = os.path.abspath(self.models_dir)
        try:
            within_models_root = os.path.commonpath([ver_path, models_root]) == models_root
        except ValueError:
            within_models_root = False
        if not within_models_root:
            raise ValueError(f"Model version {ver} resolves outside the model registry root")
        
        artifacts = {
            "version": ver,
            "models": {},
            "metadata": {}
        }

        # Load the complete LightGBM quantile bundle atomically from the
        # versioned directory. A partial bundle is not production-safe.
        model_paths = {
            q: os.path.join(ver_path, f"lgb_quantile_{q}.pkl")
            for q in ("p10", "p50", "p90")
        }
        missing_models = [q for q, path in model_paths.items() if not os.path.isfile(path)]
        if missing_models:
            raise FileNotFoundError(
                f"Model version {ver} is incomplete; missing quantile artifacts: {missing_models}"
            )
        artifacts["models"] = {q: joblib.load(path) for q, path in model_paths.items()}

        # Metadata is required for feature ordering and inference semantics.
        meta_file = os.path.join(ver_path, "model_metadata.json")
        if not os.path.isfile(meta_file):
            raise FileNotFoundError(f"Model version {ver} is missing metadata: {meta_file}")
        with open(meta_file, 'r') as f:
            artifacts["metadata"] = json.load(f)
        metadata = artifacts["metadata"]
        feature_cols = metadata.get("feature_cols")
        if not feature_cols:
            raise ValueError(f"Model version {ver} metadata has no feature_cols contract")
        if list(feature_cols) != list(MODEL_FEATURE_COLUMNS):
            raise ValueError(
                f"Model version {ver} feature contract does not match the canonical order"
            )
        if metadata.get("target_variable") != "target_next_day_modal_price":
            raise ValueError(
                f"Model version {ver} has unsupported target_variable: "
                f"{metadata.get('target_variable')!r}"
            )
        if metadata.get("feature_count") != len(MODEL_FEATURE_COLUMNS):
            raise ValueError(
                f"Model version {ver} feature_count does not equal the canonical contract"
            )

        return artifacts

model_registry = ModelRegistry()
