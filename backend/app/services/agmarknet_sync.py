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
    AGMARKNET_CONNECT_TIMEOUT_SECONDS,
    AGMARKNET_INTER_REQUEST_DELAY_SECONDS,
    AGMARKNET_READ_TIMEOUT_SECONDS,
    AGMARKNET_RETRY_ATTEMPTS,
)
from backend.app.core.constants import VALID_COMMODITIES, VALID_MARKETS
from backend.app.db.database import SessionLocal
from backend.app.db.models import MarketData

logger = logging.getLogger("croplens.agmarknet")

AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
AGMARKNET_API_URL = f"https://api.data.gov.in/resource/{AGMARKNET_RESOURCE_ID}"

# Data.gov.in throttles or stalls bare Python requests without a User-Agent.
_HTTP_HEADERS = {
    "User-Agent": "CropLensAI/1.0 (CropLens agricultural market intelligence)",
    "Accept": "application/json",
}

# Backwards-compatible names used by the scheduler.
ALLOWED_COMMODITIES = VALID_COMMODITIES
ALLOWED_MANDIS = VALID_MARKETS

# Common upstream spellings that differ from the canonical whitelist.
_COMMODITY_ALIASES: Dict[str, str] = {
    "paddy": "Paddy(Dhan)",
    "paddy dhan": "Paddy(Dhan)",
    "paddy(dhan) common": "Paddy(Dhan)",
    "gram": "Gram(Chana)",
    "chana": "Gram(Chana)",
    "gram(chana)": "Gram(Chana)",
    "chilli": "Chilli Red",
    "chilly red": "Chilli Red",
    "chilli red": "Chilli Red",
    "soybean": "Soyabean",
    "soya bean": "Soyabean",
}

_HTTP_SESSION: Optional[requests.Session] = None


def _get_http_session() -> requests.Session:
    global _HTTP_SESSION
    if _HTTP_SESSION is None:
        session = requests.Session()
        session.headers.update(_HTTP_HEADERS)
        _HTTP_SESSION = session
    return _HTTP_SESSION


def _perform_get(
    url: str,
    params: Dict[str, Any],
    timeout: tuple[int, int],
) -> requests.Response:
    """HTTP GET via a reused session (patchable in tests)."""
    return _get_http_session().get(url, params=params, timeout=timeout)


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


def _resolve_commodity(raw_name: Any, commodity_lookup: Dict[str, str]) -> Optional[str]:
    norm = _normalise(raw_name)
    if not norm:
        return None
    if norm in commodity_lookup:
        return commodity_lookup[norm]
    alias = _COMMODITY_ALIASES.get(norm)
    if alias:
        return alias
    for canonical in VALID_COMMODITIES:
        if norm.startswith(_normalise(canonical)):
            return canonical
    return None


def _resolve_market(raw_name: Any, market_lookup: Dict[str, str]) -> Optional[str]:
    norm = _normalise(raw_name)
    if not norm:
        return None
    if norm in market_lookup:
        return market_lookup[norm]
    for suffix in (" apmc", " mandi", " market"):
        if norm.endswith(suffix):
            base = norm[: -len(suffix)].strip()
            if base in market_lookup:
                return market_lookup[base]
    for canonical in VALID_MARKETS:
        if norm.startswith(_normalise(canonical)):
            return canonical
    return None


def _request_page(params: Dict[str, Any]) -> requests.Response:
    """Fetch one page; retry only transient connection failures, not read stalls."""
    timeout = (AGMARKNET_CONNECT_TIMEOUT_SECONDS, AGMARKNET_READ_TIMEOUT_SECONDS)
    total_attempts = AGMARKNET_RETRY_ATTEMPTS + 1
    for attempt in range(total_attempts):
        try:
            return _perform_get(AGMARKNET_API_URL, params, timeout)
        except requests.ReadTimeout:
            raise
        except (requests.ConnectionError, requests.ConnectTimeout) as exc:
            if attempt >= total_attempts - 1:
                raise exc
            delay_seconds = min(2 ** attempt, 5)
            logger.warning(
                "Agmarknet connection failed on attempt %s/%s; retrying in %ss",
                attempt + 1,
                total_attempts,
                delay_seconds,
            )
            time.sleep(delay_seconds)
        except requests.Timeout as exc:
            # Fail fast on other timeout types (typically upstream read stalls).
            raise exc
    raise RuntimeError("Agmarknet request exhausted its retry attempts.")


