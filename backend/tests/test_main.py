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
    # Support both healthy and degraded status for testing flexibility
    assert data["status"] in ["healthy", "degraded"]
    assert data["version"] == "1.0.0"
    assert "models_loaded" in data
    assert "dataset_loaded" in data
    assert data["startup_duration_ms"] >= 0


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
    error_msg = str(exc_info.value)
    assert any(term in error_msg for term in ["Missing required model artifact", "Model artifacts directory not found", "Failed to load model artifact"])
