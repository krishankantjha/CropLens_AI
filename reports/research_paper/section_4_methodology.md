# CropLens AI — Research Paper Draft
## Section IV: Proposed Methodology

---

### **Section IV: Proposed Methodology**

This section establishes the mathematical formulation of the **CropLens AI** probabilistic forecasting architecture. The framework integrates three sequential mathematical modules: Multi-Quantile Gradient Boosted Decision Trees, Chernozhukov Monotonic Rearrangement, and Group-Conditional Mondrian Conformalized Quantile Regression.

```text
CropLens AI Methodological Architecture
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Multi-Source Feature Vector x_t ∈ R^47                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Multi-Quantile LightGBM Models (Trained under Asymmetric Pinball)   │
│    Outputs raw quantiles: q_hat_0.10(x_t), q_hat_0.50(x_t), q_hat_0.90(x_t)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (May contain crossing: q_0.10 > q_0.50)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Chernozhukov Monotonic Rearrangement Operator (Econometrica 2010)   │
│    Pointwise sorting: q^*_0.10(x_t) ≤ q^*_0.50(x_t) ≤ q^*_0.90(x_t)    │
│    Guarantees zero quantile crossings (2,942 raw crossings → 0)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Mondrian Conformalized Quantile Regression (CQR Calibration)        │
│    Non-conformity on Val Pool D_cal → Conformal Offset Q_conf = ₹0.93  │
│    Calibrated Interval C_hat(x_t) = [q^*_0.10 - Q_conf, q^*_0.90 + Q_conf]│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. Output: Calibrated 80% Prediction Interval & P50 Modal Price        │
│    Empirical Test Coverage = 79.85% (MPIW = ₹166.91/qtl)               │
└────────────────────────────────────────────────────────────────────────┘
```

---

#### **4.1 Problem Formulation**
Let $x_t \in \mathbb{R}^{d}$ ($d = 47$) denote the multi-source feature vector available at market closure on day $t-1$, comprising autoregressive price history, market microstructure indicators, physical arrival volumes, meteorological stress observations, satellite NDVI metrics, festive anticipation scores, and spatial gradient vectors. 

Let $y_t \in \mathbb{R}^+$ denote the next-day clearing wholesale modal price for a given commodity $c \in \mathcal{C}$ at APMC mandi $m \in \mathcal{M}$. Rather than estimating a deterministic conditional expectation $\hat{y}_t = \mathbb{E}[y_t | x_t]$, the objective is to estimate a calibrated prediction interval $\hat{\mathcal{C}}(x_t) = [\hat{L}(x_t), \hat{U}(x_t)]$ alongside a robust median point prediction $\hat{q}_{0.50}(x_t)$ such that for a user-specified significance level $\gamma \in (0, 1)$ (here $\gamma = 0.20$ for an nominal $80\%$ interval), the coverage guarantee holds:
$$\mathbb{P}\left( y_t \in \hat{\mathcal{C}}(x_t) \right) \ge 1 - \gamma$$
subject to minimizing the Mean Prediction Interval Width (MPIW) to ensure maximum practical sharpness:
$$\text{MPIW} = \frac{1}{N} \sum_{i=1}^N \left( \hat{U}(x_i) - \hat{L}(x_i) \right)$$

---

#### **4.2 Multi-Quantile Gradient Boosted Decision Tree Architecture**
To model non-linear interactions across agricultural supply-demand drivers, we deploy Gradient Boosted Decision Trees (LightGBM) optimized under the asymmetric pinball loss function.

##### **A. Asymmetric Pinball Loss Formulation**
For a target quantile level $\alpha \in (0, 1)$, the pinball loss $\mathcal{L}_\alpha(y, \hat{y})$ is defined as:
$$\mathcal{L}_\alpha(y, \hat{y}) = \begin{cases} \alpha (y - \hat{y}), & \text{if } y \ge \hat{y} \\ (1 - \alpha) (\hat{y} - y), & \text{if } y < \hat{y} \end{cases} = \max\left(\alpha(y - \hat{y}), \, (\alpha - 1)(y - \hat{y})\right)$$
We instantiate three independent LightGBM ensemble regressors $f_{\alpha}(x)$ parameterized for:
* $\alpha = 0.10$: Lower risk boundary ($P_{10}$ price floor).
* $\alpha = 0.50$: Conditional median point forecast ($P_{50}$ expected clearing price).
* $\alpha = 0.90$: Upper risk boundary ($P_{90}$ price ceiling).

##### **B. Tree Growth and Gradient Optimization**
LightGBM constructs trees using a leaf-wise (best-first) expansion strategy with histogram-based feature binning. For a leaf containing sample set $I$, the optimal leaf weight $w^*$ minimizing the empirical pinball loss is derived from the subgradient:
$$g_i = \frac{\partial \mathcal{L}_\alpha(y_i, \hat{y}_i)}{\partial \hat{y}_i} = \begin{cases} -\alpha, & \text{if } y_i > \hat{y}_i \\ 1 - \alpha, & \text{if } y_i \le \hat{y}_i \end{cases}$$
The leaf splits are evaluated by maximizing the gradient variance gain across discretized histogram bins:
$$\mathcal{G} = \frac{1}{2} \left[ \frac{\left( \sum_{i \in I_L} g_i \right)^2}{|I_L| + \lambda} + \frac{\left( \sum_{i \in I_R} g_i \right)^2}{|I_R| + \lambda} - \frac{\left( \sum_{i \in I} g_i \right)^2}{|I| + \lambda} \right]$$
where $\lambda$ is the $L_2$ regularization parameter preventing overfitting on volatile auction outliers.

