# CropLens AI — Research Paper Draft
## Section III: Multi-Source Dataset & Feature Engineering

---

### **Section III: Multi-Source Dataset & Feature Engineering**

A foundational contribution of this work is the construction of a comprehensive, multi-modal, and leakage-free dataset that unifies spot market auctions, environmental telemetry, remote sensing satellite observations, spatial transportation geography, and cultural demand cycles. This section details data acquisition, preprocessing integrity protocols, the complete 47-feature taxonomy, and the strict temporal partitioning design.

```text
Section III Architecture Overview
├── 3.1 Multi-Source Ingestion & Harmonization (Agmarknet, Open-Meteo, Sentinel-2, Festival Data)
├── 3.2 Preprocessing, Cleaning & Non-Trading Day Imputation
├── 3.3 The 47-Feature Engineering Taxonomy (8 Functional Sub-Domains)
└── 3.4 Temporal Partitioning & Leakage Prevention Protocol
```

---

#### **3.1 Multi-Source Ingestion and Data Harmonization**
The dataset unifies four distinct data streams spanning January 1, 2019 to December 31, 2025 across 10 major Indian agricultural commodities and 10 geographically representative APMC mandis, yielding a total corpus of **135,471 records**.

##### **A. Agricultural Produce Market Committee (APMC) Price and Arrival Records**
Daily wholesale auction records were systematically ingested from the national Agmarknet portal (Directorate of Marketing & Inspection, Ministry of Agriculture & Farmers Welfare, Government of India). For each trading session, the recorded variables include:
* $\text{Modal Price } (y_t)$: The primary clearing price at which the largest transaction volume occurred (reported in Indian Rupees per quintal, ₹/qtl, where $1\text{ quintal} = 100\text{ kg}$).
* $\text{Minimum Price } (p^{\min}_t)$ and $\text{Maximum Price } (p^{\max}_t)$: The daily price auction boundaries.
* $\text{Physical Arrival Volume } (A_t)$: Total commodity volume physically entering the mandi yard (measured in quintals).

The 10 commodities were selected to capture diverse botanical and market classifications:
1. *Perishable Horticultural Produce:* Tomato, Onion, Potato (the critical "TOP" vegetables in Indian market policy).
2. *Staple Food Grains (Cereals):* Wheat, Paddy (Dhan), Maize.
3. *Pulses and Legumes:* Gram (Chana).
4. *Oilseeds and Commercial Cash Crops:* Soyabean, Mustard, Chilli Red (Spices).

The 10 APMC mandis represent diverse spatial tiers—ranging from primary aggregation hubs (Lasalgaon, Farrukhabad, Guntur, Khanna) to major secondary distribution centers (Agra, Indore, Karnal, Mathura) and mega terminal consumption hubs (Azadpur in Delhi, Kolkata).

##### **B. High-Resolution Meteorological Telemetry**
Daily weather telemetry was harvested via the Open-Meteo Historical Weather API, geo-referenced to the exact centroid coordinates (latitude and longitude) of each mandi. To account for agricultural crop stress, the extracted parameters include daily maximum 2-meter air temperature ($T^{\max}_t$), minimum air temperature ($T^{\min}_t$), diurnal temperature range ($\Delta T_t = T^{\max}_t - T^{\min}_t$), and total daily precipitation ($R_t$, in millimeters).

##### **C. Sentinel-2 Satellite Multi-Spectral Remote Sensing (NDVI)**
To monitor ongoing vegetative biomass vigor across surrounding rural catchment basins, 10-meter spatial resolution multi-spectral surface reflectance imagery from the European Space Agency (ESA) Sentinel-2 satellite constellation was processed. The Normalized Difference Vegetation Index (NDVI) was computed across the Red (Band 4, $665\text{ nm}$) and Near-Infrared (Band 8, $842\text{ nm}$) spectral channels:
$$\text{NDVI} = \frac{\rho_{\text{NIR}} - \rho_{\text{Red}}}{\rho_{\text{NIR}} + \rho_{\text{Red}}}$$
Cloud-masked district-level mean NDVI values were interpolated into continuous daily time series, capturing vegetative vigor and canopy biomass dynamics over surrounding crop production belts.

