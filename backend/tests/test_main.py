"""
Unit and integration tests for FastAPI application core and startup resource loading.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app, load_model_artifacts


@pytest.fixture(scope="module")
def client():
    """TestClient fixture with application lifespan context manager."""
    with TestClient(app) as test_client:
        yield test_client


def test_read_root(client):
    """Tests Root Endpoint GET /"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CropLens AI: APMC Market Intelligence Platform"
    assert data["version"] == "1.0.0"
    assert data["status"] == "operational"
    assert data["documentation"] == "/docs"
    assert data["redoc"] == "/redoc"


def test_health_check(client):
    """Tests Health Check Endpoint GET /health"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"
    assert data["models_loaded"] is True
    assert data["dataset_loaded"] is True
    assert "p10" in data["loaded_models"]
    assert "p50" in data["loaded_models"]
    assert data["dataset_rows"] >= 100000
    assert data["feature_count"] >= 39
    assert data["startup_duration_ms"] > 0


def test_openapi_documentation(client):
    """Tests Swagger OpenAPI schema generation"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "CropLens AI: APMC Market Intelligence Platform"


def test_missing_model_raises_runtime_error(monkeypatch):
    """Tests that missing model artifact causes a clear RuntimeError during load."""
    def mock_exists(path):
        if "p90.pkl" in path:
            return False
        return True

    monkeypatch.setattr("os.path.exists", mock_exists)
    with pytest.raises(RuntimeError) as exc_info:
        load_model_artifacts()
    assert "Missing required model artifact" in str(exc_info.value) or "Model artifacts directory not found" in str(exc_info.value)
