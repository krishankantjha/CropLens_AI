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
    MultiDayForecastRequest, MultiDayForecastResponse, DailyForecastPoint,
    SupplyShockResponse, SupplyShockItem,
    ArbitrageResponse, ArbitrageOpportunityItem,
    AnalyticsTrendResponse, TrendPoint
)
from backend.app.services.data_resolver import DataResolver


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

    overrides = {
        'arrivals_in_qtl': req.arrivals_in_qtl,
        'rainfall_mm': req.rainfall_mm,
        'temp_max': req.temp_max
    }
    X_input, forecast_date = DataResolver.resolve_feature_vector(
        commodity=req.commodity,
        market=req.market,
        dataset=dataset,
        feature_cols=feature_cols,
        target_date=req.date,
        overrides={k: v for k, v in overrides.items() if v is not None}
    )

    # Run pre-loaded models
    raw_p10 = float(models['p10'].predict(X_input)[0])
    raw_p50 = float(models['p50'].predict(X_input)[0])
    raw_p90 = float(models['p90'].predict(X_input)[0])
    raw_predictions = np.array([raw_p10, raw_p50, raw_p90], dtype=float)
    if not np.isfinite(raw_predictions).all() or (raw_predictions < 0).any():
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Model returned invalid price predictions.')

    # Chernozhukov Monotonic Rearrangement (Econometrica 2010): sorting guarantees P10 <= P50 <= P90
    sorted_quantiles = sorted([raw_p10, raw_p50, raw_p90])
    p10_val, p50_val, p90_val = sorted_quantiles[0], sorted_quantiles[1], sorted_quantiles[2]

    calibration = metadata.get('metrics', {}).get('conformal_calibration_cqr', {})
    qconf_offset = float(calibration.get('cqr_offset_qconf_rs_qtl', 0.0) or 0.0)
    p10_val = max(0.0, p10_val - qconf_offset)
    p90_val = p90_val + qconf_offset
    p10_display = round(p10_val, 2)
    p50_display = round(p50_val, 2)
    p90_display = round(p90_val, 2)
    band_width = round(p90_display - p10_display, 2)

    return PricePredictionResponse(
        commodity=req.commodity,
        market=req.market,
        date=forecast_date,
        p10_floor_price=p10_display,
        p50_median_price=p50_display,
        p90_ceiling_price=p90_display,
        band_width=band_width,
        band_terminology="P10-P90 Quantile Forecast Band",
        model_version="LightGBM Multi-Quantile v1.0"
    )


