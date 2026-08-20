# CropLens AI — Research Paper Draft
## Section II: Related Work

---

### **Section II: Related Work**

The computational modeling of agricultural commodity prices spans four major paradigms: classical econometric time series, supervised tree-based machine learning, deep neural sequence architectures, and probabilistic uncertainty estimation. This section surveys prior literature across these four domains and articulates the theoretical positioning of the CropLens AI framework.

```
Agricultural Price Modeling Literature Taxonomy
├── 2.1 Classical Econometric Models (ARIMA, SARIMA, VAR)
├── 2.2 Tree-Based Tabular Learning (XGBoost, CatBoost, LightGBM)
├── 2.3 Deep Neural Architectures (LSTM, GRU, Temporal Fusion Transformer)
├── 2.4 Uncertainty Quantification (Quantile Regression, Rearrangement, Conformal Prediction)
└── 2.5 Critical Synthesis & Research Gaps Addressed by CropLens AI
```

---

#### **2.1 Classical Econometric & Statistical Forecasting**
Agricultural commodity price forecasting has historically relied on parametric linear time-series techniques rooted in the Box-Jenkins methodology. Autoregressive Integrated Moving Average (ARIMA) and Seasonal ARIMA (SARIMA) formulations have been widely applied to model univariate price dynamics for staple cereals and cash crops across national wholesale markets. To capture inter-variable dynamics, Vector Autoregression (VAR) and Vector Error Correction Models (VECM) have been deployed to incorporate bidirectional relationships between market arrivals and wholesale prices.

While classical econometric models provide mathematical tractability and interpretable asymptotic properties, they exhibit fundamental structural limitations in physical agricultural spot markets:
1. **Linearity and Normality Assumptions:** Standard ARIMA/VAR formulations assume linear relationships and Gaussian-distributed error terms, which fail to accommodate the heavy-tailed, asymmetric price spikes characteristic of perishable produce auctions.
2. **Strict Stationarity Constraints:** Econometric models require differencing or logarithmic transformations to achieve weak stationarity. However, sudden agricultural supply shocks (such as localized hail damage or unseasonal rainfall) induce structural regime shifts that violate stationary autocorrelation structures.
3. **Inability to Scale Across Heterogeneous Exogenous Modalities:** Incorporating high-dimensional, multi-rate exogenous features (such as daily multi-band satellite NDVI, continuous weather telemetry, and discrete festival indicators) leads to severe parameter explosion and degrees-of-freedom depletion in classical VAR frameworks.

---

#### **2.2 Gradient Boosted Decision Trees (GBDTs) in Agricultural Intelligence**
The advent of gradient boosting algorithms—specifically XGBoost (Chen & Guestrin, 2016), LightGBM (Ke et al., 2017), and CatBoost (Prokhorenkova et al., 2018)—fundamentally shifted agricultural price modeling from linear equations to non-parametric tree ensembles. Recent empirical studies across tabular benchmarks consistently demonstrate that GBDTs systematically outperform both linear models and standard deep neural networks on tabular datasets characterized by heterogeneous feature types, irregular distributions, and complex non-linear feature interactions (Grinsztajn et al., NeurIPS 2022).

