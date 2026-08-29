"""
Agmarknet/Data.gov.in live mandi-price ingestion.

The connector intentionally does not fabricate market prices. A valid
AGMARKNET_API_KEY must be supplied through the environment. When the upstream
service is unavailable or not configured, the sync reports that state and
leaves the last known persisted data untouched.
"""

import datetime as dt
import logging
import time
from typing import Any, Dict, Optional

import pandas as pd
import requests
from sqlalchemy.orm import Session

from backend.app.core.config import (
    AGMARKNET_API_KEY,
    AGMARKNET_API_PAGE_SIZE,
    AGMARKNET_MAX_PAGES,
    AGMARKNET_TIMEOUT_SECONDS,
    AGMARKNET_RETRY_ATTEMPTS,
)
from backend.app.core.constants import VALID_COMMODITIES, VALID_MARKETS
from backend.app.db.database import SessionLocal
from backend.app.db.models import MarketData

logger = logging.getLogger("croplens.agmarknet")

AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
AGMARKNET_API_URL = f"https://api.data.gov.in/resource/{AGMARKNET_RESOURCE_ID}"

# Backwards-compatible names used by the scheduler.
ALLOWED_COMMODITIES = VALID_COMMODITIES
ALLOWED_MANDIS = VALID_MARKETS


