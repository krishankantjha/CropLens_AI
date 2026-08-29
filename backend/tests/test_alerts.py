"""
test_alerts.py — Integration test suite for Dual-Channel Alert Dispatcher (WhatsApp & Telegram).
"""

import pytest
import time
from types import SimpleNamespace
from fastapi.testclient import TestClient
from backend.app.api.alerts_router import _get_dynamic_advisory_values
from backend.app.main import app


@pytest.fixture(scope="module")
def client():
    """TestClient fixture with app lifespan model loading."""
    with TestClient(app) as test_client:
        mobile = f"97{str(time.time_ns())[-8:]}"
        response = test_client.post("/api/v1/auth/register", json={
            "mobile_number": mobile,
            "password": "testpassword123",
            "full_name": "Alert Test User",
            "role": "farmer",
            "home_mandi": "Agra",
            "preferred_commodity": "Potato",
            "language": "en",
        })
        assert response.status_code == 201
        test_client.headers.update({"Authorization": f"Bearer {response.json()['access_token']}"})
        test_client.test_mobile = mobile
        yield test_client


def test_dynamic_advisory_values_use_forecast_result(monkeypatch):
    app_state = SimpleNamespace(
        models_loaded=True,
        dataset_loaded=True,
        models={},
        metadata={},
        dataset=object(),
    )
    request = SimpleNamespace(app=SimpleNamespace(state=app_state))
    forecast = SimpleNamespace(
        current_price=2040.0,
        peak_day=SimpleNamespace(price=2210.0),
        expected_gain=170.0,
        decision="SELL AFTER 3 DAYS",
        decision_hi="3 दिन बाद बेचें",
    )
    monkeypatch.setattr(
        "backend.app.api.alerts_router.predict_7day_forecast_service",
        lambda *args: forecast,
    )

    advisory = _get_dynamic_advisory_values(request, "Tomato", "Agra", "en")

    assert advisory == {
        "decision": "SELL AFTER 3 DAYS",
        "current_price": 2040.0,
        "target_price": 2210.0,
        "expected_gain": 170.0,
    }


def test_alert_routes_require_authentication():
    with TestClient(app) as unauthenticated:
        response = unauthenticated.get("/api/v1/alerts/logs")
        assert response.status_code == 401


def test_alert_mobile_ownership_is_enforced(client: TestClient):
    response = client.post("/api/v1/alerts/subscribe", json={
        "mobile_number": "9812345678",
        "crop": "Potato",
        "mandi": "Agra",
    })
    assert response.status_code == 403


def test_send_whatsapp_advisory(client: TestClient):
    """Tests POST /api/v1/alerts/send-whatsapp endpoint."""
    payload = {
        "mobile_number": client.test_mobile,
        "crop": "Potato",
        "mandi": "Agra",
        "decision": "HOLD FOR 5 DAYS",
        "current_price": 1480.0,
        "target_price": 1620.0,
        "expected_gain": 140.0,
        "lang": "hi"
    }
    response = client.post("/api/v1/alerts/send-whatsapp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "deeplink_url" in data
    assert "wa.me" in data["deeplink_url"]


def test_test_whatsapp_alert(client: TestClient):
    """Tests POST /api/v1/alerts/test-whatsapp endpoint."""
    if not getattr(app.state, "models_loaded", False) or not getattr(app.state, "dataset_loaded", False):
        pytest.skip("Production model bundle is required for dynamic advisory tests")
    payload = {
        "mobile_number": client.test_mobile,
        "crop": "Tomato",
        "mandi": "Azadpur",
        "lang": "en"
    }
    response = client.post("/api/v1/alerts/test-whatsapp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["test_triggered"] is True
    assert "wa.me" in data["deeplink_url"]


def test_subscribe_alert_flow(client: TestClient):
    """Tests subscription creation, retrieval, update, and deletion in SQLite."""
    # 1. Create subscription
    sub_payload = {
        "mobile_number": client.test_mobile,
        "telegram_chat_id": "123456789",
        "channel": "both",
        "crop": "Onion",
        "mandi": "Lasalgaon",
        "delivery_time": "07:00 AM",
        "language": "hi"
    }
    res_sub = client.post("/api/v1/alerts/subscribe", json=sub_payload)
    assert res_sub.status_code == 200
    sub_data = res_sub.json()
    assert sub_data["status"] == "success"
    sub_id = sub_data["subscription_id"]

    # 2. List subscriptions
    res_list = client.get(f"/api/v1/alerts/subscriptions?mobile_number={client.test_mobile}")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert list_data["total_count"] >= 1

    # 3. Delete subscription
    res_del = client.delete(f"/api/v1/alerts/subscriptions/{sub_id}")
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"


def test_telegram_test_alert(client: TestClient):
    """Tests POST /api/v1/alerts/telegram/test endpoint."""
    if not getattr(app.state, "models_loaded", False) or not getattr(app.state, "dataset_loaded", False):
        pytest.skip("Production model bundle is required for dynamic advisory tests")
    payload = {
        "chat_id": "123456789",
        "crop": "Wheat",
        "mandi": "Khanna",
        "lang": "hi"
    }
    response = client.post("/api/v1/alerts/telegram/test", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "chat_id" in data


def test_telegram_bot_status(client: TestClient):
    """Tests GET /api/v1/alerts/telegram/status endpoint."""
    response = client.get("/api/v1/alerts/telegram/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "bot_username" in data


def test_dispatch_now_and_logs(client: TestClient):
    """Tests POST /api/v1/alerts/dispatch-now and GET /api/v1/alerts/logs."""
    if not getattr(app.state, "models_loaded", False):
        pytest.skip("Production model bundle is required for forecast-backed alert dispatch")
    # Subscribe temporary user
    client.post("/api/v1/alerts/subscribe", json={
        "mobile_number": client.test_mobile,
        "telegram_chat_id": "999888",
        "channel": "both",
        "crop": "Potato",
        "mandi": "Agra",
        "delivery_time": "07:00 AM",
        "language": "hi"
    })

    # Trigger morning dispatch
    res_dispatch = client.post("/api/v1/alerts/dispatch-now")
    assert res_dispatch.status_code == 200
    assert res_dispatch.json()["status"] == "success"

    # Fetch logs
    res_logs = client.get("/api/v1/alerts/logs?limit=10")
    assert res_logs.status_code == 200
    data = res_logs.json()
    assert "logs" in data
    assert data["total_logs"] >= 1
