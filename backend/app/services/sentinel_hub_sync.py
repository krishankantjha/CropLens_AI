"""
Sentinel Hub Live NDVI Ingestion Service.

Fetches real-time crop greenness index (NDVI) values for supported mandi bounding boxes
using the Sentinel Hub Statistical API.
"""

import datetime as dt
import logging
import time
from typing import Any, Dict, Optional

import requests
from sqlalchemy.orm import Session

from backend.app.core.config import (
    SENTINEL_HUB_API_KEY,
    SENTINEL_HUB_CONNECT_TIMEOUT_SECONDS,
    SENTINEL_HUB_LOOKBACK_DAYS,
    SENTINEL_HUB_MAX_CLOUD_COVERAGE,
    SENTINEL_HUB_RELAXED_CLOUD_COVERAGE,
    SENTINEL_HUB_RETRY_ATTEMPTS,
    SENTINEL_HUB_TIMEOUT_SECONDS,
)
from backend.app.core.constants import MANDI_COORDINATES
from backend.app.db.database import SessionLocal
from backend.app.db.ndvi_model import NdviData

logger = logging.getLogger("croplens.sentinel_hub")

SENTINEL_HUB_STATISTICS_URL = "https://services.sentinel-hub.com/api/v1/statistics"
_HTTP_HEADERS = {
    "User-Agent": "CropLensAI/1.0 (CropLens agricultural market intelligence)",
    "Accept": "application/json",
    "Content-Type": "application/json",
}
_HTTP_SESSION: Optional[requests.Session] = None

_EVALSCRIPT = """
//VERSION=3
function setup() {
    return {
        input: [{
            bands: ["B04", "B08", "dataMask"]
        }],
        output: [
            { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
            { id: "dataMask", bands: 1 }
        ]
    };
}
function evaluatePixel(samples) {
    let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
    return {
        ndvi: [isNaN(ndvi) ? 0 : ndvi],
        dataMask: [samples.dataMask]
    };
}
"""


def _get_http_session() -> requests.Session:
    global _HTTP_SESSION
    if _HTTP_SESSION is None:
        session = requests.Session()
        session.headers.update(_HTTP_HEADERS)
        _HTTP_SESSION = session
    return _HTTP_SESSION


def _perform_post(
    url: str,
    payload: Dict[str, Any],
    headers: Dict[str, str],
    timeout: tuple[int, int],
) -> requests.Response:
    """HTTP POST via a reused session (patchable in tests)."""
    return _get_http_session().post(url, json=payload, headers=headers, timeout=timeout)


def _bounding_box_for_coords(lat: float, lon: float, delta: float = 0.05) -> list[float]:
    """Create a small bounding box (~5km x 5km) around a mandi coordinate."""
    return [lon - delta, lat - delta, lon + delta, lat + delta]


def _build_payload(
    bbox: list[float],
    start_date: dt.date,
    end_date: dt.date,
    max_cloud_coverage: int,
) -> Dict[str, Any]:
    return {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {"maxCloudCoverage": max_cloud_coverage},
                }
            ],
        },
        "aggregation": {
            "timeRange": {
                "from": f"{start_date.isoformat()}T00:00:00Z",
                "to": f"{end_date.isoformat()}T23:59:59Z",
            },
            "aggregationInterval": {"of": "P1D"},
            "evalscript": _EVALSCRIPT,
            "width": 512,
            "height": 512,
        },
    }


def _mean_from_outputs(outputs: Dict[str, Any]) -> Optional[float]:
    for output_id in ("ndvi", "default"):
        stats = (
            outputs.get(output_id, {})
            .get("bands", {})
            .get("B0", {})
            .get("stats", {})
        )
        mean_val = stats.get("mean")
        if isinstance(mean_val, dict):
            mean_val = mean_val.get("am")
        if mean_val is not None:
            return float(mean_val)
    return None


def _request_ndvi_statistics(
    market: str,
    bbox: list[float],
    *,
    max_cloud_coverage: int,
) -> Dict[str, Any]:
    """Call Sentinel Hub once for a mandi with a specific cloud threshold."""
    api_key = SENTINEL_HUB_API_KEY
    end_date = dt.date.today()
    start_date = end_date - dt.timedelta(days=SENTINEL_HUB_LOOKBACK_DAYS)
    payload = _build_payload(bbox, start_date, end_date, max_cloud_coverage)

    auth_header = f"Bearer {api_key}" if len(api_key) > 40 else f"apikey {api_key}"
    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    timeout = (SENTINEL_HUB_CONNECT_TIMEOUT_SECONDS, SENTINEL_HUB_TIMEOUT_SECONDS)

    total_attempts = SENTINEL_HUB_RETRY_ATTEMPTS + 1
    response = None
    for attempt in range(total_attempts):
        try:
            response = _perform_post(
                SENTINEL_HUB_STATISTICS_URL,
                payload,
                headers,
                timeout,
            )
            break
        except requests.ReadTimeout:
            raise
        except (requests.ConnectionError, requests.ConnectTimeout) as exc:
            if attempt >= total_attempts - 1:
                raise exc
            delay_seconds = min(2 ** attempt, 5)
            logger.warning(
                "Sentinel Hub connection failed for %s on attempt %s/%s; retrying in %ss",
                market,
                attempt + 1,
                total_attempts,
                delay_seconds,
            )
            time.sleep(delay_seconds)

    if response is None:
        raise RuntimeError("Sentinel Hub request did not return a response.")

    if response.status_code != 200:
        return {
            "status": "upstream_error",
            "market": market,
            "http_status": response.status_code,
            "cloud_coverage_limit": max_cloud_coverage,
            "message": f"Sentinel Hub returned HTTP {response.status_code}",
        }

    data = response.json()
    latest_mean = None
    latest_date = end_date.isoformat()

    for interval in reversed(data.get("data", [])):
        mean_val = _mean_from_outputs(interval.get("outputs", {}))
        if mean_val is not None:
            latest_mean = mean_val
            latest_date = interval.get("interval", {}).get("from", "").split("T")[0] or latest_date
            break

    if latest_mean is None:
        return {
            "status": "empty",
            "market": market,
            "cloud_coverage_limit": max_cloud_coverage,
            "message": "No cloud-free Sentinel-2 observations found in date range.",
        }

    return {
        "status": "success",
        "market": market,
        "ndvi_mean": max(0.0, min(1.0, latest_mean)),
        "date": latest_date,
        "cloud_coverage_limit": max_cloud_coverage,
        "source": "Sentinel Hub Statistical API",
    }


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

    cloud_limits = [SENTINEL_HUB_MAX_CLOUD_COVERAGE]
    if SENTINEL_HUB_RELAXED_CLOUD_COVERAGE > SENTINEL_HUB_MAX_CLOUD_COVERAGE:
        cloud_limits.append(SENTINEL_HUB_RELAXED_CLOUD_COVERAGE)

    try:
        result: Dict[str, Any] = {
            "status": "empty",
            "market": market,
            "message": "No Sentinel-2 observations found.",
        }
        for cloud_limit in cloud_limits:
            result = _request_ndvi_statistics(market, bbox, max_cloud_coverage=cloud_limit)
            if result["status"] == "success":
                break
            if result["status"] != "empty":
                break

        if result["status"] != "success":
            return result

        latest_date = result["date"]
        latest_mean = result["ndvi_mean"]

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
        logger.info(
            "Sentinel Hub NDVI sync completed for %s: %s on %s (cloud<=%s%%)",
            market,
            latest_mean,
            latest_date,
            result.get("cloud_coverage_limit"),
        )
        return result
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
