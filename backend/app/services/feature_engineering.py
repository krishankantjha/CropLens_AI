"""Feature engineering pipeline for CropLens AI.

Forecasting Horizon: 1-Day Ahead (Next-Day) APMC Wholesale Price Prediction.
CropLens predicts the next day's (t+1) APMC modal wholesale price using market closing,
arrival volume, NASA POWER meteorological, and remote sensing NDVI data known up to day t.
Computes 47 numeric features for tabular and sequence model training."""

import os
import logging
import time
import pandas as pd
import numpy as np

# Project directories
BASE_DIR: str = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
BACKEND_DIR: str = os.path.join(BASE_DIR, "backend")

# Package import with fallback
try:
    from app.services.data_cleaner import get_clean_datasets
except ImportError:
    import sys
    if BACKEND_DIR not in sys.path:
        sys.path.insert(0, BACKEND_DIR)
    from app.services.data_cleaner import get_clean_datasets

logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

PROCESSED_DATA_DIR: str = os.environ.get(
    "CROPLENS_PROCESSED_DATA_DIR",
    os.path.join(BASE_DIR, "data", "processed")
)
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

# Primary market hub coordinates for Azadpur Delhi
AZADPUR_MARKET_NAME: str = "Azadpur"
AZADPUR_LAT: float = 28.7041
AZADPUR_LON: float = 77.1725

# Major festival demand weights
FESTIVAL_WEIGHTS: dict = {
    "Diwali": 1.0, "Eid": 1.0, "Holi": 0.8,
    "Navratri": 0.7, "Dussehra": 0.7, "Pongal": 0.7, "Onam": 0.7
}

# Crop base temperatures in Celsius across 5 agricultural sectors
CROP_BASE_TEMP: dict = {
    "Potato": 5.0,
    "Onion": 7.0,
    "Tomato": 10.0,
    "Wheat": 4.0,
    "Paddy(Dhan)": 10.0,
    "Maize": 10.0,
    "Soyabean": 10.0,
    "Mustard": 5.0,
    "Gram(Chana)": 7.0,
    "Chilli Red": 12.0,
}
DEFAULT_BASE_TEMP: float = 10.0

# Crop peak harvest months (Rabi and Kharif agricultural calendar)
PEAK_HARVEST_MONTHS: dict = {
    "Potato": [1, 2, 3],
    "Onion": [3, 4, 11, 12],
    "Tomato": [1, 2, 10, 11],
    "Wheat": [4, 5],
    "Paddy(Dhan)": [10, 11, 12],
    "Maize": [9, 10, 11],
    "Soyabean": [10, 11],
    "Mustard": [3, 4],
    "Gram(Chana)": [3, 4, 5],
    "Chilli Red": [2, 3, 4],
}
DEFAULT_PEAK_MONTHS: list = [3, 4, 9, 10]

# Festival window settings in days
FESTIVAL_ANTICIPATION_WINDOW_DAYS: int = 21
FESTIVAL_HANGOVER_WINDOW_DAYS: int = 14

# Regime detection settings
REGIME_MA_SHORT: int = 7
REGIME_MA_LONG: int = 30
REGIME_BULL_THRESHOLD: float = 1.01
REGIME_BEAR_THRESHOLD: float = 0.99


def haversine_distance(
    lat1: pd.Series, lon1: pd.Series, lat2: float, lon2: float
) -> pd.Series:
    """Calculate distance in kilometers between two GPS coordinates."""
    r = 6371.0  # Earth radius in km
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    delta_phi = np.radians(lat2 - lat1)
    delta_lambda = np.radians(lon2 - lon1)
    a = np.sin(delta_phi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2.0) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return r * c


def _validate_output_dir(path: str, base_dir: str) -> None:
    """Verify that the output directory stays inside the project root."""
    resolved = os.path.realpath(path)
    resolved_base = os.path.realpath(base_dir)
    if not resolved.startswith(resolved_base):
        raise ValueError(
            f"Output directory '{path}' is outside the project root."
        )


def _validate_row_count(df: pd.DataFrame, expected: int, context: str) -> None:
    """Verify that the row count remains unchanged after a merge."""
    if len(df) != expected:
        raise ValueError(
            f"Data integrity error at '{context}': "
            f"Expected {expected:,} rows, got {len(df):,}."
        )


