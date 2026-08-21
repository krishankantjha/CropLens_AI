"""
Automated live-data scheduler and prediction-cache service.

The scheduler persists upstream observations, rebuilds model-ready rows from the
canonical feature pipeline, swaps the serving dataset, and invalidates caches
before warming them again. Failed upstream calls never overwrite the serving
snapshot with fabricated values.
"""

import datetime
import time
from typing import Any, Dict, List, Optional

import pandas as pd
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.app.core.constants import MANDI_COORDINATES
from backend.app.db.database import SessionLocal
from backend.app.db.models import MarketData, WeatherData
from backend.app.services.agmarknet_sync import (
    ALLOWED_COMMODITIES,
    ALLOWED_MANDIS,
    sync_live_agmarknet_prices,
)
from backend.app.services.nasa_power_sync import fetch_live_nasa_weather

_FORECAST_7D_CACHE: Dict[str, Dict[str, Any]] = {}
_PRICE_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_STATS = {
    "hits": 0,
    "misses": 0,
    "last_warmed_at": None,
    "last_sync_at": None,
    "total_warmed_records": 0,
}

scheduler: Optional[AsyncIOScheduler] = None
_app_instance: Any = None

# The official location directory is the fallback only when an upstream record
# does not include location metadata. It is not used to fabricate prices.
_MARKET_DISTRICTS = {
    "Agra": "Agra",
    "Azadpur": "Delhi",
    "Farrukhabad": "Farrukhabad",
    "Guntur": "Guntur",
    "Indore": "Indore",
    "Karnal": "Karnal",
    "Khanna": "Ludhiana",
    "Kolkata": "Kolkata",
    "Lasalgaon": "Nashik",
    "Mathura": "Mathura",
}


def _make_cache_key(
    commodity: str,
    market: str,
    date: Optional[str] = None,
) -> str:
    c = commodity.strip().lower()
    m = market.strip().lower()
    d = date.strip() if date else datetime.date.today().isoformat()
    return f"{c}::{m}::{d}"