def _normalise(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _field(record: Dict[str, Any], *names: str) -> Any:
    """Return a field while tolerating capitalization and whitespace changes."""
    lookup = {_normalise(key): value for key, value in record.items()}
    for name in names:
        value = lookup.get(_normalise(name))
        if value not in (None, ""):
            return value
    return None


def _to_float(value: Any) -> Optional[float]:
    if value in (None, ""):
        return None
    try:
        parsed = float(str(value).replace(",", "").strip())
        return parsed if parsed >= 0 else None
    except (TypeError, ValueError):
        return None


def _to_iso_date(value: Any) -> Optional[str]:
    if value in (None, ""):
        return None
    parsed = pd.to_datetime(str(value).strip(), dayfirst=True, errors="coerce")
    return None if pd.isna(parsed) else parsed.date().isoformat()


def _request_page(params: Dict[str, Any]) -> requests.Response:
    """Fetch one page with bounded retries for transient upstream failures."""
    total_attempts = AGMARKNET_RETRY_ATTEMPTS + 1
    for attempt in range(total_attempts):
        try:
            return requests.get(
                AGMARKNET_API_URL,
                params=params,
                timeout=AGMARKNET_TIMEOUT_SECONDS,
            )
        except requests.RequestException:
            if attempt >= total_attempts - 1:
                raise
            delay_seconds = min(2 ** attempt, 5)
            logger.warning(
                "Agmarknet request failed on attempt %s/%s; retrying in %ss",
                attempt + 1,
                total_attempts,
                delay_seconds,
            )
            time.sleep(delay_seconds)
    raise RuntimeError("Agmarknet request exhausted its retry attempts.")


def _fetch_live_records() -> tuple[list[Dict[str, Any]], Dict[str, Any]]:
    """Fetch current records with bounded pagination from the official OGD API."""
    api_key = AGMARKNET_API_KEY
    if not api_key:
        return [], {
            "status": "not_configured",
            "message": "Set AGMARKNET_API_KEY to enable live Agmarknet ingestion.",
        }

    records: list[Dict[str, Any]] = []
    try:
        # Query once per supported commodity so the first API page cannot hide
        # a mandi that happens to sort later in the national result set.
        for commodity in VALID_COMMODITIES:
            for page in range(AGMARKNET_MAX_PAGES):
                response = _request_page(
                    {
                        "api-key": api_key,
                        "format": "json",
                        "filters[commodity]": commodity,
                        "offset": page * AGMARKNET_API_PAGE_SIZE,
                        "limit": AGMARKNET_API_PAGE_SIZE,
                    }
                )
                if response.status_code != 200:
                    return [], {
                        "status": "upstream_error",
                        "http_status": response.status_code,
                        "message": f"Data.gov.in returned HTTP {response.status_code} for {commodity}.",
                    }

                payload = response.json()
                page_records = payload.get("records", []) if isinstance(payload, dict) else []
                if not isinstance(page_records, list):
                    return [], {
                        "status": "upstream_error",
                        "message": "Data.gov.in response did not contain a records list.",
                    }
                records.extend(page_records)
                if len(page_records) < AGMARKNET_API_PAGE_SIZE:
                    break

        return records, {"status": "success", "raw_records": len(records)}
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Agmarknet API request failed: %s", exc)
        return [], {"status": "upstream_error", "message": str(exc)}


def sync_live_agmarknet_prices(db: Optional[Session] = None) -> Dict[str, Any]:
    """Fetch, validate, and upsert current Agmarknet records into ``market_data``."""
    owns_session = db is None
    db = db or SessionLocal()

    try:
        records, fetch_status = _fetch_live_records()
        if fetch_status["status"] != "success":
            logger.warning("Agmarknet sync skipped: %s", fetch_status)
            return {"status": fetch_status["status"], "records_synced": 0, **fetch_status}

        commodity_lookup = {_normalise(value): value for value in VALID_COMMODITIES}
        market_lookup = {_normalise(value): value for value in VALID_MARKETS}
        accepted: Dict[tuple[str, str, str], Dict[str, Any]] = {}
        rejected = 0

        for record in records:
            commodity = commodity_lookup.get(_normalise(_field(record, "commodity")))
            market = market_lookup.get(_normalise(_field(record, "market")))
            date_value = _to_iso_date(
                _field(record, "arrival_date", "arrival date", "date")
            )
            modal_price = _to_float(
                _field(record, "modal_price", "modal price", "modal")
            )
            arrivals = _to_float(
                _field(
                    record,
                    "arrivals_in_qtl",
                    "arrival_in_qtl",
                    "arrivals in qtl",
                    "arrival in qtl",
                    "arrival in quintal",
                    "arrival",
                )
            )
            min_price = _to_float(_field(record, "min_price", "min price"))
            max_price = _to_float(_field(record, "max_price", "max price"))

            if not commodity or not market or not date_value or modal_price is None:
                rejected += 1
                continue

            accepted[(commodity, market, date_value)] = {
                "commodity": commodity,
                "market": market,
                "modal_price": modal_price,
                "arrivals_in_qtl": arrivals if arrivals is not None else 0.0,
                "date": date_value,
                "state": _field(record, "state", "state name"),
                "district": _field(record, "district", "district name"),
                "variety": _field(record, "variety"),
                "grade": _field(record, "grade"),
                "min_price": min_price,
                "max_price": max_price,
            }

        if not accepted:
            return {
                "status": "empty",
                "records_synced": 0,
                "raw_records": len(records),
                "rejected_records": rejected,
                "message": "No API records matched the configured commodity/market contract.",
            }

        for item in accepted.values():
            existing = (
                db.query(MarketData)
                .filter(
                    MarketData.commodity == item["commodity"],
                    MarketData.market == item["market"],
                    MarketData.date == item["date"],
                )
                .first()
            )
            if existing:
                for field in (
                    "modal_price",
                    "arrivals_in_qtl",
                    "state",
                    "district",
                    "variety",
                    "grade",
                    "min_price",
                    "max_price",
                ):
                    value = item.get(field)
                    if value is not None:
                        setattr(existing, field, value)
            else:
                db.add(MarketData(**item))

        db.commit()
        synced_at = dt.datetime.now(dt.timezone.utc).isoformat()
        logger.info(
            "Agmarknet sync completed: %s records upserted, %s rejected",
            len(accepted),
            rejected,
        )
        return {
            "status": "success",
            "records_synced": len(accepted),
            "raw_records": len(records),
            "rejected_records": rejected,
            "synced_at": synced_at,
        }
    except Exception as exc:
        db.rollback()
        logger.exception("Agmarknet sync failed")
        return {"status": "error", "records_synced": 0, "message": str(exc)}
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(sync_live_agmarknet_prices())


__all__ = [
    "AGMARKNET_API_URL",
    "ALLOWED_COMMODITIES",
    "ALLOWED_MANDIS",
    "sync_live_agmarknet_prices",
]


# End of module.
