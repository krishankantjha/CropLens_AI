# CropLens AI — Research Paper Draft
## Front Matter & Section I: Introduction

---

### **Title**
**Calibrated Multi-Quantile Conformal Forecasting and Multi-Source Feature Fusion for Agricultural Market Intelligence**

---

### **Abstract**
Agricultural wholesale price volatility in emerging physical spot markets poses severe economic risks for smallholder farmers and institutional procurement agencies. In India's Agricultural Produce Market Committee (APMC) mandis, prices are driven by complex non-linear interactions across weather extremes, vegetative vigor, physical arrival gluts, and cultural festive demand. However, existing agricultural forecasting systems rely primarily on point-prediction formulations that fail to quantify downside market risk, while standard quantile regression models frequently suffer from quantile crossing and lack finite-sample distribution-free coverage guarantees. 

To address these challenges, this paper presents **CropLens AI**, an end-to-end calibrated multi-quantile probabilistic forecasting framework powered by multi-source agro-feature fusion. The framework unifies daily APMC auction prices, high-resolution meteorological variables, Sentinel-2 satellite vegetation indices (NDVI), physical arrival volumes, and cultural calendar drivers into a harmonized 47-feature taxonomy across 135,471 records spanning 10 commodities and 10 representative mandis from 2019 to 2025. 

To ensure rigorous risk quantification, CropLens AI trains a multi-quantile Gradient Boosted Decision Tree (LightGBM) optimized under pinball loss, applies Chernozhukov monotonic rearrangement to mathematically eliminate quantile crossings with zero structural distortion, and incorporates Group-Conditional Mondrian Conformalized Quantile Regression (CQR) to calibrate prediction intervals. Evaluated on a strictly held-out out-of-sample test set across the full 2025 calendar year (19,303 observations), the proposed framework achieves an empirical 80% coverage rate of **79.85%** with a sharp Mean Prediction Interval Width (MPIW) of **Rs 166.91/quintal** and zero post-rearrangement crossings. On point-forecast accuracy, the model achieves **20.3% to 46.6% lower Mean Absolute Error (MAE)** than zero-shot Naive Persistence across 7 of 10 individual commodity markets, with multi-loss Diebold-Mariano tests and Leave-One-Mandi-Out (LOMO) spatial validation confirming robust statistical significance and spatial transferability.

**Keywords:** Agricultural Price Forecasting, Conformalized Quantile Regression, Multi-Source Feature Fusion, Gradient Boosted Decision Trees, APMC Mandis, Uncertainty Quantification, Market Intelligence.

---

### **Section I: Introduction**

#### **1.1 Background and Macro-Economic Context**
Agriculture serves as the structural backbone of the Indian economy, engaging over 45% of the national workforce and underpinning the livelihoods of more than 600 million citizens. The primary venue for agricultural trade across India is the network of regulated Agricultural Produce Market Committee (APMC) mandis, which facilitate daily spot physical open-outcry and electronic auctions for staple grains, oilseeds, and perishable horticultural produce. 

Despite their central role in food security and rural income, APMC markets exhibit extreme daily and seasonal price volatility. Wholesale auction prices for key perishables (such as tomato, onion, and potato) and commercial cash crops frequently experience severe price swings ranging from 40% to over 300% within a single crop cycle. This price instability creates severe structural asymmetry: smallholder farmers, who operate under severe capital constraints and lack cold-chain storage infrastructure, bear the full brunt of downside price collapse during sudden arrival gluts, leading to distress selling below production costs. Concurrently, government procurement agencies (e.g., Food Corporation of India, NAFED) and private food processing aggregators face substantial budgetary unpredictability when planning procurement operations. Accurate, actionable, and risk-aware wholesale price intelligence is therefore an urgent socio-economic imperative.

#### **1.2 The Research Gap: Point Predictions vs. Calibrated Risk Quantification**
Over the past decade, numerous computational methods have been applied to agricultural price forecasting. These range from classical econometric time-series models (such as ARIMA, SARIMA, and Vector Autoregression) to modern supervised machine learning algorithms, including Gradient Boosted Decision Trees (LightGBM, XGBoost, CatBoost) and deep recurrent neural networks (LSTM, GRU, Temporal Fusion Transformers). 