def get_cached_forecast_7d(
    commodity: str,
    market: str,
    date: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Retrieve a pre-computed seven-day forecast from the process cache."""
    key = _make_cache_key(commodity, market, date)
    if key in _FORECAST_7D_CACHE:
        _CACHE_STATS["hits"] += 1
        return _FORECAST_7D_CACHE[key]
    _CACHE_STATS["misses"] += 1
    return None


def set_cached_forecast_7d(
    commodity: str,
    market: str,
    payload: Dict[str, Any],
    date: Optional[str] = None,
) -> None:
    """Store a seven-day forecast in the process cache."""
    _FORECAST_7D_CACHE[_make_cache_key(commodity, market, date)] = payload


def get_cached_price(
    commodity: str,
    market: str,
    date: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Retrieve a single-day forecast from the process cache."""
    key = _make_cache_key(commodity, market, date)
    if key in _PRICE_CACHE:
        _CACHE_STATS["hits"] += 1
        return _PRICE_CACHE[key]
    _CACHE_STATS["misses"] += 1
    return None


def set_cached_price(
    commodity: str,
    market: str,
    payload: Dict[str, Any],
    date: Optional[str] = None,
) -> None:
    """Store a single-day forecast in the process cache."""
    _PRICE_CACHE[_make_cache_key(commodity, market, date)] = payload


def _invalidate_prediction_caches() -> None:
    """Drop forecasts generated from the previous serving snapshot."""
    _FORECAST_7D_CACHE.clear()
    _PRICE_CACHE.clear()


def warm_prediction_cache(app: Any) -> Dict[str, Any]:
    """Warm forecasts for supported commodity/market pairs from app state."""
    from backend.app.schemas import MultiDayForecastRequest
    from backend.app.services.api_service import predict_7day_forecast_service

    if not getattr(getattr(app, "state", None), "models_loaded", False):
        return {"status": "skipped", "reason": "Models not yet initialized in app state"}

    start_time = time.time()
    warmed_count = 0
    today_str = datetime.date.today().isoformat()
    models = app.state.models
    metadata = app.state.metadata
    dataset = app.state.dataset

    for commodity in ALLOWED_COMMODITIES:
        for market in ALLOWED_MANDIS:
            try:
                request = MultiDayForecastRequest(
                    commodity=commodity,
                    market=market,
                    start_date=today_str,
                    horizon_days=7,
                )
                result = predict_7day_forecast_service(
                    request,
                    models,
                    metadata,
                    dataset,
                )
                set_cached_forecast_7d(
                    commodity,
                    market,
                    result.model_dump(),
                    date=today_str,
                )
                warmed_count += 1
            except Exception:
                # A pair without enough history should not prevent other pairs
                # from being warmed.
                continue

    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    _CACHE_STATS["last_warmed_at"] = datetime.datetime.now(
        datetime.timezone.utc
    ).isoformat()
    _CACHE_STATS["total_warmed_records"] = warmed_count
    return {
        "status": "success",
        "warmed_pairs": warmed_count,
        "duration_ms": elapsed_ms,
        "timestamp": _CACHE_STATS["last_warmed_at"],
    }


def _latest_reference_row(
    dataset: pd.DataFrame,
    commodity: str,
    market: str,
) -> Dict[str, Any]:
    """Get historical context used to complete a newly ingested observation."""
    if dataset.empty:
        return {}

    market_rows = dataset[
        dataset["market"].astype(str).str.lower().eq(market.lower())
    ]
    commodity_rows = market_rows[
        market_rows["commodity"].astype(str).str.lower().eq(commodity.lower())
    ]
    if commodity_rows.empty:
        commodity_rows = dataset[
            dataset["commodity"].astype(str).str.lower().eq(commodity.lower())
        ]
    if commodity_rows.empty:
        commodity_rows = market_rows
    if commodity_rows.empty:
        commodity_rows = dataset

    ordered = commodity_rows.sort_values("date")
    return ordered.iloc[-1].to_dict() if not ordered.empty else {}


def _first_present(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        try:
            if pd.isna(value):
                continue
        except (TypeError, ValueError):
            pass
        return value
    return None


def _calendar_values(date_value: pd.Timestamp, commodity: str) -> Dict[str, Any]:
    """Provide deterministic calendar context for a newly observed date."""
    month = int(date_value.month)
    if month in (9, 10, 11):
        harvest_season = "Kharif Harvest"
        is_festive = 1
        festival_name = "Seasonal Demand Window"
    elif month in (3, 4, 5):
        harvest_season = "Rabi Harvest"
        is_festive = 0
        festival_name = "None"
    else:
        harvest_season = "Zaid Lean Season"
        is_festive = 0
        festival_name = "None"

    return {
        "is_festive_season": is_festive,
        "festival_name": festival_name,
        "harvest_season_type": harvest_season,
    }


def _build_live_rows(
    market_rows: List[MarketData],
    weather_rows: List[WeatherData],
    ndvi_rows: List[Any],
    dataset: pd.DataFrame,
) -> pd.DataFrame:
    """Enrich persisted upstream records with the canonical raw-data contract."""
    weather_lookup = {
        (row.market, row.date): row for row in weather_rows
    }
    ndvi_lookup = {
        (row.market, row.date): row.ndvi_mean for row in ndvi_rows
    }
    output: List[Dict[str, Any]] = []

    for row in market_rows:
        date_value = pd.to_datetime(row.date, errors="coerce")
        if pd.isna(date_value):
            continue
        reference = _latest_reference_row(dataset, row.commodity, row.market)
        coordinates = MANDI_COORDINATES.get(row.market, {})
        weather = weather_lookup.get((row.market, row.date))
        calendar = _calendar_values(date_value, row.commodity)

        enriched = dict(reference)
        enriched.update(
            {
                "commodity": row.commodity,
                "market": row.market,
                "date": date_value,
                "modal_price": float(row.modal_price),
                "arrivals_in_qtl": float(row.arrivals_in_qtl),
                "state": _first_present(row.state, reference.get("state"), coordinates.get("state")),
                "district": _first_present(row.district, reference.get("district"), _MARKET_DISTRICTS.get(row.market, row.market)),
                "variety": _first_present(row.variety, reference.get("variety"), "Standard"),
                "grade": _first_present(row.grade, reference.get("grade"), "Standard"),
                "min_price": float(row.min_price) if row.min_price is not None else max(float(row.modal_price) * 0.9, 0.0),
                "max_price": float(row.max_price) if row.max_price is not None else float(row.modal_price) * 1.1,
                "latitude": _first_present(reference.get("latitude"), coordinates.get("lat")),
                "longitude": _first_present(reference.get("longitude"), coordinates.get("lon")),
                "market_id": _first_present(reference.get("market_id"), f"LIVE_{row.market.upper()}"),
                **calendar,
            }
        )

        if weather is not None:
            enriched.update(
                {
                    "temp_max": float(weather.temp_max),
                    "temp_min": float(weather.temp_min),
                    "rainfall_mm": float(weather.rainfall_mm),
                }
            )
        else:
            enriched["temp_max"] = _first_present(reference.get("temp_max"), 30.0)
            enriched["temp_min"] = _first_present(reference.get("temp_min"), 20.0)
            enriched["rainfall_mm"] = _first_present(reference.get("rainfall_mm"), 0.0)
        
        live_ndvi = ndvi_lookup.get((row.market, row.date))
        enriched["ndvi_mean"] = _first_present(live_ndvi, reference.get("ndvi_mean"), 0.5)
        output.append(enriched)

    if not output:
        return pd.DataFrame()
    return pd.DataFrame(output)


def refresh_application_dataset(app: Any) -> Dict[str, Any]:
    """Merge persisted live observations into the model-serving dataset."""
    current_dataset = getattr(getattr(app, "state", None), "dataset", None)
    if not isinstance(current_dataset, pd.DataFrame) or current_dataset.empty:
        return {"status": "skipped", "reason": "Serving dataset is not loaded"}

    db = SessionLocal()
    try:
        from backend.app.db.ndvi_model import NdviData

        market_rows = db.query(MarketData).all()
        weather_rows = db.query(WeatherData).all()
        ndvi_rows = db.query(NdviData).all()
        live_rows = _build_live_rows(market_rows, weather_rows, ndvi_rows, current_dataset)
        if live_rows.empty:
            return {"status": "skipped", "reason": "No persisted live market rows"}

        base = current_dataset.copy()
        base["date"] = pd.to_datetime(base["date"], errors="coerce")
        live_rows = live_rows.reindex(columns=base.columns, fill_value=pd.NA)
        combined = pd.concat([base, live_rows], ignore_index=True)
        combined = combined.drop_duplicates(
            subset=["commodity", "market", "date"],
            keep="last",
        ).sort_values(["market", "commodity", "date"])

        from backend.app.services.canonical_features import FeatureExtractor

        refreshed = FeatureExtractor.compute_batch_features(combined)
        feature_columns = list(app.state.metadata.get("feature_cols", []))
        missing_features = [
            column for column in feature_columns if column not in refreshed.columns
        ]
        if missing_features:
            return {
                "status": "error",
                "reason": f"Missing model features after refresh: {missing_features}",
            }

        app.state.dataset = refreshed.reset_index(drop=True)
        app.state.dataset_loaded = True
        _invalidate_prediction_caches()
        return {
            "status": "success",
            "live_rows_incorporated": len(live_rows),
            "dataset_rows": len(app.state.dataset),
        }
    except Exception as exc:
        print(f"[Scheduler Error] Dataset refresh failed: {exc}")
        return {"status": "error", "reason": str(exc)}
    finally:
        db.close()


async def scheduled_agmarknet_sync() -> None:
    """Daily job for official Agmarknet market-price ingestion."""
    try:
        result = sync_live_agmarknet_prices()
        if result.get("status") == "success" and _app_instance is not None:
            refresh_application_dataset(_app_instance)
        _CACHE_STATS["last_sync_at"] = datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat()
        print(f"[Scheduler] Agmarknet sync result: {result}")
    except Exception as exc:
        print(f"[Scheduler Error] Agmarknet sync failed: {exc}")


async def scheduled_nasa_weather_sync() -> None:
    """Daily job for NASA POWER observations at supported mandi coordinates."""
    try:
        results = [
            fetch_live_nasa_weather(market=market, days=7)
            for market in MANDI_COORDINATES
        ]
        if _app_instance is not None and any(
            result.get("status") == "success" for result in results
        ):
            refresh_application_dataset(_app_instance)
        successful = sum(result.get("status") == "success" for result in results)
        print(f"[Scheduler] NASA POWER sync completed for {successful} mandis.")
    except Exception as exc:
        print(f"[Scheduler Error] NASA weather sync failed: {exc}")


async def scheduled_ndvi_sync() -> None:
    """Daily job for Sentinel-2 NDVI observations at supported mandi coordinates."""
    try:
        from backend.app.services.sentinel_hub_sync import fetch_live_ndvi

        results = [
            fetch_live_ndvi(market=market)
            for market in MANDI_COORDINATES
        ]
        if _app_instance is not None and any(
            result.get("status") == "success" for result in results
        ):
            refresh_application_dataset(_app_instance)
        successful = sum(result.get("status") == "success" for result in results)
        print(f"[Scheduler] Sentinel Hub NDVI sync completed for {successful} mandis.")
    except Exception as exc:
        print(f"[Scheduler Error] NDVI sync failed: {exc}")


async def scheduled_cache_warming() -> None:
    """Daily job for warming forecasts from the latest serving dataset."""
    if _app_instance is not None:
        result = warm_prediction_cache(_app_instance)
        print(f"[Scheduler] Cache warming result: {result}")


async def scheduled_morning_alert_dispatch() -> None:
    """Daily job for dispatching scheduled advisory notifications."""
    if _app_instance is None:
        return
    try:
        from backend.app.services.whatsapp_service import (
            dispatch_scheduled_advisories_service,
        )
        dispatch_scheduled_advisories_service(_app_instance)
    except Exception as exc:
        print(f"[Scheduler Error] Morning alert dispatch failed: {exc}")


def init_scheduler(app: Any) -> AsyncIOScheduler:
    """Initialize recurring jobs once for the current application process."""
    global scheduler, _app_instance
    _app_instance = app
    if scheduler is not None and scheduler.running:
        return scheduler

    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        scheduled_agmarknet_sync,
        trigger=CronTrigger(hour=18, minute=0),
        id="daily_agmarknet_sync",
        name="Daily Agmarknet APMC Auction Price Ingestion",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        scheduled_nasa_weather_sync,
        trigger=CronTrigger(hour=18, minute=30),
        id="daily_weather_sync",
        name="Daily NASA POWER Meteorological Ingestion",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        scheduled_ndvi_sync,
        trigger=CronTrigger(hour=18, minute=15),
        id="daily_ndvi_sync",
        name="Daily Sentinel-2 NDVI Remote Sensing Ingestion",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        scheduled_cache_warming,
        trigger=CronTrigger(hour=18, minute=45),
        id="daily_cache_warming",
        name="Daily Multi-Quantile Forecast Cache Warming",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        scheduled_morning_alert_dispatch,
        trigger=CronTrigger(hour=7, minute=0),
        id="daily_morning_alerts",
        name="Daily Morning Market Advisory Dispatches",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.start()
    return scheduler


def get_scheduler_status() -> Dict[str, Any]:
    """Return scheduler jobs and cache freshness telemetry."""
    jobs_info: List[Dict[str, Any]] = []
    if scheduler and scheduler.running:
        for job in scheduler.get_jobs():
            jobs_info.append(
                {
                    "job_id": job.id,
                    "job_name": job.name,
                    "trigger": str(job.trigger),
                    "next_run_time": job.next_run_time.isoformat()
                    if job.next_run_time
                    else None,
                }
            )

    total_requests = _CACHE_STATS["hits"] + _CACHE_STATS["misses"]
    return {
        "scheduler_running": bool(scheduler and scheduler.running),
        "timezone": "Asia/Kolkata",
        "active_jobs_count": len(jobs_info),
        "jobs": jobs_info,
        "cache_metrics": {
            "cached_forecasts_7d_count": len(_FORECAST_7D_CACHE),
            "cached_single_day_prices_count": len(_PRICE_CACHE),
            "cache_hits": _CACHE_STATS["hits"],
            "cache_misses": _CACHE_STATS["misses"],
            "hit_ratio_pct": round(
                (_CACHE_STATS["hits"] / max(1, total_requests)) * 100,
                2,
            ),
            "last_warmed_at": _CACHE_STATS["last_warmed_at"],
            "last_sync_at": _CACHE_STATS["last_sync_at"],
            "total_warmed_records": _CACHE_STATS["total_warmed_records"],
        },
    }


def trigger_manual_sync(app: Any) -> Dict[str, Any]:
    """Run both upstream syncs, refresh serving state, and warm caches."""
    db = SessionLocal()
    try:
        from backend.app.services.sentinel_hub_sync import fetch_live_ndvi

        market_result = sync_live_agmarknet_prices(db=db)
        weather_results = [
            fetch_live_nasa_weather(market=market, days=7, db=db)
            for market in MANDI_COORDINATES
        ]
        ndvi_results = [
            fetch_live_ndvi(market=market, db=db)
            for market in MANDI_COORDINATES
        ]
        refresh_result = refresh_application_dataset(app)
        cache_result = warm_prediction_cache(app)
        _CACHE_STATS["last_sync_at"] = datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat()

        successful_weather = sum(
            result.get("status") == "success" for result in weather_results
        )
        successful_ndvi = sum(
            result.get("status") == "success" for result in ndvi_results
        )
        upstream_success = (
            market_result.get("status") == "success"
            or successful_weather > 0
            or successful_ndvi > 0
        )
        overall_status = (
            "success"
            if upstream_success and refresh_result.get("status") == "success"
            else "partial"
            if upstream_success
            else "error"
        )
        return {
            "status": overall_status,
            "message": "Live data synchronization completed.",
            "agmarknet_sync": market_result,
            "nasa_weather_sync": {
                "markets_attempted": len(MANDI_COORDINATES),
                "markets_succeeded": successful_weather,
                "results": weather_results,
            },
            "dataset_refresh": refresh_result,
            "cache_warming": cache_result,
            "timestamp": _CACHE_STATS["last_sync_at"],
        }
    finally:
        db.close()
