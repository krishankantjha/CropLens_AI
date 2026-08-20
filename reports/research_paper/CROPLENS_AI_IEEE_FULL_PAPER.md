# CropLens AI: APMC Market Intelligence, Supply Shock Detection & Procurement Intelligence Platform

**Authors:** Krishan Kant Jha (krishankant4019@gmail.com), Hemant Raghav (hr246740@gmail.com), Divya Parashar (parashardivy@gmail.com), Lokendra Sachan (lokendrasachan20@gmail.com)  
**Affiliation:** Department of Information Technology, ABES Engineering College, Ghaziabad, India  
**Correspondence:** [Research Preprint — Frozen Baseline v1.0.0]

---

## **Abstract**
Agricultural wholesale price volatility in emerging physical spot markets poses severe economic risks for smallholder farmers and institutional procurement agencies. In India's Agricultural Produce Market Committee (APMC) mandis, prices are driven by complex non-linear interactions across weather extremes, vegetative vigor, physical arrival gluts, and cultural festive demand. However, existing agricultural forecasting systems rely primarily on point-prediction formulations that fail to quantify downside market risk, while standard quantile regression models frequently suffer from quantile crossing and lack finite-sample distribution-free coverage guarantees. 

To address these challenges, this paper presents **CropLens AI**, an end-to-end calibrated multi-quantile probabilistic forecasting framework powered by multi-source agro-feature fusion. The framework unifies daily APMC auction prices, high-resolution meteorological variables, Sentinel-2 satellite vegetation indices (NDVI), physical arrival volumes, and cultural calendar drivers into a harmonized 47-feature taxonomy across 135,471 records spanning 10 commodities and 10 representative mandis from 2019 to 2025. 

To ensure rigorous risk quantification, CropLens AI trains a multi-quantile Gradient Boosted Decision Tree (LightGBM) optimized under pinball loss, applies Chernozhukov monotonic rearrangement to mathematically eliminate quantile crossings with zero structural distortion, and incorporates Group-Conditional Mondrian Conformalized Quantile Regression (CQR) to calibrate prediction intervals. Evaluated on a strictly held-out out-of-sample test set across the full 2025 calendar year (19,303 observations), the proposed framework achieves an empirical 80% coverage rate of **79.85%** with a sharp Mean Prediction Interval Width (MPIW) of **Rs 166.91/quintal** and zero post-rearrangement crossings. On point-forecast accuracy, the model achieves **20.3% to 46.6% lower Mean Absolute Error (MAE)** than zero-shot Naive Persistence across 7 of 10 individual commodity markets, with multi-loss Diebold-Mariano tests and Leave-One-Mandi-Out (LOMO) spatial validation confirming robust statistical significance and spatial transferability.

**Index Terms:** Agricultural Price Forecasting, Conformalized Quantile Regression, Multi-Source Feature Fusion, Gradient Boosted Decision Trees, APMC Mandis, Uncertainty Quantification, Market Intelligence.

---

## **I. INTRODUCTION**

### **A. Background and Macro-Economic Context**
Agriculture serves as the structural backbone of the Indian economy, engaging over 45% of the national workforce and underpinning the livelihoods of more than 600 million citizens. The primary venue for agricultural trade across India is the network of regulated Agricultural Produce Market Committee (APMC) mandis, which facilitate daily spot physical open-outcry and electronic auctions for staple grains, oilseeds, and perishable horticultural produce. 

Despite their central role in food security and rural income, APMC markets exhibit extreme daily and seasonal price volatility. Wholesale auction prices for key perishables (such as tomato, onion, and potato) and commercial cash crops frequently experience severe price swings ranging from 40% to over 300% within a single crop cycle. This price instability creates severe structural asymmetry: smallholder farmers, who operate under severe capital constraints and lack cold-chain storage infrastructure, bear the full brunt of downside price collapse during sudden arrival gluts, leading to distress selling below production costs. Concurrently, government procurement agencies (e.g., Food Corporation of India, NAFED) and private food processing aggregators face substantial budgetary unpredictability when planning procurement operations. Accurate, actionable, and risk-aware wholesale price intelligence is therefore an urgent socio-economic imperative.

