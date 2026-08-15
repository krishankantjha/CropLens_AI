# CropLens AI — Final Technical & Empirical Research Report

**Project Title:** CropLens AI: APMC Market Intelligence, Supply Shock Detection & Multi-Quantile Price Forecasting Engine  
**Target Platform:** Dual-Persona Web Intelligence Platform for Farmers, APMC Traders, and Procurement Officers  
**Architectural Stack:** FastAPI (Python 3.11) + React 18 (Vite + Tailwind CSS + Lucide Icons) + PyTorch + LightGBM + SQLite  

---

## 1. Executive Summary

CropLens AI is an agricultural market intelligence and quantitative forecasting platform designed specifically for Indian Agricultural Produce Market Committee (APMC) mandis. Indian agricultural wholesale markets experience severe seasonal volatility, spatial arbitrage friction, and unannounced supply shocks. CropLens AI addresses these challenges through a dual-persona interface serving both **Farmers (Kisan Advisory Mode)** and **Traders / Procurement Officers (Quantitative Analytics Mode)**.

Key technical milestones:
- **135,471 Historical APMC Records:** Ingested and cleaned across 10 major mandis and 10 agricultural commodities from 2019 to 2025.
- **47 Engineered Features:** Multi-horizon causal lags (1d, 2d, 3d, 1w, 4w, 52w), 7d/21d EMAs, price velocity, 30d volatility, NASA POWER agro-meteorological indices, NDVI crop health, Haversine geographic distance vectors, and Fourier seasonality waves.
- **Multi-Quantile Forecasting Engine:** LightGBM Multi-Quantile Regressors (P10 lower risk floor, P50 expected median, P90 upper stress ceiling) operating at sub-15ms inference latency, complemented by PyTorch 2-Layer LSTM, GRU, and Temporal Fusion Transformer (TFT) benchmarks.
- **Unsupervised Anomaly Radar:** Isolation Forest supply shock detection flagging market gluts and volume/price divergence events.
- **Conformalized Quantile Regression (CQR):** Mondrian group-conditional calibrated prediction intervals achieving 75.69% empirical coverage on out-of-sample data.

---

## 2. Prediction Horizon & Temporal Framing

### 2.1 Formal Horizon Definition
CropLens AI implements a **1-Day Ahead (Next-Day) APMC Modal Price Forecasting Horizon**:
> *"CropLens predicts the next day's ($t+1$) APMC wholesale modal price using market closing prices, arrival volumes, NASA POWER meteorological observations, and remote sensing NDVI data known and recorded up to day $t$."*

In Indian APMC operations, morning auctions establish the daily modal price by afternoon market close. Therefore, all day-$t$ closing prices, arrival totals, and daily weather aggregates are fully observed and published prior to the start of trading on day $t+1$.

### 2.2 Feature Information Availability & Temporal Validity (47 Features)

