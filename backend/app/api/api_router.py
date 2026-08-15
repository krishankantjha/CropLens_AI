"""
FastAPI Router module defining API v1 endpoints for CropLens AI.
Exposes price prediction, supply shock anomaly alerts, spatial mandi arbitrage, market trend analytics, and PDF procurement reports.
"""

from typing import Optional
from fastapi import APIRouter, Request, Query, status, Response

from backend.app.schemas import (
    PricePredictionRequest, PricePredictionResponse,
    MultiDayForecastRequest, MultiDayForecastResponse,
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
    get_cached_price,
    set_cached_price
)
from backend.app.services.pdf_generator import generate_procurement_pdf

from backend.app.api.auth_router import auth_router
from backend.app.api.alerts_router import alerts_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(alerts_router)


@api_router.post(
    "/predict/price",
    response_model=PricePredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict wholesale mandi price (P10, P50, P90)",
    description="Predicts expected wholesale modal price (P50), lower risk floor (P10), and upper stress ceiling (P90) using pre-loaded LightGBM quantile models.",
    tags=["Price Forecasting"]
)
def predict_price(req: PricePredictionRequest, request: Request) -> PricePredictionResponse:
    # Sub-2ms cache check for standard queries without custom overrides
    if not req.arrivals_in_qtl and not req.rainfall_mm and not req.temp_max:
        cached = get_cached_price(req.commodity, req.market, req.date)
        if cached:
            return PricePredictionResponse(**cached)

    res = predict_price_service(
        req=req,
        models=request.app.state.models,
        metadata=request.app.state.metadata,
        dataset=request.app.state.dataset
    )
    set_cached_price(req.commodity, req.market, res.model_dump(), req.date)
    return res


@api_router.post(
    "/predict/forecast-7d",
    response_model=MultiDayForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="7-Day Recursive Multi-Day Price Forecast",
    description="Generates an autoregressive roll-forward 7-day price trajectory with P10/P50/P90 uncertainty bounds and peak-day selling advisory.",
    tags=["Price Forecasting"]
)
def predict_7day_forecast(req: MultiDayForecastRequest, request: Request) -> MultiDayForecastResponse:
    cached = get_cached_forecast_7d(req.commodity, req.market, req.start_date)
    if cached and cached.get("forecast_horizon_days") == req.horizon_days:
        return MultiDayForecastResponse(**cached)

    res = predict_7day_forecast_service(
        req=req,
        models=request.app.state.models,
        metadata=request.app.state.metadata,
        dataset=request.app.state.dataset
    )
    set_cached_forecast_7d(req.commodity, req.market, res.model_dump(), req.start_date)
    return res


@api_router.get(
    "/predict/forecast-7d",
    response_model=MultiDayForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="7-Day Recursive Multi-Day Price Forecast (Query Params)",
    description="Generates an autoregressive roll-forward 7-day price trajectory via GET parameters.",
    tags=["Price Forecasting"]
)
def get_7day_forecast(
    request: Request,
    commodity: str = Query("Potato", description="Commodity name"),
    market: str = Query("Agra", description="APMC mandi name"),
    date: Optional[str] = Query(None, description="Starting reference date (YYYY-MM-DD)")
) -> MultiDayForecastResponse:
    cached = get_cached_forecast_7d(commodity, market, date)
    if cached:
        return MultiDayForecastResponse(**cached)

    req = MultiDayForecastRequest(commodity=commodity, market=market, start_date=date, horizon_days=7)
    res = predict_7day_forecast_service(
        req=req,
        models=request.app.state.models,
        metadata=request.app.state.metadata,
        dataset=request.app.state.dataset
    )
    set_cached_forecast_7d(commodity, market, res.model_dump(), date)
    return res


@api_router.get(
    "/system/scheduler-status",
    status_code=status.HTTP_200_OK,
    summary="APScheduler Background Jobs & Cache Status",
    description="Returns telemetry on active recurring cron jobs, last/next execution times, and cache hit metrics.",
    tags=["System Operations"]
)
def get_system_scheduler_status() -> dict:
    return get_scheduler_status()


@api_router.post(
    "/system/trigger-sync",
    status_code=status.HTTP_200_OK,
    summary="Trigger On-Demand Mandi Sync & Cache Warming",
    description="Manually triggers live Agmarknet mandi sync, NASA weather sync, and prediction cache warming.",
    tags=["System Operations"]
)
def trigger_system_sync(request: Request) -> dict:
    return trigger_manual_sync(request.app)


@api_router.get(
    "/predict/shocks",
    response_model=SupplyShockResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect potential supply shock anomalies",
    description="Uses Isolation Forest anomaly detection model to flag potential supply shocks or price crash risks across recent mandi arrival and price volatility records.",
    tags=["Supply Shock Detection"]
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
    tags=["Procurement Arbitrage"]
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
    tags=["Market Analytics"]
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
    tags=["PDF Reports"]
)
def download_procurement_pdf(
    commodity: str = Query("Potato", description="Commodity name"),
    market: str = Query("Agra", description="APMC Mandi name")
):
    pdf_bytes = generate_procurement_pdf(commodity=commodity, market=market)
    filename = f"CropLens_Procurement_{commodity}_{market}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
