"""
Unified metric definitions and statistical hypothesis testing for CropLens AI.
All evaluation scripts must use these functions to guarantee consistency across models and splits.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.regression.linear_model import OLS
from statsmodels.stats.diagnostic import acorr_ljungbox


def calculate_point_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_train: Optional[np.ndarray] = None
) -> Dict[str, float]:
    """Calculates point forecast evaluation metrics.
    
    Metrics:
    - MAE: Mean Absolute Error (Rs/qtl)
    - RMSE: Root Mean Squared Error (Rs/qtl)
    - MAPE: Mean Absolute Percentage Error (%)
    - sMAPE: Symmetric Mean Absolute Percentage Error (%)
    - R2: Coefficient of Determination
    - MASE: Mean Absolute Scaled Error (relative to in-sample naive persistence)
    """
    y_t = np.asarray(y_true, dtype=np.float64).ravel()
    y_p = np.asarray(y_pred, dtype=np.float64).ravel()
    if len(y_t) != len(y_p) or len(y_t) == 0:
        raise ValueError('y_true and y_pred must be non-empty arrays of equal length.')
    if not np.isfinite(y_t).all() or not np.isfinite(y_p).all():
        raise ValueError('y_true and y_pred must contain only finite values.')

    mae = float(mean_absolute_error(y_t, y_p))
    rmse = float(np.sqrt(mean_squared_error(y_t, y_p)))
    
    # Avoid zero division in MAPE
    denom = np.where(np.abs(y_t) < 1e-6, 1e-6, np.abs(y_t))
    mape = float(np.mean(np.abs((y_t - y_p) / denom)) * 100.0)

    # sMAPE
    smape_denom = np.abs(y_t) + np.abs(y_p) + 1e-6
    smape = float(np.mean(200.0 * np.abs(y_t - y_p) / smape_denom))

    r2 = float(r2_score(y_t, y_p))

    # MASE
    if y_train is not None and len(y_train) > 1:
        naive_train_mae = float(np.mean(np.abs(np.diff(y_train))))
        mase = float(mae / naive_train_mae) if naive_train_mae > 0 else 1.0
    else:
        mase = 1.0

    return {
        'MAE (Rs/qtl)': round(mae, 2),
        'RMSE (Rs/qtl)': round(rmse, 2),
        'MAPE (%)': round(mape, 2),
        'sMAPE (%)': round(smape, 2),
        'R2': round(r2, 4),
        'MASE': round(mase, 3)
    }


def calculate_mase(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_train: np.ndarray,
    train_groups: Optional[np.ndarray] = None,
) -> float:
    """Calculates MASE using within-series naive differences for panel data."""
    y_t = np.asarray(y_true, dtype=np.float64).ravel()
    y_p = np.asarray(y_pred, dtype=np.float64).ravel()
    if len(y_t) != len(y_p) or len(y_t) == 0:
        raise ValueError('y_true and y_pred must be non-empty arrays of equal length.')
    mae = float(mean_absolute_error(y_t, y_p))
    train_values = np.asarray(y_train, dtype=np.float64).ravel()
    if train_groups is None:
        scales = [float(np.mean(np.abs(np.diff(train_values))))] if len(train_values) > 1 else []
    else:
        groups = np.asarray(train_groups)
        if len(groups) != len(train_values):
            raise ValueError('train_groups must align with y_train.')
        scales = []
        for group in np.unique(groups):
            values = train_values[groups == group]
            if len(values) > 1:
                scales.append(float(np.mean(np.abs(np.diff(values)))))
    valid_scales = [scale for scale in scales if np.isfinite(scale) and scale > 0]
    train_diff = float(np.mean(valid_scales)) if valid_scales else 1.0
    return float(mae / train_diff) if train_diff > 0 else 1.0


def calculate_pinball_loss(y_true: np.ndarray, y_pred: np.ndarray, alpha: float) -> float:
    """Calculates pinball (quantile check) loss for quantile alpha."""
    err = np.asarray(y_true, dtype=np.float64) - np.asarray(y_pred, dtype=np.float64)
    return float(np.mean(np.maximum(alpha * err, (alpha - 1.0) * err)))


def calculate_quantile_metrics(
    y_true: np.ndarray,
    p10_pred: np.ndarray,
    p50_pred: np.ndarray,
    p90_pred: np.ndarray
) -> Dict[str, Any]:
    """Calculates pinball losses, empirical interval coverage, and mean interval width (MPIW)."""
    y_t = np.asarray(y_true, dtype=np.float64).ravel()
    p10 = np.asarray(p10_pred, dtype=np.float64).ravel()
    p50 = np.asarray(p50_pred, dtype=np.float64).ravel()
    p90 = np.asarray(p90_pred, dtype=np.float64).ravel()
    if not (len(y_t) == len(p10) == len(p50) == len(p90)) or len(y_t) == 0:
        raise ValueError('Quantile arrays must be non-empty and have equal length.')
    if not all(np.isfinite(values).all() for values in (y_t, p10, p50, p90)):
        raise ValueError('Quantile evaluation arrays must contain only finite values.')
    if np.any(p10 > p50) or np.any(p50 > p90):
        raise ValueError('Quantile predictions must satisfy P10 <= P50 <= P90.')

    p10_loss = calculate_pinball_loss(y_t, p10, 0.10)
    p50_loss = calculate_pinball_loss(y_t, p50, 0.50)
    p90_loss = calculate_pinball_loss(y_t, p90, 0.90)

    # Coverage: Actual falls within [P10, P90]
    in_interval = (y_t >= p10) & (y_t <= p90)
    coverage_pct = float(np.mean(in_interval) * 100.0)

    # Mean Prediction Interval Width (MPIW)
    mpiw = float(np.mean(p90 - p10))

    return {
        'P10 Pinball Loss': round(p10_loss, 4),
        'P50 Pinball Loss': round(p50_loss, 4),
        'P90 Pinball Loss': round(p90_loss, 4),
        'Coverage (%)': round(coverage_pct, 2),
        'Target Coverage (%)': 80.0,
        'MPIW (Rs/qtl)': round(mpiw, 2)
    }


def calculate_diebold_mariano(
    y_true: np.ndarray,
    y_pred1: np.ndarray,
    y_pred2: np.ndarray,
    loss_type: str = 'absolute',
    maxlags: int = 7
) -> Dict[str, Any]:
    """Executes Diebold-Mariano (DM) pairwise test with Newey-West HAC standard errors.
    
    Supports:
    - 'absolute': d_t = |e1_t| - |e2_t| (appropriate for MAE/median forecasts)
    - 'squared': d_t = e1_t^2 - e2_t^2 (appropriate for MSE/mean forecasts)
    - 'percentage': d_t = |e1_t/y_t| - |e2_t/y_t| (appropriate for MAPE)
    """
    y_t = np.asarray(y_true, dtype=np.float64).ravel()
    e1 = y_t - np.asarray(y_pred1, dtype=np.float64).ravel()
    e2 = y_t - np.asarray(y_pred2, dtype=np.float64).ravel()

    if loss_type == 'squared':
        d = (e1 ** 2) - (e2 ** 2)
        loss_desc = "Squared Error Loss (MSE)"
    elif loss_type == 'percentage':
        denom = np.where(np.abs(y_t) < 1e-6, 1e-6, np.abs(y_t))
        d = np.abs(e1 / denom) - np.abs(e2 / denom)
        loss_desc = "Absolute Percentage Error Loss (MAPE)"
    else:
        d = np.abs(e1) - np.abs(e2)
        loss_desc = "Absolute Error Loss (MAE)"

    # Regress loss differential d on constant with Newey-West HAC covariance
    ols_fit = OLS(d, np.ones(len(d))).fit(cov_type='HAC', cov_kwds={'maxlags': maxlags})
    dm_stat = float(ols_fit.tvalues[0])
    p_val = float(ols_fit.pvalues[0])

    # If dm_stat > 0, Model 2 has smaller loss than Model 1 (Model 2 is better)
    # If dm_stat < 0, Model 1 has smaller loss than Model 2 (Model 1 is better)
    is_sig = bool(p_val < 0.05)
    
    return {
        'loss_function': loss_desc,
        'variance_estimator': f"Newey-West HAC (maxlags={maxlags})",
        'dm_statistic': round(dm_stat, 4),
        'p_value': round(p_val, 6),
        'statistically_significant': is_sig,
        'mean_loss_differential': round(float(np.mean(d)), 4)
    }


def calculate_ljung_box(
    residuals: np.ndarray,
    lags: Optional[List[int]] = None
) -> Dict[str, Dict[str, float]]:
    """Calculates Ljung-Box test for autocorrelation in residuals across designated lags."""
    if lags is None:
        lags = [1, 7, 14, 30]

    res = np.asarray(residuals, dtype=np.float64).ravel()
    # Filter valid lags that fit within sample size
    valid_lags = [lag for lag in lags if lag < len(res)]
    if not valid_lags:
        return {}

    lb_df = acorr_ljungbox(res, lags=valid_lags, return_df=True)
    results = {}
    for lag, row in lb_df.iterrows():
        results[f"lag_{lag}"] = {
            'lb_stat': round(float(row['lb_stat']), 3),
            'p_value': round(float(row['lb_pvalue']), 6)
        }
    return results
