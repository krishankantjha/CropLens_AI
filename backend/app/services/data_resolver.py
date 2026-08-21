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