def _merge_datasets(
    df_prices: pd.DataFrame,
    df_weather: pd.DataFrame,
    df_ndvi: pd.DataFrame,
    df_locations: pd.DataFrame,
    df_calendar: pd.DataFrame,
) -> pd.DataFrame:
    """Merge five clean datasets into one unified price table."""
    initial_rows = len(df_prices)

    # Format dates
    df_prices["date"] = pd.to_datetime(df_prices["arrival_date"])
    df_weather["date"] = pd.to_datetime(df_weather["date"])
    df_ndvi["date"] = pd.to_datetime(df_ndvi["date"])
    df_calendar["date"] = pd.to_datetime(df_calendar["date"])

    # Sort chronologically before merging
    df_prices = df_prices.sort_values(["market", "commodity", "date"]).reset_index(drop=True)
    df_weather = df_weather.sort_values(["district", "date"]).reset_index(drop=True)
    df_ndvi = df_ndvi.sort_values(["district", "date"]).reset_index(drop=True)

    # Merge weather data
    df = pd.merge(
        df_prices,
        df_weather[["date", "district", "rainfall_mm", "temp_max", "temp_min"]],
        on=["date", "district"],
        how="left",
    )
    _validate_row_count(df, initial_rows, "weather merge")

    # Merge satellite NDVI data and fill gaps
    df = pd.merge(
        df,
        df_ndvi[["date", "district", "ndvi_mean"]],
        on=["date", "district"],
        how="left",
    )
    # Forward-fill only: backward filling would copy future satellite values
    # into earlier observations and violate the t-to-t+1 information boundary.
    df["ndvi_mean"] = (
        df.groupby(["district", "commodity"])["ndvi_mean"]
        .transform(lambda x: x.ffill())
    )
    _validate_row_count(df, initial_rows, "NDVI merge")

    # Merge mandi location coordinates
    df = pd.merge(
        df,
        df_locations[["market", "district", "state", "market_id", "latitude", "longitude"]],
        on=["market", "district", "state"],
        how="left",
    )
    missing_gps = df[df["latitude"].isna()]["market"].unique()
    if len(missing_gps) > 0:
        logger.warning(
            f"Missing GPS coordinates for market locations: {list(missing_gps)}"
        )
    _validate_row_count(df, initial_rows, "locations merge")

    # Merge festival and harvest calendar
    df = pd.merge(
        df,
        df_calendar[["date", "is_festive_season", "festival_name", "harvest_season_type"]],
        on="date",
        how="left",
    )
    _validate_row_count(df, initial_rows, "calendar merge")

    return df