def predict_7day_forecast_service(
    req: MultiDayForecastRequest,
    models: Dict[str, Any],
    metadata: Dict[str, Any],
    dataset: pd.DataFrame
) -> MultiDayForecastResponse:
    """
    Executes a 7-day recursive autoregressive roll-forward price forecasting loop (t+1 to t+7).
    Propagates predicted P50 prices into trailing lags, recalculates dynamic EMAs, channel width,
    and velocity, applies Chernozhukov rearrangement, and returns peak-day advisory.
    """
    feature_cols = metadata.get('feature_cols', [])
    if not feature_cols:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model metadata missing required 'feature_cols' definition."
        )

    # Filter historical dataset for commodity and market
    matched = DataResolver.get_market_data(dataset, req.commodity, req.market)

    # Resolve reference date
    if req.start_date:
        matched['date_str'] = matched['date'].dt.strftime('%Y-%m-%d')
        exact = matched[matched['date_str'] <= req.start_date]
        if not exact.empty:
            base_row = exact.iloc[-1].copy()
            start_dt = pd.to_datetime(exact.iloc[-1]['date'])
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='No historical row exists on or before the requested forecast start date.'
            )
    else:
        base_row = matched.iloc[-1].copy()
        start_dt = pd.to_datetime(matched.iloc[-1]['date'])

    current_price_value = base_row.get('modal_price', base_row.get('price_lag_1d'))
    if current_price_value is None or pd.isna(current_price_value) or not np.isfinite(float(current_price_value)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Historical current price is unavailable for the requested forecast.'
        )
    current_price = float(current_price_value)

    # Seed 35-day historical price sequence for autoregressive lag roll-forward
    if 'modal_price' not in matched.columns:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Historical modal prices are required for recursive forecasting.'
        )
    history_prices = list(matched['modal_price'].dropna().tail(35).values)
    if len(history_prices) < 28:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='At least 28 observed historical prices are required for recursive forecasting.'
        )

    DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    DAY_NAMES_HI = ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"]

    daily_forecasts: List[DailyForecastPoint] = []
    horizon = min(max(req.horizon_days, 1), 14)

    for k in range(1, horizon + 1):
        target_dt = start_dt + pd.Timedelta(days=k)
        
        # Unified dynamic feature calculation via DataResolver
        X_df = DataResolver.compute_dynamic_features(
            base_row=base_row.to_dict(),
            history_prices=history_prices,
            target_dt=target_dt,
            feature_cols=feature_cols
        )

        # Score multi-quantile LightGBM models
        p10_raw = float(models['p10'].predict(X_df)[0])
        p50_raw = float(models['p50'].predict(X_df)[0])
        p90_raw = float(models['p90'].predict(X_df)[0])
        raw_predictions = np.array([p10_raw, p50_raw, p90_raw], dtype=float)
        if not np.isfinite(raw_predictions).all() or (raw_predictions < 0).any():
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Model returned invalid recursive price predictions.')

        # Chernozhukov Monotonic Rearrangement (P10 <= P50 <= P90)
        sorted_q = sorted([p10_raw, p50_raw, p90_raw])
        p10_val, p50_val, p90_val = sorted_q[0], sorted_q[1], sorted_q[2]

        calibration = metadata.get('metrics', {}).get('conformal_calibration_cqr', {})
        qconf_offset = float(calibration.get('cqr_offset_qconf_rs_qtl', 0.0) or 0.0)
        p10_val = max(0.0, p10_val - qconf_offset)
        p90_val = p90_val + qconf_offset

        # Roll forward predicted P50 price into historical memory for step k+1
        history_prices.append(p50_val)

        target_date_str = target_dt.strftime('%Y-%m-%d')
        dow = target_dt.dayofweek

        daily_forecasts.append(DailyForecastPoint(
            day_index=k,
            date=target_date_str,
            day_name=DAY_NAMES[dow],
            day_name_hi=DAY_NAMES_HI[dow],
            price=round(p50_val, 2),
            p10_floor_price=round(p10_val, 2),
            p50_median_price=round(p50_val, 2),
            p90_ceiling_price=round(p90_val, 2),
            band_width=round(p90_val - p10_val, 2),
            height="70%",
            is_peak=False,
            type="normal"
        ))

    # Identify Peak Day and calculate relative chart heights
    all_prices = [f.price for f in daily_forecasts]
    peak_idx = int(np.argmax(all_prices))
    daily_forecasts[peak_idx].is_peak = True
    daily_forecasts[peak_idx].type = "peak"

    min_p = min(all_prices + [current_price])
    max_p = max(all_prices + [current_price])
    spread = max_p - min_p if (max_p - min_p) > 1.0 else 1.0

    for idx, pt in enumerate(daily_forecasts):
        if idx > 0 and pt.price < daily_forecasts[idx - 1].price:
            pt.type = "drop"
        rel_h = int(55 + ((pt.price - min_p) / spread) * 43)
        pt.height = f"{min(max(rel_h, 45), 98)}%"

    peak_day = daily_forecasts[peak_idx]
    gain = round(peak_day.price - current_price, 2)

    # Actionable Farmer Marketing Advisory Decision
    if gain > 50.0 and peak_day.day_index >= 2:
        decision = f"HOLD FOR {peak_day.day_index} DAYS"
        decision_hi = f"{peak_day.day_index} दिन रुकें और बेचें"
    elif gain <= 0.0 or peak_day.day_index <= 1:
        decision = "SELL TODAY / WITHIN 24 HOURS"
        decision_hi = "आज या 24 घंटे में बेचें"
    else:
        decision = f"SELL ON {peak_day.day_name.upper()}"
        decision_hi = f"{peak_day.day_name_hi} को बेचें"

    # Dynamic confidence score derived from uncertainty width relative to price
    avg_price = float(np.mean(all_prices))
    avg_band = float(np.mean([pt.band_width for pt in daily_forecasts]))
    dynamic_conf = max(70.0, min(98.5, round(100.0 * (1.0 - (avg_band / (2.0 * max(avg_price, 1.0)))), 1)))
    confidence_str = f"{dynamic_conf:.1f}%"

    return MultiDayForecastResponse(
        commodity=req.commodity,
        market=req.market,
        forecast_horizon_days=horizon,
        current_price=round(current_price, 2),
        forecasts=daily_forecasts,
        peak_day=peak_day,
        decision=decision,
        decision_hi=decision_hi,
        expected_gain=gain,
        confidence=confidence_str,
        model_version="7-Day Recursive Roll-Forward v1.0"
    )


def detect_supply_shocks_service(
    commodity: Optional[str],
    market: Optional[str],
    days: int,
    models: Dict[str, Any],
    dataset: pd.DataFrame
) -> SupplyShockResponse:
    """Uses Isolation Forest to detect potential supply shock anomalies across recent mandi records."""
    if commodity and market:
        df = DataResolver.get_market_data(dataset, commodity, market)
    else:
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

    # Filter last N days per commodity and market group
    df = df.sort_values('date').groupby(['commodity', 'market'], as_index=False).tail(days).reset_index(drop=True)

    shock_features = ['arrival_ratio', 'arrival_velocity_7d', 'price_volatility_30d', 'price_spread']
    for f in shock_features:
        if f not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Required supply shock feature '{f}' missing from dataset."
            )

    # Impute missing features with commodity median first, then global median
    comm_median = df.groupby('commodity')[shock_features].transform('median')
    global_median = dataset[shock_features].median(numeric_only=True)
    X_shock_df = df[shock_features].fillna(comm_median).fillna(global_median)
    if X_shock_df.isna().any().any() or not np.isfinite(X_shock_df.to_numpy(dtype=float)).all():
        missing_rows = int(X_shock_df.isna().any(axis=1).sum())
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'Insufficient historical data for supply-shock features in {missing_rows} row(s).'
        )
    X_shock = X_shock_df.to_numpy(dtype=float)

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

    # Ensure base market data exists
    DataResolver.get_market_data(dataset, commodity, base_market)

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

    df = DataResolver.get_market_data(dataset, commodity, market)

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
