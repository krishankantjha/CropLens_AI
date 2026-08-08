"""Data cleaner and schema validation service for CropLens AI."""

import os
import logging
import time
from typing import TypedDict, Dict, List
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DEFAULT_RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
RAW_DATA_DIR = os.environ.get("CROPLENS_RAW_DATA_DIR", DEFAULT_RAW_DIR)

# Domain constants
MIN_PRICE_FLOOR = 300.0
MAD_MULTIPLIER = 5.0
MIN_ARRIVALS_QTL = 10.0
MAX_ARRIVALS_QTL = 50000.0
MIN_RAINFALL_MM = 0.0
TEMP_MAX_RANGE = (0.0, 50.0)
TEMP_MIN_RANGE = (-5.0, 40.0)
NDVI_RANGE = (0.0, 1.0)
INDIA_LAT_RANGE = (6.5, 37.6)
INDIA_LON_RANGE = (68.0, 97.5)

# Required column schemas
REQUIRED_SCHEMAS: Dict[str, List[str]] = {
    "prices": ["arrival_date", "state", "district", "market", "commodity", "variety", "min_price", "max_price", "modal_price", "arrivals_in_qtl"],
    "weather": ["date", "district", "rainfall_mm", "temp_max", "temp_min"],
    "ndvi": ["date", "district", "ndvi_mean"],
    "locations": ["market_id", "market", "district", "state", "latitude", "longitude"],
    "calendar": ["date", "is_festive_season", "festival_name", "harvest_season_type"]
}

class CleanDatasets(TypedDict):
    """Clean datasets return type."""
    prices: pd.DataFrame
    weather: pd.DataFrame
    ndvi: pd.DataFrame
    locations: pd.DataFrame
    calendar: pd.DataFrame

def _load_csv_dataset(filename: str, dataset_key: str) -> pd.DataFrame:
    """Load CSV file and validate column schema."""
    filepath = os.path.join(RAW_DATA_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"[{dataset_key}] File not found: {filepath}")
        
    try:
        df = pd.read_csv(filepath)
    except pd.errors.EmptyDataError:
        raise ValueError(f"[{dataset_key}] File is empty: {filepath}")
    except Exception as e:
        raise RuntimeError(f"[{dataset_key}] Failed to read CSV {filepath}: {str(e)}")
        
    if df.empty:
        raise ValueError(f"[{dataset_key}] Loaded dataset contains zero rows: {filepath}")

    required_cols = REQUIRED_SCHEMAS.get(dataset_key, [])
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(f"[{dataset_key}] Missing required columns: {missing_cols}")

    return df.replace([np.inf, -np.inf], np.nan)

def clean_prices(df: pd.DataFrame) -> pd.DataFrame:
    """Clean Agmarknet price and arrival data."""
    start_time = time.time()
    initial_rows = len(df)
    df = df.copy()

    # Format dates
    df['arrival_date'] = pd.to_datetime(df['arrival_date'].astype(str).str.replace('_', '-'), errors='coerce')
    invalid_dates = df['arrival_date'].isna().sum()
    if invalid_dates > 0:
        logger.warning(f"[prices] Dropping {invalid_dates} invalid arrival_date rows")
        df = df.dropna(subset=['arrival_date'])

    # Strip text whitespace
    text_cols = ['state', 'district', 'market', 'commodity', 'variety']
    df[text_cols] = df[text_cols].apply(lambda c: c.astype(str).str.strip())

    # Remove duplicates
    dups_count = df.duplicated(subset=['arrival_date', 'market', 'commodity']).sum()
    if dups_count > 0:
        logger.info(f"[prices] Dropped {dups_count} duplicate price records")
        df = df.drop_duplicates(subset=['arrival_date', 'market', 'commodity'], keep='last')

    df = df.dropna(subset=['modal_price'])
    if df.empty:
        raise ValueError("[prices] No valid price rows remain")

    # Filter MAD price outliers per commodity
    cleaned_groups = []
    outliers_dropped = 0
    
    for commodity, group in df.groupby('commodity'):
        prices = group['modal_price']
        median_p = prices.median()
        mad = (prices - median_p).abs().median()
        
        if mad == 0 or np.isnan(mad):
            mad = prices.std() if prices.std() > 0 else 100.0

        lower_bound = max(MIN_PRICE_FLOOR, median_p - (MAD_MULTIPLIER * mad))
        upper_bound = median_p + (MAD_MULTIPLIER * mad)

        valid_mask = (prices >= lower_bound) & (prices <= upper_bound)
        outliers_dropped += (~valid_mask).sum()
        cleaned_groups.append(group[valid_mask])

    if cleaned_groups:
        df = pd.concat(cleaned_groups, ignore_index=True)
    else:
        df = pd.DataFrame(columns=df.columns)

    # Clip arrivals to valid bounds
    df['arrivals_in_qtl'] = df['arrivals_in_qtl'].fillna(MIN_ARRIVALS_QTL).clip(
        lower=MIN_ARRIVALS_QTL, upper=MAX_ARRIVALS_QTL
    )

    df = df.sort_values(['market', 'commodity', 'arrival_date']).reset_index(drop=True)
    elapsed = time.time() - start_time
    logger.info(f"[prices] Cleaned in {elapsed:.3f}s: {initial_rows:,} raw -> {len(df):,} clean rows ({outliers_dropped:,} outliers dropped)")
    return df