| # | Feature Name | Information Source | Availability Time | Target Horizon | Temporal Status |
|---|---|---|---|---|---|
| 1 | `arrivals_in_qtl` | Mandi Log | Day $t$ Close | Predict Day $t+1$ | Valid (Known at $t$) |
| 2 | `rainfall_mm` | NASA POWER | Day $t$ Close | Predict Day $t+1$ | Valid (Known at $t$) |
| 3 | `temp_max` | NASA POWER | Day $t$ Close | Predict Day $t+1$ | Valid (Known at $t$) |
| 4 | `temp_min` | NASA POWER | Day $t$ Close | Predict Day $t+1$ | Valid (Known at $t$) |
| 5 | `ndvi_mean` | MODIS/Sentinel | Day $t$ (8-day composite) | Predict Day $t+1$ | Valid (Known at $t$) |
| 6 | `is_festive_season` | Hindu/National Calendar | Pre-determined | Predict Day $t+1$ | Valid (Deterministic) |
| 7 | `price_lag_1d` | APMC Modal Price | Day $t-1$ Close | Predict Day $t+1$ | Valid (Lagged) |
| 8 | `price_lag_2d` | APMC Modal Price | Day $t-2$ Close | Predict Day $t+1$ | Valid (Lagged) |
| 9 | `price_lag_3d` | APMC Modal Price | Day $t-3$ Close | Predict Day $t+1$ | Valid (Lagged) |
| 10 | `price_lag_1w` | APMC Modal Price | Day $t-7$ Close | Predict Day $t+1$ | Valid (Lagged) |
| 11 | `price_lag_4w` | APMC Modal Price | Day $t-28$ Close | Predict Day $t+1$ | Valid (Lagged) |
| 12 | `price_lag_52w` | APMC Modal Price | Day $t-364$ Close | Predict Day $t+1$ | Valid (Lagged) |
| 13 | `price_ema_7d` | APMC Modal Price | Day $t-1$ EMA | Predict Day $t+1$ | Valid (Shifted EMA) |
| 14 | `price_ema_21d` | APMC Modal Price | Day $t-1$ EMA | Predict Day $t+1$ | Valid (Shifted EMA) |
| 15 | `price_channel_width_7d` | APMC Modal Price | Days $t-7$ to $t-1$ | Predict Day $t+1$ | Valid (Shifted Rolling) |
| 16 | `price_velocity_7d` | APMC Modal Price | Day $t$ vs Day $t-7$ | Predict Day $t+1$ | Valid (Known at Day $t$ Close) |
| 17 | `price_volatility_30d` | APMC Modal Price | Days $t-30$ to $t-1$ | Predict Day $t+1$ | Valid (Shifted Rolling) |
| 18 | `price_spread` | APMC Max - Min | Day $t$ Close | Predict Day $t+1$ | Valid (Known at Day $t$ Close) |
| 19 | `rolling_price_reversal_signal` | APMC Modal Price | Day $t$ vs 90d Mean | Predict Day $t+1$ | Valid (Known at Day $t$ Close) |
| 20 | `modal_vs_midpoint_bias` | APMC Price Range | Day $t$ Close | Predict Day $t+1$ | Valid (Known at Day $t$ Close) |
| 21 | `commodity_price_percentile_rank` | APMC Modal Price | Expanding to $t-1$ | Predict Day $t+1$ | Valid (Shifted Expanding) |
| 22 | `price_quality_premium` | APMC Modal / Min | Day $t$ Close | Predict Day $t+1$ | Valid (Known at Day $t$ Close) |
| 23 | `arrivals_rolling_mean_30d` | Mandi Log | Days $t-30$ to $t-1$ | Predict Day $t+1$ | Valid (Shifted Rolling) |
| 24 | `arrival_ratio` | Mandi Log | Day $t-1$ vs 30d Mean | Predict Day $t+1$ | Valid (Shifted) |
| 25 | `arrival_velocity_7d` | Mandi Log | Day $t-1$ vs Day $t-8$ | Predict Day $t+1$ | Valid (Shifted) |
| 26 | `arrival_price_divergence_signal` | APMC & Mandi Log | Direction at $t-1$ | Predict Day $t+1$ | Valid (Shifted) |
| 27 | `temp_range` | NASA POWER | Day $t-1$ Max - Min | Predict Day $t+1$ | Valid (Shifted) |
| 28 | `rainfall_rolling_sum_14d` | NASA POWER | Days $t-14$ to $t-1$ | Predict Day $t+1$ | Valid (Shifted Rolling) |
| 29 | `rain_x_ndvi_interaction` | NASA & MODIS | Day $t-1$ Rain $\times$ NDVI | Predict Day $t+1$ | Valid (Shifted Rain) |
| 30 | `temp_stress_days_7d` | NASA POWER | Days $t-7$ to $t-1$ | Predict Day $t+1$ | Valid (Shifted Rolling) |
| 31 | `consecutive_dry_days` | NASA POWER | Run length to $t-1$ | Predict Day $t+1$ | Valid (Shifted Run) |
| 32 | `vegetative_stress_ratio` | NASA & MODIS | NDVI / Heat Stress ($t-1$) | Predict Day $t+1$ | Valid (Shifted Temp) |
| 33 | `heat_wave_event_flag` | NASA POWER | 3-day run to $t-1$ | Predict Day $t+1$ | Valid (Shifted Run) |
| 34 | `ndvi_momentum_4w` | MODIS | NDVI Day $t$ - Day $t-28$ | Predict Day $t+1$ | Valid (Known at $t$) |
| 35 | `harvest_glut_index` | Mandi & MODIS | NDVI $\times$ Arrival Ratio ($t-1$) | Predict Day $t+1$ | Valid (Shifted Arrival) |
| 36 | `festival_price_anticipation_score` | Calendar | Window $[t, t+21]$ | Predict Day $t+1$ | Valid (Calendar Lookahead) |
| 37 | `post_festival_demand_hangover` | Calendar | Window $[t-14, t]$ | Predict Day $t+1$ | Valid (Calendar History) |
| 38 | `dist_to_hub_km` | GPS | Static Mandi Vector | Predict Day $t+1$ | Valid (Static Geodesic) |
| 39 | `hub_price_diff` | Azadpur Benchmark | Day $t$ vs Azadpur $t-1$ | Predict Day $t+1$ | Valid (Known at Day $t$ Close) |
| 40 | `spatial_price_gradient` | Regional Mean | Day $t$ vs Regional $t-1$ | Predict Day $t+1$ | Valid (Known at Day $t$ Close) |
| 41 | `sin_month` | Calendar | Month of Year ($t$) | Predict Day $t+1$ | Valid (Deterministic) |
| 42 | `cos_month` | Calendar | Month of Year ($t$) | Predict Day $t+1$ | Valid (Deterministic) |
| 43 | `sin_dow` | Calendar | Day of Week ($t$) | Predict Day $t+1$ | Valid (Deterministic) |
| 44 | `cos_dow` | Calendar | Day of Week ($t$) | Predict Day $t+1$ | Valid (Deterministic) |
| 45 | `is_peak_harvest_month` | Calendar Table | Commodity Harvest Month | Predict Day $t+1$ | Valid (Deterministic) |
| 46 | `market_seasonality_deviation` | Historical Mean | Day $t$ vs Prior Years Mean | Predict Day $t+1$ | Valid (Historical Prior Years) |
| 47 | `price_regime_indicator` | APMC Modal Price | MA7 vs MA30 at $t-1$ | Predict Day $t+1$ | Valid (Shifted MAs) |

