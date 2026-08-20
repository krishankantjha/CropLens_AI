"""
Lightweight ML drift monitoring service for CropLens AI.
Compares real-time inference feature inputs against training baseline statistics
stored in model metadata, detecting distribution shifts, missingness, and outliers.
"""

import logging
import pandas as pd
from typing import Dict, Any, List

logger = logging.getLogger("croplens.drift")


class MLDriftMonitor:
    """Monitors incoming inference data for feature drift against training baselines."""

    def __init__(self, metadata: Dict[str, Any]):
        self.metadata = metadata
        self.feature_stats = metadata.get("feature_stats", {})
        self.feature_cols = metadata.get("feature_cols", [])

    def check_drift(self, input_features: Dict[str, float]) -> Dict[str, Any]:
        """
        Evaluates input feature dictionary against training baseline bounds/stats.
        Returns drift report with warnings for any feature exceeding bounds.
        """
        drift_warnings: List[str] = []
        missing_features: List[str] = []

        for col in self.feature_cols:
            if col not in input_features:
                missing_features.append(col)
                continue

            val = input_features[col]
            stats = self.feature_stats.get(col, {})
            
            # If basic min/max stats exist in metadata, check bounds
            if "min" in stats and "max" in stats:
                vmin = stats["min"]
                vmax = stats["max"]
                span = vmax - vmin if vmax != vmin else 1.0
                # Allow 20% buffer beyond training min/max
                buffer = span * 0.2
                if val < (vmin - buffer) or val > (vmax + buffer):
                    drift_warnings.append(
                        f"Feature '{col}' value {val} outside training bounds [{vmin}, {vmax}]"
                    )

        has_drift = len(drift_warnings) > 0 or len(missing_features) > 0
        if has_drift:
            logger.warning(f"ML Drift detected: {len(drift_warnings)} feature bounds violations, {len(missing_features)} missing features.")

        return {
            "has_drift": has_drift,
            "drift_warnings": drift_warnings,
            "missing_features": missing_features
        }