However, existing approaches suffer from two critical methodological limitations:
1. **Inadequacy of Point-Forecast Formulations:** Classical and modern regression models predominantly optimize for the conditional mean $\mathbb{E}[y_{t+1}|x_t]$ under squared error loss or conditional median under absolute error loss. A single point estimate (e.g., predicting that tomorrow's potato price will be Rs 1,850/quintal) provides zero insight into the underlying uncertainty or the shape of the conditional error distribution. For a farmer deciding whether to harvest and transport produce to a mandi 50 kilometers away, the critical decision parameter is not merely the expected mean price, but the lower probabilistic bound (e.g., whether the downside price floor is Rs 1,800/quintal or Rs 1,350/quintal).
2. **Quantile Crossing and Uncalibrated Interval Coverage:** When researchers train independent quantile regressors (e.g., targeting the 10th and 90th percentiles using asymmetric pinball loss), the independently fitted models frequently violate monotonicity, resulting in *quantile crossing* ($P_{10} > P_{90}$). Furthermore, uncalibrated quantile regression models offer no theoretical or empirical guarantees that an nominal 80% prediction interval will actually contain 80% of true future realization values under out-of-sample temporal distribution shifts.

#### **1.3 The Multi-Source Feature Fusion Challenge**
Agricultural commodity prices are inherently non-stationary and cannot be effectively modeled as self-contained univariate price series. Instead, price discovery at the mandi gate is governed by complex, multi-modal exogenous drivers operating at distinct spatial and temporal scales:
* *Meteorological shocks* (such as unseasonal rainfall during harvest, prolonged heat stress during grain filling, or monsoon delays) directly alter localized crop yields and short-term transport logistics.
* *Remote sensing vegetation vigor* (captured via multi-spectral satellite indices such as Sentinel-2 NDVI) reflects ongoing crop biomass health across surrounding district catchment basins.
* *Physical market logistics* (daily arrival quantities, spatial distance to major national consumption hubs, and inter-mandi price gradients) dictate daily supply-demand clearance.
* *Cultural and seasonal demand dynamics* (including major festival calendars and regional marriage seasons) trigger predictable spikes in consumer demand.

Prior agricultural forecasting literature has largely analyzed these exogenous factors in isolation or over restricted single-crop, single-mandi settings. There remains a marked deficiency of open, reproducible, multi-source frameworks that systematically fuse high-resolution weather observations, satellite vegetation metrics, arrival dynamics, spatial gradients, and festive calendars into a unified, leakage-free temporal forecasting pipeline.

#### **1.4 Proposed Approach: The CropLens AI Framework**
To resolve these foundational challenges, this paper introduces **CropLens AI**, a scientifically rigorous, calibrated multi-quantile price intelligence architecture designed specifically for Indian agricultural spot markets. The core philosophy of CropLens AI is that agricultural forecasting must be treated as an uncertainty-aware decision-support problem rather than a simple point-regression exercise.

CropLens AI addresses the limitations of prior work through three interconnected engineering components:
1. **Multi-Source Data Harmonization:** Constructing a multi-year benchmark dataset (2019–2025) comprising 135,471 records across 10 major crops and 10 geographically representative mandis, structured into a 47-feature leakage-free taxonomy.
2. **Multi-Quantile GBDT Architecture:** Deploying LightGBM models parameterized to estimate the conditional 10th ($P_{10}$), 50th ($P_{50}$), and 90th ($P_{90}$) quantiles of next-day wholesale prices.
3. **Monotonic Rearrangement and Conformal Calibration:** Applying Chernozhukov monotonic rearrangement to mathematically enforce $P_{10} \le P_{50} \le P_{90}$ pointwise without altering valid non-crossing predictions, followed by Group-Conditional Mondrian Conformalized Quantile Regression (CQR) calibrated on a validation set to provide finite-sample, distribution-free 80% prediction interval coverage on out-of-sample data.

#### **1.5 Primary Research Contributions**
The explicit contributions of this work are summarized as follows:
* **C1. Multi-Source Agro-Feature Benchmark Dataset:** We construct and release a comprehensive, leakage-free dataset unifying daily APMC price records, Open-Meteo meteorological variables, Sentinel-2 satellite NDVI time series, and festival anticipation scores spanning 135,471 observations across 10 agricultural commodities and 10 mandis over a 7-year continuous timeline (2019–2025).
* **C2. Non-Crossing, Conformalized Quantile Forecasting Pipeline:** We formulate and validate an end-to-end probabilistic forecasting framework that couples Multi-Quantile LightGBM with Chernozhukov monotonic rearrangement (eliminating 2,942 raw crossings down to 0) and Mondrian CQR calibration, achieving an empirical coverage of **79.85%** against an nominal 80.0% target on the strictly held-out 2025 test set.
* **C3. Rigorous Multi-Loss and Multi-Model Empirical Benchmarking:** We conduct exhaustive comparative benchmarking against 7 diverse baselines—including zero-shot Naive Persistence, Ridge linear regression, XGBoost, CatBoost, and deep sequence models (PyTorch LSTM, GRU, and Temporal Fusion Transformer). Evaluations are conducted using multi-loss Diebold-Mariano tests with Newey-West HAC covariance and Ljung-Box residual autocorrelation diagnostics.
* **C4. Spatial Generalization, Interpretability, and Operational Diagnostics:** We demonstrate cross-market spatial transferability using Leave-One-Mandi-Out (LOMO) spatial cross-validation, provide global feature importance attributions using TreeSHAP, evaluate statistical predictive precedence via grouped Granger causality with Benjamini-Hochberg FDR correction, and validate operational shock triage through documented historical event case studies.

#### **1.6 Organization of the Paper**
The remainder of this paper is organized as follows: **Section II** surveys related work across econometric, machine learning, deep learning, and conformal uncertainty methods in agriculture. **Section III** details the multi-source data ingestion, preprocessing, and 47-feature taxonomy. **Section IV** establishes the mathematical methodology of Multi-Quantile LightGBM, Chernozhukov rearrangement, and Mondrian CQR. **Section V** outlines the experimental design, temporal partitioning, and baseline models. **Section VI** presents comprehensive empirical results, per-commodity breakdowns, Diebold-Mariano tests, and ablation studies. **Section VII** discusses interpretability (SHAP, Granger) and operational triage case studies. **Section VIII** provides an honest examination of methodological limitations and future directions. Finally, **Section IX** concludes the paper.