---

## 3. Dataset & Temporal Partitioning

- **Total Dataset:** 135,471 rows across 10 commodities and 10 mandis.
- **Temporal Range:** 2019-01-01 to 2025-12-31 (7 full years).
- **Training Set (2019–2023):** 96,770 records (71.43%).
- **Validation Set (2024):** 19,398 records (14.32%) — used exclusively for Optuna hyperparameter optimization and CQR non-conformity calibration.
- **Holdout Test Set (2025):** 19,303 records (14.25%) — strictly isolated for final out-of-sample empirical evaluation.

## 4. Empirical Benchmark Comparison (2025 Holdout Test Set)

All models evaluated on the identical 2025 holdout test set (19,303 daily observations):

| Model Architecture | Model Class | Features Used | R² Score | RMSE (Rs/qtl) | MAE (Rs/qtl) | MAPE (%) | sMAPE (%) | MASE | Diebold-Mariano Test (HAC Corrected vs LightGBM) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **LightGBM Quantile (P10/P50/P90)*** | **Monotonic Quantile GBDT** | **47** | **0.998** | **₹212.87** | **₹59.58** | **0.78%** | **0.79%** | **0.016** | **Primary Benchmark Engine** |
| **XGBoost Regressor** | GBDT Regressor | 47 | 0.998 | ₹198.50 | ₹57.16 | 0.82% | 0.82% | 0.015 | DM = -6.727 ($p < 0.0001$, Winner: XGBoost) |
| **CatBoost Regressor** | GBDT Regressor | 47 | 0.998 | ₹211.52 | ₹84.33 | 1.42% | 1.42% | 0.022 | — |
| **Ridge Linear Baseline** | Linear Scaled | 47 | 0.992 | ₹59.36 | ₹29.77 | 0.60% | 0.60% | 0.008 | DM = -12.890 ($p < 0.0001$, Winner: Ridge) |
| **PyTorch 2-Layer LSTM** | Deep Recurrent | 47 | 0.996 | ₹327.80 | ₹112.98 | 1.53% | 1.55% | 0.030 | — |
| **PyTorch 2-Layer GRU** | Deep Recurrent | 47 | 0.996 | ₹331.64 | ₹110.05 | 1.54% | 1.56% | 0.029 | — |
| **Temporal Fusion Transformer (TFT)** | Deep Attention | Custom | 0.997 | ₹246.73 | ₹87.53 | 3.73% | 3.78% | 0.023 | — |
| **Classical ARIMA(1,1,1)** | Stochastic TS | Univariate | 0.960 | ₹1009.80 | ₹668.08 | 14.71% | 15.42% | 0.180 | DM = -28.40 ($p < 0.0001$) |