def _compute_price_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate price lags, velocity, volatility, and market structure features."""
    grp = df.groupby(["market", "commodity"])

    # Calculate historical price lags (short-horizon and seasonal)
    df["price_lag_1d"] = grp["modal_price"].shift(1)
    df["price_lag_2d"] = grp["modal_price"].shift(2)
    df["price_lag_3d"] = grp["modal_price"].shift(3)
    df["price_lag_1w"] = grp["modal_price"].shift(7)
    df["price_lag_4w"] = grp["modal_price"].shift(28)
    df["price_lag_52w"] = grp["modal_price"].shift(364)

    # Calculate Exponential Moving Averages (EMAs) for short and medium term trend
    df["price_ema_7d"] = grp["modal_price"].transform(
        lambda x: x.shift(1).ewm(span=7, adjust=False).mean()
    )
    df["price_ema_21d"] = grp["modal_price"].transform(
        lambda x: x.shift(1).ewm(span=21, adjust=False).mean()
    )

    # Calculate 7-day rolling price channel width from historical prices only.
    roll_max_7d = grp["modal_price"].transform(lambda x: x.shift(1).rolling(7, min_periods=2).max())
    roll_min_7d = grp["modal_price"].transform(lambda x: x.shift(1).rolling(7, min_periods=2).min())
    df["price_channel_width_7d"] = (roll_max_7d - roll_min_7d).fillna(0.0)

    # Calculate velocity using prices available before the prediction cutoff.
    price_lag_8d = grp["modal_price"].shift(8)
    df["price_velocity_7d"] = (df["price_lag_1d"] - price_lag_8d) / 7.0

    # Calculate rolling price volatility over 30 days
    df["price_volatility_30d"] = grp["modal_price"].transform(
        lambda x: x.shift(1).rolling(30, min_periods=2).std()
    ).fillna(0.0)

    # Calculate daily auction price spread
    df["price_spread"] = df["max_price"] - df["min_price"]

    # Calculate price reversal Z score relative to 90 day lagged mean
    roll_mean_90 = grp["modal_price"].transform(
        lambda x: x.shift(1).rolling(90, min_periods=7).mean()
    )
    roll_std_90 = grp["modal_price"].transform(
        lambda x: x.shift(1).rolling(90, min_periods=7).std()
    ).fillna(1.0).replace(0.0, 1.0)
    df["rolling_price_reversal_signal"] = (df["price_lag_1d"] - roll_mean_90) / roll_std_90

    # Use the previous auction's min/max values, not the target row's modal price.
    min_price_lag1 = grp["min_price"].shift(1)
    max_price_lag1 = grp["max_price"].shift(1)
    midpoint = (min_price_lag1 + max_price_lag1) / 2.0
    price_range = (max_price_lag1 - min_price_lag1).clip(lower=1.0)
    df["modal_vs_midpoint_bias"] = (df["price_lag_1d"] - midpoint) / price_range

    # Calculate historical percentile rank using past prices only
    df["commodity_price_percentile_rank"] = grp["modal_price"].transform(
        lambda x: x.shift(1).expanding(min_periods=10).rank(pct=True)
    ).fillna(0.5)

    # Calculate quality premium from the previous auction only.
    min_price_lag1 = grp["min_price"].shift(1)
    df["price_quality_premium"] = df["price_lag_1d"] / (min_price_lag1 + 1e-5)

    return df


def _compute_supply_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate supply arrival ratios and supply demand divergence using strictly lagged past arrivals (t-1)."""
    grp = df.groupby(["market", "commodity"])

    # Shift arrivals by 1 day to ensure arrival metrics use data strictly available prior to morning auction price discovery
    arrivals_lag1 = grp["arrivals_in_qtl"].shift(1)
    
    # Calculate 30 day rolling mean of past arrivals (strictly t-1 to t-30)
    df["arrivals_rolling_mean_30d"] = grp["arrivals_in_qtl"].transform(
        lambda x: x.shift(1).rolling(30, min_periods=1).mean()
)

    # Calculate arrival glut or deficit ratio using lagged arrivals
    df["arrival_ratio"] = arrivals_lag1 / (df["arrivals_rolling_mean_30d"] + 1e-5)

    # Calculate rate of change in arrivals over 7 days (t-1 vs t-8)
    arrivals_lag_8d = grp["arrivals_in_qtl"].shift(8).fillna(df["arrivals_in_qtl"])
    df["arrival_velocity_7d"] = (arrivals_lag1 - arrivals_lag_8d) / 7.0

    # Calculate arrival price divergence signal using lagged changes
    delta_arrivals = grp["arrivals_in_qtl"].shift(1).diff().fillna(0.0)
    delta_price = grp["modal_price"].shift(1).diff().fillna(0.0)
    df["arrival_price_divergence_signal"] = (
        np.sign(delta_arrivals) * np.sign(delta_price)
    ).astype(int)

    return df


