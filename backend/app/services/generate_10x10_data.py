"""
generate_10x10_data.py — Historical Data Generator for 10 Commodities x 10 APMC Mandis (2019–2025)

Generates realistic, seasonally calibrated, weather-correlated daily APMC market prices,
NASA weather observations, and MODIS NDVI satellite series across 8 Indian states.
"""

import os
import datetime
import numpy as np
import pandas as pd

# Target Directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
os.makedirs(RAW_DIR, exist_ok=True)

# Set random seed for 100% reproducibility
np.random.seed(42)

# Date Range: 2019-01-01 to 2025-12-31 (7 years, 2557 days)
dates = pd.date_range(start="2019-01-01", end="2025-12-31", freq="D")
n_days = len(dates)

# 1. 10 Strategic Mandi Hubs
MANDIS = {
    "Agra": {"district": "Agra", "state": "Uttar Pradesh", "lat": 27.1767, "lon": 78.0081, "base_tmax": 32.0, "base_rain": 2.1},
    "Khanna": {"district": "Ludhiana", "state": "Punjab", "lat": 30.7071, "lon": 76.2167, "base_tmax": 30.5, "base_rain": 2.3},
    "Azadpur": {"district": "Delhi", "state": "Delhi", "lat": 28.7041, "lon": 77.1725, "base_tmax": 31.8, "base_rain": 2.2},
    "Mathura": {"district": "Mathura", "state": "Uttar Pradesh", "lat": 27.4924, "lon": 77.6737, "base_tmax": 32.2, "base_rain": 2.0},
    "Lasalgaon": {"district": "Nashik", "state": "Maharashtra", "lat": 20.1477, "lon": 74.2252, "base_tmax": 31.0, "base_rain": 2.8},
    "Karnal": {"district": "Karnal", "state": "Haryana", "lat": 29.6857, "lon": 76.9905, "base_tmax": 30.8, "base_rain": 2.4},
    "Indore": {"district": "Indore", "state": "Madhya Pradesh", "lat": 22.7196, "lon": 75.8577, "base_tmax": 32.5, "base_rain": 2.9},
    "Farrukhabad": {"district": "Farrukhabad", "state": "Uttar Pradesh", "lat": 27.3826, "lon": 79.5830, "base_tmax": 32.0, "base_rain": 2.5},
    "Guntur": {"district": "Guntur", "state": "Andhra Pradesh", "lat": 16.3067, "lon": 80.4365, "base_tmax": 34.5, "base_rain": 3.1},
    "Kolkata": {"district": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639, "base_tmax": 32.0, "base_rain": 4.5}
}

# 2. 10 Commodities across 5 Sectors (Base Modal Prices in Rs/qtl, Seasonality, Volatility)
COMMODITIES = {
    "Potato": {
        "base_price": 1450.0, "volatility": 0.18, "variety": "Desi",
        "peak_months": [1, 2, 3], "lean_months": [8, 9, 10],
        "active_mandis": ["Agra", "Farrukhabad", "Azadpur", "Mathura", "Kolkata", "Karnal"]
    },
    "Onion": {
        "base_price": 2200.0, "volatility": 0.28, "variety": "Red/Nashik",
        "peak_months": [3, 4, 11, 12], "lean_months": [7, 8, 9],
        "active_mandis": ["Lasalgaon", "Azadpur", "Agra", "Indore", "Mathura", "Kolkata"]
    },
    "Tomato": {
        "base_price": 2400.0, "volatility": 0.35, "variety": "Hybrid",
        "peak_months": [1, 2, 10, 11], "lean_months": [6, 7, 8],
        "active_mandis": ["Azadpur", "Agra", "Lasalgaon", "Mathura", "Farrukhabad", "Kolkata"]
    },
    "Wheat": {
        "base_price": 2150.0, "volatility": 0.08, "variety": "Dara/Sharbati",
        "peak_months": [4, 5], "lean_months": [1, 2, 12],
        "active_mandis": ["Khanna", "Karnal", "Agra", "Indore", "Mathura", "Farrukhabad"]
    },
    "Paddy(Dhan)": {
        "base_price": 2080.0, "volatility": 0.09, "variety": "Basmati/Common",
        "peak_months": [10, 11, 12], "lean_months": [5, 6, 7],
        "active_mandis": ["Khanna", "Karnal", "Kolkata", "Guntur", "Agra"]
    },
    "Maize": {
        "base_price": 1850.0, "volatility": 0.12, "variety": "Yellow",
        "peak_months": [9, 10, 11], "lean_months": [4, 5, 6],
        "active_mandis": ["Lasalgaon", "Farrukhabad", "Indore", "Agra", "Khanna", "Karnal"]
    },
    "Soyabean": {
        "base_price": 4600.0, "volatility": 0.15, "variety": "Yellow",
        "peak_months": [10, 11], "lean_months": [4, 5, 6],
        "active_mandis": ["Indore", "Lasalgaon", "Mathura", "Agra"]
    },
    "Mustard": {
        "base_price": 5300.0, "volatility": 0.14, "variety": "Black/Yellow",
        "peak_months": [3, 4], "lean_months": [9, 10, 11],
        "active_mandis": ["Agra", "Mathura", "Karnal", "Farrukhabad", "Indore"]
    },
    "Gram(Chana)": {
        "base_price": 5200.0, "volatility": 0.13, "variety": "Desi",
        "peak_months": [3, 4, 5], "lean_months": [10, 11, 12],
        "active_mandis": ["Indore", "Agra", "Mathura", "Farrukhabad", "Lasalgaon"]
    },
    "Chilli Red": {
        "base_price": 16500.0, "volatility": 0.22, "variety": "Teja/Guntur",
        "peak_months": [2, 3, 4], "lean_months": [8, 9, 10],
        "active_mandis": ["Guntur", "Indore", "Azadpur", "Kolkata"]
    }
}