In agricultural market forecasting, GBDTs offer distinct domain-specific advantages:
* **Handling Non-Linear Thresholds:** GBDTs naturally model non-linear physical phenomena, such as threshold temperatures beyond which crop quality rapidly deteriorates, or non-linear arrival glut dynamics where market clearance prices collapse abruptly once daily supply exceeds local mandi handling capacity.
* **Mixed Categorical-Continuous Ingestion:** Modern implementations (such as LightGBM's integer encoding and histogram-based binning) natively process high-cardinality categorical identifiers (mandi location, crop variety, harvesting regime) alongside continuous environmental measurements without requiring one-hot feature space explosion.
* **Robustness to Collinearity and Scale Discrepancies:** Tree-based split criteria are invariant to monotonic feature scaling, enabling seamless co-ingestion of micro-level pricing spreads alongside macro-level satellite vegetation indices.

Despite their widespread empirical success in point forecasting, standard GBDTs are traditionally trained under Mean Squared Error (MSE) or Mean Absolute Error (MAE) loss, outputting only a deterministic point estimate that fails to convey the underlying variance or downside risk of physical spot auctions.

---

#### **2.3 Deep Neural Sequence Architectures and Temporal Attention**
To model long-range temporal dependencies and complex multi-modal inputs, deep learning architectures have garnered extensive attention in agricultural forecasting. Recurrent Neural Networks, particularly Long Short-Term Memory (LSTM; Hochreiter & Schmidhuber, 1997) and Gated Recurrent Units (GRU; Cho et al., 2014), have been deployed to capture sequential price patterns and seasonal crop growth curves. More recently, attention-based architectures such as the Temporal Fusion Transformer (TFT; Lim et al., 2021) have been applied to multi-horizon time-series forecasting, utilizing specialized gating mechanisms, variable selection networks, and temporal self-attention to process heterogeneous time-varying and static covariates.

However, applying deep sequence models to daily APMC mandi wholesale price forecasting introduces several practical and methodological hurdles:
* **High Parameterization on Irregular Series:** Daily spot mandi records frequently feature irregular trading closures (e.g., Sunday closures, local market holidays, strike disruptions). Recurrent architectures and Transformer positional encodings struggle with non-uniform time steps unless complex interpolation or padding strategies are introduced, which risk introducing artificial temporal artifacts.
* **Sub-Optimal Performance on Tabular Regimes:** Deep neural networks lack the inductive bias of decision trees for axis-aligned tabular decision boundaries, frequently requiring orders of magnitude more training iterations while remaining highly sensitive to hyperparameter tuning and random initialization seeds.
* **Computational Overhead and Inference Latency:** Transformer and recurrent models impose significant GPU memory footprints and training overheads, making frequent retraining and low-latency edge deployment challenging for rural agricultural advisory deployments.

---

#### **2.4 Uncertainty Quantification, Quantile Crossing, and Conformal Prediction**
Point forecasting is inherently insufficient for agricultural risk management. A farmer deciding whether to incur post-harvest transportation costs requires probabilistic confidence bounds to guard against distress selling.

##### **A. Quantile Regression and the Quantile Crossing Problem**
Quantile Regression, pioneered by Koenker and Bassett (1978), models the conditional quantile $q_\alpha(x)$ of a response variable by minimizing the asymmetric pinball loss function $\mathcal{L}_\alpha(y, \hat{y})$:
$$\mathcal{L}_\alpha(y, \hat{y}) = \max(\alpha (y - \hat{y}), (\alpha - 1)(y - \hat{y}))$$
When training multiple independent quantile models (e.g., $\alpha = 0.10, 0.50, 0.90$), a fundamental mathematical failure known as **quantile crossing** occurs: because each model is optimized independently, the predicted quantiles can violate the basic monotonicity axiom of cumulative distribution functions, yielding instances where $\hat{q}_{0.10}(x) > \hat{q}_{0.50}(x)$ or $\hat{q}_{0.50}(x) > \hat{q}_{0.90}(x)$.

To restore strict mathematical validity, Chernozhukov, Fernández-Val, and Galichon (Econometrica, 2010) established the theoretical framework of **Monotonic Rearrangement**. By applying an increasing rearrangement operator (sorting the predicted quantile curves pointwise), the rearranged quantiles are proven to be strictly non-decreasing, non-crossing, and possess an estimation error that is strictly bounded by—and often superior to—the original unconstrained quantile estimates.

##### **B. Conformalized Quantile Regression (CQR)**
While monotonic rearrangement guarantees non-crossing quantiles, standard quantile regression models still lack finite-sample coverage validity under temporal and spatial distribution drift; an nominal 80% interval ($P_{10}$ to $P_{90}$) frequently yields empirical coverage far below 80% when evaluated on unseen future market regimes.

To achieve distribution-free, finite-sample coverage guarantees, Conformal Prediction (Vovk et al., 2005; Shafer & Vovk, 2008) provides a rigorous framework. Romano, Patterson, and Candès (NeurIPS, 2019) introduced **Conformalized Quantile Regression (CQR)**, which combines the adaptive interval sharpness of quantile regression with the exact finite-sample coverage guarantees of conformal prediction. By evaluating non-conformity scores on a calibration holdout set:
$$E_i = \max(\hat{q}_{\alpha/2}(x_i) - y_i, \, y_i - \hat{q}_{1 - \alpha/2}(x_i))$$
CQR computes a conformal adjustment scalar $Q_{1-\alpha}(E)$ that expands or contracts the prediction interval symmetrically, guaranteeing that the true future price realization falls within the calibrated interval with a user-specified probability $1 - \alpha$, regardless of the underlying data distribution.

---

#### **2.5 Synthesis and Research Positioning of CropLens AI**
Table I systematically contrasts prior agricultural price forecasting paradigms against the proposed CropLens AI framework across core methodological dimensions.

##### **TABLE I: Methodological Comparison of Agricultural Price Forecasting Approaches**
| Methodological Dimension | Classical Econometrics (ARIMA/VAR) | Standard GBDT (XGBoost/CatBoost) | Deep Neural Sequence (LSTM/TFT) | Standard Quantile GBDT | **CropLens AI (Proposed)** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Primary Output** | Point Forecast | Point Forecast | Point Forecast | Uncalibrated Quantiles | **Calibrated Risk Intervals + Median** |
| **Feature Modalities** | Univariate / 2-Var | Tabular Features | Multi-Horizon Sequences | Tabular Features | **47-Feature Multi-Source Fusion** |
| **Quantile Crossing Handling** | N/A (Point Only) | N/A (Point Only) | N/A (Point Only) | Unhandled (Crossings Present) | **Chernozhukov Rearrangement (0 Crossings)** |
| **Coverage Guarantees** | Asymptotic Normal | None | None | Heuristic Only | **Distribution-Free Finite-Sample CQR (80%)** |
| **Spatial Generalization** | Single Market | Fixed Markets | Fixed Mandi Sequences | Fixed Markets | **Leave-One-Mandi-Out (LOMO) Validated** |
| **Inference Latency** | Low (< 1 ms) | Very Low (< 1 ms) | High (15–30 ms) | Low (< 1 ms) | **Low (< 1 ms on Commodity CPU)** |
| **Interpretability** | Linear Coefficients | TreeSHAP | Attention Weights | Partial SHAP | **TreeSHAP + BH-FDR Granger Causality** |

As synthesized in Table I, CropLens AI bridges the critical gap between fast, highly accurate tabular gradient boosting and mathematically guaranteed, distribution-free risk quantification, providing an operational and academically defensible intelligence foundation for agricultural spot markets.