##### **D. Cultural Calendars and Festival Demand Schedules**
In Indian agricultural commerce, consumer demand for perishables, pulses, and cooking oils spikes sharply during major cultural, religious, and festive seasons. We constructed a structured calendar tracking major national and regional festivals (Diwali, Eid, Holi, Navratri, Dussehra, Makar Sankranti, Chhath Puja, and regional harvest celebrations) along with an exponential anticipation and decay score modeling consumer purchasing surges in the 14 days preceding each event.

---

#### **3.2 Preprocessing, Cleaning, and Temporal Integrity**
Raw agricultural transaction data inherently exhibits operational anomalies, recording errors, and trading gaps. To guarantee pristine data hygiene, the following sequential preprocessing pipeline was implemented:

1. **Transaction Validity and Price Invariance Filters:** Records with non-positive values ($y_t \le 0$ or $A_t \le 0$) or non-physical auction reversals ($p^{\min}_t > p^{\max}_t$ or $y_t < p^{\min}_t$ or $y_t > p^{\max}_t$) were flagged and scrubbed.
2. **Trading Gap Imputation via Forward-Fill Persistence:** APMC mandis routinely close on Sundays, gazetted holidays, and during local auction strikes. For missing trading sessions within a continuous series, price levels were forward-filled from the most recent active trading day (representing zero-order market persistence), while physical arrival volumes were set to zero ($A_t = 0$) to accurately reflect closed market gates.
3. **Extreme Outlier Capping:** Modal price changes exceeding $5\times$ the rolling 30-day interquartile range (IQR) were cross-verified against neighboring regional mandis to distinguish genuine macroeconomic supply crunches from typographical data entry errors.

---

#### **3.3 The 47-Feature Engineering Taxonomy**
To capture the full multidimensional dynamics of agricultural price formation without data leakage, we engineered a comprehensive taxonomy of **47 numerical features**, categorized into eight functional domains as detailed in Table II.

