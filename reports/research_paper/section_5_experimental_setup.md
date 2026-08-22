# CropLens AI — Research Paper Draft
## Section V: Experimental Setup & Benchmarks

---

### **Section V: Experimental Setup & Benchmarks**

This section outlines the experimental methodology used to evaluate CropLens AI against a comprehensive suite of statistical, tree-based, and deep neural baselines. We specify the temporal partitioning protocol, baseline model architectures, quantitative evaluation metrics, statistical hypothesis testing procedures, and reproducibility controls.

```text
Section V Experimental Architecture
├── 5.1 Temporal Holdout Partitioning (Strict 2019-2023 Train / 2024 Val / 2025 Test)
├── 5.2 Baseline Model Formulations (Naive Persistence, Ridge, XGBoost, CatBoost, LSTM, GRU, TFT)
├── 5.3 Point & Probabilistic Evaluation Metrics (MAE, RMSE, MAPE, sMAPE, R^2, MASE, Coverage, MPIW)
├── 5.4 Statistical Significance (Multi-Loss Diebold-Mariano with HAC) & Residual Diagnostics
└── 5.5 Hyperparameters, Training Hardware & Reproducibility Protocol
```

---

#### **5.1 Temporal Evaluation Protocol**
To prevent temporal data leakage and replicate real-world deployment conditions, the 135,471-sample dataset was partitioned chronologically without random shuffling:
* **Training Partition (2019-01-01 to 2023-12-31):** $96,770\text{ samples}$ ($71.4\%$ of total data) used strictly for model parameter optimization and tree split discovery.
* **Validation & Calibration Partition (2024-01-01 to 2024-12-31):** $19,398\text{ samples}$ ($14.3\%$) used for hyperparameter selection and estimating the non-conformity threshold ($\hat{Q}_{\text{conf}}$) in Conformalized Quantile Regression.
* **Out-of-Sample Test Partition (2025-01-01 to 2025-12-31):** $19,303\text{ samples}$ ($14.2\%$) strictly held out and evaluated only after model configurations and calibration parameters were frozen.

---

#### **5.2 Baseline Models and Benchmark Implementations**
CropLens AI was benchmarked against 7 representative models spanning heuristic baselines, linear models, non-linear tree ensembles, and deep sequence networks:

##### **1. Zero-Shot Naive Persistence (Random Walk Baseline)**
Assuming that tomorrow's wholesale price equals today's closing auction price:
$$\hat{y}_{t+1} = y_t \quad (\text{corresponding to } \texttt{price\_lag\_1d})$$
In physical commodity markets with strong near-martingale properties ($r > 0.98$), persistence represents an aggressive baseline that many complex models fail to beat.

##### **2. Ridge Linear Regression (L2-Regularized OLS)**
A linear regression baseline trained on all 47 features with $L_2$ Tikhonov regularization ($\alpha = 10.0$):
$$\min_{w} \sum_{i=1}^{n} \left( y_i - w^T x_i \right)^2 + \alpha \|w\|_2^2$$
Ridge provides an optimal linear point-forecast reference under squared error loss.

##### **3. XGBoost (Extreme Gradient Boosting)**
A scalable tree boosting system (Chen & Guestrin, 2016) trained under Mean Squared Error loss using depth-wise tree expansion, subsampling ratio of $0.80$, learning rate of $\eta = 0.05$, and maximum tree depth of 6.

##### **4. CatBoost (Symmetric Decision Trees)**
An oblivious decision tree ensemble (Prokhorenkova et al., 2018) trained with Root Mean Squared Error (RMSE) loss, using ordered boosting, depth of 6, and learning rate of $\eta = 0.05$.

##### **5. PyTorch 2-Layer LSTM**
A recurrent neural network with 2 stacked LSTM layers ($64\text{ hidden units}$ per layer, dropout rate of $0.15$), processing a 7-day sliding lookback window ($L = 7$) of all 47 features, trained under Huber loss using the Adam optimizer ($\text{lr} = 0.005$, batch size of 256, 50 epochs with early stopping).

