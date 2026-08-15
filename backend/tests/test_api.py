"""
Integration test suite for Phase 4 API endpoints (price prediction, supply shock alerts, spatial arbitrage, analytics trends).
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture(scope="module")
def client():
    """TestClient fixture with app lifespan model loading."""
    with TestClient(app) as test_client:
        yield test_client


def test_predict_price_valid(client):
    """Tests POST /api/v1/predict/price with valid commodity and market."""
    payload = {
        "commodity": "Tomato",
        "market": "Azadpur",
        "date": "2025-06-15"
    }
    response = client.post("/api/v1/predict/price", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Tomato"
    assert data["market"] == "Azadpur"
    assert data["date"] == "2025-06-15"
    assert data["p10_floor_price"] > 0
    assert data["p50_median_price"] > 0
    assert data["p90_ceiling_price"] > 0
    assert data["p10_floor_price"] <= data["p50_median_price"] <= data["p90_ceiling_price"]
    assert round(data["p90_ceiling_price"] - data["p10_floor_price"], 2) == data["band_width"]
    assert data["band_terminology"] == "P10-P90 Quantile Forecast Band"


def test_predict_price_custom_overrides(client):
    """Tests POST /api/v1/predict/price with custom arrival and weather overrides."""
    payload = {
        "commodity": "Onion",
        "market": "Lasalgaon",
        "arrivals_in_qtl": 2500.0,
        "rainfall_mm": 12.5,
        "temp_max": 34.0
    }
    response = client.post("/api/v1/predict/price", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Onion"
    assert data["market"] == "Lasalgaon"
    assert data["p50_median_price"] > 0


def test_predict_price_invalid_commodity(client):
    """Tests POST /api/v1/predict/price validation for invalid commodity."""
    payload = {
        "commodity": "Banana",
        "market": "Azadpur"
    }
    response = client.post("/api/v1/predict/price", json=payload)
    assert response.status_code == 422


def test_predict_shocks(client):
    """Tests GET /api/v1/predict/shocks Isolation Forest anomaly detection."""
    response = client.get("/api/v1/predict/shocks?commodity=Onion&days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records_analyzed"] > 0
    assert "anomalies" in data
    assert isinstance(data["anomalies"], list)
    first_item = data["anomalies"][0]
    assert "anomaly_status" in first_item
    assert "anomaly_score" in first_item
    assert "is_anomaly" in first_item


def test_procurement_arbitrage(client):
    """Tests GET /api/v1/procurement/arbitrage spatial price difference calculation."""
    response = client.get("/api/v1/procurement/arbitrage?commodity=Tomato&base_market=Agra")
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Tomato"
    assert data["base_market"] == "Agra"
    assert len(data["opportunities"]) > 0
    first_opp = data["opportunities"][0]
    assert first_opp["source_market"] == "Agra"
    assert "gross_price_difference" in first_opp
    assert "price_gradient_percentage" in first_opp
    assert "disclaimer" in data


def test_analytics_trends(client):
    """Tests GET /api/v1/analytics/trends 30-day price trend statistics."""
    response = client.get("/api/v1/analytics/trends?commodity=Tomato&market=Azadpur&days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Tomato"
    assert data["market"] == "Azadpur"
    assert data["timeframe_days"] <= 30
    assert data["min_price"] <= data["avg_price"] <= data["max_price"]
    assert data["price_volatility_30d"] >= 0
    assert data["price_trend_direction"] in ["Upward", "Downward", "Stable"]
    assert len(data["historical_points"]) <= 30
    assert len(data["historical_points"]) > 0


def test_predict_7day_forecast(client):
    """Tests POST /api/v1/predict/forecast-7d recursive roll-forward trajectory."""
    payload = {
        "commodity": "Potato",
        "market": "Agra",
        "horizon_days": 7
    }
    response = client.post("/api/v1/predict/forecast-7d", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Potato"
    assert data["market"] == "Agra"
    assert data["forecast_horizon_days"] == 7
    assert len(data["forecasts"]) == 7

    # Verify continuous horizon index & monotonic quantile bounds for each day
    for idx, pt in enumerate(data["forecasts"], 1):
        assert pt["day_index"] == idx
        assert pt["p10_floor_price"] <= pt["p50_median_price"] <= pt["p90_ceiling_price"]
        assert pt["price"] > 0
        assert pt["height"].endswith("%")

    assert "peak_day" in data
    assert data["peak_day"]["price"] >= max([f["price"] for f in data["forecasts"]])
    assert "decision" in data
    assert "decision_hi" in data
    assert "expected_gain" in data

