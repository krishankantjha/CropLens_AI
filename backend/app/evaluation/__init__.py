"""
CropLens AI — Evaluation Package
Provides unified metrics, baseline models, diagnostics, and the canonical evaluation runner.
"""

from .metrics import (
    calculate_point_metrics,
    calculate_quantile_metrics,
    calculate_diebold_mariano,
    calculate_ljung_box,
    calculate_mase
)
from .baselines import evaluate_naive_persistence

__all__ = [
    'calculate_point_metrics',
    'calculate_quantile_metrics',
    'calculate_diebold_mariano',
    'calculate_ljung_box',
    'calculate_mase',
    'evaluate_naive_persistence'
]