##### **6. PyTorch 2-Layer GRU**
A Gated Recurrent Unit network sharing identical sequence lookback ($L = 7$), hidden dimensionality ($64\text{ units}$ across 2 layers), dropout ($0.15$), and optimization hyperparameters as the LSTM baseline.

##### **7. PyTorch Temporal Fusion Transformer (TFT)**
A temporal attention architecture (Lim et al., 2021) configured with a 30-day lookback window ($L = 30$), hidden state dimension $d_{\text{model}} = 64$, 4 self-attention heads, dropout rate of $0.10$, optimized using AdamW ($\text{lr} = 0.001$, batch size of 64). As documented in our research freeze, deep sequence models are classified as proof-of-concept sequence baselines evaluated under standard prototype configurations.

---

#### **5.3 Quantitative Evaluation Metrics**

##### **A. Point Forecast Accuracy Metrics**
Let $y_i$ denote the true price, $\hat{y}_i$ the predicted price, and $N$ the total test sample count ($N = 19,303$).
1. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i| \quad (\text{in } \text{Rs/qtl})$$
2. **Root Mean Squared Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (y_i - \hat{y}_i)^2} \quad (\text{in } \text{Rs/qtl})$$
3. **Mean Absolute Percentage Error (MAPE):**
   $$\text{MAPE} = \frac{100\%}{N} \sum_{i=1}^N \left| \frac{y_i - \hat{y}_i}{y_i} \right|$$
4. **Symmetric Mean Absolute Percentage Error (sMAPE):**
   $$\text{sMAPE} = \frac{100\%}{N} \sum_{i=1}^N \frac{2 |y_i - \hat{y}_i|}{|y_i| + |\hat{y}_i|}$$
5. **Coefficient of Determination ($R^2$):**
   $$R^2 = 1 - \frac{\sum_{i=1}^N (y_i - \hat{y}_i)^2}{\sum_{i=1}^N (y_i - \bar{y})^2}$$
6. **Mean Absolute Scaled Error (MASE):** Evaluated against the in-sample naive 1-step seasonal difference:
   $$\text{MASE} = \frac{\frac{1}{N}\sum_{i=1}^N |y_i - \hat{y}_i|}{\frac{1}{n_{\text{train}}-1}\sum_{k=2}^{n_{\text{train}}} |y_k - y_{k-1}|}$$

##### **B. Uncertainty & Prediction Interval Metrics**
For a calibrated prediction interval $\hat{\mathcal{C}}(x_i) = [\hat{L}_i, \hat{U}_i]$ targeting nominal coverage $1 - \gamma = 0.80$:
1. **Empirical Interval Coverage Rate (%):**
   $$\text{Coverage} = \frac{100\%}{N} \sum_{i=1}^N \mathbb{I}\left( \hat{L}_i \le y_i \le \hat{U}_i \right)$$
2. **Mean Prediction Interval Width (MPIW):**
   $$\text{MPIW} = \frac{1}{N} \sum_{i=1}^N \left( \hat{U}_i - \hat{L}_i \right) \quad (\text{in } \text{Rs/qtl})$$
3. **Quantile Crossing Rate (%):**
   $$\text{Crossing Rate} = \frac{100\%}{N} \sum_{i=1}^N \mathbb{I}\left( \hat{q}_{0.10}(x_i) > \hat{q}_{0.50}(x_i) \; \lor \; \hat{q}_{0.50}(x_i) > \hat{q}_{0.90}(x_i) \right)$$

---

#### **5.4 Statistical Significance and Diagnostic Suite**

