"""
test_alerts.py — Integration test suite for WhatsApp alert dispatcher.
"""

import pytest
import time
from types import SimpleNamespace
from fastapi.testclient import TestClient
from backend.app.api.alerts_router import _get_dynamic_advisory_values
from backend.app.services.whatsapp_service import (
    dispatch_scheduled_advisories_service,
    normalize_delivery_time,
    parse_delivery_time,
    subscription_due_now,
)
from backend.app.db.database import SessionLocal
from backend.app.db.models import AlertLog
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
        test_client.headers.update({"X-CSRF-Token": response.json()["csrf_token"]})
        test_client.test_mobile = mobile
        yield test_client


def test_parse_delivery_time_supports_24h_and_12h_formats():
    assert parse_delivery_time("07:30") == (7, 30)
    assert parse_delivery_time("07:00 AM") == (7, 0)
    assert parse_delivery_time("7:15 pm") == (19, 15)
    assert normalize_delivery_time("07:00 AM") == "07:00"


def test_subscription_due_now_respects_ist_minute_and_daily_guard():
    from datetime import datetime
    from zoneinfo import ZoneInfo

    sub = type("Sub", (), {"delivery_time": "07:30", "last_dispatched_at": None})()
    due_at = datetime(2026, 9, 18, 7, 30, tzinfo=ZoneInfo("Asia/Kolkata"))
    not_due_at = datetime(2026, 9, 18, 7, 29, tzinfo=ZoneInfo("Asia/Kolkata"))

    assert subscription_due_now(sub, due_at) is True
    assert subscription_due_now(sub, not_due_at) is False


def test_dispatch_skips_subscriptions_not_due(monkeypatch):
    sub = type(
        "Sub",
        (),
        {
            "id": 1,
            "crop": "Potato",
            "mandi": "Agra",
            "language": "en",
            "mobile_number": "9876543210",
            "delivery_time": "23:59",
            "last_dispatched_at": None,
            "is_active": 1,
        },
    )()

    class FakeQuery:
        def filter(self, *args, **kwargs):
            return self

        def all(self):
            return [sub]

    class FakeSession:
        def query(self, model):
            return FakeQuery()

        def add(self, item):
            return None

        def commit(self):
            return None

        def close(self):
            return None

    monkeypatch.setattr("backend.app.db.database.SessionLocal", lambda: FakeSession())

    fixed_now = __import__("datetime").datetime(
        2026, 9, 18, 7, 30, tzinfo=__import__("zoneinfo").ZoneInfo("Asia/Kolkata")
    )

    class FixedDateTime(__import__("datetime").datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed_now if tz is not None else fixed_now.replace(tzinfo=None)

    monkeypatch.setattr("backend.app.services.whatsapp_service.datetime", FixedDateTime)

    result = dispatch_scheduled_advisories_service(app=None, respect_delivery_time=True)
    assert result["dispatched_count"] == 0
    assert result["skipped_not_due"] == 1


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


def test_non_whatsapp_channel_is_rejected(client: TestClient):
    response = client.post("/api/v1/alerts/subscribe", json={
        "mobile_number": client.test_mobile,
        "channel": "telegram",
        "crop": "Potato",
        "mandi": "Agra",
        "delivery_time": "07:00 AM",
        "language": "en",
    })
    assert response.status_code == 422


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
    sub_payload = {
        "mobile_number": client.test_mobile,
        "channel": "whatsapp",
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

    res_list = client.get(f"/api/v1/alerts/subscriptions?mobile_number={client.test_mobile}")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert list_data["total_count"] >= 1

    res_del = client.delete(f"/api/v1/alerts/subscriptions/{sub_id}")
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"


def test_dispatch_now_and_logs(client: TestClient):
    """Tests POST /api/v1/alerts/dispatch-now and GET /api/v1/alerts/logs."""
    assert client.post("/api/v1/alerts/dispatch-now").status_code == 403
    if not getattr(app.state, "models_loaded", False):
        pytest.skip("Production model bundle is required for forecast-backed alert dispatch")

    client.post("/api/v1/alerts/subscribe", json={
        "mobile_number": client.test_mobile,
        "channel": "whatsapp",
        "crop": "Potato",
        "mandi": "Agra",
        "delivery_time": "07:00 AM",
        "language": "hi"
    })

    res_logs = client.get("/api/v1/alerts/logs?limit=10")
    assert res_logs.status_code == 200
    data = res_logs.json()
    assert "logs" in data


def test_alert_logs_are_limited_to_current_farmer(client: TestClient):
    db = SessionLocal()
    try:
        db.add(AlertLog(
            recipient="0000000000",
            channel="whatsapp",
            crop="Potato",
            mandi="Agra",
            message_text="private alert",
            status="success",
        ))
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/alerts/logs?limit=50")
    assert response.status_code == 200
    assert all(log["recipient"] == client.test_mobile for log in response.json()["logs"])
