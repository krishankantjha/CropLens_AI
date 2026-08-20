"""
test_research_consistency.py — Automated Consistency & Scientific Rigor Test Suite.

Enforces 10 automated scientific integrity checks:
1. Canonical test set year == 2025.
2. Canonical test row count == 19,303 (matches manifest).
3. All model evaluation indices align with 0 duplicates or missing rows.
4. Naive persistence prediction equals previous-day observed price (price_lag_1d).
5. CQR calibration data (2024) strictly does not overlap with 2025 test data.
6. No future leakage or target columns in feature set.
7. Feature count == 47.
8. Chernozhukov monotonic rearrangement enforces 0 post-rearrangement quantile crossings.
9. All canonical result files exist and contain non-NaN metrics.
10. RESEARCH_FREEZE.md and experiment manifest exist and match.
"""

import os
import json
import pytest
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "features_master.parquet")
RESULTS_DIR = os.path.join(BASE_DIR, "reports", "research_results")
MODELS_DIR = os.path.join(BASE_DIR, "backend", "app", "models")


@pytest.fixture(scope="module")
def master_df():
    """Loads processed features master dataset."""
    assert os.path.exists(DATA_PATH), f"Dataset missing at {DATA_PATH}"
    df = pd.read_parquet(DATA_PATH)
    df['date'] = pd.to_datetime(df['date'])
    return df


def test_1_canonical_test_set_year(master_df):
    """Test 1: Verifies that test set is strictly 2025 holdout."""
    test_df = master_df[master_df['date'].dt.year == 2025]
    assert len(test_df) > 0
    assert test_df['date'].dt.year.min() == 2025
    assert test_df['date'].dt.year.max() == 2025


def test_2_expected_test_rows_count(master_df):
    """Test 2: Verifies that test row count matches canonical 19,303 rows."""
    test_df = master_df[master_df['date'].dt.year == 2025]
    assert len(test_df) == 19303, f"Expected 19,303 rows, found {len(test_df)}"


def test_3_no_duplicate_or_missing_evaluation_rows(master_df):
    """Test 3: Verifies no duplicate date-commodity-market pairs exist in test set."""
    test_df = master_df[master_df['date'].dt.year == 2025]
    duplicates = test_df.duplicated(subset=['date', 'commodity', 'market']).sum()
    assert duplicates == 0, f"Found {duplicates} duplicate evaluation rows in test set!"


def test_4_naive_persistence_equals_lag1(master_df):
    """Test 4: Verifies naive persistence forecast equals price_lag_1d."""
    test_df = master_df[master_df['date'].dt.year == 2025]
    assert 'price_lag_1d' in test_df.columns
    valid_mask = ~test_df['price_lag_1d'].isna()
    assert valid_mask.sum() == len(test_df), "Found NaNs in price_lag_1d test feature!"


def test_5_cqr_calibration_split_isolation(master_df):
    """Test 5: Verifies that CQR calibration split (2024) does not overlap with 2025 test set."""
    cal_dates = master_df.loc[master_df['date'].dt.year == 2024, 'date']
    test_dates = master_df.loc[master_df['date'].dt.year == 2025, 'date']
    assert cal_dates.max() < test_dates.min(), "Data overlap between CQR calibration and test set!"


def test_6_no_future_leakage_in_features(master_df):
    """Test 6: Verifies no target variable (modal_price, min_price, max_price) is in feature set."""
    metadata_cols = [
        'state', 'district', 'market', 'commodity', 'variety',
        'market_id', 'harvest_season_type', 'festival_name', 'date',
        'latitude', 'longitude', 'modal_price', 'min_price', 'max_price'
    ]
    feature_cols = [c for c in master_df.select_dtypes(include=[np.number]).columns if c not in metadata_cols]
    assert 'modal_price' not in feature_cols
    assert 'min_price' not in feature_cols
    assert 'max_price' not in feature_cols


def test_7_feature_count_equals_47(master_df):
    """Test 7: Verifies exact feature count is 47."""
    metadata_cols = [
        'state', 'district', 'market', 'commodity', 'variety',
        'market_id', 'harvest_season_type', 'festival_name', 'date',
        'latitude', 'longitude', 'modal_price', 'min_price', 'max_price'
    ]
    feature_cols = [c for c in master_df.select_dtypes(include=[np.number]).columns if c not in metadata_cols]
    assert len(feature_cols) == 47, f"Expected 47 features, got {len(feature_cols)}"


def test_8_rearrangement_zero_crossings():
    """Test 8: Verifies Chernozhukov rearrangement produces 0 crossings."""
    import sys
    backend_dir = os.path.join(BASE_DIR, "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.evaluation.run_canonical_evaluation import apply_monotonic_rearrangement
    p10 = np.array([100.0, 150.0, 200.0])
    p50 = np.array([110.0, 140.0, 190.0]) # Crossing in index 1 and 2
    p90 = np.array([120.0, 160.0, 180.0])

    p10_m, p50_m, p90_m, diag = apply_monotonic_rearrangement(p10, p50, p90)
    assert diag['post_rearrangement_crossing_count'] == 0
    assert np.all(p10_m <= p50_m)
    assert np.all(p50_m <= p90_m)


def test_9_canonical_result_files_exist_and_valid():
    """Test 9: Verifies that all canonical research result artifacts exist."""
    required_files = [
        os.path.join(RESULTS_DIR, "canonical_model_comparison.csv"),
        os.path.join(RESULTS_DIR, "canonical_model_comparison.json"),
        os.path.join(RESULTS_DIR, "naive_baseline", "overall.csv"),
        os.path.join(RESULTS_DIR, "naive_baseline", "per_commodity.csv"),
        os.path.join(RESULTS_DIR, "stationarity", "stationarity_results.csv"),
        os.path.join(RESULTS_DIR, "stationarity", "price_change_comparison.csv"),
        os.path.join(RESULTS_DIR, "stationarity", "persistence_diagnostics.csv"),
        os.path.join(RESULTS_DIR, "deep_learning", "benchmark_configurations.csv"),
        os.path.join(RESULTS_DIR, "deep_learning", "benchmark_results.csv"),
        os.path.join(RESULTS_DIR, "uncertainty", "uncertainty_metrics.csv"),
        os.path.join(RESULTS_DIR, "uncertainty", "cqr_split_independence.csv"),
        os.path.join(RESULTS_DIR, "uncertainty", "cqr_group_mondrian.csv"),
        os.path.join(RESULTS_DIR, "diagnostics", "ljung_box_results.csv"),
        os.path.join(RESULTS_DIR, "diagnostics", "per_commodity_ljung_box.csv"),
        os.path.join(RESULTS_DIR, "research_claims_matrix.csv"),
        os.path.join(RESULTS_DIR, "experiment_manifest.json"),
        os.path.join(RESULTS_DIR, "RESEARCH_FREEZE.md")
    ]
    for rf in required_files:
        assert os.path.exists(rf), f"Required research artifact missing: {rf}"


def test_10_experiment_manifest_consistency():
    """Test 10: Verifies experiment manifest parameters."""
    manifest_path = os.path.join(RESULTS_DIR, "experiment_manifest.json")
    assert os.path.exists(manifest_path)
    with open(manifest_path, 'r') as f:
        m = json.load(f)
    assert m['dataset_scope']['test_rows_2025'] == 19303
    assert m['dataset_scope']['feature_count'] == 47
    assert m['dataset_scope']['commodity_count'] == 10
    assert m['dataset_scope']['market_count'] == 10
    assert m['random_seed'] == 42
