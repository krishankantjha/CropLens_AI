"""
Sentinel Hub Live NDVI Ingestion Service.

Fetches real-time crop greenness index (NDVI) values for supported mandi bounding boxes
using the Sentinel Hub Statistical API or Copernicus Data Space Ecosystem.
"""

import datetime as dt
import logging
from typing import Any, Dict, Optional

import requests
from sqlalchemy.orm import Session

from backend.app.core.config import SENTINEL_HUB_API_KEY, SENTINEL_HUB_TIMEOUT_SECONDS
from backend.app.core.constants import MANDI_COORDINATES
from backend.app.db.database import SessionLocal
from backend.app.db.ndvi_model import NdviData

logger = logging.getLogger("croplens.sentinel_hub")

SENTINEL_HUB_STATISTICS_URL = "https://services.sentinel-hub.com/api/v1/statistics"


def _bounding_box_for_coords(lat: float, lon: float, delta: float = 0.05) -> list[float]:
    """Create a small bounding box (~5km x 5km) around a mandi coordinate."""
    return [lon - delta, lat - delta, lon + delta, lat + delta]


def fetch_live_ndvi(
    market: str = "Agra",
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Fetch and upsert the latest available Sentinel-2 NDVI observation for a mandi.
    """
    if market not in MANDI_COORDINATES:
        return {"status": "invalid_market", "market": market, "ndvi_mean": None}

    api_key = SENTINEL_HUB_API_KEY
    if not api_key:
        return {
            "status": "not_configured",
            "market": market,
            "message": "Set SENTINEL_HUB_API_KEY to enable live NDVI ingestion.",
        }

    owns_session = db is None
    db = db or SessionLocal()
    coords = MANDI_COORDINATES[market]
    bbox = _bounding_box_for_coords(coords["lat"], coords["lon"])

    end_date = dt.date.today()
    start_date = end_date - dt.timedelta(days=10)

    evalscript = """
    //VERSION=3
    function setup() {
        return {
            input: ["B04", "B08"],
            output: { bands: 1, sampleType: "FLOAT32" }
        }
    }
    function evaluatePixel(sample) {
        let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
        return [isNaN(ndvi) ? 0 : ndvi];
    }
    """

    payload = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {"maxCloudCoverage": 20},
                }
            ],
        },
        "aggregation": {
            "timeRange": {
                "from": f"{start_date.isoformat()}T00:00:00Z",
                "to": f"{end_date.isoformat()}T23:59:59Z",
            },
            "evalscript": evalscript,
            "resolution": "120m",
        },
        "calculations": {"default": {"statistics": {"mean": {"am": [0, 1]} } } },
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        response = requests.post(
            SENTINEL_HUB_STATISTICS_URL,
            json=payload,
            headers=headers,
            timeout=SENTINEL_HUB_TIMEOUT_SECONDS,
        )
        if response.status_code != 200:
            return {
                "status": "upstream_error",
                "market": market,
                "http_status": response.status_code,
                "message": f"Sentinel Hub returned HTTP {response.status_code}",
            }

        data = response.json()
        outputs = data.get("outputs", {})
        default_stats = outputs.get("default", {}).get("bands", {}).get("B0", {}).get("stats", {})
        
        # Extract the latest non-null mean NDVI from the time series
        latest_mean = None
        latest_date = end_date.isoformat()
        
        # Fallback inspection of intervals if structured differently
        intervals = data.get("data", [])
        for interval in reversed(intervals):
            outputs_val = interval.get("outputs", {}).get("default", {}).get("bands", {}).get("B0", {}).get("stats", {})
            mean_val = outputs_val.get("mean", {}).get("am")
            if mean_val is not None:
                latest_mean = float(mean_val)
                latest_date = interval.get("interval", {}).get("from", "").split("T")[0] or latest_date
                break

        if latest_mean is None and default_stats:
            mean_val = default_stats.get("mean", {}).get("am")
            if mean_val is not None:
                latest_mean = float(mean_val)

        if latest_mean is None:
            return {
                "status": "empty",
                "market": market,
                "message": "No cloud-free Sentinel-2 observations found in date range.",
            }

        # Clamp NDVI between 0 and 1
        latest_mean = max(0.0, min(1.0, latest_mean))

        existing = (
            db.query(NdviData)
            .filter(NdviData.market == market, NdviData.date == latest_date)
            .first()
        )
        if existing:
            existing.ndvi_mean = latest_mean
        else:
            db.add(NdviData(market=market, date=latest_date, ndvi_mean=latest_mean))

        db.commit()
        logger.info("Sentinel Hub NDVI sync completed for %s: %s on %s", market, latest_mean, latest_date)
        return {
            "status": "success",
            "market": market,
            "ndvi_mean": latest_mean,
            "date": latest_date,
            "source": "Sentinel Hub Statistical API",
        }
    except (requests.RequestException, ValueError, TypeError) as exc:
        db.rollback()
        logger.warning("Sentinel Hub NDVI sync failed for %s: %s", market, exc)
        return {
            "status": "upstream_error",
            "market": market,
            "message": str(exc),
        }
    finally:
        if owns_session:
            db.close()


__all__ = ["fetch_live_ndvi"]