##### **TABLE II: Complete 47-Feature Engineering Taxonomy for CropLens AI**
| Category # | Functional Feature Domain | Feature Name | Mathematical / Operational Definition | Domain Rationale |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Autoregressive Price History & Momentum (12)** | `price_lag_1d`, `price_lag_2d`, `price_lag_3d` | $y_{t-1}, y_{t-2}, y_{t-3}$ | Short-term price memory and immediate inertia. |
| | | `price_lag_1w`, `price_lag_4w`, `price_lag_52w` | $y_{t-7}, y_{t-28}, y_{t-364}$ | Weekly, monthly, and annual seasonal autoregression. |
| | | `price_ema_7d`, `price_ema_21d` | $\text{EMA}_k(y_{t-1}) = \alpha y_{t-1} + (1-\alpha)\text{EMA}_{t-2}$ | Fast and medium trend tracking filters. |
| | | `price_channel_width_7d` | $\max_{k \in [1,7]}(y_{t-k}) - \min_{k \in [1,7]}(y_{t-k})$ | Short-term price volatility boundary. |
| | | `price_velocity_7d` | $(y_{t-1} - y_{t-7}) / 7$ | Rate of price acceleration/deceleration. |
| | | `price_volatility_30d` | $\text{std}_{k \in [1,30]}(y_{t-k}) / \bar{y}_{30\text{d}}$ | Normalized 30-day rolling coefficient of variation. |
| | | `price_spread` | $(p^{\max}_{t-1} - p^{\min}_{t-1}) / y_{t-1}$ | Intraday auction bidding dispersion proxy. |
| **2** | **Market Microstructure & Quality (4)** | `rolling_price_reversal_signal` | $\text{sign}(y_{t-1} - y_{t-2}) \neq \text{sign}(y_{t-2} - y_{t-3})$ | Mean-reversion probability flag. |
| | | `modal_vs_midpoint_bias` | $(y_{t-1} - (p^{\max}_{t-1} + p^{\min}_{t-1})/2)$ | Auction clearing skewness towards upper/lower bounds. |
| | | `commodity_price_percentile_rank`| $\text{Rank}(y_{t-1}) / N_{365\text{d}}$ | Historical price elevation percentile within the past year. |
| | | `price_quality_premium` | $(p^{\max}_{t-1} - y_{t-1}) / y_{t-1}$ | Quality grade separation spread. |
| **3** | **Physical Supply & Arrival Dynamics (5)** | `arrivals_in_qtl` | $A_{t-1}$ | Previous trading day physical arrival volume. |
| | | `arrivals_rolling_mean_30d` | $\frac{1}{30}\sum_{k=1}^{30} A_{t-k}$ | Baseline baseline monthly supply absorption rate. |
| | | `arrival_ratio` | $A_{t-1} / (\text{arrivals\_rolling\_mean\_30d} + \epsilon)$ | Arrival shock ratio ($>1.5$ indicates supply glut). |
| | | `arrival_velocity_7d` | $(A_{t-1} - A_{t-7}) / 7$ | 7-day rate of arrival volume expansion. |
| | | `arrival_price_divergence_signal`| $\Delta A_{7\text{d}} \times \Delta y_{7\text{d}}$ | Supply-price elasticity divergence indicator. |
| **4** | **Meteorological & Remote Sensing (12)** | `temp_max`, `temp_min`, `temp_range` | $T^{\max}_{t-1}, T^{\min}_{t-1}, (T^{\max}_{t-1} - T^{\min}_{t-1})$ | Daily thermal extreme and diurnal range. |
| | | `rainfall_mm` | $R_{t-1}$ | Daily cumulative precipitation. |
| | | `rainfall_rolling_sum_14d` | $\sum_{k=1}^{14} R_{t-k}$ | Cumulative bi-weekly moisture accumulation. |
| | | `consecutive_dry_days` | $\sum \mathbb{I}(R_{t-k} = 0)$ | Drought stress duration counter. |
| | | `temp_stress_days_7d` | $\sum_{k=1}^7 \mathbb{I}(T^{\max}_{t-k} > 38^\circ\text{C})$ | Extreme heatwave threshold exposure days. |
| | | `heat_wave_event_flag` | $\mathbb{I}(\text{temp\_stress\_days\_7d} \ge 3)$ | Binary flag for acute regional heatwaves. |
| | | `ndvi_mean` | $\text{NDVI}_{t-1}$ | 10-meter satellite vegetative canopy vigor. |
| | | `ndvi_momentum_4w` | $\text{NDVI}_{t-1} - \text{NDVI}_{t-28}$ | 4-week vegetation biomass growth/decay rate. |
| | | `vegetative_stress_ratio` | $\text{NDVI}_{t-1} / \text{NDVI}_{\text{baseline}}$ | Biomass deficit indicator relative to historical normal. |
| | | `rain_x_ndvi_interaction` | $R_{t-1} \times \text{NDVI}_{t-1}$ | Compound hydro-vegetative interaction term. |
| **5** | **Agro-Ecological & Harvest Indices (2)** | `harvest_glut_index` | $A_{t-1} \times \mathbb{I}(\text{is\_harvest\_season})$ | Interaction of peak crop harvest with daily arrivals. |
| | | `is_peak_harvest_month` | $\mathbb{I}(\text{Month} \in \text{Harvest\_Calendar}_{\text{crop}})$ | Binary indicator for primary seasonal crop harvesting window. |
| **6** | **Cultural & Festive Drivers (3)** | `is_festive_season` | $\mathbb{I}(\text{Date} \in \text{Festival\_Window})$ | Binary flag for active major cultural festivals. |
| | | `festival_price_anticipation_score`| $\exp(-\lambda \cdot \text{days\_until\_festival})$ | Exponential demand surge leading into festivals ($\lambda = 0.15$). |
| | | `post_festival_demand_hangover`| $\exp(-\mu \cdot \text{days\_since\_festival})$ | Exponential post-festival demand slump decay ($\mu = 0.20$). |
| **7** | **Spatial Transportation Geography (3)** | `dist_to_hub_km` | $D(\text{Mandi}_i, \text{National\_Terminal\_Hub})$ | Great-circle distance to primary national hub (Azadpur/Delhi). |
| | | `hub_price_diff` | $y^{\text{hub}}_{t-1} - y^{\text{local}}_{t-1}$ | Inter-mandi spatial arbitrage price differential. |
| | | `spatial_price_gradient` | $(y^{\text{hub}}_{t-1} - y^{\text{local}}_{t-1}) / \text{dist\_to\_hub\_km}$ | Spatial price gradient per unit transport distance (₹/qtl/km). |
| **8** | **Calendar Seasonality & Regimes (6)** | `sin_month`, `cos_month` | $\sin(2\pi m / 12), \cos(2\pi m / 12)$ | Cyclical annual calendar encodings. |
| | | `sin_dow`, `cos_dow` | $\sin(2\pi d / 7), \cos(2\pi d / 7)$ | Cyclical weekly trading schedule encodings. |
| | | `market_seasonality_deviation`| $y_{t-1} - \text{Median}_{\text{DOY}}(y)$ | Deviation from long-term day-of-year seasonal median. |
| | | `price_regime_indicator` | $\mathbb{I}(y_{t-1} > \bar{y}_{365\text{d}} + 1.5\sigma)$ | Macro inflationary regime indicator. |