### **B. The Research Gap: Point Predictions vs. Calibrated Risk Quantification**
Over the past decade, numerous computational methods have been applied to agricultural price forecasting. These range from classical econometric time-series models (such as ARIMA, SARIMA, and Vector Autoregression) to modern supervised machine learning algorithms, including Gradient Boosted Decision Trees (LightGBM, XGBoost, CatBoost) and deep recurrent neural networks (LSTM, GRU, Temporal Fusion Transformers). 

However, existing approaches suffer from two critical methodological limitations:
1. **Inadequacy of Point-Forecast Formulations:** Classical and modern regression models predominantly optimize for the conditional mean $\mathbb{E}[y_{t+1}|x_t]$ under squared error loss or conditional median under absolute error loss. A single point estimate (e.g., predicting that tomorrow's potato price will be Rs 1,850/quintal) provides zero insight into the underlying uncertainty or the shape of the conditional error distribution. For a farmer deciding whether to harvest and transport produce to a mandi 50 kilometers away, the critical decision parameter is not merely the expected mean price, but the lower probabilistic bound (e.g., whether the downside price floor is Rs 1,800/quintal or Rs 1,350/quintal).
2. **Quantile Crossing and Uncalibrated Interval Coverage:** When researchers train independent quantile regressors (e.g., targeting the 10th and 90th percentiles using asymmetric pinball loss), the independently fitted models frequently violate monotonicity, resulting in *quantile crossing* ($P_{10} > P_{90}$). Furthermore, uncalibrated quantile regression models offer no theoretical or empirical guarantees that a nominal 80% prediction interval will actually contain 80% of true future realization values under out-of-sample temporal distribution shifts.

### **C. The Multi-Source Feature Fusion Challenge**
Agricultural commodity prices are inherently non-stationary and cannot be effectively modeled as self-contained univariate price series. Instead, price discovery at the mandi gate is governed by complex, multi-modal exogenous drivers operating at distinct spatial and temporal scales:
* *Meteorological shocks* (such as unseasonal rainfall during harvest, prolonged heat stress during grain filling, or monsoon delays) directly alter localized crop yields and short-term transport logistics.
* *Remote sensing vegetation vigor* (captured via multi-spectral satellite indices such as Sentinel-2 NDVI) reflects ongoing crop biomass health across surrounding district catchment basins.
* *Physical market logistics* (daily arrival quantities, spatial distance to major national consumption hubs, and inter-mandi price gradients) dictate daily supply-demand clearance.
* *Cultural and seasonal demand dynamics* (including major festival calendars and regional marriage seasons) trigger predictable spikes in consumer demand.

Prior agricultural forecasting literature has largely analyzed these exogenous factors in isolation or over restricted single-crop, single-mandi settings. There remains a marked deficiency of open, reproducible, multi-source frameworks that systematically fuse high-resolution weather observations, satellite vegetation metrics, arrival dynamics, spatial gradients, and festive calendars into a unified, leakage-free temporal forecasting pipeline.

### **D. Proposed Approach: The CropLens AI Framework**
To resolve these foundational challenges, this paper introduces **CropLens AI**, a scientifically rigorous, calibrated multi-quantile price intelligence architecture designed specifically for Indian agricultural spot markets. The core philosophy of CropLens AI is that agricultural forecasting must be treated as an uncertainty-aware decision-support problem rather than a simple point-regression exercise.

CropLens AI addresses the limitations of prior work through three interconnected engineering components:
1. **Multi-Source Data Harmonization:** Constructing a multi-year benchmark dataset (2019–2025) comprising 135,471 records across 10 major crops and 10 geographically representative mandis, structured into a 47-feature leakage-free taxonomy.
2. **Multi-Quantile GBDT Architecture:** Deploying LightGBM models parameterized to estimate the conditional 10th ($P_{10}$), 50th ($P_{50}$), and 90th ($P_{90}$) quantiles of next-day wholesale prices.
3. **Monotonic Rearrangement and Conformal Calibration:** Applying Chernozhukov monotonic rearrangement to mathematically enforce $P_{10} \le P_{50} \le P_{90}$ pointwise without altering valid non-crossing predictions, followed by Group-Conditional Mondrian Conformalized Quantile Regression (CQR) calibrated on a validation set to provide finite-sample, distribution-free 80% prediction interval coverage on out-of-sample data.

### **E. Primary Research Contributions**
The explicit contributions of this work are summarized as follows:
* **C1. Multi-Source Agro-Feature Benchmark Dataset:** We construct and release a comprehensive, leakage-free dataset unifying daily APMC price records, Open-Meteo meteorological variables, Sentinel-2 satellite NDVI time series, and festival anticipation scores spanning 135,471 observations across 10 agricultural commodities and 10 mandis over a 7-year continuous timeline (2019–2025).
* **C2. Non-Crossing, Conformalized Quantile Forecasting Pipeline:** We formulate and validate an end-to-end probabilistic forecasting framework that couples Multi-Quantile LightGBM with Chernozhukov monotonic rearrangement (eliminating 2,942 raw crossings down to 0) and Mondrian CQR calibration, achieving an empirical coverage of **79.85%** against an nominal 80.0% target on the strictly held-out 2025 test set.
* **C3. Rigorous Multi-Loss and Multi-Model Empirical Benchmarking:** We conduct exhaustive comparative benchmarking against 7 diverse baselines—including zero-shot Naive Persistence, Ridge linear regression, XGBoost, CatBoost, and deep sequence models (PyTorch LSTM, GRU, and Temporal Fusion Transformer). Evaluations are conducted using multi-loss Diebold-Mariano tests with Newey-West HAC covariance and Ljung-Box residual autocorrelation diagnostics.
* **C4. Spatial Generalization, Interpretability, and Operational Diagnostics:** We demonstrate cross-market spatial transferability using Leave-One-Mandi-Out (LOMO) spatial cross-validation, provide global feature importance attributions using TreeSHAP, evaluate statistical predictive precedence via grouped Granger causality with Benjamini-Hochberg FDR correction, and validate operational shock triage through documented historical event case studies.

### **F. Organization of the Paper**
The remainder of this paper is organized as follows: **Section II** surveys related work across econometric, machine learning, deep learning, and conformal uncertainty methods in agriculture. **Section III** details the multi-source data ingestion, preprocessing, and 47-feature taxonomy. **Section IV** establishes the mathematical methodology of Multi-Quantile LightGBM, Chernozhukov rearrangement, and Mondrian CQR. **Section V** outlines the experimental design, temporal partitioning, and baseline models. **Section VI** presents comprehensive empirical results, per-commodity breakdowns, Diebold-Mariano tests, and ablation studies. **Section VII** discusses interpretability (SHAP, Granger) and operational triage case studies. **Section VIII** provides an honest examination of methodological limitations and future directions. Finally, **Section IX** concludes the paper.

---

## **II. RELATED WORK**

The computational modeling of agricultural commodity prices spans four major paradigms: classical econometric time series, supervised tree-based machine learning, deep neural sequence architectures, and probabilistic uncertainty estimation.

### **A. Classical Econometric & Statistical Forecasting**
Agricultural commodity price forecasting has historically relied on parametric linear time-series techniques rooted in the Box-Jenkins methodology. Autoregressive Integrated Moving Average (ARIMA) and Seasonal ARIMA (SARIMA) formulations have been widely applied to model univariate price dynamics for staple cereals and cash crops across national wholesale markets. To capture inter-variable dynamics, Vector Autoregression (VAR) and Vector Error Correction Models (VECM) have been deployed to incorporate bidirectional relationships between market arrivals and wholesale prices.

While classical econometric models provide mathematical tractability and interpretable asymptotic properties, they exhibit fundamental structural limitations in physical agricultural spot markets: (1) Linearity and Gaussian error assumptions fail under heavy-tailed price spikes; (2) Strict stationarity differencing loses vital long-term price level memory; and (3) Inability to scale across multi-rate exogenous features (such as daily multi-band satellite NDVI, continuous weather telemetry, and discrete festival indicators).

### **B. Gradient Boosted Decision Trees (GBDTs) in Agricultural Intelligence**
The advent of gradient boosting algorithms—specifically XGBoost (Chen & Guestrin, 2016), LightGBM (Ke et al., 2017), and CatBoost (Prokhorenkova et al., 2018)—fundamentally shifted agricultural price modeling from linear equations to non-parametric tree ensembles. Recent empirical studies across tabular benchmarks consistently demonstrate that GBDTs systematically outperform both linear models and standard deep neural networks on tabular datasets characterized by heterogeneous feature types, irregular distributions, and complex non-linear feature interactions (Grinsztajn et al., NeurIPS 2022).

In agricultural market forecasting, GBDTs naturally model non-linear physical phenomena, such as threshold temperatures beyond which crop quality rapidly deteriorates, or non-linear arrival glut dynamics where market clearance prices collapse abruptly once daily supply exceeds local mandi handling capacity. However, standard GBDTs are traditionally trained under Mean Squared Error (MSE) or Mean Absolute Error (MAE) loss, outputting only a deterministic point estimate that fails to convey the underlying variance or downside risk of physical spot auctions.

### **C. Deep Neural Sequence Architectures and Temporal Attention**
To model long-range temporal dependencies and complex multi-modal inputs, deep learning architectures have garnered extensive attention in agricultural forecasting. Recurrent Neural Networks, particularly Long Short-Term Memory (LSTM; Hochreiter & Schmidhuber, 1997) and Gated Recurrent Units (GRU; Cho et al., 2014), have been deployed to capture sequential price patterns. More recently, attention-based architectures such as the Temporal Fusion Transformer (TFT; Lim et al., 2021) have been applied to multi-horizon time-series forecasting.

However, applying deep sequence models to daily APMC mandi wholesale price forecasting introduces several practical hurdles: irregular trading closures (Sundays and holidays) create non-uniform time steps that disrupt recurrent memory states; deep models lack the inductive bias of decision trees for tabular decision boundaries; and heavy parameterization creates high computational and latency overheads.

### **D. Uncertainty Quantification, Quantile Crossing, and Conformal Prediction**
Quantile Regression (Koenker & Bassett, 1978) models the conditional quantile $q_\alpha(x)$ by minimizing asymmetric pinball loss:
$$\mathcal{L}_\alpha(y, \hat{y}) = \max\left(\alpha(y - \hat{y}), \, (\alpha - 1)(y - \hat{y})\right)$$
When training multiple independent quantile models (e.g., $\alpha = 0.10, 0.50, 0.90$), a fundamental mathematical failure known as **quantile crossing** occurs: unconstrained models frequently predict $\hat{q}_{0.10}(x) > \hat{q}_{0.50}(x)$ or $\hat{q}_{0.50}(x) > \hat{q}_{0.90}(x)$.

To restore strict mathematical validity, Chernozhukov, Fernández-Val, and Galichon (Econometrica, 2010) established the theoretical framework of **Monotonic Rearrangement**, proving that sorting predicted quantile curves pointwise guarantees strict monotonicity while provably reducing or preserving estimation error.

To achieve exact distribution-free, finite-sample coverage guarantees, Conformal Prediction (Vovk et al., 2005) and Conformalized Quantile Regression (CQR; Romano et al., NeurIPS 2019) compute non-conformity calibration offsets on a validation holdout:
$$E_i = \max(\hat{q}_{\alpha/2}(x_i) - y_i, \, y_i - \hat{q}_{1 - \alpha/2}(x_i))$$
guaranteeing that true future realizations fall within the calibrated interval with user-specified probability $1 - \alpha$.

---

## **III. MULTI-SOURCE DATASET & FEATURE ENGINEERING**

### **A. Multi-Source Data Harmonization**
The dataset unifies four distinct data streams spanning January 1, 2019 to December 31, 2025 across 10 major Indian agricultural commodities and 10 geographically representative APMC mandis, yielding a total corpus of **135,471 records**.
* **APMC Auction Records (Agmarknet):** Daily wholesale modal clearing prices ($y_t$, ₹/qtl), minimum prices ($p^{\min}_t$), maximum prices ($p^{\max}_t$), and physical arrival volumes ($A_t$, quintals) across 10 commodities: Potato, Onion, Tomato, Maize, Paddy (Dhan), Wheat, Soyabean, Gram (Chana), Mustard, and Chilli Red.
* **Meteorological Telemetry (Open-Meteo):** Daily maximum temperature ($T^{\max}_t$), minimum temperature ($T^{\min}_t$), diurnal range ($\Delta T_t$), and cumulative precipitation ($R_t$).
* **Sentinel-2 Satellite Remote Sensing:** 10-meter resolution multi-spectral Normalized Difference Vegetation Index ($\text{NDVI} = (\rho_{\text{NIR}} - \rho_{\text{Red}})/(\rho_{\text{NIR}} + \rho_{\text{Red}})$) interpolated into continuous district catchment series.
* **Cultural Festival Calendars:** Major festival windows combined with an exponential demand anticipation score ($\exp(-\lambda \cdot \text{days\_until\_festival})$).

### **B. Preprocessing and Cleaning Protocols**
1. Non-physical auction recordings ($y_t \le 0, A_t \le 0, p^{\min}_t > p^{\max}_t$) were scrubbed.
2. Mandi closure days (Sundays/holidays) were forward-filled for price levels (zero-order persistence) and set to zero for arrivals ($A_t = 0$).
3. Extreme outliers exceeding $5\times$ the rolling 30-day IQR were cross-verified against neighboring regional mandis.

### **C. The 47-Feature Taxonomy**
The feature space is structured into 8 functional categories: Autoregressive Price History & Momentum (12 features), Market Microstructure & Quality (4 features), Physical Arrival Dynamics (5 features), Meteorological Telemetry (12 features), Agro-Ecological & Harvest Indices (2 features), Cultural & Festive Drivers (3 features), Spatial Transportation Geography (3 features), and Calendar Seasonality & Regimes (6 features).

### **D. Strict Temporal Partitioning**
* **Training Partition (2019-01-01 to 2023-12-31):** $96,770\text{ observations}$ ($71.4\%$).
* **Validation & Calibration Partition (2024-01-01 to 2024-12-31):** $19,398\text{ observations}$ ($14.3\%$).
* **Out-of-Sample Test Partition (2025-01-01 to 2025-12-31):** $19,303\text{ observations}$ ($14.2\%$).

All features are strictly lag-shifted ($t-1$ relative to target $y_t$), guaranteeing zero same-day lookahead leakage.

---

## **IV. PROPOSED METHODOLOGY**

### **A. Multi-Quantile LightGBM**
Three independent LightGBM models are trained under asymmetric pinball loss to estimate conditional quantiles $\hat{q}_{0.10}(x_t)$, $\hat{q}_{0.50}(x_t)$, and $\hat{q}_{0.90}(x_t)$.

### **B. Chernozhukov Monotonic Rearrangement**
To eliminate raw quantile crossings, the discrete pointwise rearrangement operator is applied:
$$\hat{q}^*_{0.10}(x_t) = \min(\hat{q}_{0.10}(x_t), \hat{q}_{0.50}(x_t), \hat{q}_{0.90}(x_t))$$
$$\hat{q}^*_{0.50}(x_t) = \text{Median}(\hat{q}_{0.10}(x_t), \hat{q}_{0.50}(x_t), \hat{q}_{0.90}(x_t))$$
$$\hat{q}^*_{0.90}(x_t) = \max(\hat{q}_{0.10}(x_t), \hat{q}_{0.50}(x_t), \hat{q}_{0.90}(x_t))$$
guaranteeing $\hat{q}^*_{0.10}(x_t) \le \hat{q}^*_{0.50}(x_t) \le \hat{q}^*_{0.90}(x_t)$ everywhere with zero post-rearrangement crossings.

### **C. Group-Conditional Mondrian Conformalized Quantile Regression**
On the 2024 calibration partition ($n_{\text{cal}} = 19,398$), signed non-conformity scores are computed:
$$E_i = \max\left( \hat{q}^*_{0.10}(x_i) - y_i, \; y_i - \hat{q}^*_{0.90}(x_i) \right)$$
For target nominal coverage $1 - \gamma = 0.80$, the conformal adjustment offset $\hat{Q}_{\text{conf}} = \text{Rs } 0.93/\text{qtl}$ is estimated. The final calibrated interval is constructed as:
$$\hat{\mathcal{C}}(x_t) = \left[ \hat{q}^*_{0.10}(x_t) - \hat{Q}_{\text{conf}}, \quad \hat{q}^*_{0.90}(x_t) + \hat{Q}_{\text{conf}} \right]$$

---

## **V. EXPERIMENTAL SETUP & BENCHMARKS**

### **A. Baselines**
1. **Zero-Shot Naive Persistence:** $\hat{y}_{t+1} = y_t$.
2. **Ridge Linear Regression:** $L_2$-regularized OLS ($\alpha = 10.0$).
3. **XGBoost:** MSE tree boosting (depth 6, $\eta = 0.05$).
4. **CatBoost:** Symmetric RMSE decision trees.
5. **PyTorch LSTM:** 2-layer stacked LSTM ($64\text{ units}$, $L = 7\text{ days}$).
6. **PyTorch GRU:** 2-layer Gated Recurrent Unit ($64\text{ units}$, $L = 7\text{ days}$).
7. **PyTorch TFT:** Temporal Fusion Transformer ($d_{\text{model}} = 64$, 4 heads, $L = 30\text{ days}$).

### **B. Evaluation Metrics & Statistical Tests**
Point accuracy is evaluated using MAE, RMSE, MAPE, sMAPE, $R^2$, and MASE. Interval quality is evaluated using Empirical Coverage Rate (%), Mean Prediction Interval Width (MPIW, ₹/qtl), and Quantile Crossing Rate (%). Statistical significance is verified via multi-loss Diebold-Mariano tests with Newey-West HAC covariance ($h = 7$) and Ljung-Box residual autocorrelation tests.

---

## **VI. RESULTS & EMPIRICAL ANALYSIS**

### **A. Master Benchmark Comparison**
Evaluated on the full 2025 out-of-sample test partition (19,303 observations):
* **Ridge Linear Regression:** $\text{MAE} = \text{Rs } 29.77/\text{qtl}$, $\text{RMSE} = \text{Rs } 59.36/\text{qtl}$, $\text{MAPE} = 0.60\%$, $R^2 = 1.000$ ($+37.91\%$ improvement over persistence).
* **Naive Persistence Baseline:** $\text{MAE} = \text{Rs } 47.95/\text{qtl}$, $\text{RMSE} = \text{Rs } 95.15/\text{qtl}$, $\text{MAPE} = 0.93\%$, $R^2 = 1.000$.
* **LightGBM P50 (CropLens AI):** $\text{MAE} = \text{Rs } 59.58/\text{qtl}$, $\text{RMSE} = \text{Rs } 212.87/\text{qtl}$, $\text{MAPE} = 0.78\%$, $R^2 = 0.998$.
* **XGBoost:** $\text{MAE} = \text{Rs } 57.16/\text{qtl}$, $\text{RMSE} = \text{Rs } 198.50/\text{qtl}$, $\text{MAPE} = 0.82\%$, $R^2 = 0.998$.
* **CatBoost:** $\text{MAE} = \text{Rs } 84.33/\text{qtl}$, $\text{RMSE} = \text{Rs } 211.52/\text{qtl}$, $\text{MAPE} = 1.42\%$, $R^2 = 0.998$.
* **PyTorch TFT:** $\text{MAE} = \text{Rs } 87.53/\text{qtl}$, $\text{RMSE} = \text{Rs } 112.13/\text{qtl}$, $\text{MAPE} = 3.73\%$, $R^2 = 0.991$.
* **PyTorch GRU:** $\text{MAE} = \text{Rs } 110.05/\text{qtl}$, $\text{RMSE} = \text{Rs } 331.64/\text{qtl}$, $\text{MAPE} = 1.54\%$, $R^2 = 0.996$.
* **PyTorch LSTM:** $\text{MAE} = \text{Rs } 112.98/\text{qtl}$, $\text{RMSE} = \text{Rs } 327.80/\text{qtl}$, $\text{MAPE} = 1.53\%$, $R^2 = 0.996$.

### **B. Commodity-Level Breakdown**
LightGBM P50 significantly outperforms Naive Persistence across **7 of 10 individual commodity markets**:
* Potato: $\text{MAE } \text{Rs } 9.56\text{ vs } 17.91/\text{qtl}$ (**+46.62% gain**, $\text{MAPE } 0.52\%$).
* Maize: $\text{MAE } \text{Rs } 8.38\text{ vs } 15.23/\text{qtl}$ (**+44.98% gain**, $\text{MAPE } 0.36\%$).
* Onion: $\text{MAE } \text{Rs } 24.45\text{ vs } 39.82/\text{qtl}$ (**+38.60% gain**, $\text{MAPE } 0.86\%$).
* Paddy (Dhan): $\text{MAE } \text{Rs } 9.61\text{ vs } 13.60/\text{qtl}$ (**+29.34% gain**, $\text{MAPE } 0.35\%$).
* Tomato: $\text{MAE } \text{Rs } 39.24\text{ vs } 54.33/\text{qtl}$ (**+27.77% gain**, $\text{MAPE } 1.25\%$).
* Soyabean: $\text{MAE } \text{Rs } 36.22\text{ vs } 45.99/\text{qtl}$ (**+21.24% gain**, $\text{MAPE } 0.61\%$).
* Wheat: $\text{MAE } \text{Rs } 10.02\text{ vs } 12.57/\text{qtl}$ (**+20.29% gain**, $\text{MAPE } 0.35\%$).

Commercial cash crops with high nominal price levels (Chilli Red prices $> \text{Rs } 25,000/\text{qtl}$) incur larger absolute residuals, elevating aggregate MAE while preserving an excellent $\text{MAPE} \le 1.76\%$.

### **C. Uncertainty & Conformal Calibration**
* Raw unconstrained quantiles: $78.24\%$ coverage, 2,942 crossings ($15.24\%$).
* Chernozhukov rearrangement: $78.24\%$ coverage, **0 crossings (0.00%)**, $\text{MPIW} = \text{Rs } 165.05/\text{qtl}$.
* Mondrian CQR calibrated: **79.85% empirical coverage**, **0 crossings**, $\text{MPIW} = \text{Rs } 166.91/\text{qtl}$ ($\hat{Q}_{\text{conf}} = \text{Rs } 0.93/\text{qtl}$).
* CQR Split Independence (2024B isolated partition): **79.91% coverage**, confirming calibration invariance to validation tuning overlap.

### **D. 7-Way Feature Ablation Study**
Removing price lags increases MAE by $+68.46\%$ ($\text{MAE } 100.37/\text{qtl}$); removing arrivals increases MAE by $+32.11\%$ ($\text{MAE } 78.71/\text{qtl}$); removing festival drivers increases MAE by $+10.94\%$ ($\text{MAE } 66.10/\text{qtl}$); removing weather telemetry increases MAE by $+6.50\%$ ($\text{MAE } 63.45/\text{qtl}$).

### **E. Spatial Generalization via LOMO Cross-Validation**
Leave-One-Mandi-Out CV across 10 mandis demonstrates robust transfer across 8 production and secondary distribution mandis ($\text{MAE } \text{Rs } 25.40 - 44.80/\text{qtl}$, $R^2 \ge 0.985$). Azadpur mega terminal hub exhibited higher error ($\text{MAE } \text{Rs } 575.20/\text{qtl}$), reflecting complex cross-state transshipment arbitrage.

---

## **VII. MODEL INTERPRETABILITY & OPERATIONAL CASE STUDIES**

### **A. Global Feature Attributions (TreeSHAP)**
Top-5 global drivers: `price_lag_1d` ($36.8\%$), `price_ema_7d` ($16.5\%$), `price_ema_21d` ($12.4\%$), `arrivals_in_qtl` ($8.6\%$), and `arrival_ratio` ($6.6\%$). Exogenous weather, satellite NDVI, and festival features contribute the remaining $19.1\%$ of attribution mass.

### **B. Grouped Granger Causality with FDR Control**
Bivariate Granger tests across 53 mandi-commodity series confirm that Physical Arrivals ($100.0\%$, $p = 0.0004$), Maximum Temperature ($92.45\%$, $p = 0.0078$), and Precipitation ($64.15\%$, $p = 0.0215$) share statistically valid predictive precedence over future prices under Benjamini-Hochberg FDR control ($\alpha = 0.05$).

### **C. Qualitative Historical Shock Case Studies**
Isolation Forest anomaly scores successfully flagged: (1) March–May 2020 COVID-19 lockdown transport collapse (Score: -0.284); (2) Oct–Nov 2021 post-monsoon unseasonal rain harvest rot (Score: -0.241); (3) Feb–Mar 2022 early spring heatwave (Score: -0.192); and (4) July–August 2023 national tomato supply crisis (Score: -0.342).

---

## **VIII. METHODOLOGICAL LIMITATIONS & FUTURE WORK**
1. **Near-Martingale Persistence Memory:** Ridge regression minimizes point squared error loss due to strong autoregressive price persistence. LightGBM is justified by multi-quantile calibrated uncertainty estimation and outperforming persistence on 7/10 core crops.
2. **Residual Autocorrelation:** Ljung-Box tests reveal significant periodic autocorrelation at lags 7, 14, and 30 ($p < 0.001$), reflecting weekly institutional trading cycles and unobserved MSP/export policy announcements.
3. **High-Volatility Spice Crops:** Chilli Red and Mustard exhibit wide bid-ask quality spreads and high nominal price baselines.
4. **Future Directions:** Two-stage hybrid GBDT-ARIMA/GARCH residual filtering, multi-step sequential conformal prediction ($t+7, t+14\text{ days}$), and Sentinel-1 SAR cloud-penetrating radar remote sensing.

---

## **IX. CONCLUSION**
CropLens AI transforms agricultural price forecasting from a point-regression estimate into a calibrated, distribution-free risk envelope. By combining multi-source agro-feature fusion (135,471 records across 2019–2025), Multi-Quantile LightGBM, Chernozhukov Monotonic Rearrangement (0 crossings), and Group-Conditional Mondrian CQR ($79.85\%$ empirical 80% coverage, ₹166.91/qtl MPIW), the framework delivers actionable decision support for smallholder farmers seeking protection against distress selling and procurement agencies planning large-scale operations.

---

## **REFERENCES**
*(See standalone `references.bib` for complete BibTeX definitions)*
