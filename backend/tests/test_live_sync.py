import pytest
import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.database import Base
from backend.app.db.models import MarketData, WeatherData
from backend.app.db.ndvi_model import NdviData
from backend.app.services import agmarknet_sync, nasa_power_sync


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_agmarknet_sync_filters_and_upserts_supported_records(monkeypatch, db_session):
    monkeypatch.setattr(agmarknet_sync, "AGMARKNET_API_KEY", "test-key")
    monkeypatch.setattr(agmarknet_sync, "AGMARKNET_MAX_PAGES", 1)

    def fake_get(url, params, timeout):
        commodity = params["filters[commodity]"]
        return FakeResponse(
            {
                "records": [
                    {
                        "Commodity": commodity,
                        "Market": "Agra",
                        "Arrival_Date": "21/08/2026",
                        "Modal_Price": "2,100",
                        "Arrival_In_Qtl": "450",
                        "State": "Uttar Pradesh",
                        "District": "Agra",
                        "Variety": "Standard",
                        "Grade": "FAQ",
                        "Min_Price": "1,900",
                        "Max_Price": "2,200",
                    }
                ]
            }
        )

    monkeypatch.setattr(agmarknet_sync.requests, "get", fake_get)
    result = agmarknet_sync.sync_live_agmarknet_prices(db_session)

    assert result["status"] == "success"
    assert result["records_synced"] == 10
    rows = db_session.query(MarketData).all()
    assert len(rows) == 10
    assert rows[0].date == "2026-08-21"
    assert rows[0].modal_price == 2100.0
    assert rows[0].district == "Agra"
    assert rows[0].min_price == 1900.0


def test_agmarknet_fetch_retries_transient_timeout(monkeypatch):
    monkeypatch.setattr(agmarknet_sync, "AGMARKNET_API_KEY", "test-key")
    monkeypatch.setattr(agmarknet_sync, "AGMARKNET_MAX_PAGES", 1)
    monkeypatch.setattr(agmarknet_sync, "AGMARKNET_RETRY_ATTEMPTS", 2)
    monkeypatch.setattr(agmarknet_sync.time, "sleep", lambda _seconds: None)
    calls = 0

    def flaky_get(url, params, timeout):
        nonlocal calls
        calls += 1
        if calls < 3:
            raise requests.Timeout("temporary upstream timeout")
        return FakeResponse({"records": []})

    monkeypatch.setattr(agmarknet_sync.requests, "get", flaky_get)
    records, result = agmarknet_sync._fetch_live_records()

    assert records == []
    assert result["status"] == "success"
    assert calls == len(agmarknet_sync.VALID_COMMODITIES) + 2


def test_nasa_power_skips_provider_missing_value_rows(monkeypatch, db_session):
    payload = {
        "properties": {
            "parameter": {
                "T2M_MAX": {"20260820": -999.0},
                "T2M_MIN": {"20260820": -999.0},
                "PRECTOTCORR": {"20260820": -999.0},
                "ALLSKY_SFC_SW_DWN": {"20260820": -999.0},
            }
        }
    }
    monkeypatch.setattr(nasa_power_sync.requests, "get", lambda *args, **kwargs: FakeResponse(payload))

    result = nasa_power_sync.fetch_live_nasa_weather("Agra", days=1, db=db_session)

    assert result["status"] == "empty"
    assert result["days_synced"] == 0
    assert db_session.query(WeatherData).count() == 0


def test_nasa_power_persists_valid_observation(monkeypatch, db_session):
    payload = {
        "properties": {
            "parameter": {
                "T2M_MAX": {"20260820": 34.2},
                "T2M_MIN": {"20260820": 25.1},
                "PRECTOTCORR": {"20260820": 4.5},
                "ALLSKY_SFC_SW_DWN": {"20260820": 19.0},
            }
        }
    }
    monkeypatch.setattr(nasa_power_sync.requests, "get", lambda *args, **kwargs: FakeResponse(payload))

    result = nasa_power_sync.fetch_live_nasa_weather("Agra", days=1, db=db_session)

    assert result["status"] == "success"
    row = db_session.query(WeatherData).one()
    assert row.date == "2026-08-20"
    assert row.temp_max == pytest.approx(34.2)
    assert row.rainfall_mm == pytest.approx(4.5)


def test_refresh_application_dataset_incorporates_persisted_live_row(monkeypatch, db_session):
    from types import SimpleNamespace

    from backend.app.services import scheduler_service

    history = []
    for day in range(1, 6):
        history.append(
            {
                "date": f"2026-08-{day:02d}",
                "state": "Uttar Pradesh",
                "district": "Agra",
                "market": "Agra",
                "market_id": "M001",
                "commodity": "Potato",
                "variety": "Standard",
                "grade": "FAQ",
                "min_price": 1800.0,
                "max_price": 2200.0,
                "modal_price": 2000.0 + day,
                "arrivals_in_qtl": 500.0 + day,
                "temp_max": 33.0,
                "temp_min": 23.0,
                "rainfall_mm": 0.0,
                "ndvi_mean": 0.55,
                "is_festive_season": 0,
                "festival_name": "None",
                "harvest_season_type": "Zaid Lean Season",
                "latitude": 27.1767,
                "longitude": 78.0081,
            }
        )

    db_session.add(
        MarketData(
            commodity="Potato",
            market="Agra",
            modal_price=2500.0,
            arrivals_in_qtl=620.0,
            date="2026-08-06",
            state="Uttar Pradesh",
            district="Agra",
            variety="Standard",
            grade="FAQ",
            min_price=2300.0,
            max_price=2700.0,
        )
    )
    db_session.add(
        WeatherData(
            market="Agra",
            date="2026-08-06",
            temp_max=35.0,
            temp_min=24.0,
            rainfall_mm=1.5,
            solar_radiation=20.0,
        )
    )
    db_session.add(NdviData(market="Agra", date="2026-08-06", ndvi_mean=0.62))
    db_session.commit()

    monkeypatch.setattr(scheduler_service, "SessionLocal", lambda: db_session)
    app = SimpleNamespace(
        state=SimpleNamespace(
            dataset=__import__("pandas").DataFrame(history),
            metadata={"feature_cols": ["modal_price", "arrivals_in_qtl", "price_lag_1d"]},
            models_loaded=True,
            dataset_loaded=True,
        )
    )

    result = scheduler_service.refresh_application_dataset(app)

    assert result["status"] == "success"
    refreshed = app.state.dataset
    row = refreshed[
        (refreshed["commodity"] == "Potato")
        & (refreshed["market"] == "Agra")
        & (refreshed["date"] == "2026-08-06")
    ]
    assert len(row) == 1
    assert row.iloc[0]["modal_price"] == pytest.approx(2500.0)
    assert row.iloc[0]["arrivals_in_qtl"] == pytest.approx(620.0)
    assert row.iloc[0]["price_lag_1d"] == pytest.approx(2005.0)
