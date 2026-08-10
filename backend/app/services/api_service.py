"""
Service module containing core business and machine learning inference logic for CropLens AI endpoints.
Decouples route handlers from feature extraction, model scoring, spatial price gradient calculations, and analytics.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status

from backend.app.schemas import (
    PricePredictionRequest, PricePredictionResponse,
    SupplyShockResponse, SupplyShockItem,
    ArbitrageResponse, ArbitrageOpportunityItem,
    AnalyticsTrendResponse, TrendPoint
)


def get_feature_vector(
    req: PricePredictionRequest,
    dataset: pd.DataFrame,
    feature_cols: List[str]
) -> tuple[pd.DataFrame, str]:
    """
    Extracts and prepares a single-row feature DataFrame matching the exact 39 features required by Phase 3 ML models.
    Resolves historical context from master dataset and applies optional user overrides.
    """
    # Filter dataset for commodity and market
    matched = dataset[(dataset['commodity'] == req.commodity) & (dataset['market'] == req.market)]
    if matched.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical market records found for commodity '{req.commodity}' in market '{req.market}'."
        )

    # Date resolution
    if req.date:
        matched['date_str'] = matched['date'].dt.strftime('%Y-%m-%d')
        exact = matched[matched['date_str'] == req.date]
        if not exact.empty:
            target_row = exact.iloc[-1].copy()
            forecast_date = req.date
        else:
            # Fallback to latest row and update date features
            target_row = matched.iloc[-1].copy()
            forecast_date = req.date
            try:
                dt_val = pd.to_datetime(req.date)
                target_row['sin_month'] = np.sin(2 * np.pi * dt_val.month / 12)
                target_row['cos_month'] = np.cos(2 * np.pi * dt_val.month / 12)
            except Exception:
                pass
    else:
        target_row = matched.iloc[-1].copy()
        forecast_date = target_row['date'].strftime('%Y-%m-%d')

    # Apply user feature overrides if supplied
    if req.arrivals_in_qtl is not None:
        target_row['arrivals_in_qtl'] = req.arrivals_in_qtl
    if req.rainfall_mm is not None:
        target_row['rainfall_mm'] = req.rainfall_mm
    if req.temp_max is not None:
        target_row['temp_max'] = req.temp_max

    # Construct single-row DataFrame with exact feature columns in order
    X_single = pd.DataFrame([target_row[feature_cols].to_dict()], columns=feature_cols)

    # Impute any missing numeric values with median
    X_single = X_single.fillna(dataset[feature_cols].median())

    return X_single, forecast_date


def predict_price_service(
    req: PricePredictionRequest,
    models: Dict[str, Any],
    metadata: Dict[str, Any],
    dataset: pd.DataFrame
) -> PricePredictionResponse:
    """Predicts wholesale modal prices (P10, P50, P90) using pre-loaded LightGBM quantile models."""
    feature_cols = metadata.get('feature_cols', [])
    if not feature_cols:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model metadata missing required 'feature_cols' definition."
        )

    X_input, forecast_date = get_feature_vector(req, dataset, feature_cols)

    # Run pre-loaded models
    p10_val = float(models['p10'].predict(X_input)[0])
    p50_val = float(models['p50'].predict(X_input)[0])
    p90_val = float(models['p90'].predict(X_input)[0])

    # Ensure monotonic ordering (P10 <= P50 <= P90)
    p10_val = min(p10_val, p50_val)
    p90_val = max(p90_val, p50_val)

    band_width = round(p90_val - p10_val, 2)

    return PricePredictionResponse(
        commodity=req.commodity,
        market=req.market,
        date=forecast_date,
        p10_floor_price=round(p10_val, 2),
        p50_median_price=round(p50_val, 2),
        p90_ceiling_price=round(p90_val, 2),
        band_width=band_width,
        band_terminology="P10-P90 Quantile Forecast Band",
        model_version="LightGBM Multi-Quantile v1.0"
    )


def detect_supply_shocks_service(
    commodity: Optional[str],
    market: Optional[str],
    days: int,
    models: Dict[str, Any],
    dataset: pd.DataFrame
) -> SupplyShockResponse:
    """Uses Isolation Forest to detect potential supply shock anomalies across recent mandi records."""
    df = dataset.copy()
    if commodity:
        df = df[df['commodity'].str.title() == commodity.strip().title()]
    if market:
        df = df[df['market'].str.title() == market.strip().title()]

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No market data records match the requested commodity or market filters."
        )

    # Filter last N days of available data
    df = df.sort_values('date').tail(days * len(df['market'].unique()))

    shock_features = ['arrival_ratio', 'arrival_velocity_7d', 'price_volatility_30d', 'price_spread']
    for f in shock_features:
        if f not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Required supply shock feature '{f}' missing from dataset."
            )

    X_shock = df[shock_features].fillna(dataset[shock_features].median()).values

    iso_model = models['isolation_forest']
    scores = iso_model.decision_function(X_shock)
    preds = iso_model.predict(X_shock)  # -1 for anomaly, 1 for normal

    anomalies: List[SupplyShockItem] = []
    for idx, (_, row) in enumerate(df.iterrows()):
        is_anom = bool(preds[idx] == -1)
        score = float(scores[idx])
        date_str = row['date'].strftime('%Y-%m-%d')

        if is_anom:
            arr_ratio = float(row.get('arrival_ratio', 1.0))
            p_vel = float(row.get('price_velocity_7d', 0.0))
            status_msg = "Potential Supply Shock / Anomaly"
            desc_msg = f"Potential supply shock detected on {date_str} (Arrival ratio: {arr_ratio:.2f}, Price velocity: {p_vel:.2f} Rs/qtl/day)."
        else:
            arr_ratio = float(row.get('arrival_ratio', 1.0))
            p_vel = float(row.get('price_velocity_7d', 0.0))
            status_msg = "Normal Market Condition"
            desc_msg = "Market operating within normal supply and volatility boundaries."

        anomalies.append(SupplyShockItem(
            commodity=str(row['commodity']),
            market=str(row['market']),
            date=date_str,
            anomaly_status=status_msg,
            is_anomaly=is_anom,
            anomaly_score=round(score, 4),
            arrival_ratio=round(arr_ratio, 2),
            price_velocity_7d=round(p_vel, 2),
            message=desc_msg
        ))

    total_anomalies = sum(1 for a in anomalies if a.is_anomaly)

    return SupplyShockResponse(
        total_records_analyzed=len(anomalies),
        total_anomalies_detected=total_anomalies,
        anomalies=anomalies
    )


def calculate_arbitrage_service(
    commodity: str,
    base_market: str,
    date: Optional[str],
    dataset: pd.DataFrame
) -> ArbitrageResponse:
    """Calculates spatial wholesale mandi price gradients to identify potential selling market opportunities."""
    c_title = commodity.strip().title()
    m_title = base_market.strip().title()

    df = dataset[dataset['commodity'] == c_title].copy()
    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No dataset records found for commodity '{c_title}'."
        )

    if date:
        df['date_str'] = df['date'].dt.strftime('%Y-%m-%d')
        date_matched = df[df['date_str'] == date]
        if not date_matched.empty:
            working_df = date_matched
            target_date = date
        else:
            latest_dt = df['date'].max()
            working_df = df[df['date'] == latest_dt]
            target_date = latest_dt.strftime('%Y-%m-%d')
    else:
        latest_dt = df['date'].max()
        working_df = df[df['date'] == latest_dt]
        target_date = latest_dt.strftime('%Y-%m-%d')

    base_row = working_df[working_df['market'] == m_title]
    if base_row.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base market '{m_title}' not found in active records for {c_title} on date {target_date}."
        )

    base_price = float(base_row.iloc[-1]['modal_price'])

    opportunities: List[ArbitrageOpportunityItem] = []
    other_markets = working_df[working_df['market'] != m_title]

    for _, row in other_markets.iterrows():
        dest_market = str(row['market'])
        dest_price = float(row['modal_price'])
        diff = round(dest_price - base_price, 2)
        pct = round((diff / base_price) * 100, 2) if base_price > 0 else 0.0

        if diff > 0:
            rec = f"Potential selling opportunity: Transporting from {m_title} to {dest_market} offers +Rs {diff:.2f}/qtl gross margin ({pct:+.1f}%)."
        else:
            rec = f"No arbitrage advantage: {dest_market} price is Rs {abs(diff):.2f}/qtl lower than {m_title}."

        opportunities.append(ArbitrageOpportunityItem(
            commodity=c_title,
            source_market=m_title,
            destination_market=dest_market,
            source_price=round(base_price, 2),
            destination_price=round(dest_price, 2),
            gross_price_difference=diff,
            price_gradient_percentage=pct,
            recommendation=rec
        ))

    # Sort opportunities by highest gross price difference
    opportunities.sort(key=lambda x: x.gross_price_difference, reverse=True)

    return ArbitrageResponse(
        commodity=c_title,
        base_market=m_title,
        date=target_date,
        opportunities=opportunities,
        disclaimer="Potential price opportunity based on wholesale modal price gradients. Does not account for individual transport, loading, or commission fees."
    )


def get_analytics_trends_service(
    commodity: str,
    market: str,
    days: int,
    dataset: pd.DataFrame
) -> AnalyticsTrendResponse:
    """Calculates 30-day historical wholesale price trend metrics, rolling volatility, and price direction."""
    c_title = commodity.strip().title()
    m_title = market.strip().title()

    df = dataset[(dataset['commodity'] == c_title) & (dataset['market'] == m_title)].copy()
    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No dataset records found for commodity '{c_title}' in market '{m_title}'."
        )

    df = df.sort_values('date').tail(days)

    prices = df['modal_price'].values
    min_p = float(np.min(prices))
    max_p = float(np.max(prices))
    avg_p = float(np.mean(prices))
    volatility = float(np.std(prices))

    first_price = float(prices[0])
    last_price = float(prices[-1])
    price_change_pct = ((last_price - first_price) / first_price) * 100 if first_price > 0 else 0.0

    if price_change_pct > 2.0:
        direction = "Upward"
    elif price_change_pct < -2.0:
        direction = "Downward"
    else:
        direction = "Stable"

    trend_points: List[TrendPoint] = []
    for _, row in df.iterrows():
        trend_points.append(TrendPoint(
            date=row['date'].strftime('%Y-%m-%d'),
            modal_price=round(float(row['modal_price']), 2),
            arrivals_in_qtl=round(float(row['arrivals_in_qtl']), 2)
        ))

    return AnalyticsTrendResponse(
        commodity=c_title,
        market=m_title,
        timeframe_days=days if len(df) >= days else len(df),
        min_price=round(min_p, 2),
        max_price=round(max_p, 2),
        avg_price=round(avg_p, 2),
        price_volatility_30d=round(volatility, 2),
        price_trend_direction=direction,
        historical_points=trend_points
    )