def _fetch_live_records() -> tuple[list[Dict[str, Any]], Dict[str, Any]]:
    """Fetch current records via one small query per supported mandi."""
    api_key = AGMARKNET_API_KEY
    if not api_key:
        return [], {
            "status": "not_configured",
            "message": "Set AGMARKNET_API_KEY to enable live Agmarknet ingestion.",
        }

    records: list[Dict[str, Any]] = []
    market_errors: list[Dict[str, Any]] = []
    markets_succeeded = 0

    try:
        # Per-market queries return small payloads quickly; national or per-commodity
        # queries with large limits often stall when no User-Agent is sent.
        for index, market in enumerate(VALID_MARKETS):
            if index > 0 and AGMARKNET_INTER_REQUEST_DELAY_SECONDS > 0:
                time.sleep(AGMARKNET_INTER_REQUEST_DELAY_SECONDS)

            market_records: list[Dict[str, Any]] = []
            market_failed = False
            for page in range(AGMARKNET_MAX_PAGES):
                try:
                    response = _request_page(
                        {
                            "api-key": api_key,
                            "format": "json",
                            "filters[market]": market,
                            "offset": page * AGMARKNET_API_PAGE_SIZE,
                            "limit": AGMARKNET_API_PAGE_SIZE,
                        }
                    )
                except requests.RequestException as exc:
                    market_errors.append(
                        {
                            "market": market,
                            "status": "upstream_error",
                            "message": str(exc),
                        }
                    )
                    market_failed = True
                    break

                if response.status_code != 200:
                    market_errors.append(
                        {
                            "market": market,
                            "status": "upstream_error",
                            "http_status": response.status_code,
                            "message": f"Data.gov.in returned HTTP {response.status_code}.",
                        }
                    )
                    market_failed = True
                    break

                payload = response.json()
                page_records = payload.get("records", []) if isinstance(payload, dict) else []
                if not isinstance(page_records, list):
                    market_errors.append(
                        {
                            "market": market,
                            "status": "upstream_error",
                            "message": "Data.gov.in response did not contain a records list.",
                        }
                    )
                    market_failed = True
                    break

                market_records.extend(page_records)
                if len(page_records) < AGMARKNET_API_PAGE_SIZE:
                    break

            if market_failed:
                continue

            records.extend(market_records)
            markets_succeeded += 1

        fetch_meta = {
            "fetch_strategy": "per_market",
            "markets_succeeded": markets_succeeded,
            "markets_failed": len(market_errors),
            "market_errors": market_errors,
            # Backwards-compatible aliases for existing logs and API consumers.
            "commodities_succeeded": markets_succeeded,
            "commodities_failed": len(market_errors),
            "commodity_errors": market_errors,
        }

        if records:
            status = "success" if not market_errors else "partial"
            return records, {
                "status": status,
                "raw_records": len(records),
                **fetch_meta,
            }

        if market_errors:
            return [], {
                "status": "upstream_error",
                "message": "All mandi fetches failed against Data.gov.in.",
                **fetch_meta,
            }

        return records, {"status": "success", "raw_records": 0, **fetch_meta}
    except ValueError as exc:
        logger.warning("Agmarknet API response parsing failed: %s", exc)
        return [], {"status": "upstream_error", "message": str(exc)}


def sync_live_agmarknet_prices(db: Optional[Session] = None) -> Dict[str, Any]:
    """Fetch, validate, and upsert current Agmarknet records into ``market_data``."""
    owns_session = db is None
    db = db or SessionLocal()

    try:
        records, fetch_status = _fetch_live_records()
        if fetch_status["status"] not in {"success", "partial"}:
            logger.warning("Agmarknet sync skipped: %s", fetch_status)
            return {"status": fetch_status["status"], "records_synced": 0, **fetch_status}

        commodity_lookup = {_normalise(value): value for value in VALID_COMMODITIES}
        market_lookup = {_normalise(value): value for value in VALID_MARKETS}
        accepted: Dict[tuple[str, str, str], Dict[str, Any]] = {}
        rejected = 0

        for record in records:
            commodity = _resolve_commodity(_field(record, "commodity"), commodity_lookup)
            market = _resolve_market(_field(record, "market"), market_lookup)
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
        sync_status = fetch_status.get("status", "success")
        return {
            "status": sync_status if sync_status == "partial" else "success",
            "records_synced": len(accepted),
            "raw_records": len(records),
            "rejected_records": rejected,
            "synced_at": synced_at,
            "fetch_strategy": fetch_status.get("fetch_strategy"),
            "markets_succeeded": fetch_status.get("markets_succeeded"),
            "markets_failed": fetch_status.get("markets_failed"),
            "market_errors": fetch_status.get("market_errors", []),
            "commodities_succeeded": fetch_status.get("commodities_succeeded"),
            "commodities_failed": fetch_status.get("commodities_failed"),
            "commodity_errors": fetch_status.get("commodity_errors", []),
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