*\* Evaluated with Chernozhukov Monotonic Rearrangement (Econometrica, 2010), eliminating 100% of quantile crossings.*

### Architectural Insights & Loss Formulation Context:
1. **Quantile vs. Point Loss Optimization:** LightGBM P50 is trained with asymmetric pinball quantile loss at $\alpha=0.50$, specifically designed to provide mathematically consistent median estimates coupled with calibrated P10 downside floor and P90 upside ceiling bounds. In contrast, Ridge and XGBoost minimize mean squared error directly, achieving lower point MAPE on slow-moving MSP commodities (Wheat, Paddy), but providing zero uncertainty quantification.
2. **Tabular vs. Sequence Models:** With 47 features and zero data leakage, PyTorch LSTM (1.53% MAPE) and GRU (1.54% MAPE) achieve competitive performance on 7-day lookbacks, but tabular gradient boosting remains superior due to explicit interaction splits on meteorological, harvest calendar, and spatial gradient vectors.

---

## 5. Statistical Rigor, Uncertainty & Diagnostic Tests

### 5.1 95% Circular Block Bootstrap Confidence Intervals (N = 1,000 Resamples, 7-Day Blocks)
To account for temporal autocorrelation in daily APMC price observations, confidence intervals were computed via circular block bootstrapping with 7-day contiguous blocks:
- **MAE (Rs/qtl):** ₹59.51 [95% CI: **₹56.35 to ₹62.47**]
- **MAPE (%):** 0.78% [95% CI: **0.76% to 0.80%**]
- **R² Score:** 0.998 [95% CI: **0.998 to 0.998**]
- **P10–P90 Coverage (%):** 78.24% [95% CI: **77.62% to 78.81%**]

### 5.2 Benjamini-Hochberg FDR-Corrected Granger Causality Tests
Granger causality evaluated across 53 commodity-mandi time series (lags 1–7 days) with Benjamini-Hochberg False Discovery Rate correction at $\alpha = 0.05$:
- **Arrival Volume (`arrivals_in_qtl`):** Raw Significant: 53/53 (100.0%) | **FDR-Adjusted Significant: 53/53 (100.0%)** (Avg min $p = 0.0000$)
- **Maximum Temperature (`temp_max`):** Raw Significant: 49/53 (92.45%) | **FDR-Adjusted Significant: 49/53 (92.45%)** (Avg min $p = 0.0163$)
- **Rainfall Volume (`rainfall_mm`):** Raw Significant: 36/53 (67.92%) | **FDR-Adjusted Significant: 34/53 (64.15%)** (Avg min $p = 0.0650$)

### 5.3 Quantile Monotonicity & Before-vs-After Validation ($P_{10} \le P_{50} \le P_{90}$)
Evaluating unconstrained independent quantile trees against Chernozhukov Monotonic Rearrangement:

| Dataset Partition | Total Obs | Raw Tree Crossings | Raw Crossing Rate (%) | Post-Rearrangement Crossings | Post Crossing Rate (%) | Mean Shift on Crossings | Safety Guard Status |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Validation Set (2024)** | 19,398 | 2,667 | 13.75% | **0** | **0.00%** | ₹16.79/qtl | PASSED (Clean shifts) |
| **Holdout Test Set (2025)** | 19,303 | 2,942 | 15.24% | **0** | **0.00%** | ₹37.11/qtl | PASSED (Clean shifts) |

- **Empirical Validation Finding:** Raw crossings were isolated to ultra-low volatility regimes where the inter-quantile interval narrowed below ₹15/qtl. Applying Chernozhukov monotonic rearrangement eliminated 100% of crossing anomalies while strictly improving $P_{50}$ point estimation (Test MAPE improved from 0.85% to **0.78%**, MAE from ₹63.31 to **₹59.58/qtl**), verifying Chernozhukov's rearrangement error-reduction inequality.