def _compute_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate weather stress, satellite NDVI, and crop health indicators using strictly lagged meteorological signals (t-1)."""
    grp_district = df.groupby("district")

    # Shift weather observations by 1 day so day-t price forecasts use weather recorded prior to trading start
    temp_max_lag1 = grp_district["temp_max"].shift(1)
    temp_min_lag1 = grp_district["temp_min"].shift(1)
    rainfall_lag1 = grp_district["rainfall_mm"].shift(1).fillna(0.0)

    # Calculate diurnal temperature range
    df["temp_range"] = temp_max_lag1 - temp_min_lag1

    # Calculate 14 day cumulative rainfall sum (strictly past 14 days)
    df["rainfall_rolling_sum_14d"] = grp_district["rainfall_mm"].transform(
        lambda x: x.shift(1).rolling(14, min_periods=1).sum()
    ).fillna(0.0)

    # Calculate rainfall and NDVI interaction
    df["rain_x_ndvi_interaction"] = rainfall_lag1 * df["ndvi_mean"]

    # Count heatwave stress days above 35 degrees in past week
    df["temp_stress_days_7d"] = grp_district["temp_max"].transform(
        lambda x: (x.shift(1) > 35.0).astype(int).rolling(7, min_periods=1).sum()
    ).fillna(0.0)

    # Count consecutive dry days with zero rain
    df["consecutive_dry_days"] = grp_district["rainfall_mm"].transform(
        lambda x: (x.shift(1) == 0.0).astype(int).groupby((x.shift(1) != 0.0).cumsum()).cumsum()
    ).fillna(0.0)

    # Calculate vegetative stress ratio using crop base temperatures
    df["base_temp"] = df["commodity"].map(CROP_BASE_TEMP).fillna(DEFAULT_BASE_TEMP)
    effective_heat = (temp_max_lag1 - df["base_temp"]).clip(lower=0.0) + 1.0
    df["vegetative_stress_ratio"] = df["ndvi_mean"] / effective_heat
    df = df.drop(columns=["base_temp"])

    # Flag heatwave events of 3 consecutive days at or above 40 degrees
    df["heat_wave_event_flag"] = grp_district["temp_max"].transform(
        lambda x: (x.shift(1) >= 40.0).astype(int).rolling(3, min_periods=3).sum().eq(3).astype(int)
    ).fillna(0).astype(int)

    # Calculate 4 week crop greenness momentum
    ndvi_lag_28 = df.groupby(["district"])["ndvi_mean"].shift(28)
    ndvi_lag_1 = df.groupby(["district"])['ndvi_mean'].shift(1)
    ndvi_lag_29 = df.groupby(["district"])['ndvi_mean'].shift(29)
    df["ndvi_momentum_4w"] = ndvi_lag_1 - ndvi_lag_29

    # Use the last known NDVI observation with lagged arrivals.
    df["harvest_glut_index"] = ndvi_lag_1 * df["arrival_ratio"]

    return df


def _compute_festival_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate festival demand anticipation and post festival hangover scores."""
    festival_dates = (
        df[df["is_festive_season"] == 1][["date", "festival_name"]]
        .drop_duplicates()
        .sort_values("date")
        .reset_index(drop=True)
    )

    unique_dates = df[["date"]].drop_duplicates().sort_values("date").reset_index(drop=True)

    if festival_dates.empty:
        df["festival_price_anticipation_score"] = 0.0
        df["post_festival_demand_hangover"] = 0.0
        logger.warning("No festival dates found in calendar data")
        return df

    # Calculate upcoming festival score within anticipation window
    next_fest = pd.merge_asof(
        unique_dates,
        festival_dates.rename(columns={"date": "fest_date", "festival_name": "next_fest_name"}),
        left_on="date",
        right_on="fest_date",
        direction="forward",
        tolerance=pd.Timedelta(days=FESTIVAL_ANTICIPATION_WINDOW_DAYS),
    )
    next_fest["days_to"] = (next_fest["fest_date"] - next_fest["date"]).dt.days
    next_fest["fest_weight"] = next_fest["next_fest_name"].map(
        lambda x: FESTIVAL_WEIGHTS.get(x, 0.4) if pd.notna(x) else 0.0
    )
    next_fest["festival_price_anticipation_score"] = np.where(
        next_fest["fest_date"].notna(),
        next_fest["fest_weight"] / (next_fest["days_to"] + 1.0),
        0.0,
    )

    # Calculate past festival hangover score within hangover window
    prev_fest = pd.merge_asof(
        unique_dates,
        festival_dates.rename(columns={"date": "fest_date", "festival_name": "prev_fest_name"}),
        left_on="date",
        right_on="fest_date",
        direction="backward",
        tolerance=pd.Timedelta(days=FESTIVAL_HANGOVER_WINDOW_DAYS),
    )
    prev_fest["days_since"] = (prev_fest["date"] - prev_fest["fest_date"]).dt.days
    prev_fest["fest_weight"] = prev_fest["prev_fest_name"].map(
        lambda x: FESTIVAL_WEIGHTS.get(x, 0.4) if pd.notna(x) else 0.0
    )
    prev_fest["post_festival_demand_hangover"] = np.where(
        prev_fest["fest_date"].notna(),
        prev_fest["fest_weight"] / (prev_fest["days_since"] + 1.0),
        0.0,
    )

    # Merge scores back by date
    df = df.merge(
        next_fest[["date", "festival_price_anticipation_score"]],
        on="date", how="left"
    )
    df = df.merge(
        prev_fest[["date", "post_festival_demand_hangover"]],
        on="date", how="left"
    )
    df["festival_price_anticipation_score"] = df["festival_price_anticipation_score"].fillna(0.0)
    df["post_festival_demand_hangover"] = df["post_festival_demand_hangover"].fillna(0.0)

    return df