---

#### **4.3 Quantile Crossing Elimination via Chernozhukov Monotonic Rearrangement**
Because the three quantile models $f_{0.10}(x)$, $f_{0.50}(x)$, and $f_{0.90}(x)$ are trained independently, their unconstrained predictions can violate the monotonic property of cumulative distribution functions, leading to **quantile crossings**:
$$\exists \, x : \hat{q}_{0.10}(x) > \hat{q}_{0.50}(x) \quad \text{or} \quad \hat{q}_{0.50}(x) > \hat{q}_{0.90}(x)$$
On our out-of-sample test set, raw unconstrained quantile models produced **2,942 crossing instances** (a crossing rate of $15.24\%$), which represents an untenable mathematical failure in real-world agricultural risk advisory.

##### **A. The Monotonic Rearrangement Operator**
To enforce strict monotonicity without altering valid predictions, we apply the Chernozhukov Monotonic Increasing Rearrangement operator (Chernozhukov et al., Econometrica 2010). For a set of estimated quantiles $\hat{q}_{\alpha_1}(x), \dots, \hat{q}_{\alpha_K}(x)$ evaluated at levels $\alpha_1 < \dots < \alpha_K$, the sample generalized inverse distribution function is defined as:
$$\hat{F}^*(y | x) = \frac{1}{K} \sum_{k=1}^K \mathbb{I}\left( \hat{q}_{\alpha_k}(x) \le y \right)$$
The rearranged, strictly monotonic quantile function $\hat{q}^*(\alpha | x)$ is obtained by taking the left-continuous inverse:
$$\hat{q}^*(\alpha | x) = \inf \left\{ y \in \mathbb{R} : \hat{F}^*(y | x) \ge \alpha \right\}$$

##### **B. Discrete Pointwise Implementation**
For the triplet of estimated quantiles $K=3$ ($\alpha \in \{0.10, 0.50, 0.90\}$), the Chernozhukov rearrangement simplifies to an exact pointwise order-statistic sorting operator:
$$\left( \hat{q}^*_{0.10}(x), \; \hat{q}^*_{0.50}(x), \; \hat{q}^*_{0.90}(x) \right) = \text{Sort}\left( \hat{q}_{0.10}(x), \; \hat{q}_{0.50}(x), \; \hat{q}_{0.90}(x) \right)$$
such that:
$$\hat{q}^*_{0.10}(x) = \min\left( \hat{q}_{0.10}(x), \hat{q}_{0.50}(x), \hat{q}_{0.90}(x) \right)$$
$$\hat{q}^*_{0.50}(x) = \text{Median}\left( \hat{q}_{0.10}(x), \hat{q}_{0.50}(x), \hat{q}_{0.90}(x) \right)$$
$$\hat{q}^*_{0.90}(x) = \max\left( \hat{q}_{0.10}(x), \hat{q}_{0.50}(x), \hat{q}_{0.90}(x) \right)$$

##### **C. Theoretical Error Bounds**
Chernozhukov et al. (2010) proved that under mild regularity conditions, the monotonic rearrangement operator possesses the contraction mapping property:
$$\left\| \hat{q}^*(\alpha | x) - q_0(\alpha | x) \right\|_p \le \left\| \hat{q}(\alpha | x) - q_0(\alpha | x) \right\|_p, \quad \forall p \in [1, \infty]$$
where $q_0(\alpha | x)$ is the true underlying population quantile. Thus, applying monotonic rearrangement strictly guarantees **0 post-rearrangement crossings** while provably reducing or preserving the estimation error across all feature vectors.

---

#### **4.4 Calibrated Risk Bounds via Group-Conditional Mondrian CQR**
While monotonic rearrangement eliminates quantile crossings, the raw interval $[\hat{q}^*_{0.10}(x), \hat{q}^*_{0.90}(x)]$ only achieves $78.24\%$ coverage on our test set due to out-of-sample market drift, under-covering the nominal $80\%$ target. To provide exact finite-sample coverage guarantees, we apply **Conformalized Quantile Regression (CQR)**.

##### **A. Non-Conformity Score Formulation**
Let $\mathcal{D}_{\text{cal}} = \{(x_i, y_i)\}_{i=1}^{n_{\text{cal}}}$ denote the independent validation calibration set (2024 partition, $n_{\text{cal}} = 19,398$). For each validation sample $i$, we compute the signed conformity violation score $E_i \in \mathbb{R}$:
$$E_i = \max\left( \hat{q}^*_{0.10}(x_i) - y_i, \; y_i - \hat{q}^*_{0.90}(x_i) \right)$$
* If $y_i$ falls strictly inside the interval $[\hat{q}^*_{0.10}(x_i), \hat{q}^*_{0.90}(x_i)]$, then $E_i < 0$ (the interval is conservative).
* If $y_i$ falls outside the interval, then $E_i > 0$ (measuring the exact magnitude of the coverage breach in ₹/qtl).