##### **A. Multi-Loss Diebold-Mariano (DM) Tests with Newey-West HAC Covariance**
To test whether the forecast accuracy difference between CropLens AI and competitor models is statistically significant, we deploy the Diebold-Mariano test (Diebold & Mariano, 1995). For two competing forecast series with loss differentials $d_t = \ell(e_{1,t}) - \ell(e_{2,t})$, the test statistic is:
$$\text{DM} = \frac{\bar{d}}{\sqrt{\hat{\sigma}^2_{\bar{d}}}} \xrightarrow{d} \mathcal{N}(0, 1)$$
where $\bar{d} = \frac{1}{T}\sum_{t=1}^T d_t$, and the long-run asymptotic variance $\hat{\sigma}^2_{\bar{d}}$ is estimated using the Newey-West Heteroskedasticity and Autocorrelation Consistent (HAC) estimator with lag truncation parameter $h = 7$:
$$\hat{\sigma}^2_{\bar{d}} = \frac{1}{T} \left( \hat{\gamma}_0 + 2 \sum_{k=1}^h \left(1 - \frac{k}{h+1}\right) \hat{\gamma}_k \right)$$
We evaluate DM tests under three distinct economic loss functions:
1. *Absolute Error Loss:* $\ell(e_t) = |e_t|$ (consistent with conditional median/quantile pinball optimization).
2. *Squared Error Loss:* $\ell(e_t) = e_t^2$ (consistent with MSE-trained models).
3. *Percentage Error Loss:* $\ell(e_t) = |e_t / y_t|$.

##### **B. Ljung-Box Residual Autocorrelation Test**
To diagnose whether the forecasting model captures all linear and periodic temporal structure, we apply the Ljung-Box test (Ljung & Box, 1978) to the model residuals $e_t = y_t - \hat{y}_{0.50}(t)$ across lags $m \in \{1, 7, 14, 30\}$:
$$Q(m) = N(N+2) \sum_{k=1}^m \frac{\hat{\rho}_k^2}{N - k} \xrightarrow{d} \chi^2(m)$$
where $\hat{\rho}_k$ represents the sample autocorrelation of the residuals at lag $k$.

---

#### **5.5 Model Hyperparameters and Reproducibility Protocol**
Table III summarizes the operational hyperparameters and reproducibility configurations.

##### **TABLE III: Model Hyperparameters and Reproducibility Settings**
| Parameter Dimension | LightGBM Quantile Ensembles | XGBoost Baseline | CatBoost Baseline | PyTorch Deep Models |
| :--- | :---: | :---: | :---: | :---: |
| **Objective / Loss** | Pinball ($\alpha \in \{0.1, 0.5, 0.9\}$) | MSE (`reg:squarederror`) | RMSE | Huber Loss ($\delta = 1.0$) |
| **Boosting Iterations / Epochs**| 350 trees (Early stopping = 30) | 300 trees | 300 trees | 50 epochs (Patience = 10) |
| **Learning Rate ($\eta$)** | 0.03 | 0.05 | 0.05 | 0.005 (Adam) / 0.001 (AdamW) |
| **Tree Depth / Num Leaves** | `num_leaves` = 31 | `max_depth` = 6 | `depth` = 6 | 2 Layers (64 Units/Layer) |
| **Subsample / Colsample** | 0.80 / 0.80 | 0.80 / 0.80 | N/A (MVS) | Dropout = 0.15 |
| **L2 Regularization ($\lambda$)** | 5.0 | 5.0 | 3.0 | Weight Decay = $1\times 10^{-4}$ |
| **Random Initialization Seed** | **42 (Locked)** | **42 (Locked)** | **42 (Locked)** | **42 (Locked)** |

All experiments were executed on an Intel Core i7-13700H CPU ($16\text{ cores}$, $2.40\text{ GHz}$) with $32\text{ GB RAM}$ and an NVIDIA GeForce RTX 4060 GPU ($8\text{ GB VRAM}$) running Python 3.11.9, PyTorch 2.4.0, LightGBM 4.5.0, Scikit-Learn 1.5.1, and Statsmodels 0.14.2. All numbers are reproducible via `python backend/app/evaluation/run_canonical_evaluation.py`.

#### **Visual Reproducibility of the Temporal Protocol**
The notebook exports `reports/eda_insights/chronological_train_validation_test_split.png` and the corresponding CSV boundary table. The visualization mirrors the strict calendar partition above: training covers 2019–2023, validation and conformal calibration cover 2024, and the untouched out-of-sample test period covers 2025. No random shuffling is used.