def _compute_spatial_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate transport distance and spatial price differences."""
    # Calculate distance to primary market hub
    df["dist_to_hub_km"] = haversine_distance(
        df["latitude"], df["longitude"], AZADPUR_LAT, AZADPUR_LON
    )

    # Calculate Azadpur benchmark prices lagged by 1 day
    azadpur_df = (
        df[df["market"] == AZADPUR_MARKET_NAME]
        .groupby(["date", "commodity"])["modal_price"]
        .mean()
        .reset_index()
        .rename(columns={"modal_price": "azadpur_modal_price"})
        .sort_values(["commodity", "date"])
    )
    azadpur_df["azadpur_modal_price"] = azadpur_df.groupby("commodity")[
        "azadpur_modal_price"
    ].shift(1)

    df = pd.merge(df, azadpur_df, on=["date", "commodity"], how="left")
    df["hub_price_diff"] = (
        (df["price_lag_1d"] - df["azadpur_modal_price"]) / (df["azadpur_modal_price"] + 1e-5) * 100
    )
    df = df.drop(columns=["azadpur_modal_price"])

    # Calculate regional average price lagged by 1 day
    daily_avg = (
        df.groupby(["date", "commodity"])["modal_price"]
        .mean()
        .reset_index()
        .rename(columns={"modal_price": "regional_avg_price"})
        .sort_values(["commodity", "date"])
    )
    daily_avg["regional_avg_price"] = daily_avg.groupby("commodity")[
        "regional_avg_price"
    ].shift(1)
    df = pd.merge(df, daily_avg, on=["date", "commodity"], how="left")
    df["spatial_price_gradient"] = (
        (df["price_lag_1d"] - df["regional_avg_price"]) / (df["regional_avg_price"] + 1e-5) * 100
    )
    df = df.drop(columns=["regional_avg_price"])

    return df


def _compute_market_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate seasonality, market regimes, and harvest flags."""
    grp = df.groupby(["market", "commodity"])

    # Calculate Fourier seasonality sine and cosine waves (monthly and day-of-week)
    df["sin_month"] = np.sin(2 * np.pi * df["date"].dt.month / 12.0)
    df["cos_month"] = np.cos(2 * np.pi * df["date"].dt.month / 12.0)
    df["sin_dow"] = np.sin(2 * np.pi * df["date"].dt.dayofweek / 7.0)
    df["cos_dow"] = np.cos(2 * np.pi * df["date"].dt.dayofweek / 7.0)

    # Flag crop peak harvest months
    df["month"] = df["date"].dt.month
    df["is_peak_harvest_month"] = 0
    for commodity, months in PEAK_HARVEST_MONTHS.items():
        mask = (df["commodity"] == commodity) & (df["month"].isin(months))
        df.loc[mask, "is_peak_harvest_month"] = 1
    default_mask = (~df["commodity"].isin(PEAK_HARVEST_MONTHS)) & (df["month"].isin(DEFAULT_PEAK_MONTHS))
    df.loc[default_mask, "is_peak_harvest_month"] = 1
    df = df.drop(columns=["month"])

    # Calculate market seasonality deviation using historical prior year averages
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    df["year"] = df["date"].dt.year

    year_week_avg = (
        df.groupby(["market", "commodity", "week_of_year", "year"])["modal_price"]
        .mean()
        .reset_index()
        .rename(columns={"modal_price": "year_week_price"})
        .sort_values(["market", "commodity", "week_of_year", "year"])
    )
    year_week_avg["hist_week_mean"] = year_week_avg.groupby(
        ["market", "commodity", "week_of_year"]
    )["year_week_price"].transform(lambda x: x.shift(1).expanding().mean())
    year_week_avg["hist_week_std"] = year_week_avg.groupby(
        ["market", "commodity", "week_of_year"]
    )["year_week_price"].transform(lambda x: x.shift(1).expanding().std())

    df = df.merge(
        year_week_avg[["market", "commodity", "week_of_year", "year", "hist_week_mean", "hist_week_std"]],
        on=["market", "commodity", "week_of_year", "year"],
        how="left",
    )
    df["hist_week_std"] = df["hist_week_std"].fillna(1.0).replace(0.0, 1.0)
    df["market_seasonality_deviation"] = (
        (df["price_lag_1d"] - df["hist_week_mean"]) / df["hist_week_std"]
    )
    df = df.drop(columns=["week_of_year", "year", "hist_week_mean", "hist_week_std"])

    # Calculate price regime indicator using lagged moving averages
    ma7 = grp["modal_price"].transform(
        lambda x: x.shift(1).rolling(REGIME_MA_SHORT, min_periods=1).mean()
    )
    ma30 = grp["modal_price"].transform(
        lambda x: x.shift(1).rolling(REGIME_MA_LONG, min_periods=1).mean()
    )
    df["price_regime_indicator"] = np.select(
        [ma7 > ma30 * REGIME_BULL_THRESHOLD, ma7 < ma30 * REGIME_BEAR_THRESHOLD],
        [1, -1],
        default=0,
    )

    return df


