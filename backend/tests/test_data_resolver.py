import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from backend.app.services.data_resolver import DataResolver
from fastapi import HTTPException

@pytest.fixture
def mock_dataset():
    dates = [datetime(2026, 8, 1) + timedelta(days=i) for i in range(10)]
    data = {
        'date': dates,
        'commodity': ['Potato'] * 10,
        'market': ['Agra'] * 10,
        'modal_price': [1000 + i*10 for i in range(10)],
        'arrivals_in_qtl': [100 + i for i in range(10)],
        'temp_max': [30.0] * 10,
        'rainfall_mm': [0.0] * 10
    }
    return pd.DataFrame(data)

def test_get_market_data_success(mock_dataset):
    df = DataResolver.get_market_data(mock_dataset, 'Potato', 'Agra')
    assert len(df) == 10
    assert (df['commodity'] == 'Potato').all()
    assert (df['market'] == 'Agra').all()

def test_get_market_data_not_found(mock_dataset):
    with pytest.raises(HTTPException) as exc:
        DataResolver.get_market_data(mock_dataset, 'NonExistent', 'Agra')
    assert exc.value.status_code == 404

def test_resolve_feature_vector(mock_dataset):
    feature_cols = ['modal_price', 'arrivals_in_qtl', 'temp_max']
    X, date_str = DataResolver.resolve_feature_vector(
        'Potato', 'Agra', mock_dataset, feature_cols
    )
    assert isinstance(X, pd.DataFrame)
    assert X.shape == (1, 3)
    assert date_str == '2026-08-10'
    assert X.iloc[0]['modal_price'] == 1090

def test_resolve_feature_vector_with_overrides(mock_dataset):
    feature_cols = ['modal_price', 'arrivals_in_qtl']
    overrides = {'arrivals_in_qtl': 500.0}
    X, _ = DataResolver.resolve_feature_vector(
        'Potato', 'Agra', mock_dataset, feature_cols, overrides=overrides
    )
    assert X.iloc[0]['arrivals_in_qtl'] == 500.0

def test_compute_dynamic_features():
    base_row = {
        'date': '2026-08-10',
        'temp_max': 30.0,
        'rainfall_mm': 10.0
    }
    history_prices = [1000.0] * 35
    target_dt = pd.to_datetime('2026-08-11')
    feature_cols = ['sin_month', 'price_lag_1d', 'temp_max', 'rainfall_mm']
    
    X = DataResolver.compute_dynamic_features(
        base_row, history_prices, target_dt, feature_cols
    )
    
    assert isinstance(X, pd.DataFrame)
    assert X.iloc[0]['price_lag_1d'] == 1000.0
    assert X.iloc[0]['rainfall_mm'] == 7.0 # 10.0 * 0.7^1
    assert 'sin_month' in X.columns
