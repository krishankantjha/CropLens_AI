"""
Baseline forecasting models for CropLens AI benchmark comparisons.
Implements the Naive Persistence (Random Walk) baseline and helper wrappers.
"""

import numpy as np
import pandas as pd
from typing import Dict, Tuple
from .metrics import calculate_point_metrics


def evaluate_naive_persistence(
    df: pd.DataFrame,
    test_year: int = 2025,
    target_col: str = 'modal_price',
    lag1_col: str = 'price_lag_1d'
) -> Tuple[Dict[str, float], pd.DataFrame, pd.DataFrame, np.ndarray, np.ndarray]:
    """Evaluates the Naive Random Walk / Persistence Baseline on the exact out-of-sample test set.
    
    Definition:
    prediction(t+1) = actual_price(t)
    
    In the feature dataset, price_lag_1d contains actual_price(t).
    
    Returns:
    - overall_metrics: Dictionary of MAE, RMSE, MAPE, sMAPE, R2, MASE
    - per_commodity_df: DataFrame of naive metrics per commodity
    - per_mandi_df: DataFrame of naive metrics per market
    - y_test: Array of actual target prices
    - y_naive: Array of persistence forecast prices
    """
    df_eval = df.copy()
    df_eval['date'] = pd.to_datetime(df_eval['date'])
    
    train_mask = df_eval['date'].dt.year <= 2023
    test_mask = df_eval['date'].dt.year == test_year
    
    test_df = df_eval.loc[test_mask].copy()
    train_y = df_eval.loc[train_mask, target_col].values
    
    # If lag1_col is present, use it. Otherwise, compute lag1 within (commodity, market) group
    if lag1_col in test_df.columns:
        y_naive = test_df[lag1_col].values
    else:
        grp = df_eval.groupby(['commodity', 'market'])
        df_eval['_lag1_calc'] = grp[target_col].shift(1)
        y_naive = df_eval.loc[test_mask, '_lag1_calc'].values

    y_test = test_df[target_col].values

    # Drop any rows where y_naive is NaN if present
    valid_mask = ~np.isnan(y_naive) & ~np.isnan(y_test)
    y_test_clean = y_test[valid_mask]
    y_naive_clean = y_naive[valid_mask]
    test_df_clean = test_df.loc[valid_mask].copy()
    test_df_clean['naive_pred'] = y_naive_clean

    overall_metrics = calculate_point_metrics(y_test_clean, y_naive_clean, train_y)

    # Per commodity breakdown
    comm_records = []
    for comm, group in test_df_clean.groupby('commodity'):
        c_true = group[target_col].values
        c_pred = group['naive_pred'].values
        m = calculate_point_metrics(c_true, c_pred)
        comm_records.append({
            'commodity': comm,
            'test_rows': len(group),
            'naive_mae_rs_qtl': m['MAE (Rs/qtl)'],
            'naive_rmse_rs_qtl': m['RMSE (Rs/qtl)'],
            'naive_mape_pct': m['MAPE (%)'],
            'naive_smape_pct': m['sMAPE (%)'],
            'naive_r2': m['R2']
        })
    per_commodity_df = pd.DataFrame(comm_records).sort_values('commodity').reset_index(drop=True)

    # Per mandi breakdown
    mandi_records = []
    for mkt, group in test_df_clean.groupby('market'):
        m_true = group[target_col].values
        m_pred = group['naive_pred'].values
        m = calculate_point_metrics(m_true, m_pred)
        mandi_records.append({
            'market': mkt,
            'test_rows': len(group),
            'naive_mae_rs_qtl': m['MAE (Rs/qtl)'],
            'naive_rmse_rs_qtl': m['RMSE (Rs/qtl)'],
            'naive_mape_pct': m['MAPE (%)'],
            'naive_smape_pct': m['sMAPE (%)'],
            'naive_r2': m['R2']
        })
    per_mandi_df = pd.DataFrame(mandi_records).sort_values('market').reset_index(drop=True)

    return overall_metrics, per_commodity_df, per_mandi_df, y_test_clean, y_naive_clean


def compute_improvement_percentage(naive_metric: float, model_metric: float, metric_type: str = 'error') -> float:
    """Calculates percentage improvement of a model over the naive baseline.
    For error metrics (MAE, RMSE, MAPE): improvement = ((naive - model) / naive) * 100
    For R2: improvement = model - naive
    """
    if metric_type == 'r2':
        return round(float(model_metric - naive_metric), 4)
    
    if abs(naive_metric) < 1e-6:
        return 0.0
    improvement = ((naive_metric - model_metric) / naive_metric) * 100.0
    return round(float(improvement), 2)