### 5.4 In-Sample COVID-19 Period Robustness Analysis
Evaluating model stability across market shock regimes within the training historical window:
- **COVID-19 Shock Period (2020–2021):** MAE = ₹29.42/qtl, RMSE = ₹98.33/qtl, MAPE = **0.58%**, R² = **0.999**
- **Normal Market Period (2022–2024):** MAE = ₹33.67/qtl, RMSE = ₹88.98/qtl, MAPE = **0.60%**, R² = **1.000**
- *Methodological Disclosure:* Evaluated as an in-sample training-period robustness analysis to quantify model stability during extreme government-mandated transport lockdown shocks.

### 5.5 Isolation Forest Supply Shock Detection (Unsupervised Radar)
- **Contamination Rate:** 0.05 (5.0%)
- **Test Set Flagged Anomalies:** 1,286 out of 19,303 days (**6.66% anomaly rate**)
- **Normal Day Retention Specificity:** **96.05%**
- **Operational Proxy Metrics (vs Heuristic Volume/Velocity Thresholds):** Precision = 45.10%, Recall = 40.47%, F1-Score = 42.66%.

---

## 6. Multi-Category Feature Ablation Study

| Ablation Scenario | Features Removed | Test MAE (Rs/qtl) | Test RMSE (Rs/qtl) | Test MAPE (%) | Error Degradation |
|---|:---:|:---:|:---:|:---:|:---:|
| **Model A (Full 47 Features)** | None | **₹63.31** | **₹216.65** | **0.85%** | Baseline |
| **Model B (No Price Lags)** | 10 Lag & Velocity Features | ₹100.37 | ₹280.12 | 1.53% | **+80.0% Error** |
| **Model C (No Weather & NDVI)** | 13 NASA & MODIS Features | ₹67.29 | ₹223.13 | 0.93% | +9.4% Error |
| **Model D (No Arrival Volumes)** | 5 Mandi Arrival Features | ₹78.71 | ₹271.58 | 1.07% | +25.9% Error |
| **Model E (No Weather + No Arrivals)**| 18 Exogenous Features | ₹66.40 | ₹227.13 | 0.91% | +7.1% Error |
| **Model F (No Spatial Vectors)** | 3 Geodesic Distance Features | ₹63.68 | ₹209.33 | 0.86% | +1.2% Error |
| **Model G (No Festival Calendar)** | 3 Festival Demand Features | ₹66.10 | ₹219.56 | 0.90% | +5.9% Error |

---

## 7. Leave-One-Mandi-Out (LOMO) Spatial Generalization

Evaluated by holding out an entire mandi during training (2019–2024) and testing on the held-out mandi across 2025:
- **Khanna (Punjab):** MAE = ₹9.24/qtl, MAPE = 0.38%, R² = 0.998
- **Farrukhabad (Uttar Pradesh):** MAE = ₹25.64/qtl, MAPE = 0.67%, R² = 1.000
- **Guntur (Andhra Pradesh):** MAE = ₹110.95/qtl, MAPE = 0.73%, R² = 0.999
- **Agra (Uttar Pradesh):** MAE = ₹32.95/qtl, MAPE = 0.77%, R² = 0.999
- **Lasalgaon (Maharashtra):** MAE = ₹29.23/qtl, MAPE = 0.80%, R² = 0.999
- **Karnal (Haryana):** MAE = ₹38.73/qtl, MAPE = 0.81%, R² = 0.993
- **Mathura (Uttar Pradesh):** MAE = ₹40.93/qtl, MAPE = 0.91%, R² = 0.998
- **Indore (Madhya Pradesh):** MAE = ₹106.40/qtl, MAPE = 1.18%, R² = 0.996
- **Kolkata (West Bengal):** MAE = ₹121.18/qtl, MAPE = 1.21%, R² = 0.998
- **Azadpur (Delhi):** MAE = ₹575.83/qtl, MAPE = 3.25%, R² = 0.981

---

## 8. Conclusion & Research Readiness

With all methodological, temporal leakage, and statistical tests fully resolved and documented, CropLens AI presents a sound, leakage-free, and reproducible agricultural forecasting and market intelligence platform ready for research-paper publication.

