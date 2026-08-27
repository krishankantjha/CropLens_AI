import json
from pathlib import Path

import joblib
import pytest

from backend.app.core.model_registry import ModelRegistry
from backend.app.services.canonical_features import MODEL_FEATURE_COLUMNS


def write_registry(root: Path, path: str = "v1.0.0", active: str = "v1.0.0") -> Path:
    registry = root / "registry.json"
    registry.write_text(json.dumps({"active_version": active, "versions": {active: {"path": path}}}))
    return registry


def test_blank_version_override_uses_registry_active(monkeypatch, tmp_path):
    registry = write_registry(tmp_path)
    monkeypatch.setenv("PROD_MODEL_VERSION", "")
    assert ModelRegistry(str(registry)).get_active_version() == "v1.0.0"


def test_registry_rejects_path_outside_model_root(tmp_path):
    registry = write_registry(tmp_path, path="../outside")
    with pytest.raises(ValueError, match="outside the model registry root"):
        ModelRegistry(str(registry)).load_model()


def test_registry_missing_version_is_explicit(tmp_path):
    registry = tmp_path / "registry.json"
    registry.write_text(json.dumps({"active_version": "v1.0.0", "versions": {}}))
    with pytest.raises(FileNotFoundError, match="not registered"):
        ModelRegistry(str(registry)).load_model()


def test_complete_bundle_loads_with_canonical_contract(tmp_path):
    registry = write_registry(tmp_path)
    version_dir = tmp_path / "v1.0.0"
    version_dir.mkdir()
    for quantile in ("p10", "p50", "p90"):
        joblib.dump({"quantile": quantile}, version_dir / f"lgb_quantile_{quantile}.pkl")
    (version_dir / "model_metadata.json").write_text(json.dumps({
        "target_variable": "target_next_day_modal_price",
        "feature_count": len(MODEL_FEATURE_COLUMNS),
        "feature_cols": list(MODEL_FEATURE_COLUMNS),
    }))
    loaded = ModelRegistry(str(registry)).load_model()
    assert set(loaded["models"]) == {"p10", "p50", "p90"}
    assert loaded["metadata"]["feature_cols"] == list(MODEL_FEATURE_COLUMNS)


def test_canonical_contract_has_47_features():
    assert len(MODEL_FEATURE_COLUMNS) == 47
    assert len(set(MODEL_FEATURE_COLUMNS)) == 47