def engineer_features() -> pd.DataFrame:
    """Load clean datasets, merge, and compute all 42 engineered features."""
    start_time = time.time()
    logger.info("Loading clean datasets from Data Cleaner service")

    clean_dict = get_clean_datasets()
    df_prices = clean_dict["prices"]
    df_weather = clean_dict["weather"]
    df_ndvi = clean_dict["ndvi"]
    df_locations = clean_dict["locations"]
    df_calendar = clean_dict["calendar"]

    initial_price_rows = len(df_prices)
    logger.info(f"Starting feature engineering on {initial_price_rows:,} price records")

    # Step 1 Merge datasets
    df = _merge_datasets(df_prices, df_weather, df_ndvi, df_locations, df_calendar)

    # Step 2 Price features
    df = _compute_price_features(df)

    # Step 3 Supply features
    df = _compute_supply_features(df)

    # Step 4 Weather features
    df = _compute_weather_features(df)

    # Step 5 Festival features
    df = _compute_festival_features(df)

    # Step 6 Spatial features
    df = _compute_spatial_features(df)

    # Step 7 Market features
    df = _compute_market_features(df)

    # Remove temporary date column
    if "arrival_date" in df.columns:
        df = df.drop(columns=["arrival_date"])

    df = df.sort_values(["market", "commodity", "date"]).reset_index(drop=True)

    # Log data quality checks
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    nan_counts = df[numeric_cols].isnull().sum()
    nan_found = nan_counts[nan_counts > 0]
    if not nan_found.empty:
        logger.warning(
            f"NaN values in {len(nan_found)} feature column(s): {nan_found.to_dict()}"
        )
    else:
        logger.info("Data quality check passed zero NaN values across numeric columns")

    elapsed = time.time() - start_time
    logger.info(
        f"SUCCESS Feature Engineering completed in {elapsed:.3f}s: "
        f"{len(df):,} rows x {len(df.columns)} columns"
    )
    return df


def save_master_parquet() -> str:
    """Run feature engineering pipeline and save master parquet file."""
    _validate_output_dir(PROCESSED_DATA_DIR, BASE_DIR)

    df_master = engineer_features()
    output_path = os.path.join(PROCESSED_DATA_DIR, "features_master.parquet")

    try:
        df_master.to_parquet(output_path, index=False, compression="snappy")
    except Exception as primary_error:
        logger.warning(f"PyArrow export failed ({primary_error}) Retrying with fastparquet engine")
        try:
            df_master.to_parquet(output_path, index=False, engine="fastparquet")
        except Exception as fallback_error:
            raise RuntimeError(
                f"Parquet export failed with both engines. "
                f"Primary: {primary_error} Fallback: {fallback_error}"
            ) from fallback_error

    logger.info(f"Master feature dataset exported to: {output_path}")
    return output_path


if __name__ == "__main__":
    out_file = save_master_parquet()
    print(f"SUCCESS Master feature parquet file generated: {out_file}")
