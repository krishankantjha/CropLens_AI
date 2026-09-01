"""
FastAPI Router module defining API v1 endpoints for CropLens AI.
Exposes price prediction, supply shock anomaly alerts, spatial mandi arbitrage, market trend analytics, and PDF procurement reports.
"""

from typing import Optional
from fastapi import APIRouter, Request, Query, status, Response, Depends, HTTPException

from backend.app.schemas import (
    PricePredictionRequest, PricePredictionResponse,
    MultiDayForecastRequest, MultiDayForecastResponse, SystemResourcesResponse,
    SupplyShockResponse, ArbitrageResponse, AnalyticsTrendResponse
)
from backend.app.services.api_service import (
    predict_price_service,
    predict_7day_forecast_service,
    detect_supply_shocks_service,
    calculate_arbitrage_service,
    get_analytics_trends_service
)
from backend.app.services.scheduler_service import (
    get_scheduler_status,
    trigger_manual_sync,
    get_cached_forecast_7d,
    set_cached_forecast_7d,
    dataset_watermark,
)
from backend.app.services.pdf_generator import generate_procurement_pdf

from backend.app.api.auth_router import auth_router, get_current_user, require_system_operator, verify_csrf
from backend.app.api.alerts_router import alerts_router
from backend.app.core.constants import VALID_COMMODITIES, VALID_MARKETS
from backend.app.core.redis_client import redis_store

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(alerts_router)


def _require_model_runtime(request: Request) -> None:
    """Require validated model artifacts before serving model-backed routes."""
    if not getattr(request.app.state, "models_loaded", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model service is unavailable because the production model bundle is not loaded.",
        )


def _require_dataset_runtime(request: Request) -> None:
    """Require a validated serving dataset before serving data-backed routes."""
    if not getattr(request.app.state, "dataset_loaded", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Data service is unavailable because the serving dataset is not loaded.",
        )


def _require_forecast_runtime(request: Request) -> None:
    """Require both validated models and serving data in degraded mode."""
    _require_model_runtime(request)
    _require_dataset_runtime(request)


def _require_expensive_rate_limit(request: Request) -> None:
    """Limit expensive prediction and report generation per client address."""
    client_host = request.client.host if request.client else "unknown"
    key = f"expensive:{request.url.path}:{client_host}"
    if not redis_store.check_rate_limit(key, window_seconds=60, max_requests=30):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many expensive requests. Please retry after 60 seconds.",
            headers={"Retry-After": "60"},
        )


@api_router.post(
    "/predict/price",
    response_model=PricePredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Single-Day Price Prediction",
    description="Generates a single-day P10/P50/P90 price forecast with optional feature overrides.",
    tags=["Price Forecasting"],
    dependencies=[
        Depends(get_current_user),
        Depends(_require_forecast_runtime),
        Depends(_require_expensive_rate_limit),
    ]
)
def predict_price(req: PricePredictionRequest, request: Request) -> PricePredictionResponse:
    return predict_price_service(
        req=req,
        models=request.app.state.models,
        metadata=request.app.state.metadata,
        dataset=request.app.state.dataset
    )


@api_router.post(
    "/predict/forecast-7d",
    response_model=MultiDayForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Seven-Day Recursive Price Forecast",
    description="Backward-compatible alias for the unified multi-day forecast endpoint.",
    tags=["Price Forecasting"]
)
def predict_forecast_7d(req: MultiDayForecastRequest, request: Request) -> MultiDayForecastResponse:
    _require_forecast_runtime(request)
    model_version = getattr(request.app.state, "model_version", "unknown")
    data_watermark = dataset_watermark(request.app.state.dataset)
    cached = get_cached_forecast_7d(
        req.commodity,
        req.market,
        req.start_date,
        horizon_days=req.horizon_days,
        model_version=model_version,
        data_watermark=data_watermark,
    )
    if cached and cached.get("forecast_horizon_days") == req.horizon_days:
        return MultiDayForecastResponse(**cached)

    res = predict_7day_forecast_service(
        req=req,
        models=request.app.state.models,
        metadata=request.app.state.metadata,
        dataset=request.app.state.dataset
    )
    set_cached_forecast_7d(
        req.commodity,
        req.market,
        res.model_dump(),
        req.start_date,
        horizon_days=req.horizon_days,
        model_version=model_version,
        data_watermark=data_watermark,
    )
    return res