def clean_weather(df: pd.DataFrame) -> pd.DataFrame:
    """Clean Open Meteo daily weather data."""
    start_time = time.time()
    initial_rows = len(df)
    df = df.copy()

    df['date'] = pd.to_datetime(df['date'].astype(str).str.replace('_', '-'), errors='coerce')
    invalid_dates = df['date'].isna().sum()
    if invalid_dates > 0:
        logger.warning(f"[weather] Dropping {invalid_dates} invalid date rows")
        df = df.dropna(subset=['date'])

    df['district'] = df['district'].astype(str).str.strip()

    # Sort before interpolation to prevent cross district leakage
    df = df.sort_values(['district', 'date']).reset_index(drop=True)

    dups_count = df.duplicated(subset=['date', 'district']).sum()
    if dups_count > 0:
        logger.info(f"[weather] Dropped {dups_count} duplicate weather records")
        df = df.drop_duplicates(subset=['date', 'district'], keep='last')

    df['rainfall_mm'] = df['rainfall_mm'].fillna(MIN_RAINFALL_MM).clip(lower=MIN_RAINFALL_MM)

    # Interpolate temperatures per district
    df['temp_max'] = df.groupby('district')['temp_max'].transform(
        lambda x: x.interpolate(method='linear').bfill().ffill()
    ).clip(lower=TEMP_MAX_RANGE[0], upper=TEMP_MAX_RANGE[1])

    df['temp_min'] = df.groupby('district')['temp_min'].transform(
        lambda x: x.interpolate(method='linear').bfill().ffill()
    ).clip(lower=TEMP_MIN_RANGE[0], upper=TEMP_MIN_RANGE[1])

    elapsed = time.time() - start_time
    logger.info(f"[weather] Cleaned in {elapsed:.3f}s: {initial_rows:,} raw -> {len(df):,} clean rows")
    return df

def clean_ndvi(df: pd.DataFrame) -> pd.DataFrame:
    """Clean Sentinel 2 NDVI crop health data."""
    start_time = time.time()
    initial_rows = len(df)
    df = df.copy()

    df['date'] = pd.to_datetime(df['date'].astype(str).str.replace('_', '-'), errors='coerce')
    invalid_dates = df['date'].isna().sum()
    if invalid_dates > 0:
        logger.warning(f"[ndvi] Dropping {invalid_dates} invalid date rows")
        df = df.dropna(subset=['date'])

    df['district'] = df['district'].astype(str).str.strip()

    dups_count = df.duplicated(subset=['date', 'district']).sum()
    if dups_count > 0:
        logger.info(f"[ndvi] Dropped {dups_count} duplicate NDVI records")
        df = df.drop_duplicates(subset=['date', 'district'], keep='last')

    df['ndvi_mean'] = df['ndvi_mean'].fillna(0.35).clip(lower=NDVI_RANGE[0], upper=NDVI_RANGE[1])

    df = df.sort_values(['district', 'date']).reset_index(drop=True)
    elapsed = time.time() - start_time
    logger.info(f"[ndvi] Cleaned in {elapsed:.3f}s: {initial_rows:,} raw -> {len(df):,} clean rows")
    return df

