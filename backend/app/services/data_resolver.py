"""
DataResolver Service - Centralized data filtering and feature engineering for CropLens AI.
Unifies data access across forecasting, arbitrage, and analytics services.
"""

import numpy as np
import pandas as pd
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status

class DataResolver:
    @staticmethod
    def get_market_data(
        dataset: pd.DataFrame, 
        commodity: str, 
        market: str
    ) -> pd.DataFrame:
        """Filters and sorts dataset for a specific commodity and market."""
        matched = dataset[
            (dataset['commodity'].str.lower() == commodity.lower()) & 
            (dataset['market'].str.lower() == market.lower())
        ].copy()
        
        if matched.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No historical market records found for commodity '{commodity}' in market '{market}'."
            )
        
        return matched.sort_values('date')

    @staticmethod
    def resolve_feature_vector(
        commodity: str,
        market: str,
        dataset: pd.DataFrame,
        feature_cols: List[str],
        target_date: Optional[str] = None,
        overrides: Optional[Dict[str, float]] = None
    ) -> Tuple[pd.DataFrame, str]:
        """
        Extracts and prepares a single-row feature DataFrame.
        Handles date resolution, seasonality features, and user overrides.
        """
        matched = DataResolver.get_market_data(dataset, commodity, market)
        
        # Date resolution
        if target_date:
            matched['date_str'] = matched['date'].dt.strftime('%Y-%m-%d')
            exact = matched[matched['date_str'] == target_date]
            if not exact.empty:
                target_row = exact.iloc[-1].copy()
                forecast_date = target_date
            else:
                # Fallback to latest row and update calendar date features for requested future date
                target_row = matched.iloc[-1].copy()
                forecast_date = target_date
                try:
                    dt_val = pd.to_datetime(target_date)
                    target_row['sin_month'] = float(np.sin(2 * np.pi * dt_val.month / 12.0))
                    target_row['cos_month'] = float(np.cos(2 * np.pi * dt_val.month / 12.0))
                    target_row['sin_dow'] = float(np.sin(2 * np.pi * dt_val.dayofweek / 7.0))
                    target_row['cos_dow'] = float(np.cos(2 * np.pi * dt_val.dayofweek / 7.0))
                except Exception:
                    pass
        else:
            target_row = matched.iloc[-1].copy()
            forecast_date = target_row['date'].strftime('%Y-%m-%d')

        # Apply overrides
        if overrides:
            for key, val in overrides.items():
                if key in target_row:
                    target_row[key] = float(val)

        # Construct single-row DataFrame
        X_single = pd.DataFrame([target_row[feature_cols].to_dict()], columns=feature_cols)

        # Impute missing values
        comm_median = matched[feature_cols].median(numeric_only=True)
        global_median = dataset[feature_cols].median(numeric_only=True)
        X_single = X_single.fillna(comm_median).fillna(global_median).fillna(0.0)

        return X_single, forecast_date

    @staticmethod
    def compute_dynamic_features(
        base_row: Dict[str, Any],
        history_prices: List[float],
        target_dt: pd.Timestamp,
        feature_cols: List[str]
    ) -> pd.DataFrame:
        """
        Updates a feature row with recursive autoregressive features (lags, EMAs, volatility).
        Used primarily for multi-day recursive forecasting.
        """
        row = base_row.copy()
        k = (target_dt - pd.to_datetime(base_row.get('date', target_dt))).days
        dow = target_dt.dayofweek

        # 1. Seasonality
        row['sin_month'] = float(np.sin(2 * np.pi * target_dt.month / 12.0))
        row['cos_month'] = float(np.cos(2 * np.pi * target_dt.month / 12.0))
        row['sin_dow'] = float(np.sin(2 * np.pi * dow / 7.0))
        row['cos_dow'] = float(np.cos(2 * np.pi * dow / 7.0))

        # 2. Weather Dissipation (Mocking persistence/decay)
        if 'temp_max' in row:
            row['temp_max'] = round(float(row['temp_max']) + 1.2 * np.sin(2 * np.pi * k / 7.0), 2)
        if 'rainfall_mm' in row:
            row['rainfall_mm'] = max(0.0, round(float(row['rainfall_mm']) * (0.7 ** k), 2))

        # 3. Autoregressive Lags
        price_lags = {
            'price_lag_1d': -1, 'price_lag_2d': -2, 'price_lag_3d': -3,
            'price_lag_1w': -7, 'price_lag_4w': -28
        }
        for col, idx in price_lags.items():
            if col in feature_cols:
                row[col] = float(history_prices[idx]) if len(history_prices) >= abs(idx) else float(history_prices[0])

        # 4. Technical Indicators (EMAs, Channel, Volatility)
        if 'price_ema_7d' in feature_cols:
            row['price_ema_7d'] = float(pd.Series(history_prices[-14:]).ewm(span=7, adjust=False).mean().iloc[-1])
        if 'price_ema_21d' in feature_cols:
            row['price_ema_21d'] = float(pd.Series(history_prices[-30:]).ewm(span=21, adjust=False).mean().iloc[-1])
        
        if 'price_channel_width_7d' in feature_cols:
            p_slice7 = history_prices[-7:]
            row['price_channel_width_7d'] = float(np.max(p_slice7) - np.min(p_slice7))
        
        if 'price_velocity_7d' in feature_cols:
            row['price_velocity_7d'] = float((history_prices[-1] - history_prices[-7]) / 7.0) if len(history_prices) >= 7 else 0.0
            
        if 'price_volatility_30d' in feature_cols:
            p_slice30 = history_prices[-30:] if len(history_prices) >= 30 else history_prices
            row['price_volatility_30d'] = float(np.std(p_slice30))

        if 'price_regime_indicator' in feature_cols:
            ema7 = float(pd.Series(history_prices[-14:]).ewm(span=7, adjust=False).mean().iloc[-1])
            ema21 = float(pd.Series(history_prices[-30:]).ewm(span=21, adjust=False).mean().iloc[-1])
            row['price_regime_indicator'] = 1.0 if ema7 > ema21 else 0.0

        # Construct final row
        X_df = pd.DataFrame([{col: row.get(col, 0.0) for col in feature_cols}], columns=feature_cols)
        return X_df.fillna(0.0)
