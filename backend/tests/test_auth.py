"""
Pytest Integration Suite for CropLens AI Authentication & User Management.
Tests user registration, Bcrypt password hashing, secure-cookie sessions, OTP flow, and preferences.
"""

import time
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_user_registration_and_login(client: TestClient):
    """Test user registration, duplicate prevention, and secure-cookie login."""
    test_mobile = f"99{str(time.time_ns())[-8:]}"
    
    # 1. Register new user
    reg_payload = {
        "mobile_number": test_mobile,
        "password": "testpassword123",
        "full_name": "Test Farmer",
        "role": "farmer",
        "home_mandi": "Kolar",
        "preferred_commodity": "Tomato",
        "language": "hi"
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" not in data
    assert "refresh_token" not in data
    assert "csrf_token" in data
    assert data["user"]["mobile_number"] == test_mobile
    assert data["user"]["role"] == "farmer"
    assert data["user"]["language"] == "hi"

    csrf_headers = {"X-CSRF-Token": data["csrf_token"]}

    # Authorization headers are no longer accepted as a compatibility bypass.
    with TestClient(app) as raw_client:
        assert raw_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer not-a-cookie-session"},
        ).status_code == 401

    # 2. Attempt duplicate registration (should fail with 400)
    dup_response = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_response.status_code == 400

    # 3. Test login with correct credentials
    login_payload = {
        "mobile_number": test_mobile,
        "password": "testpassword123"
    }
    login_response = client.post("/api/v1/auth/login", json=login_payload)
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "csrf_token" in login_data
    csrf_headers = {"X-CSRF-Token": login_data["csrf_token"]}

    # 4. Test login with wrong password (should fail with 401)
    wrong_response = client.post("/api/v1/auth/login", json={
        "mobile_number": test_mobile,
        "password": "wrongpassword"
    })
    assert wrong_response.status_code == 401

    # 5. Fetch user profile through the secure session cookie
    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["mobile_number"] == test_mobile

    # 6. Update user preferences
    pref_response = client.put("/api/v1/auth/preferences", headers=csrf_headers, json={
        "home_mandi": "Lasalgaon",
        "preferred_commodity": "Onion",
        "language": "mr"
    })
    assert pref_response.status_code == 200
    pref_data = pref_response.json()
    assert pref_data["home_mandi"] == "Lasalgaon"
    assert pref_data["preferred_commodity"] == "Onion"
    assert pref_data["language"] == "mr"

    logout_response = client.post("/api/v1/auth/logout", headers=csrf_headers)
    assert logout_response.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401


def test_otp_flow(client: TestClient):
    """Test OTP code sending and passwordless verification."""
    test_mobile = f"98{str(time.time_ns())[-8:]}"

    # Send OTP
    send_res = client.post("/api/v1/auth/otp/send", json={"mobile_number": test_mobile})
    assert send_res.status_code == 200
    assert "expires_in_seconds" in send_res.json()

    # Verify OTP
    verify_res = client.post("/api/v1/auth/otp/verify", json={
        "mobile_number": test_mobile,
        "otp_code": "123456"
    })
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert "csrf_token" in verify_data
    assert verify_data["user"]["mobile_number"] == test_mobile