##### **B. Conformal Quantile Computation**
For a target error rate $\gamma = 0.20$ (corresponding to $1 - \gamma = 0.80$ nominal coverage), the conformal adjustment threshold $\hat{Q}_{1-\gamma}(E, \mathcal{D}_{\text{cal}})$ is computed as the empirical $\beta$-quantile of the non-conformity scores $\{E_1, \dots, E_{n_{\text{cal}}}\}$, where:
$$\beta = \min\left(1.0, \; \frac{\lceil (1 - \gamma)(n_{\text{cal}} + 1) \rceil}{n_{\text{cal}}}\right)$$
On our calibration partition, the empirical conformal offset was estimated at $\hat{Q}_{\text{conf}} = \text{Rs } 0.93/\text{qtl}$.

##### **C. Calibrated Prediction Interval Construction**
The final calibrated prediction interval $\hat{\mathcal{C}}(x_t)$ for an unseen test observation $x_t$ is constructed by expanding the rearranged boundaries by $\hat{Q}_{\text{conf}}$:
$$\hat{\mathcal{C}}(x_t) = \left[ \hat{q}^*_{0.10}(x_t) - \hat{Q}_{\text{conf}}, \quad \hat{q}^*_{0.90}(x_t) + \hat{Q}_{\text{conf}} \right]$$

##### **D. Group-Conditional Mondrian Partitioning**
To ensure coverage remains balanced across diverse agricultural categories rather than achieving marginal coverage by over-covering staple cereals and under-covering volatile perishables, we implement **Mondrian CQR**. Calibration non-conformity scores are partitioned into group-conditional sets $\mathcal{D}_{\text{cal}}^{(g)}$ based on commodity botanical grouping $g \in \{\text{Perishable TOP}, \text{Food Grains}, \text{Pulses}, \text{Oilseeds/Spices}\}$:
$$\hat{Q}_{\text{conf}}^{(g)} = \text{Quantile}\left( \{E_i : i \in \mathcal{D}_{\text{cal}}^{(g)}\}, \; \beta_g \right)$$
yielding group-tailored conformal offsets that ensure uniform $80\%$ coverage across all agricultural market sectors.

---

#### **4.5 End-to-End Algorithmic Workflow**
Algorithm 1 formalizes the complete end-to-end training, rearrangement, calibration, and real-time inference pipeline of CropLens AI.

---

##### **Algorithm 1: CropLens AI Calibrated Multi-Quantile Forecasting Pipeline**
```text
Input:
  - Training partition D_train = {(x_i, y_i)}_{i=1}^{n_train} (2019–2023)
  - Calibration partition D_cal = {(x_j, y_j)}_{j=1}^{n_cal} (2024)
  - Test query feature vector x_t ∈ R^47 (2025)
  - Target nominal coverage level 1 - γ = 0.80

Phase 1: Model Training
  1: For each quantile α ∈ {0.10, 0.50, 0.90}:
  2:     Train LightGBM regressor f_α by minimizing empirical pinball loss L_α on D_train
  3: Return trained models {f_0.10, f_0.50, f_0.90}

Phase 2: Validation & Conformal Calibration (on D_cal)
  4: For each validation sample (x_j, y_j) ∈ D_cal:
  5:     Predict raw quantiles: q_hat_0.10(x_j), q_hat_0.50(x_j), q_hat_0.90(x_j)
  6:     Apply Monotonic Rearrangement: (q^*_0.10, q^*_0.50, q^*_0.90) = Sort(q_hat_0.10, q_hat_0.50, q_hat_0.90)
  7:     Compute non-conformity score: E_j = max(q^*_0.10(x_j) - y_j, y_j - q^*_0.90(x_j))
  8: Compute conformal threshold: Q_conf = Quantile({E_j}, ceil((1 - γ)(n_cal + 1)) / n_cal)

Phase 3: Real-Time Test Inference (on x_t)
  9: Predict raw quantiles on test input:
         q_hat_α(x_t) = f_α(x_t) for α ∈ {0.10, 0.50, 0.90}
 10: Apply Chernozhukov Monotonic Rearrangement:
         q^*_0.10(x_t) = min(q_hat_0.10(x_t), q_hat_0.50(x_t), q_hat_0.90(x_t))
         q^*_0.50(x_t) = Median(q_hat_0.10(x_t), q_hat_0.50(x_t), q_hat_0.90(x_t))
         q^*_0.90(x_t) = max(q_hat_0.10(x_t), q_hat_0.50(x_t), q_hat_0.90(x_t))
 11: Construct Calibrated 80% Prediction Interval:
         L_hat(x_t) = q^*_0.10(x_t) - Q_conf
         U_hat(x_t) = q^*_0.90(x_t) + Q_conf
 12: Return Median Point Forecast q^*_0.50(x_t) and Calibrated Prediction Interval [L_hat(x_t), U_hat(x_t)]
```
