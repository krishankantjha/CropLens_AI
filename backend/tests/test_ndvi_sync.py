import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.database import Base
from backend.app.db.ndvi_model import NdviData
from backend.app.services import sentinel_hub_sync


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


def test_ndvi_sync_not_configured(db_session):
    result = sentinel_hub_sync.fetch_live_ndvi("Agra", db=db_session)
    assert result["status"] == "not_configured"


def test_ndvi_sync_persists_observation(monkeypatch, db_session):
    monkeypatch.setattr(sentinel_hub_sync, "SENTINEL_HUB_API_KEY", "test-ndvi-key")

    payload = {
        "data": [
            {
                "interval": {"from": "2026-08-20T00:00:00Z"},
                "outputs": {
                    "default": {
                        "bands": {
                            "B0": {
                                "stats": {
                                    "mean": {"am": 0.645}
                                }
                            }
                        }
                    }
                }
            }
        ]
    }
    monkeypatch.setattr(sentinel_hub_sync.requests, "post", lambda *args, **kwargs: FakeResponse(payload))

    result = sentinel_hub_sync.fetch_live_ndvi("Agra", db=db_session)

    assert result["status"] == "success"
    assert result["ndvi_mean"] == pytest.approx(0.645)

    row = db_session.query(NdviData).one()
    assert row.market == "Agra"
    assert row.date == "2026-08-20"
    assert row.ndvi_mean == pytest.approx(0.645)