@api_router.post(
    "/predict/forecast",
    response_model=MultiDayForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Unified Multi-Day Price Forecast",
    description="Generates an autoregressive roll-forward price trajectory (1-14 days) with P10/P50/P90 uncertainty bounds and actionable advisory.",
    tags=["Price Forecasting"]
)
def predict_forecast(req: MultiDayForecastRequest, request: Request) -> MultiDayForecastResponse:
    _require_forecast_runtime(request)
    # Handle single-day vs multi-day via horizon_days parameter
    model_version = getattr(request.app.state, "model_version", "unknown")
    data_watermark = dataset_watermark(request.app.state.dataset)
    cached = get_cached_forecast_7d(
        req.commodity,
        req.market,
        req.start_date,
        horizon_days=req.horizon_days,
        model_version=model_version,
        data_watermark=data_watermark,
    )
    if cached and cached.get("forecast_horizon_days") == req.horizon_days:
        return MultiDayForecastResponse(**cached)

    res = predict_7day_forecast_service(
        req=req,
        models=request.app.state.models,
        metadata=request.app.state.metadata,
        dataset=request.app.state.dataset
    )
    set_cached_forecast_7d(
        req.commodity,
        req.market,
        res.model_dump(),
        req.start_date,
        horizon_days=req.horizon_days,
        model_version=model_version,
        data_watermark=data_watermark,
    )
    return res


@api_router.get(
    "/predict/forecast",
    response_model=MultiDayForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Unified Multi-Day Price Forecast (Query Params)",
    description="Generates a price trajectory via GET parameters.",
    tags=["Price Forecasting"]
)
def get_forecast(
    request: Request,
    commodity: str = Query("Potato", description="Commodity name"),
    market: str = Query("Agra", description="APMC mandi name"),
    date: Optional[str] = Query(None, description="Starting reference date (YYYY-MM-DD)"),
    horizon: int = Query(7, ge=1, le=14, description="Forecast horizon in days")
) -> MultiDayForecastResponse:
    _require_forecast_runtime(request)
    model_version = getattr(request.app.state, "model_version", "unknown")
    data_watermark = dataset_watermark(request.app.state.dataset)
    cached = get_cached_forecast_7d(
        commodity,
        market,
        date,
        horizon_days=horizon,
        model_version=model_version,
        data_watermark=data_watermark,
    )
    if cached and cached.get("forecast_horizon_days") == horizon:
        return MultiDayForecastResponse(**cached)

    req = MultiDayForecastRequest(commodity=commodity, market=market, start_date=date, horizon_days=horizon)
    res = predict_7day_forecast_service(
        req=req,
        models=request.app.state.models,
        metadata=request.app.state.metadata,
        dataset=request.app.state.dataset
    )
    set_cached_forecast_7d(
        commodity,
        market,
        res.model_dump(),
        date,
        horizon_days=horizon,
        model_version=model_version,
        data_watermark=data_watermark,
    )
    return res


@api_router.get(
    "/system/resources",
    response_model=SystemResourcesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Supported Commodities and Mandis",
    description="Returns the complete catalog of supported agricultural commodities and APMC mandi hubs dynamically.",
    tags=["System Operations"]
)
def get_system_resources() -> SystemResourcesResponse:
    # Mapping icons and varieties for a professional UI experience
    RESOURCE_METADATA = {
        "Potato": {"label": "🥔 Potato", "variety": "Desi"},
        "Onion": {"label": "🧅 Onion", "variety": "Red/Nashik"},
        "Tomato": {"label": "🍅 Tomato", "variety": "Hybrid"},
        "Wheat": {"label": "🌾 Wheat", "variety": "Dara/Sharbati"},
        "Paddy(Dhan)": {"label": "🌾 Paddy (Dhan)", "variety": "Basmati/Common"},
        "Maize": {"label": "🌽 Maize", "variety": "Yellow"},
        "Soyabean": {"label": "🌱 Soyabean", "variety": "Yellow"},
        "Mustard": {"label": "🌻 Mustard", "variety": "Black/Yellow"},
        "Gram(Chana)": {"label": "🥜 Gram (Chana)", "variety": "Desi"},
        "Chilli Red": {"label": "🌶️ Chilli Red", "variety": "Teja/Guntur"}
    }
    
    commodities = []
    for c in VALID_COMMODITIES:
        meta = RESOURCE_METADATA.get(c, {"label": c, "variety": "Common"})
        commodities.append({"id": c, "label": meta["label"], "variety": meta["variety"]})
        
    return {
        "status": "success",
        "commodities": commodities,
        "mandis": VALID_MARKETS
    }


@api_router.get(
    "/system/scheduler-status",
    status_code=status.HTTP_200_OK,
    summary="APScheduler Background Jobs & Cache Status",
    description="Returns telemetry on active recurring cron jobs, last/next execution times, and cache hit metrics.",
    tags=["System Operations"],
    dependencies=[Depends(require_system_operator)]
)
def get_system_scheduler_status() -> dict:
    return get_scheduler_status()


@api_router.post(
    "/system/trigger-sync",
    status_code=status.HTTP_200_OK,
    summary="Trigger On-Demand Mandi Sync & Cache Warming",
    description="Manually triggers live Agmarknet mandi sync, NASA weather sync, and prediction cache warming.",
    tags=["System Operations"],
    dependencies=[Depends(require_system_operator), Depends(verify_csrf)]
)
def trigger_system_sync(request: Request) -> dict:
    return trigger_manual_sync(request.app)


