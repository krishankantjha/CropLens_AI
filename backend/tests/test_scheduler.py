"""
test_scheduler.py — Test suite for APScheduler background worker and forecast caching.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture(scope="module")
def client():
    """TestClient fixture with app lifespan model loading."""
    with TestClient(app) as test_client:
        if not getattr(app.state, "models_loaded", False):
            pytest.skip("Production model bundle is required for scheduler integration tests")
        yield test_client


@pytest.fixture(scope="module")
def auth_headers(client: TestClient):
    """Create or authenticate a stable test user for protected scheduler endpoints."""
    credentials = {
        "mobile_number": "9000000001",
        "password": "SchedulerTest123!",
        "full_name": "Scheduler Test User",
    }
    registration = client.post("/api/v1/auth/register", json=credentials)
    if registration.status_code == 200:
        token = registration.json()["access_token"]
    else:
        login = client.post(
            "/api/v1/auth/login",
            json={"mobile_number": credentials["mobile_number"], "password": credentials["password"]},
        )
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_scheduler_status(client: TestClient, auth_headers):
    """Tests GET /api/v1/system/scheduler-status returns active cron jobs and telemetry."""
    response = client.get("/api/v1/system/scheduler-status", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "scheduler_running" in data
    assert data["scheduler_running"] is True
    assert "active_jobs_count" in data
    assert data["active_jobs_count"] >= 3
    assert "cache_metrics" in data
    assert "jobs" in data
    
    job_ids = [j["job_id"] for j in data["jobs"]]
    assert "daily_agmarknet_sync" in job_ids
    assert "daily_weather_sync" in job_ids
    assert "daily_cache_warming" in job_ids


def test_manual_sync_trigger(client: TestClient, auth_headers):
    """Tests POST /api/v1/system/trigger-sync executes on-demand sync and cache warming."""
    response = client.post("/api/v1/system/trigger-sync", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "agmarknet_sync" in data
    assert "nasa_weather_sync" in data
    assert "cache_warming" in data
    assert data["cache_warming"]["status"] == "success"


def test_prediction_caching_performance(client: TestClient, auth_headers):
    """Tests that repeating prediction requests hit the cache and increment hit counters."""
    # Fetch initial status
    status_before = client.get("/api/v1/system/scheduler-status", headers=auth_headers).json()
    hits_before = status_before["cache_metrics"]["cache_hits"]

    # Request forecast
    payload = {"commodity": "Potato", "market": "Agra", "horizon_days": 7}
    res1 = client.post("/api/v1/predict/forecast", json=payload)
    assert res1.status_code == 200

    # Repeat exact request — should hit cache
    res2 = client.post("/api/v1/predict/forecast", json=payload)
    assert res2.status_code == 200
    assert res1.json()["current_price"] == res2.json()["current_price"]

    # Verify hit counter incremented
    status_after = client.get("/api/v1/system/scheduler-status", headers=auth_headers).json()
    hits_after = status_after["cache_metrics"]["cache_hits"]
    assert hits_after >= hits_before + 1