def clean_locations(df: pd.DataFrame) -> pd.DataFrame:
    """Clean APMC mandi spatial GPS locations."""
    start_time = time.time()
    initial_rows = len(df)
    df = df.copy()

    text_cols = ['market_id', 'market', 'district', 'state']
    df[text_cols] = df[text_cols].apply(lambda c: c.astype(str).str.strip())

    dups_count = df.duplicated(subset=['market_id']).sum()
    if dups_count > 0:
        df = df.drop_duplicates(subset=['market_id'], keep='last')

    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')

    invalid_gps = df['latitude'].isna() | df['longitude'].isna()
    if invalid_gps.any():
        bad_markets = df.loc[invalid_gps, 'market'].tolist()
        raise ValueError(f"[locations] Invalid GPS coordinates for markets: {bad_markets}")

    lat_valid = df['latitude'].between(INDIA_LAT_RANGE[0], INDIA_LAT_RANGE[1])
    lon_valid = df['longitude'].between(INDIA_LON_RANGE[0], INDIA_LON_RANGE[1])

    if not (lat_valid.all() and lon_valid.all()):
        out_of_bounds = df[~(lat_valid & lon_valid)]['market'].tolist()
        raise ValueError(f"[locations] GPS coordinates out of India bounds for markets: {out_of_bounds}")

    elapsed = time.time() - start_time
    logger.info(f"[locations] Cleaned in {elapsed:.3f}s: {initial_rows:,} raw -> {len(df):,} clean rows")
    return df.reset_index(drop=True)

def clean_calendar(df: pd.DataFrame) -> pd.DataFrame:
    """Clean holiday and harvest season calendar."""
    start_time = time.time()
    initial_rows = len(df)
    df = df.copy()

    df['date'] = pd.to_datetime(df['date'].astype(str).str.replace('_', '-'), errors='coerce')
    invalid_dates = df['date'].isna().sum()
    if invalid_dates > 0:
        logger.warning(f"[calendar] Dropping {invalid_dates} invalid date rows")
        df = df.dropna(subset=['date'])

    dups_count = df.duplicated(subset=['date']).sum()
    if dups_count > 0:
        df = df.drop_duplicates(subset=['date'], keep='last')

    df['is_festive_season'] = pd.to_numeric(df['is_festive_season'], errors='coerce').fillna(0).astype(int).clip(lower=0, upper=1)

    text_cols = ['festival_name', 'harvest_season_type']
    df[text_cols] = df[text_cols].apply(lambda c: c.astype(str).str.strip())

    df = df.sort_values('date').reset_index(drop=True)
    elapsed = time.time() - start_time
    logger.info(f"[calendar] Cleaned in {elapsed:.3f}s: {initial_rows:,} raw -> {len(df):,} clean rows")
    return df

def get_clean_datasets() -> CleanDatasets:
    """Load and clean all 5 raw datasets."""
    start_total = time.time()
    logger.info(f"Starting Data Cleaner using RAW_DATA_DIR: {RAW_DATA_DIR}")

    df_prices = _load_csv_dataset("1_agmarknet_prices.csv", "prices")
    df_weather = _load_csv_dataset("2_weather_daily.csv", "weather")
    df_ndvi = _load_csv_dataset("3_satellite_ndvi.csv", "ndvi")
    df_mandis = _load_csv_dataset("4_mandis_locations.csv", "locations")
    df_calendar = _load_csv_dataset("5_festivals_calendar.csv", "calendar")

    clean_data: CleanDatasets = {
        "prices": clean_prices(df_prices),
        "weather": clean_weather(df_weather),
        "ndvi": clean_ndvi(df_ndvi),
        "locations": clean_locations(df_mandis),
        "calendar": clean_calendar(df_calendar)
    }

    elapsed_total = time.time() - start_total
    logger.info(f"SUCCESS Data Cleaner completed in {elapsed_total:.3f}s across all 5 datasets")
    return clean_data

if __name__ == "__main__":
    datasets = get_clean_datasets()
    print("SUCCESS Data Cleaner execution completed successfully")
    for name, data in datasets.items():
        print(f"Dataset {name.capitalize()} contains {len(data):,} clean records")
