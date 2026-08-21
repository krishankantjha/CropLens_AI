"""
NASA POWER live weather ingestion.

This module fetches daily weather observations for supported mandi coordinates,
validates provider sentinel values, and upserts them into ``weather_data``.
It never substitutes synthetic weather for a failed upstream request.
"""

import datetime as dt
import logging
from typing import Any, Dict, Optional

import requests
from sqlalchemy.orm import Session

from backend.app.core.config import NASA_POWER_TIMEOUT_SECONDS
from backend.app.core.constants import MANDI_COORDINATES
from backend.app.db.database import SessionLocal
from backend.app.db.models import WeatherData

logger = logging.getLogger("croplens.nasa_power")

NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_MISSING_VALUE = -999.0


def _valid_number(value: Any) -> Optional[float]:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed == NASA_MISSING_VALUE:
        return None
    return parsed


def fetch_live_nasa_weather(
    market: str = "Agra",
    days: int = 7,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """Fetch and upsert recent NASA POWER daily observations for one mandi."""
    if market not in MANDI_COORDINATES:
        return {"status": "invalid_market", "market": market, "days_synced": 0}

    owns_session = db is None
    db = db or SessionLocal()
    days = min(max(int(days), 1), 31)
    coords = MANDI_COORDINATES[market]
    # NASA POWER may publish the current UTC day as -999 while the
    # observation is still incomplete; request completed days only.
    end_date = dt.date.today() - dt.timedelta(days=1)
    start_date = end_date - dt.timedelta(days=days - 1)

    params = {
        "parameters": "T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN",
        "community": "AG",
        "longitude": coords["lon"],
        "latitude": coords["lat"],
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
    }

    try:
        response = requests.get(
            NASA_POWER_BASE_URL,
            params=params,
            timeout=NASA_POWER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        parameters = payload.get("properties", {}).get("parameter", {})
        temp_max = parameters.get("T2M_MAX", {})
        temp_min = parameters.get("T2M_MIN", {})
        precipitation = parameters.get("PRECTOTCORR", {})
        solar = parameters.get("ALLSKY_SFC_SW_DWN", {})

        upserted = 0
        skipped = 0
        for date_key, temp_max_value in temp_max.items():
            date_value = dt.datetime.strptime(date_key, "%Y%m%d").date().isoformat()
            values = {
                "temp_max": _valid_number(temp_max_value),
                "temp_min": _valid_number(temp_min.get(date_key)),
                "rainfall_mm": _valid_number(precipitation.get(date_key)),
                "solar_radiation": _valid_number(solar.get(date_key)),
            }
            if any(values[key] is None for key in ("temp_max", "temp_min", "rainfall_mm")):
                skipped += 1
                continue

            existing = (
                db.query(WeatherData)
                .filter(
                    WeatherData.market == market,
                    WeatherData.date == date_value,
                )
                .first()
            )
            if existing:
                for key, value in values.items():
                    setattr(existing, key, value)
            else:
                db.add(WeatherData(market=market, date=date_value, **values))
            upserted += 1

        db.commit()
        if not upserted:
            return {
                "status": "empty",
                "market": market,
                "days_synced": 0,
                "days_skipped": skipped,
                "source": "NASA POWER Daily Point API",
            }

        logger.info(
            "NASA POWER sync completed for %s: %s days upserted, %s skipped",
            market,
            upserted,
            skipped,
        )
        return {
            "status": "success",
            "market": market,
            "days_synced": upserted,
            "days_skipped": skipped,
            "source": "NASA POWER Daily Point API",
        }
    except (requests.RequestException, ValueError, TypeError) as exc:
        db.rollback()
        logger.warning("NASA POWER sync failed for %s: %s", market, exc)
        return {
            "status": "upstream_error",
            "market": market,
            "days_synced": 0,
            "message": str(exc),
        }
    except Exception as exc:
        db.rollback()
        logger.exception("Unexpected NASA POWER sync failure for %s", market)
        return {
            "status": "error",
            "market": market,
            "days_synced": 0,
            "message": str(exc),
        }
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(fetch_live_nasa_weather("Agra"))


__all__ = ["NASA_POWER_BASE_URL", "fetch_live_nasa_weather"]
