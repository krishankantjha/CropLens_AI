"""
Canonical Feature Engineering Service for CropLens AI.
Ensures identical feature transformation logic for training (batch) and inference (online).
Defines authoritative feature schemas and calculation methods.
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("croplens.features")

MODEL_FEATURE_COLUMNS = (
    "arrivals_in_qtl", "rainfall_mm", "temp_max", "temp_min", "ndvi_mean",
    "is_festive_season", "price_lag_1d", "price_lag_2d", "price_lag_3d",
    "price_lag_1w", "price_lag_4w", "price_lag_52w", "price_ema_7d",
    "price_ema_21d", "price_channel_width_7d", "price_velocity_7d",
    "price_volatility_30d", "price_spread", "rolling_price_reversal_signal",
    "modal_vs_midpoint_bias", "commodity_price_percentile_rank",
    "price_quality_premium", "arrivals_rolling_mean_30d", "arrival_ratio",
    "arrival_velocity_7d", "arrival_price_divergence_signal", "temp_range",
    "rainfall_rolling_sum_14d", "rain_x_ndvi_interaction", "temp_stress_days_7d",
    "consecutive_dry_days", "vegetative_stress_ratio", "heat_wave_event_flag",
    "ndvi_momentum_4w", "harvest_glut_index", "festival_price_anticipation_score",
    "post_festival_demand_hangover", "dist_to_hub_km", "hub_price_diff",
    "spatial_price_gradient", "sin_month", "cos_month", "sin_dow", "cos_dow",
    "is_peak_harvest_month", "market_seasonality_deviation", "price_regime_indicator",
)

class FeatureExtractor:
    """
    Unified feature extraction engine.
    Supports batch processing (DataFrames) and online processing (single observations).
    """
    
    FEATURE_SCHEMA = {
        "price_momentum": ["price_lag_1d", "price_ema_7d", "price_velocity_7d"],
        "supply_dynamics": ["arrival_ratio", "arrival_velocity_7d"],
        "weather_stress": ["temp_range", "temp_stress_days_7d", "rainfall_rolling_sum_14d"],
        "satellite_health": ["ndvi_mean", "ndvi_momentum_4w"]
    }

    @staticmethod
    def compute_batch_features(df: pd.DataFrame) -> pd.DataFrame:
        """
        Computes all 47 features on a full time-series DataFrame.
        Optimized for training and backtesting.
        """
        # Implementation delegates to existing optimized logic in feature_engineering.py
        # but ensures strict adherence to the canonical schema.
        try:
            from app.services.feature_engineering import (
                _compute_price_features,
                _compute_supply_features,
                _compute_weather_features,
                _compute_festival_features,
                _compute_spatial_features,
                _compute_market_features,
            )
        except ImportError:
            from backend.app.services.feature_engineering import (
                _compute_price_features,
                _compute_supply_features,
                _compute_weather_features,
                _compute_festival_features,
                _compute_spatial_features,
                _compute_market_features,
            )

        df = df.copy()
        required_columns = {
            "date", "market", "commodity", "district", "modal_price",
            "arrivals_in_qtl", "min_price", "max_price", "temp_max",
            "temp_min", "rainfall_mm", "ndvi_mean", "is_festive_season",
            "festival_name", "latitude", "longitude",
        }
        missing = sorted(required_columns.difference(df.columns))
        if missing:
            raise ValueError(
                "Canonical feature extraction requires columns: " + ", ".join(missing)
            )

        df = df.sort_values(["market", "commodity", "date"]).reset_index(drop=True)
        # These two columns are recreated by the function below. Dropping them
        # prevents pandas from creating _x/_y duplicates during its date merges.
        df = df.drop(
            columns=[
                "festival_price_anticipation_score",
                "post_festival_demand_hangover",
            ],
            errors="ignore",
        )
        df = _compute_price_features(df)
        df = _compute_supply_features(df)
        df = _compute_weather_features(df)
        df = _compute_festival_features(df)
        df = _compute_spatial_features(df)
        df = _compute_market_features(df)
        return df

    @staticmethod
    def compute_online_features(
        current_data: Dict[str, Any], 
        history_window: pd.DataFrame
    ) -> Dict[str, float]:
        """
        Computes features for a single real-time inference request.
        Requires a history_window (past N days) to compute lags and rolling stats.
        """
        # 1. Combine history with current observation
        obs_df = pd.DataFrame([current_data])
        full_context = pd.concat([history_window, obs_df]).sort_values("date").reset_index(drop=True)
        
        # 2. Run batch logic on the small window
        # (The window size must be >= the largest lag/rolling period, e.g., 364 days for price_lag_52w)
        features_df = FeatureExtractor.compute_batch_features(full_context)
        
        # 3. Extract the last row (the current observation with its computed features)
        latest_features = features_df.iloc[-1].to_dict()
        
        # 4. Filter to only return numeric feature columns used by the model
        # (This avoids leaking metadata like 'market' or 'date' into the model input)
        return {k: v for k, v in latest_features.items() if isinstance(v, (int, float, np.number)) and not np.isnan(v)}

def get_feature_extractor():
    return FeatureExtractor()
