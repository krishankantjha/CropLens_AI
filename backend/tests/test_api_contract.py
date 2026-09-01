"""Regression checks for the documented critical API surface."""

from backend.app.main import app


EXPECTED_CRITICAL_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/auth/me",
    "/api/v1/predict/forecast-7d",
    "/api/v1/predict/forecast",
    "/api/v1/analytics/trends",
    "/api/v1/procurement/arbitrage",
    "/api/v1/procurement/pdf",
}


def test_critical_api_paths_are_registered() -> None:
    paths = set(app.openapi()["paths"])
    assert EXPECTED_CRITICAL_PATHS <= paths
    assert "/api/v1/predict/analytics-trends" not in paths