---

#### **3.4 Strict Temporal Partitioning and Leakage Prevention**
To ensure rigorous evaluation and prevent lookahead bias, the dataset was strictly partitioned chronologically along calendar boundaries:

```text
Full Master Dataset (135,471 Rows | 2019-01-01 to 2025-12-31)
┌──────────────────────────────────────────────┬──────────────────────┬──────────────────────┐
│            TRAINING PARTITION                │ VALIDATION / CALIBRATION │ OUT-OF-SAMPLE TEST   │
│         2019-01-01 to 2023-12-31             │ 2024-01-01 to 2024-12-31 │ 2025-01-01 to 2025-12-31 │
│             (96,770 rows)                    │     (19,398 rows)    │     (19,303 rows)    │
│  Model Training & Gradient Boosting Splits   │ Optuna Tuning & CQR  │ STRICTLY UNTOUCHED   │
└──────────────────────────────────────────────┴──────────────────────┴──────────────────────┘
```

The temporal split protocol enforces four non-negotiable integrity constraints:
1. **Zero Future Information in Features:** All autoregressive prices, arrival volumes, weather parameters, and satellite NDVI values are strictly lag-shifted by at least one day ($t-1$ relative to forecast target $y_t$). Same-day auction clearing information ($y_t, p^{\min}_t, p^{\max}_t, A_t$) is strictly excluded from the feature space.
2. **Untouched Test Set:** The 2025 holdout partition (19,303 observations) was locked prior to any model selection or hyperparameter tuning. No test observations were ever used for feature selection, scaling parameter estimation, or tree depth selection.
3. **Independent Calibration Split:** Conformal non-conformity calibration parameters ($Q_{\text{conf}}$) were estimated strictly using the 2024 validation partition, completely isolated from both the training gradients and the 2025 test evaluation.
4. **Automated Consistency Verification:** All 10 integrity assertions (zero duplicate rows, exact feature counts, zero target leakage, and index alignment) were formalized into automated unit tests (`backend/tests/test_research_consistency.py`) with a 100% automated pass rate.
