"""
test_alerts.py — Integration test suite for Dual-Channel Alert Dispatcher (WhatsApp & Telegram).
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture(scope="module")
def client():
    """TestClient fixture with app lifespan model loading."""
    with TestClient(app) as test_client:
        yield test_client


def test_send_whatsapp_advisory(client: TestClient):
    """Tests POST /api/v1/alerts/send-whatsapp endpoint."""
    payload = {
        "mobile_number": "9876543210",
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
    payload = {
        "mobile_number": "9876543210",
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
        "mobile_number": "9998887776",
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
    res_list = client.get("/api/v1/alerts/subscriptions?mobile_number=9998887776")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert list_data["total_count"] >= 1

    # 3. Delete subscription
    res_del = client.delete(f"/api/v1/alerts/subscriptions/{sub_id}")
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"


def test_telegram_test_alert(client: TestClient):
    """Tests POST /api/v1/alerts/telegram/test endpoint."""
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
        "mobile_number": "9123456780",
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