print("Generating 10x10 Historical Agmarknet, Weather, and NDVI Datasets (2019-2025)...")

# --- Step A: Generate Weather Dataset for All 10 Mandis ---
weather_rows = []
day_of_year = dates.dayofyear.values

for mandi, m_info in MANDIS.items():
    dist = m_info["district"]
    # Seasonal temperature curve (hottest in May/June, coldest in Jan)
    temp_seasonal = 10.0 * np.sin(2 * np.pi * (day_of_year - 105) / 365.25)
    temp_max = m_info["base_tmax"] + temp_seasonal + np.random.normal(0, 1.8, n_days)
    temp_min = temp_max - np.random.uniform(8.0, 15.0, n_days)
    
    # Monsoon rainfall curve (July - Sept)
    rain_prob = np.where((dates.month >= 6) & (dates.month <= 9), 0.45, 0.08)
    rain_occ = np.random.binomial(1, rain_prob, n_days)
    rain_amount = np.random.exponential(m_info["base_rain"] * 4.5, n_days) * rain_occ
    
    for i, d in enumerate(dates):
        weather_rows.append({
            "date": d.strftime("%Y-%m-%d"),
            "district": dist,
            "rainfall_mm": round(float(max(0.0, rain_amount[i])), 1),
            "temp_max": round(float(temp_max[i]), 1),
            "temp_min": round(float(temp_min[i]), 1)
        })

df_weather = pd.DataFrame(weather_rows)
weather_path = os.path.join(RAW_DIR, "2_weather_daily.csv")
df_weather.to_csv(weather_path, index=False)
print(f"Generated Weather Records: {len(df_weather)} rows -> {weather_path}")

# --- Step B: Generate Satellite NDVI Dataset (5-day intervals) ---
ndvi_dates = pd.date_range(start="2019-01-01", end="2025-12-31", freq="5D")
ndvi_rows = []
ndvi_doy = ndvi_dates.dayofyear.values

for mandi, m_info in MANDIS.items():
    dist = m_info["district"]
    # Vegetative greenness peak post-monsoon (Sep-Nov) and post-Rabi (Feb-Mar)
    ndvi_curve = 0.50 + 0.22 * np.sin(2 * np.pi * (ndvi_doy - 220) / 365.25) + np.random.normal(0, 0.03, len(ndvi_dates))
    ndvi_curve = np.clip(ndvi_curve, 0.15, 0.88)
    
    for i, d in enumerate(ndvi_dates):
        ndvi_rows.append({
            "date": d.strftime("%Y_%m_%d"),
            "district": dist,
            "ndvi_mean": round(float(ndvi_curve[i]), 3)
        })

df_ndvi = pd.DataFrame(ndvi_rows)
ndvi_path = os.path.join(RAW_DIR, "3_satellite_ndvi.csv")
df_ndvi.to_csv(ndvi_path, index=False)
print(f"Generated Satellite NDVI Records: {len(df_ndvi)} rows -> {ndvi_path}")

# --- Step C: Generate Agmarknet Price & Arrival Records for 10x10 Trading Pairs ---
price_records = []

# Long-term inflation trend ~4.5% p.a.
year_offsets = (dates.year - 2019) * 0.045

for comm, c_info in COMMODITIES.items():
    base_p = c_info["base_price"]
    vol = c_info["volatility"]
    variety = c_info["variety"]
    peak_m = c_info["peak_months"]
    lean_m = c_info["lean_months"]
    active_mandis = c_info["active_mandis"]
    
    for mandi in active_mandis:
        m_info = MANDIS[mandi]
        dist = m_info["district"]
        state = m_info["state"]
        
        # Mandi price premium/discount offset
        if mandi == "Azadpur":
            mandi_offset = 1.08  # Mega-terminal premium
        elif mandi == "Kolkata":
            mandi_offset = 1.06  # Eastern consumption terminal
        elif mandi in ["Lasalgaon", "Khanna", "Farrukhabad", "Guntur"]:
            mandi_offset = 0.94  # Primary farmgate production hub discount
        else:
            mandi_offset = 1.00
            
        # Daily price path using mean-reverting geometric Brownian motion with seasonal supply gluts
        price_series = np.zeros(n_days)
        price_series[0] = base_p * mandi_offset
        
        for t in range(1, n_days):
            m = dates[t].month
            # Seasonal factor: Glut during harvest (-15% to -25%), Lean price spike (+15% to +30%)
            if m in peak_m:
                seasonal_drift = -0.18
            elif m in lean_m:
                seasonal_drift = 0.20
            else:
                seasonal_drift = 0.02
                
            # COVID-19 Disruption (2020 March-May shock followed by recovery)
            if dates[t].year == 2020 and dates[t].month in [3, 4, 5]:
                covid_factor = -0.12
            else:
                covid_factor = 0.0
                
            drift = 0.0001 + seasonal_drift / 365.25 + covid_factor / 60.0
            shock = np.random.normal(0, vol / np.sqrt(250))
            
            # Mean reversion to inflation-adjusted equilibrium
            eq_price = base_p * mandi_offset * (1.0 + year_offsets[t]) * (1.0 + seasonal_drift)
            reversion = 0.03 * (eq_price - price_series[t-1]) / eq_price
            
            price_series[t] = price_series[t-1] * (1.0 + drift + reversion + shock)
            price_series[t] = max(price_series[t], base_p * 0.35)
            
        # Arrivals (inversely correlated with price spikes, positively correlated with peak harvest)
        for t in range(n_days):
            m = dates[t].month
            is_peak = 1.8 if m in peak_m else 0.8
            base_arrival = 1200.0 if comm in ["Wheat", "Paddy(Dhan)", "Potato", "Onion"] else 450.0
            arrivals = base_arrival * is_peak * np.random.uniform(0.6, 1.4)
            
            modal = round(float(price_series[t]), 1)
            min_p = round(float(modal * np.random.uniform(0.88, 0.95)), 1)
            max_p = round(float(modal * np.random.uniform(1.05, 1.15)), 1)
            
            price_records.append({
                "arrival_date": dates[t].strftime("%Y_%m_%d"),
                "state": state,
                "district": dist,
                "market": mandi,
                "commodity": comm,
                "variety": variety,
                "min_price": min_p,
                "max_price": max_p,
                "modal_price": modal,
                "arrivals_in_qtl": int(arrivals)
            })

df_prices = pd.DataFrame(price_records)
prices_path = os.path.join(RAW_DIR, "1_agmarknet_prices.csv")
df_prices.to_csv(prices_path, index=False)
print(f"Generated Agmarknet Daily Trade Records: {len(df_prices)} rows across 10 commodities and 10 mandis -> {prices_path}")

# --- Step D: Generate Mandi Location Directory ---
mandi_records = [
    {
        "market_id": f"MANDI_{i+1:03d}",
        "market": name,
        "district": info["district"],
        "state": info["state"],
        "latitude": info["lat"],
        "longitude": info["lon"]
    }
    for i, (name, info) in enumerate(MANDIS.items())
]
df_mandis = pd.DataFrame(mandi_records)
mandis_path = os.path.join(RAW_DIR, "4_mandis_locations.csv")
df_mandis.to_csv(mandis_path, index=False)
print(f"Generated Mandi Location Records: {len(df_mandis)} rows -> {mandis_path}")

# --- Step E: Generate Festival Calendar ---
import holidays
india_holidays = holidays.India(years=range(2019, 2026))
calendar_records = []
for d in dates:
    month = d.month
    d_date = d.date()
    is_holiday = 1 if d_date in india_holidays else (1 if month in [9, 10, 11] else 0)
    fest_name = india_holidays.get(d_date, "None")
    harvest_season = "Kharif Harvest" if month in [9, 10, 11] else ("Rabi Harvest" if month in [3, 4, 5] else "Zaid Lean Season")
    calendar_records.append({
        "date": d.strftime("%Y-%m-%d"),
        "is_festive_season": is_holiday,
        "festival_name": fest_name,
        "harvest_season_type": harvest_season
    })
df_calendar = pd.DataFrame(calendar_records)
calendar_path = os.path.join(RAW_DIR, "5_festivals_calendar.csv")
df_calendar.to_csv(calendar_path, index=False)
print(f"Generated Festival Calendar Records: {len(df_calendar)} rows -> {calendar_path}")
