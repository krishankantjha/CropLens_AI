# CropLens AI â€” Formal Research Freeze State

**Date of Freeze:** 2026-08-27
**Version:** 1.0.0-RESEARCH-FREEZE
**Evaluation Scope:** 2025 Out-of-Sample Holdout Set (19,240 rows)

---

## 1. Dataset & Split Specifications
- **Master Dataset Path:** `data/processed/features_master.parquet` (135,404 rows after valid-target construction, 62 columns)
- **Temporal Horizon:** 1-Day Ahead ($t+1$) APMC Modal Wholesale Price Prediction
- **Training Period:** 2019-01-01 to 2023-12-31 (96,766 rows)
- **Validation Period:** 2024-01-01 to 2024-12-31 (19,398 rows) â€” strictly used for Optuna tuning and CQR calibration
- **Test Period:** 2025-01-01 to 2025-12-31 (19,240 rows) â€” strictly untouched holdout
- **Commodity Scope (10):** Chilli Red, Gram(Chana), Maize, Mustard, Onion, Paddy(Dhan), Potato, Soyabean, Tomato, Wheat
- **Market Mandi Scope (10):** Agra, Azadpur, Farrukhabad, Guntur, Indore, Karnal, Khanna, Kolkata, Lasalgaon, Mathura
- **Random Seed:** 42 across all data loaders, model initializers, and bootstrap resamplers

---

## 2. Feature Set Definition (47 Total Features)
- **Autoregressive Price History (12):** `price_lag_1d`, `price_lag_2d`, `price_lag_3d`, `price_lag_1w`, `price_lag_4w`, `price_lag_52w`, `price_ema_7d`, `price_ema_21d`, `price_channel_width_7d`, `price_velocity_7d`, `price_volatility_30d`, `price_spread`
- **Market Microstructure & Rank (4):** `rolling_price_reversal_signal`, `modal_vs_midpoint_bias`, `commodity_price_percentile_rank`, `price_quality_premium`
- **Supply & Arrivals (5):** `arrivals_in_qtl`, `arrivals_rolling_mean_30d`, `arrival_ratio`, `arrival_velocity_7d`, `arrival_price_divergence_signal`
- **Meteorological & Satellite NDVI (12):** `rainfall_mm`, `temp_max`, `temp_min`, `temp_range`, `rainfall_rolling_sum_14d`, `ndvi_mean`, `rain_x_ndvi_interaction`, `temp_stress_days_7d`, `consecutive_dry_days`, `vegetative_stress_ratio`, `heat_wave_event_flag`, `ndvi_momentum_4w`
- **Agro-Ecological & Harvest Indices (2):** `harvest_glut_index`, `is_peak_harvest_month`
- **Festival Demand Drivers (3):** `is_festive_season`, `festival_price_anticipation_score`, `post_festival_demand_hangover`
- **Spatial & Geographic Inter-Mandi Hub (3):** `dist_to_hub_km`, `hub_price_diff`, `spatial_price_gradient`
- **Calendar Seasonality & Regimes (6):** `sin_month`, `cos_month`, `sin_dow`, `cos_dow`, `market_seasonality_deviation`, `price_regime_indicator`

---

## 3. Canonical Frozen Benchmark Results (2025 Test Set)

| Model                             |   MAE (Rs/qtl) |   RMSE (Rs/qtl) |   MAPE (%) |       R2 |    MASE |   MAE vs Naive (%) | Role in Paper                      |
|:----------------------------------|---------------:|----------------:|-----------:|---------:|--------:|-------------------:|:-----------------------------------|
| Naive Persistence (Random Walk)   |          69.37 |          139.09 |       1.34 |   0.9993 |   1.591 |               0    | Zero-shot (Persistence)            |
| Ridge Regression                  |          56.58 |          113.6  |       1.11 |   0.9995 |   1.298 |              18.44 | Supervised Regression              |
| XGBoost                           |          80.4  |          219.94 |       1.29 |   0.9981 |   1.844 |             -15.9  | Supervised Regression              |
| CatBoost                          |          98.55 |          230.27 |       1.71 |   0.9979 |   2.261 |             -42.06 | Supervised Regression              |
| LightGBM P50                      |          82    |          225.66 |       1.28 |   0.998  |   1.881 |             -18.21 | Quantile Pinball Loss (alpha=0.50) |
| LSTM (2-Layer)                    |         115.7  |          289.46 |       2.02 |   0.997  | nan     |             -66.79 | Sequence Huber Loss                |
| GRU (2-Layer)                     |         139.98 |          388.12 |       1.88 |   0.994  | nan     |            -101.79 | Sequence Huber Loss                |
| Temporal Fusion Transformer (TFT) |          84.75 |          176.99 |       1.66 | nan      | nan     |             -22.17 | Sequence MSE Loss                  |

---

## 4. Probabilistic Uncertainty & Conformal Coverage
- **Target Nominal Coverage:** 80.00%
- **Uncalibrated Empirical Coverage:** 78.24% (MPIW: Rs 165.05/qtl)
- **Mondrian CQR Calibrated Coverage:** **79.85%** (MPIW: Rs 166.91/qtl)
- **Raw Quantile Crossings:** 2,942 (15.24%)
- **Post-Rearrangement Crossings:** **0 (0.00%)** via Chernozhukov Monotonic Rearrangement

---

## 5. Known Methodological Limitations & Explicit Disclosures
1. **Linear Point Forecasting Advantage:** Ridge regression achieves lowest MAE/RMSE under squared error loss because agricultural modal prices exhibit high near-martingale memory. LightGBM P50 is justified primarily by multi-quantile interval estimation and outperforming Naive persistence on 7 of 10 individual commodity markets.
2. **Residual Autocorrelation:** Significant periodic autocorrelation ($p < 0.001$) remains at lags 7, 14, 30 due to weekly market auction cycles and unobserved macro policy/MSP announcements.
3. **High Volatility Spices:** Chilli Red and Mustard exhibit heavy-tailed auction volatility that inflates overall aggregate MAE.
4. **Deep Learning Benchmarks:** LSTM, GRU, and TFT are proof-of-concept sequence baselines evaluated with standard architectures without extensive Optuna search.
5. **Anomaly Detection:** Isolation Forest is an unsupervised operational triage filter evaluated against proxy operational heuristics, not ground-truth historical shock labels.
6. **COVID Analysis:** Retrospective in-sample regime consistency analysis (2020-2021 vs 2022-2024), not an unseen pandemic stress test.

---

## 6. Forbidden Claims (Must NOT be Written in Paper)
- âŒ Do NOT claim LightGBM is the superior model on point MSE/MAE over Ridge.
- âŒ Do NOT claim pinball loss mathematically guarantees non-crossing intervals (rearrangement is required).
- âŒ Do NOT claim Isolation Forest achieves 42.66% supervised classification accuracy.
- âŒ Do NOT claim COVID analysis proves generalization to an unseen pandemic.
- âŒ Do NOT claim Deep Learning is fundamentally unsuitable for crop prices based on default benchmark runs.
- âŒ Do NOT claim Granger causality proves physical agricultural causality.
