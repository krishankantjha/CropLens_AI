# CropLens AI — Research Paper Draft
## Section VIII: Methodological Limitations & Future Directions

---

### **Section VIII: Methodological Limitations & Future Directions**

Scientific transparency requires an objective examination of model limitations and boundaries. This section provides an honest analysis of the methodological constraints identified during our empirical evaluation and outlines promising directions for future research.

```text
Section VIII Limitations & Future Roadmap
├── 8.1 Near-Martingale Memory & Linear Point-Prediction Advantage
├── 8.2 Institutional Periodicities & Residual Autocorrelation Structure
├── 8.3 Heavy-Tailed Volatility in Commercial Spice & Cash Crop Markets
├── 8.4 Geographic Representation & Deep Sequence Benchmark Scope
└── 8.5 Concrete Directions for Future Research
```

---

#### **8.1 Near-Martingale Price Memory & Linear Model Superiority under Squared Loss**
A central empirical finding of our benchmark evaluation is that regularized linear regression (Ridge) achieves a lower aggregate point-forecast error ($\text{MAE} = \text{Rs } 29.77/\text{qtl}$, $\text{RMSE} = \text{Rs } 59.36/\text{qtl}$) than tree-based ensembles (LightGBM $\text{MAE} = \text{Rs } 59.58/\text{qtl}$, XGBoost $\text{MAE} = \text{Rs } 57.16/\text{qtl}$) on the full 2025 out-of-sample test partition.

##### **Root Cause and Economic Tradeoff:**
1. **Near-Martingale Autoregressive Inertia:** Agricultural spot wholesale prices exhibit strong persistence ($r > 0.98$ between $y_{t+1}$ and $y_t$). Under stationary market conditions, an unconstrained linear combination of price levels, moving averages, and spreads tracks day-to-day fluctuations with minimal variance.
2. **Loss Function Asymmetry:** Ridge and XGBoost are optimized directly to minimize squared error loss ($\mathcal{L}_2$). In contrast, LightGBM P50 is trained under asymmetric pinball loss ($\alpha = 0.50$, equivalent to median regression under $L_1$ loss) to anchor the lower ($P_{10}$) and upper ($P_{90}$) quantiles.
3. **The Risk Quantification Tradeoff:** While Ridge minimizes mean squared error, it produces strictly a deterministic scalar output, providing zero quantification of downside price risk or non-linear supply-glut thresholds. LightGBM is retained as the operational foundation because it enables mathematically guaranteed, non-crossing prediction intervals ($79.85\%$ empirical coverage via CQR) and significantly outperforms persistence across 7 of 10 individual commodity markets.

---

#### **8.2 Periodic Residual Autocorrelation and Institutional Market Drivers**
Ljung-Box diagnostic tests (Section VI.8) revealed statistically significant residual autocorrelation at weekly ($Q(7) = 60.454, p < 0.001$) and monthly ($Q(30) = 752.038, p < 0.001$) lags, indicating that systematic temporal structure remains uncaptured by the tree ensemble.

##### **Underlying Structural Drivers:**
* **Institutional Mandi Trading Schedules:** Indian APMC mandis operate under discrete institutional schedules (weekly settlement cycles, Sunday closures, and regional auction schedules) that induce periodic supply-clearing rhythms.
* **Unobserved Macroeconomic Policy Interventions:** Agricultural prices are subject to sudden, unmodeled government interventions, including sudden adjustments to central Minimum Support Prices (MSP), sudden export restrictions (e.g., onion and wheat export bans), buffer stock liquidation releases, and stock holding limits imposed on private traders. Because policy decisions are not captured in numerical telemetry, their market impacts appear as temporally correlated residual shifts.

---

#### **8.3 Heavy-Tailed Volatility in Commercial Spice Markets**
While LightGBM P50 substantially outperforms persistence across staple food grains and perishables ($+20\%$ to $+47\%$ MAE gains across potato, maize, onion, paddy, tomato, soyabean, and wheat), its aggregate MAE is disproportionately elevated by commercial cash crops, specifically **Chilli Red** ($\text{MAE} = \text{Rs } 421.11/\text{qtl}$) and **Mustard** ($\text{MAE} = \text{Rs } 98.59/\text{qtl}$).

##### **Market Microstructure Factors:**
* **Extreme Nominal Price Baselines:** Commercial spices trade at high nominal price levels (Chilli Red frequently trades between ₹20,000 and ₹35,000 per quintal, compared to ₹1,500–₹2,500/qtl for potato and wheat). Consequently, even a minimal percentage error ($1.76\%$) translates into a large absolute rupee residual.
* **Non-Standardized Quality Grading and Bid-Ask Dispersion:** Physical spice auctions feature wide quality grading differentials (moisture content, color value, pod breakage) that generate broad daily price spreads unobserved in standardized cereal auctions.

---

#### **8.4 Geographic Representation & Deep Sequence Benchmark Scope**
* **Geographic Coverage:** While the 10 selected APMC mandis represent diverse agricultural zones (Punjab, Uttar Pradesh, Madhya Pradesh, Maharashtra, Andhra Pradesh, West Bengal, and Delhi), future extensions must evaluate spatial transfer across southern peninsula mandis and northeastern regional markets.
* **Deep Learning Benchmark Scope:** Recurrent (LSTM, GRU) and attention-based (TFT) architectures were evaluated under standardized prototype configurations rather than exhaustive Optuna hyperparameter tuning. While these baselines confirm that tabular GBDTs offer superior computational and operational efficiency on daily tabular records, we explicitly qualify that they serve as proof-of-concept sequence baselines rather than establishing definitive theoretical limits of deep neural architectures.

---

#### **8.5 Directions for Future Research**
Based on the empirical insights and limitations identified in this work, we highlight three concrete avenues for future exploration:

1. **Hybrid GBDT-ARIMA/GARCH Residual Filtering:** To eliminate the weekly periodic autocorrelation diagnosed by our Ljung-Box tests, future architectures can implement a two-stage hybrid framework where non-linear feature interactions are modeled via Multi-Quantile LightGBM, and the resulting time-series residuals are filtered through an online AR-GARCH or Kalman filter to capture high-frequency trading rhythms.
2. **Multi-Horizon Recursive Quantile Rollouts with Dynamic Conformalization:** Extending the current 1-day ahead ($t+1$) horizon to multi-step recursive forecasts ($t+7, t+14\text{ days}$) using sequential multi-horizon conformal prediction to provide dynamic risk containment envelopes across entire harvest shipment timelines.
3. **Synthetic Aperture Radar (SAR) Cloud-Penetrating Remote Sensing:** Integrating Sentinel-1 SAR radar backscatter telemetry alongside optical Sentinel-2 NDVI to ensure continuous, cloud-free vegetation monitoring during the peak monsoon season when optical satellite passes are obscured by cloud cover.