@api_router.get(
    "/predict/shocks",
    response_model=SupplyShockResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect potential supply shock anomalies",
    description="Uses Isolation Forest anomaly detection model to flag potential supply shocks or price crash risks across recent mandi arrival and price volatility records.",
    tags=["Supply Shock Detection"],
    dependencies=[
        Depends(get_current_user),
        Depends(_require_forecast_runtime),
        Depends(_require_expensive_rate_limit),
    ]
)
def detect_supply_shocks(
    request: Request,
    commodity: Optional[str] = Query(None, description="Optional commodity filter (Onion, Potato, Tomato)"),
    market: Optional[str] = Query(None, description="Optional APMC mandi filter"),
    days: int = Query(30, ge=1, le=365, description="Number of recent records to evaluate per market")
) -> SupplyShockResponse:
    return detect_supply_shocks_service(
        commodity=commodity,
        market=market,
        days=days,
        models=request.app.state.models,
        dataset=request.app.state.dataset
    )


@api_router.get(
    "/procurement/arbitrage",
    response_model=ArbitrageResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate spatial mandi price arbitrage opportunities",
    description="Calculates spatial wholesale modal price differences across APMC mandis to identify higher-margin selling market opportunities for farmers and procurement officers.",
    tags=["Procurement Arbitrage"],
    dependencies=[
        Depends(get_current_user),
        Depends(_require_dataset_runtime),
        Depends(_require_expensive_rate_limit),
    ]
)
def calculate_arbitrage(
    request: Request,
    commodity: str = Query("Tomato", description="Commodity name (Onion, Potato, Tomato)"),
    base_market: str = Query("Kolar", description="Source APMC mandi market"),
    date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD), defaults to latest available date")
) -> ArbitrageResponse:
    return calculate_arbitrage_service(
        commodity=commodity,
        base_market=base_market,
        date=date,
        dataset=request.app.state.dataset
    )


@api_router.get(
    "/analytics/trends",
    response_model=AnalyticsTrendResponse,
    status_code=status.HTTP_200_OK,
    summary="Get 30-day historical price trends and market analytics",
    description="Returns historical wholesale modal prices, mandi arrivals, 30-day rolling volatility, and trend direction for a given commodity and market.",
    tags=["Market Analytics"],
    dependencies=[
        Depends(get_current_user),
        Depends(_require_dataset_runtime),
        Depends(_require_expensive_rate_limit),
    ]
)
def get_analytics_trends(
    request: Request,
    commodity: str = Query("Tomato", description="Commodity name (Onion, Potato, Tomato)"),
    market: str = Query("Azadpur", description="APMC mandi market name"),
    days: int = Query(30, ge=7, le=180, description="Historical timeframe in days")
) -> AnalyticsTrendResponse:
    return get_analytics_trends_service(
        commodity=commodity,
        market=market,
        days=days,
        dataset=request.app.state.dataset
    )


@api_router.get(
    "/procurement/pdf",
    status_code=status.HTTP_200_OK,
    summary="Download Institutional Procurement PDF Advisory Brief",
    description="Generates a downloadable PDF report summarizing forecast risk bands, spatial arbitrage gradients, and supply shock alerts.",
    tags=["PDF Reports"],
    dependencies=[
        Depends(get_current_user),
        Depends(_require_forecast_runtime),
        Depends(_require_expensive_rate_limit),
    ]
)
def download_procurement_pdf(
    request: Request,
    commodity: str = Query("Potato", description="Commodity name"),
    market: str = Query("Agra", description="APMC Mandi name")
):
    from backend.app.schemas import PricePredictionRequest

    pred_req = PricePredictionRequest(commodity=commodity, market=market)
    pred_res = predict_price_service(
        req=pred_req,
        models=request.app.state.models,
        metadata=request.app.state.metadata,
        dataset=request.app.state.dataset,
    )
    p10_val = pred_res.p10_floor_price
    p50_val = pred_res.p50_median_price
    p90_val = pred_res.p90_ceiling_price

    arb_res = calculate_arbitrage_service(
        commodity=commodity,
        base_market=market,
        date=None,
        dataset=request.app.state.dataset,
    )
    arb_items = [item.model_dump() for item in arb_res.opportunities]
    decision = None

    pdf_bytes = generate_procurement_pdf(
        commodity=commodity,
        market=market,
        p10=p10_val,
        p50=p50_val,
        p90=p90_val,
        arbitrage_items=arb_items,
        decision=decision
    )
    safe_commodity = commodity.replace(" ", "_").replace("(", "").replace(")", "")
    safe_market = market.replace(" ", "_")
    filename = f"CropLens_Procurement_{safe_commodity}_{safe_market}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )
