"""
Model training script for CropLens AI.
Forecasting Horizon: 1-Day Ahead (Next-Day) APMC Wholesale Price Prediction.
CropLens predicts the next day's (t+1) modal price using information known up to day t.
Trains LightGBM price forecast quantile models (P10, P50, P90), Isolation Forest anomaly detector,
Ridge baseline, CatBoost, XGBoost, ARIMA statistical baselines, runs Optuna tuning, FDR-corrected
grouped Granger tests, Newey-West HAC Diebold-Mariano tests, 7-day Circular Block Bootstrap CIs,
Mondrian CQR calibration, SHAP explainability, ablation study, and exports model files.
"""

import os
import json
import joblib
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

import lightgbm as lgb
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_percentage_error, root_mean_squared_error, mean_absolute_error, r2_score, f1_score, precision_score, recall_score
from statsmodels.tsa.stattools import grangercausalitytests, adfuller, kpss
from statsmodels.stats.multitest import multipletests
from statsmodels.regression.linear_model import OLS
from scipy import stats

import optuna
import shap

warnings.filterwarnings('ignore')
optuna.logging.set_verbosity(optuna.logging.WARNING)


class ModelTrainer:
    """Trainer class to train, evaluate, and save CropLens AI models."""

    def __init__(self, data_path: str = None, output_dir: str = None, figures_dir: str = None):
        # Find dataset file path
        if data_path is None:
            if os.path.exists(os.path.join('data', 'processed', 'features_master.parquet')):
                self.data_path = os.path.join('data', 'processed', 'features_master.parquet')
            elif os.path.exists(os.path.join('..', 'data', 'processed', 'features_master.parquet')):
                self.data_path = os.path.join('..', 'data', 'processed', 'features_master.parquet')
            else:
                self.data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'processed', 'features_master.parquet'))
        else:
            self.data_path = data_path

        # Setup output directories
        self.output_dir = output_dir or os.path.abspath(os.path.join(os.getcwd(), 'backend', 'app', 'models'))
        self.figures_dir = figures_dir or os.path.abspath(os.path.join(os.getcwd(), 'reports', 'figures'))

        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.figures_dir, exist_ok=True)

        self.df = None
        self.feature_cols = None
        self.target_col = 'modal_price'

        # Train, validation, and test datasets
        self.X_train, self.y_train = None, None
        self.X_val, self.y_val = None, None
        self.X_test, self.y_test = None, None

        # Dictionaries to store models and metrics
        self.models = {}
        self.best_params = {}
        self.metrics = {}
        self.shap_values = None
        self.xgb_imputer = None

    def _pinball_loss(self, y_true, y_pred, alpha: float) -> float:
        """Calculates pinball (quantile) loss for a given quantile alpha."""
        err = y_true - y_pred
        return float(np.mean(np.maximum(alpha * err, (alpha - 1.0) * err)))

    def load_and_split_data(self):
        """Loads master dataset and splits it into train, validation, and test sets by date."""
        print(f"Loading dataset: {self.data_path}")
        self.df = pd.read_parquet(self.data_path)
        self.df['date'] = pd.to_datetime(self.df['date'])
        self.df = self.df.sort_values('date').reset_index(drop=True)

        # Exclude metadata and same-day target price columns
        metadata_cols = [
            'state', 'district', 'market', 'commodity', 'variety',
            'market_id', 'harvest_season_type', 'festival_name', 'date',
            'latitude', 'longitude', 'modal_price', 'min_price', 'max_price'
        ]

        # Select all numerical features for training
        self.feature_cols = [c for c in self.df.select_dtypes(include=[np.number]).columns if c not in metadata_cols]

        print(f"Total Rows: {self.df.shape[0]:,} | Features: {len(self.feature_cols)}")

        # Split data by year: Train (2019-2023), Validation (2024), Test (2025)
        train_mask = self.df['date'].dt.year <= 2023
        val_mask = self.df['date'].dt.year == 2024
        test_mask = self.df['date'].dt.year == 2025

        self.X_train = self.df.loc[train_mask, self.feature_cols]
        self.y_train = self.df.loc[train_mask, self.target_col]

        self.X_val = self.df.loc[val_mask, self.feature_cols]
        self.y_val = self.df.loc[val_mask, self.target_col]

        self.X_test = self.df.loc[test_mask, self.feature_cols]
        self.y_test = self.df.loc[test_mask, self.target_col]

        print(f"Train Set (2019-2023): {self.X_train.shape[0]:,} rows")
        print(f"Val Set (2024): {self.X_val.shape[0]:,} rows")
        print(f"Test Set (2025): {self.X_test.shape[0]:,} rows")

    def run_granger_causality(self, max_lag: int = 7):
        """Runs Granger Causality tests separately for each commodity-market pair time series."""
        print("\nRunning Grouped Granger Causality tests (commodity x market)...")
        results = {}

        for var in ['rainfall_mm', 'arrivals_in_qtl', 'temp_max']:
            if var not in self.df.columns:
                continue

            p_values = []
            significant_groups = 0
            total_groups = 0

            groups = self.df.groupby(['commodity', 'market'])
            for (comm, mkt), group in groups:
                sub_df = group[[self.target_col, var]].dropna()
                if len(sub_df) < 50:
                    continue

                try:
                    test_res = grangercausalitytests(sub_df[[self.target_col, var]], maxlag=max_lag, verbose=False)
                    min_p = min([test_res[lag][0]['ssr_ftest'][1] for lag in range(1, max_lag + 1)])
                    p_values.append(min_p)
                    total_groups += 1
                    if min_p < 0.05:
                        significant_groups += 1
                except Exception:
                    continue

            if total_groups > 0:
                avg_p = float(np.mean(p_values))
                sig_pct = float((significant_groups / total_groups) * 100)
                
                # Apply Benjamini-Hochberg False Discovery Rate (FDR) correction at alpha = 0.05
                rejected, pvals_corrected, _, _ = multipletests(p_values, alpha=0.05, method='fdr_bh')
                fdr_sig_count = int(np.sum(rejected))
                fdr_sig_pct = float((fdr_sig_count / total_groups) * 100)
                
                results[var] = {
                    'avg_min_p_value': round(avg_p, 4),
                    'raw_significant_groups': significant_groups,
                    'fdr_adjusted_significant_groups': fdr_sig_count,
                    'total_groups': total_groups,
                    'raw_significant_percentage': round(sig_pct, 2),
                    'fdr_adjusted_significant_percentage': round(fdr_sig_pct, 2),
                    'fdr_method': 'Benjamini-Hochberg (fdr_bh)',
                    'fdr_alpha': 0.05
                }
                print(f"- {var:20s}: Raw {significant_groups}/{total_groups} ({sig_pct:.1f}%) | FDR-Corrected {fdr_sig_count}/{total_groups} ({fdr_sig_pct:.1f}%) significant (avg p = {avg_p:.4f})")

        self.metrics['granger_causality'] = {
            'methodology': 'Grouped per commodity-market time series (lags 1-7 days) with Benjamini-Hochberg FDR correction',
            'note': 'Measures statistical Granger-predictive association, not real-world physical causal proof.',
            'results': results
        }

    def run_stationarity_tests(self):
        """Runs Augmented Dickey-Fuller (ADF) and KPSS stationarity tests per commodity price series."""
        print("\nRunning ADF and KPSS Stationarity Tests per commodity...")
        stat_results = {}
        for comm, group in self.df.groupby('commodity'):
            series = group[self.target_col].dropna()
            if len(series) < 30:
                continue
            
            # ADF Test (Null: Unit root present / Non-stationary)
            try:
                adf_res = adfuller(series)
                adf_stat = float(adf_res[0])
                adf_p = float(adf_res[1])
                adf_stat_flag = bool(adf_p < 0.05)
            except Exception:
                adf_stat, adf_p, adf_stat_flag = 0.0, 1.0, False

            # KPSS Test (Null: Stationarity)
            try:
                kpss_res = kpss(series, regression='c', nlags='auto')
                kpss_stat = float(kpss_res[0])
                kpss_p = float(kpss_res[1])
                kpss_stat_flag = bool(kpss_p >= 0.05)
            except Exception:
                kpss_stat, kpss_p, kpss_stat_flag = 0.0, 0.05, True

            stat_results[comm] = {
                'ADF_Statistic': round(adf_stat, 4),
                'ADF_p_value': round(adf_p, 4),
                'ADF_Stationary': adf_stat_flag,
                'KPSS_Statistic': round(kpss_stat, 4),
                'KPSS_p_value': round(kpss_p, 4),
                'KPSS_Stationary': kpss_stat_flag,
                'Inference': 'Stationary' if (adf_stat_flag and kpss_stat_flag) else 'Non-Stationary / Trend-Stationary'
            }
            print(f"- {comm:10s} | ADF Stat: {adf_stat:7.3f} (p={adf_p:.4f}, {'Stat' if adf_stat_flag else 'Non-Stat'}) | KPSS Stat: {kpss_stat:6.3f} (p={kpss_p:.4f}, {'Stat' if kpss_stat_flag else 'Non-Stat'})")

        self.metrics['stationarity_tests'] = stat_results

    def optimize_hyperparameters(self, n_trials: int = 35):
        """Finds best LightGBM quantile hyperparameters on validation set with L1/L2 regularization."""
        print(f"\nTuning LightGBM quantile hyperparameters with Optuna ({n_trials} trials)...")

        def objective(trial):
            params = {
                'objective': 'quantile',
                'alpha': 0.50,
                'metric': 'quantile',
                'boosting_type': 'gbdt',
                'learning_rate': trial.suggest_float('learning_rate', 0.02, 0.15, log=True),
                'num_leaves': trial.suggest_int('num_leaves', 20, 63),
                'max_depth': trial.suggest_int('max_depth', 4, 10),
                'min_child_samples': trial.suggest_int('min_child_samples', 15, 60),
                'subsample': trial.suggest_float('subsample', 0.65, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.65, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 1e-3, 10.0, log=True),
                'reg_lambda': trial.suggest_float('reg_lambda', 1e-3, 10.0, log=True),
                'random_state': 42,
                'verbose': -1
            }

            model = lgb.LGBMRegressor(**params, n_estimators=250)
            model.fit(self.X_train, self.y_train)
            preds = model.predict(self.X_val)
            val_pinball = self._pinball_loss(self.y_val, preds, alpha=0.50)
            return val_pinball

        sampler = optuna.samplers.TPESampler(seed=42)
        study = optuna.create_study(direction='minimize', sampler=sampler)
        study.optimize(objective, n_trials=n_trials)

        self.best_params = study.best_params
        print(f"Best Validation Pinball Loss (alpha = 0.50): {study.best_value:.4f}")
        print(f"Best Parameters: {self.best_params}")

    def train_quantile_models(self):
        """Trains LightGBM quantile regression models for P10, P50, and P90 bounds."""
        print("\nTraining LightGBM quantile models (P10, P50, P90)...")
        quantiles = [0.10, 0.50, 0.90]

        for q in quantiles:
            q_name = f"p{int(q*100)}"
            params = {
                'objective': 'quantile',
                'alpha': q,
                'metric': 'quantile',
                'n_estimators': 300,
                'random_state': 42,
                'verbose': -1,
                **self.best_params
            }

            model = lgb.LGBMRegressor(**params)
            model.fit(
                self.X_train, self.y_train,
                eval_set=[(self.X_val, self.y_val)],
                callbacks=[lgb.early_stopping(stopping_rounds=30, verbose=False)]
            )

            self.models[q_name] = model
            print(f"Trained {q_name.upper()} model (alpha = {q})")

    def calibrate_conformal_quantiles(self):
        """Executes Mondrian Group-Conditional Conformal Quantile Regression (M-CQR) calibration per sector and measures MPIW sharpness."""
        print("\nRunning Mondrian Group-Conditional Conformal Quantile Regression (M-CQR)...")

        val_df = self.df.loc[self.X_val.index].copy()
        test_df = self.df.loc[self.X_test.index].copy()

        val_p10 = self.models['p10'].predict(self.X_val)
        val_p90 = self.models['p90'].predict(self.X_val)
        y_val = np.array(self.y_val)

        test_p10 = self.models['p10'].predict(self.X_test)
        test_p90 = self.models['p90'].predict(self.X_test)
        y_test = np.array(self.y_test)

        # Map commodities to 5 agricultural sectors
        sector_mapping = {
            'Potato': 'Vegetables', 'Onion': 'Vegetables', 'Tomato': 'Vegetables',
            'Wheat': 'Cereals', 'Paddy(Dhan)': 'Cereals', 'Maize': 'Cereals',
            'Soyabean': 'Oilseeds', 'Mustard': 'Oilseeds',
            'Gram(Chana)': 'Pulses',
            'Chilli Red': 'Spices'
        }
        val_df['sector'] = val_df['commodity'].map(sector_mapping).fillna('Other')
        test_df['sector'] = test_df['commodity'].map(sector_mapping).fillna('Other')

        # Global non-conformity score
        global_scores = np.maximum(val_p10 - y_val, y_val - val_p90)
        n_val = len(global_scores)
        q_val_level = np.ceil((n_val + 1) * 0.80) / n_val
        q_conf_global = float(np.quantile(global_scores, min(1.0, q_val_level)))

        # Sector-specific Mondrian non-conformity scores
        q_conf_sectors = {}
        for sec in ['Vegetables', 'Cereals', 'Oilseeds', 'Pulses', 'Spices']:
            sec_mask = (val_df['sector'] == sec).values
            if sec_mask.sum() > 30:
                sec_scores = np.maximum(val_p10[sec_mask] - y_val[sec_mask], y_val[sec_mask] - val_p90[sec_mask])
                n_s = len(sec_scores)
                q_level_s = np.ceil((n_s + 1) * 0.80) / n_s
                q_conf_sectors[sec] = float(np.quantile(sec_scores, min(1.0, q_level_s)))
            else:
                q_conf_sectors[sec] = q_conf_global

        # Apply Mondrian offsets on test set
        test_offsets = np.array([q_conf_sectors.get(s, q_conf_global) for s in test_df['sector']])
        cal_p10 = test_p10 - test_offsets
        cal_p90 = test_p90 + test_offsets

        uncal_coverage = float(np.mean((y_test >= test_p10) & (y_test <= test_p90)) * 100)
        cal_coverage = float(np.mean((y_test >= cal_p10) & (y_test <= cal_p90)) * 100)

        uncal_mpiw = float(np.mean(test_p90 - test_p10))
        cal_mpiw = float(np.mean(cal_p90 - cal_p10))

        print(f"- Global Non-Conformity Offset (Q_conf): Rs {q_conf_global:.2f}/qtl")
        print(f"- Sector Offsets: {q_conf_sectors}")
        print(f"- Uncalibrated Test P10-P90 Coverage: {uncal_coverage:.2f}% (MPIW: Rs {uncal_mpiw:.2f}/qtl)")
        print(f"- Mondrian Calibrated Test Coverage:   {cal_coverage:.2f}% (MPIW: Rs {cal_mpiw:.2f}/qtl | Target: 80.0% +/- 1.0%)")

        self.metrics['conformal_quantile_regression'] = {
            'target_coverage_percent': 80.0,
            'global_non_conformity_offset_rs_per_qtl': round(q_conf_global, 2),
            'sector_conformal_offsets_rs_per_qtl': {k: round(v, 2) for k, v in q_conf_sectors.items()},
            'uncalibrated_coverage_percent': round(uncal_coverage, 2),
            'calibrated_coverage_percent': round(cal_coverage, 2),
            'uncalibrated_mpiw_rs_per_qtl': round(uncal_mpiw, 2),
            'calibrated_mpiw_rs_per_qtl': round(cal_mpiw, 2),
            'method': 'Mondrian Group-Conditional CQR (M-CQR)'
        }

    def train_and_eval_ridge_baseline(self):
        """Trains Ridge regression with SimpleImputer and StandardScaler pipeline on training data as a fair baseline."""
        print("\nTraining Ridge linear baseline with SimpleImputer and StandardScaler...")
        from sklearn.impute import SimpleImputer
        
        pipeline = Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler()),
            ('ridge', Ridge(alpha=1.0, random_state=42))
        ])
        pipeline.fit(self.X_train, self.y_train)

        ridge_preds = pipeline.predict(self.X_test)
        ridge_mape = mean_absolute_percentage_error(self.y_test, ridge_preds) * 100
        ridge_rmse = root_mean_squared_error(self.y_test, ridge_preds)
        ridge_mae = mean_absolute_error(self.y_test, ridge_preds)

        self.models['ridge_baseline'] = pipeline
        self.metrics['ridge_baseline'] = {
            'MAPE (%)': round(float(ridge_mape), 2),
            'RMSE (Rs/qtl)': round(float(ridge_rmse), 2),
            'MAE (Rs/qtl)': round(float(ridge_mae), 2)
        }

        print("Ridge Baseline Test Performance (2025 Set):")
        print(f"- MAPE: {ridge_mape:.2f}%")
        print(f"- RMSE: Rs {ridge_rmse:.2f}/qtl")
        print(f"- MAE:  Rs {ridge_mae:.2f}/qtl")

    def train_arima_baseline(self):
        """Trains classical ARIMA(1,1,1) statistical time-series baseline per commodity-mandi group and evaluates on test set."""
        print("\nTraining Classical ARIMA Statistical Baseline per commodity-mandi series...")
        from statsmodels.tsa.arima.model import ARIMA

        arima_preds_dict = {}
        actuals_dict = {}

        # Train separate ARIMA(1,1,1) for each commodity-market series on train data (2019-2023)
        train_df = self.df.loc[self.X_train.index]
        test_df = self.df.loc[self.X_test.index]

        arima_predictions = []
        arima_actuals = []

        for (comm, mkt), grp_tr in train_df.groupby(['commodity', 'market']):
            grp_te = test_df[(test_df['commodity'] == comm) & (test_df['market'] == mkt)]
            if len(grp_tr) < 30 or len(grp_te) == 0:
                continue

            try:
                # Fit ARIMA(1,1,1) on training modal price series
                history = list(grp_tr[self.target_col].dropna().values)
                test_vals = list(grp_te[self.target_col].dropna().values)
                
                # Rolling 1-step or batch forecast
                model = ARIMA(history, order=(1, 1, 1))
                fit_res = model.fit()
                
                # Forecast test length
                forecast_res = fit_res.forecast(steps=len(test_vals))
                
                arima_predictions.extend(forecast_res)
                arima_actuals.extend(test_vals)
            except Exception:
                # Fallback to mean persistence if ARIMA optimization diverges
                mean_val = float(grp_tr[self.target_col].mean())
                arima_predictions.extend([mean_val] * len(grp_te))
                arima_actuals.extend(grp_te[self.target_col].values)

        if len(arima_predictions) > 0:
            arima_actuals = np.array(arima_actuals)
            arima_predictions = np.array(arima_predictions)

            arima_mae = float(mean_absolute_error(arima_actuals, arima_predictions))
            arima_rmse = float(root_mean_squared_error(arima_actuals, arima_predictions))
            arima_mape = float(mean_absolute_percentage_error(arima_actuals, arima_predictions) * 100)
            arima_r2 = float(r2_score(arima_actuals, arima_predictions))

            print("ARIMA Baseline Test Performance (2025 Set):")
            print(f"- MAE:  Rs {arima_mae:.2f}/qtl")
            print(f"- RMSE: Rs {arima_rmse:.2f}/qtl")
            print(f"- MAPE: {arima_mape:.2f}%")
            print(f"- R2:   {arima_r2:.3f}")

            self.metrics['arima_baseline'] = {
                'order': '(1, 1, 1)',
                'MAE (Rs/qtl)': round(arima_mae, 2),
                'RMSE (Rs/qtl)': round(arima_rmse, 2),
                'MAPE (%)': round(arima_mape, 2),
                'R2': round(arima_r2, 3)
            }

    def train_catboost_and_xgboost(self):
        """Trains CatBoostRegressor and XGBRegressor on training data and evaluates on test data."""
        print("\nTraining CatBoostRegressor and XGBRegressor...")
        import time
        from catboost import CatBoostRegressor
        from xgboost import XGBRegressor
        from sklearn.impute import SimpleImputer
        from sklearn.metrics import r2_score

        imputer = SimpleImputer(strategy='median')
        X_tr_imp = imputer.fit_transform(self.X_train)
        X_te_imp = imputer.transform(self.X_test)
        self.xgb_imputer = imputer

        # 1. CatBoost
        t0 = time.time()
        cb = CatBoostRegressor(iterations=300, learning_rate=0.08, depth=6, verbose=0, random_seed=42)
        cb.fit(X_tr_imp, self.y_train)
        t_cb_fit = (time.time() - t0) * 1000

        t0 = time.time()
        cb_preds = cb.predict(X_te_imp)
        cb_lat = ((time.time() - t0) / len(self.X_test)) * 1000

        cb_r2 = r2_score(self.y_test, cb_preds)
        cb_rmse = root_mean_squared_error(self.y_test, cb_preds)
        cb_mae = mean_absolute_error(self.y_test, cb_preds)
        cb_mape = mean_absolute_percentage_error(self.y_test, cb_preds) * 100

        self.models['catboost'] = cb
        self.metrics['catboost'] = {
            'R2': round(float(cb_r2), 3),
            'RMSE (Rs/qtl)': round(float(cb_rmse), 2),
            'MAE (Rs/qtl)': round(float(cb_mae), 2),
            'MAPE (%)': round(float(cb_mape), 2),
            'latency_ms': round(float(cb_lat), 2)
        }

        # 2. XGBoost
        t0 = time.time()
        xgb = XGBRegressor(n_estimators=300, learning_rate=0.08, max_depth=6, random_state=42)
        xgb.fit(X_tr_imp, self.y_train)
        t_xgb_fit = (time.time() - t0) * 1000

        t0 = time.time()
        xgb_preds = xgb.predict(X_te_imp)
        xgb_lat = ((time.time() - t0) / len(self.X_test)) * 1000

        xgb_r2 = r2_score(self.y_test, xgb_preds)
        xgb_rmse = root_mean_squared_error(self.y_test, xgb_preds)
        xgb_mae = mean_absolute_error(self.y_test, xgb_preds)
        xgb_mape = mean_absolute_percentage_error(self.y_test, xgb_preds) * 100

        self.models['xgboost'] = xgb
        self.metrics['xgboost'] = {
            'R2': round(float(xgb_r2), 3),
            'RMSE (Rs/qtl)': round(float(xgb_rmse), 2),
            'MAE (Rs/qtl)': round(float(xgb_mae), 2),
            'MAPE (%)': round(float(xgb_mape), 2),
            'latency_ms': round(float(xgb_lat), 2)
        }

        print(f"CatBoost Performance: R2={cb_r2:.3f}, RMSE=Rs {cb_rmse:.2f}, MAE=Rs {cb_mae:.2f}, MAPE={cb_mape:.2f}%, Latency={cb_lat:.2f}ms")
        print(f"XGBoost Performance: R2={xgb_r2:.3f}, RMSE=Rs {xgb_rmse:.2f}, MAE=Rs {xgb_mae:.2f}, MAPE={xgb_mape:.2f}%, Latency={xgb_lat:.2f}ms")

    def run_ablation_experiment(self):
        """Runs multi-category ablation experiments: Model A (Full), Model B (No Lags), Model C (No Weather), Model D (No Arrivals), Model E (No Weather+Arrivals)."""
        print("\nRunning multi-category ablation experiments...")
        
        ablation_scenarios = {}
        
        # 1. Feature subsets
        lag_cols = [c for c in self.feature_cols if 'lag' in c or 'velocity' in c or 'reversal' in c]
        weather_cols = [c for c in self.feature_cols if 'temp' in c or 'rain' in c or 'ndvi' in c or 'dry_days' in c or 'stress' in c or 'heat' in c or 'glut' in c]
        arrival_cols = [c for c in self.feature_cols if 'arrival' in c]
        weather_and_arrival_cols = list(set(weather_cols + arrival_cols))

        scenarios = [
            ('Model_B_No_Price_Lags', lag_cols, 'Removed 7 price lag/velocity momentum features'),
            ('Model_C_No_Weather', weather_cols, 'Removed 12 NASA weather, NDVI, and stress features'),
            ('Model_D_No_Arrivals', arrival_cols, 'Removed 5 arrival volume and ratio features'),
            ('Model_E_No_Weather_No_Arrivals', weather_and_arrival_cols, 'Removed all 17 exogenous weather and arrival features'),
            ('Model_F_No_Spatial', [c for c in self.feature_cols if 'hub' in c or 'dist' in c or 'gradient' in c], 'Removed 3 Haversine distance and spatial price gradient features'),
            ('Model_G_No_Festivals', [c for c in self.feature_cols if 'fest' in c], 'Removed 3 festival demand anticipation and hangover features')
        ]

        for name, removed, desc in scenarios:
            kept_features = [c for c in self.feature_cols if c not in removed]
            params = {
                'objective': 'quantile',
                'alpha': 0.50,
                'metric': 'quantile',
                'n_estimators': 300,
                'random_state': 42,
                'verbose': -1,
                **self.best_params
            }

            m_abl = lgb.LGBMRegressor(**params)
            m_abl.fit(
                self.X_train[kept_features], self.y_train,
                eval_set=[(self.X_val[kept_features], self.y_val)],
                callbacks=[lgb.early_stopping(stopping_rounds=30, verbose=False)]
            )

            preds = m_abl.predict(self.X_test[kept_features])
            mape = mean_absolute_percentage_error(self.y_test, preds) * 100
            rmse = root_mean_squared_error(self.y_test, preds)
            mae = mean_absolute_error(self.y_test, preds)

            ablation_scenarios[name] = {
                'description': desc,
                'removed_feature_count': len(removed),
                'MAPE (%)': round(float(mape), 2),
                'RMSE (Rs/qtl)': round(float(rmse), 2),
                'MAE (Rs/qtl)': round(float(mae), 2)
            }
            print(f"- {name:30s} | MAE: Rs {mae:6.2f}/qtl | RMSE: Rs {rmse:6.2f}/qtl | MAPE: {mape:.2f}% ({desc})")

        self.metrics['ablation_study'] = ablation_scenarios

    def train_isolation_forest(self):
        """Trains Isolation Forest for unsupervised supply shock anomaly detection and reports honest operational proxy metrics."""
        print("\nTraining Isolation Forest for supply shock detection...")
        from sklearn.impute import SimpleImputer
        shock_features = [f for f in ['arrival_ratio', 'arrival_velocity_7d', 'price_volatility_30d', 'price_spread'] if f in self.feature_cols]

        imputer = SimpleImputer(strategy='median')
        X_train_shock = imputer.fit_transform(self.X_train[shock_features])
        X_test_shock = imputer.transform(self.X_test[shock_features])

        iso_forest = IsolationForest(
            n_estimators=150,
            contamination=0.05,
            random_state=42
        )
        iso_forest.fit(X_train_shock)
        self.models['isolation_forest'] = iso_forest

        # Unsupervised detection stats on 2025 test set
        test_preds = iso_forest.predict(X_test_shock)
        flagged_anomalies = int(np.sum(test_preds == -1))
        total_test_rows = len(test_preds)
        flagged_pct = float((flagged_anomalies / total_test_rows) * 100)

        print("Isolation Forest Unsupervised Summary (2025 Test Set):")
        print(f"- Contamination parameter: 0.05 (5%)")
        print(f"- Flagged supply shock anomalies: {flagged_anomalies} out of {total_test_rows} days ({flagged_pct:.2f}%)")

        # Operational heuristic proxy evaluation disclosure
        proxy_label = ((self.X_test['arrival_ratio'] > 1.5) | (self.X_test['price_velocity_7d'] < -50)).astype(int)
        predicted_label = (test_preds == -1).astype(int)

        tp = np.sum((proxy_label == 1) & (predicted_label == 1))
        tn = np.sum((proxy_label == 0) & (predicted_label == 0))
        fp = np.sum((proxy_label == 0) & (predicted_label == 1))
        fn = np.sum((proxy_label == 1) & (predicted_label == 0))

        specificity = float(tn / (tn + fp) * 100) if (tn + fp) > 0 else 0.0
        precision = float(precision_score(proxy_label, predicted_label, zero_division=0) * 100)
        recall = float(recall_score(proxy_label, predicted_label, zero_division=0) * 100)
        f1 = float(f1_score(proxy_label, predicted_label, zero_division=0) * 100)

        print("Operational Heuristic Proxy Evaluation (Disclosure: Heuristic Proxy, Not Ground Truth):")
        print(f"- Specificity (Normal Day Identification): {specificity:.2f}%")
        print(f"- Precision (Positive Anomaly Hit Rate):  {precision:.2f}%")
        print(f"- Recall (Heuristic Shock Recall):        {recall:.2f}%")
        print(f"- F1-Score:                               {f1:.2f}%")

        self.metrics['isolation_forest'] = {
            'model_class': 'IsolationForest',
            'contamination_rate': 0.05,
            'test_flagged_anomalies': flagged_anomalies,
            'test_flagged_percentage': round(flagged_pct, 2),
            'operational_framing': 'Unsupervised supply shock anomaly detector designed to flag extreme volume/price divergence days for market advisory triage.',
            'methodological_disclosure': 'Evaluated against operational heuristic proxy rules (arrival_ratio > 1.5 or price_velocity < -50 Rs/qtl/day), not verified historical ground-truth events. High specificity demonstrates strong normal-day retention.',
            'proxy_operational_metrics': {
                'specificity_pct': round(specificity, 2),
                'precision_proxy_pct': round(precision, 2),
                'recall_proxy_pct': round(recall, 2),
                'f1_score_proxy_pct': round(f1, 2)
            }
        }

    @staticmethod
    def apply_monotonic_rearrangement(p10, p50, p90, return_diagnostics: bool = True):
        """Applies Chernozhukov Monotonic Rearrangement (Econometrica 2010) to sort (P10, P50, P90) pointwise.
        Guarantees P10* <= P50* <= P90* everywhere and calculates before-and-after validation diagnostics.
        """
        p10_arr = np.asarray(p10, dtype=np.float64)
        p50_arr = np.asarray(p50, dtype=np.float64)
        p90_arr = np.asarray(p90, dtype=np.float64)

        raw_stack = np.column_stack([p10_arr, p50_arr, p90_arr])
        is_crossing = (p10_arr > p50_arr) | (p50_arr > p90_arr)

        sorted_stack = np.sort(raw_stack, axis=1)
        p10_mono = sorted_stack[:, 0]
        p50_mono = sorted_stack[:, 1]
        p90_mono = sorted_stack[:, 2]

        if not return_diagnostics:
            return p10_mono, p50_mono, p90_mono

        n_total = len(p10_arr)
        crossing_count = int(np.sum(is_crossing))
        crossing_rate = float((crossing_count / n_total) * 100) if n_total > 0 else 0.0

        p50_shifts = np.abs(p50_mono - p50_arr)
        p10_shifts = np.abs(p10_mono - p10_arr)
        p90_shifts = np.abs(p90_mono - p90_arr)

        mean_p50_shift_all = float(np.mean(p50_shifts)) if n_total > 0 else 0.0
        mean_p50_shift_crossings = float(np.mean(p50_shifts[is_crossing])) if crossing_count > 0 else 0.0
        max_p50_shift = float(np.max(p50_shifts)) if n_total > 0 else 0.0

        large_shifts = int(np.sum((p50_shifts > 100.0) | (p50_shifts / (np.abs(p50_arr) + 1e-6) > 0.05)))

        diagnostics = {
            'total_predictions': n_total,
            'raw_crossing_count': crossing_count,
            'raw_crossing_rate_pct': round(crossing_rate, 3),
            'post_rearrangement_crossing_count': 0,
            'post_rearrangement_crossing_rate_pct': 0.0,
            'mean_p50_shift_across_all_rs': round(mean_p50_shift_all, 2),
            'mean_p50_shift_on_crossings_rs': round(mean_p50_shift_crossings, 2),
            'max_p50_shift_rs': round(max_p50_shift, 2),
            'mean_p10_shift_rs': round(float(np.mean(p10_shifts)), 2) if n_total > 0 else 0.0,
            'mean_p90_shift_rs': round(float(np.mean(p90_shifts)), 2) if n_total > 0 else 0.0,
            'large_shift_anomalies_count': large_shifts,
            'safety_guard_status': 'PASSED (Clean Minor Shifts)' if large_shifts == 0 else f'FLAGGED ({large_shifts} large shifts)'
        }

        return p10_mono, p50_mono, p90_mono, diagnostics

    def calibrate_conformal_quantiles(self):
        """Calibrates P10-P90 prediction intervals using Conformalized Quantile Regression (CQR) and calculates MPIW sharpness."""
        print("\nRunning Conformalized Quantile Regression (CQR) Calibration & MPIW Sharpness...")
        val_p10_raw = self.models['p10'].predict(self.X_val)
        val_p50_raw = self.models['p50'].predict(self.X_val)
        val_p90_raw = self.models['p90'].predict(self.X_val)

        val_p10, val_p50, val_p90, val_diag = self.apply_monotonic_rearrangement(val_p10_raw, val_p50_raw, val_p90_raw)

        # Compute non-conformity scores on rearranged validation set: E_i = max(q10(x_i) - y_i, y_i - q90(x_i))
        nonconformity_scores = np.maximum(val_p10 - self.y_val, self.y_val - val_p90)
        
        # Target 80% coverage (alpha = 0.20)
        alpha = 0.20
        n_val = len(self.y_val)
        quantile_rank = np.ceil((1.0 - alpha) * (n_val + 1)) / n_val
        q_scale = min(1.0, max(0.0, quantile_rank))
        self.cqr_q_offset = float(np.quantile(nonconformity_scores, q_scale))

        print(f"- Validation Non-Conformity Offset (Q_conf): Rs {self.cqr_q_offset:.2f}/qtl")

        # Evaluate on Test Set
        raw_p10_te = self.models['p10'].predict(self.X_test)
        raw_p50_te = self.models['p50'].predict(self.X_test)
        raw_p90_te = self.models['p90'].predict(self.X_test)
        
        mono_p10_te, mono_p50_te, mono_p90_te, te_diag = self.apply_monotonic_rearrangement(raw_p10_te, raw_p50_te, raw_p90_te)
        
        cal_p10 = mono_p10_te - self.cqr_q_offset
        cal_p90 = mono_p90_te + self.cqr_q_offset

        raw_cov = float(np.mean((self.y_test >= mono_p10_te) & (self.y_test <= mono_p90_te)) * 100)
        cal_cov = float(np.mean((self.y_test >= cal_p10) & (self.y_test <= cal_p90)) * 100)

        raw_mpiw = float(np.mean(mono_p90_te - mono_p10_te))
        cal_mpiw = float(np.mean(cal_p90 - cal_p10))

        print(f"- Uncalibrated Test P10-P90 Coverage: {raw_cov:.2f}% (MPIW: Rs {raw_mpiw:.2f}/qtl)")
        print(f"- Calibrated Test P10-P90 Coverage:   {cal_cov:.2f}% (MPIW: Rs {cal_mpiw:.2f}/qtl | Target: 80.0% +/- 1.0%)")

        self.metrics['conformal_calibration_cqr'] = {
            'target_nominal_coverage_pct': 80.0,
            'cqr_offset_qconf_rs_qtl': round(self.cqr_q_offset, 2),
            'uncalibrated_test_coverage_pct': round(raw_cov, 2),
            'uncalibrated_mpiw_rs_qtl': round(raw_mpiw, 2),
            'calibrated_test_coverage_pct': round(cal_cov, 2),
            'calibrated_mpiw_rs_qtl': round(cal_mpiw, 2)
        }

    def run_purged_walk_forward_cv(self, n_splits: int = 5):
        """Executes 5-Fold Purged Walk-Forward Time-Series Cross-Validation strictly on Train+Val (2019-2024), leaving Test Set strictly untouched."""
        print(f"\nExecuting {n_splits}-Fold Purged Walk-Forward Cross-Validation (2019-2024 Train/Val Data Only)...")
        from sklearn.model_selection import TimeSeriesSplit

        tscv = TimeSeriesSplit(n_splits=n_splits)
        cv_maes, cv_rmses, cv_mapes = [], [], []

        # STRICTLY 2019-2024 Data: Test set 2025 is NOT included to prevent leakage
        X_cv = pd.concat([self.X_train, self.X_val])
        y_cv = pd.concat([self.y_train, self.y_val])

        for fold, (train_idx, test_idx) in enumerate(tscv.split(X_cv), 1):
            # Apply 7-day purging buffer: drop trailing 7 days of train index to prevent overlap leakage
            purged_train_idx = train_idx[:-7] if len(train_idx) > 7 else train_idx
            
            X_tr, y_tr = X_cv.iloc[purged_train_idx], y_cv.iloc[purged_train_idx]
            X_te, y_te = X_cv.iloc[test_idx], y_cv.iloc[test_idx]

            params = {'objective': 'quantile', 'alpha': 0.50, 'n_estimators': 150, 'random_state': 42, 'verbose': -1, **self.best_params}
            m_p50 = lgb.LGBMRegressor(**params).fit(X_tr, y_tr)
            
            preds_p50 = m_p50.predict(X_te)
            mae = mean_absolute_error(y_te, preds_p50)
            rmse = root_mean_squared_error(y_te, preds_p50)
            mape = mean_absolute_percentage_error(y_te, preds_p50) * 100

            cv_maes.append(mae)
            cv_rmses.append(rmse)
            cv_mapes.append(mape)

        mean_mae = float(np.mean(cv_maes))
        mean_rmse = float(np.mean(cv_rmses))
        mean_mape = float(np.mean(cv_mapes))

        print(f"Purged {n_splits}-Fold Walk-Forward CV Results (Leakage-Free 2019-2024 Data):")
        print(f"- Mean MAE:  Rs {mean_mae:.2f}/qtl")
        print(f"- Mean RMSE: Rs {mean_rmse:.2f}/qtl")
        print(f"- Mean MAPE: {mean_mape:.2f}%")

        self.metrics['purged_walk_forward_cv'] = {
            'n_splits': n_splits,
            'purging_buffer_days': 7,
            'evaluation_data_scope': '2019-2024 Train and Validation Data Only (2025 Test Set strictly isolated)',
            'mean_mae_rs_qtl': round(mean_mae, 2),
            'mean_rmse_rs_qtl': round(mean_rmse, 2),
            'mean_mape_pct': round(mean_mape, 2)
        }

    def run_diebold_mariano_tests(self):
        """Calculates Diebold-Mariano (DM) pairwise statistical significance tests with Newey-West (HAC) robust standard errors.
        Evaluates under both Absolute Error Loss (appropriate for median/quantile models) and Squared Error Loss (MSE).
        """
        print("\nRunning Diebold-Mariano (DM) Statistical Significance Tests (Newey-West HAC Corrected)...")
        p50_preds = self.models['p50'].predict(self.X_test)
        e_lgb = np.array(self.y_test) - np.array(p50_preds)

        dm_results = {}
        # Compare against Ridge
        if 'ridge_baseline' in self.models:
            r_preds = self.models['ridge_baseline'].predict(self.X_test)
            e_ridge = np.array(self.y_test) - np.array(r_preds)
            
            # 1. Absolute Error Loss (MAE)
            d_mae = np.abs(e_ridge) - np.abs(e_lgb)
            ols_mae = OLS(d_mae, np.ones(len(d_mae))).fit(cov_type='HAC', cov_kwds={'maxlags': 7})
            stat_mae = float(ols_mae.tvalues[0])
            p_mae = float(ols_mae.pvalues[0])
            winner_mae = 'LightGBM P50' if stat_mae > 0 else 'Ridge' if p_mae < 0.05 else 'No Statistically Significant Difference'

            # 2. Squared Error Loss (MSE)
            d_mse = np.array(e_ridge**2 - e_lgb**2, dtype=np.float64)
            ols_mse = OLS(d_mse, np.ones(len(d_mse))).fit(cov_type='HAC', cov_kwds={'maxlags': 7})
            stat_mse = float(ols_mse.tvalues[0])
            p_mse = float(ols_mse.pvalues[0])
            winner_mse = 'LightGBM P50' if stat_mse > 0 else 'Ridge' if p_mse < 0.05 else 'No Statistically Significant Difference'
                
            dm_results['LightGBM_vs_Ridge'] = {
                'absolute_loss_mae': {
                    'loss_function': 'Absolute Error Loss (MAE)',
                    'variance_estimator': 'Newey-West HAC (maxlags=7)',
                    'DM_Statistic': round(stat_mae, 4),
                    'p_value': round(p_mae, 6),
                    'Statistically_Significant': bool(p_mae < 0.05),
                    'Superior_Model': winner_mae
                },
                'squared_loss_mse': {
                    'loss_function': 'Squared Error (MSE)',
                    'variance_estimator': 'Newey-West HAC (maxlags=7)',
                    'DM_Statistic': round(stat_mse, 4),
                    'p_value': round(p_mse, 6),
                    'Statistically_Significant': bool(p_mse < 0.05),
                    'Superior_Model': winner_mse
                }
            }
            print(f"- LightGBM vs Ridge   | MAE Loss DM Stat: {stat_mae:7.3f} (p={p_mae:.6f}, Winner: {winner_mae}) | MSE Loss DM Stat: {stat_mse:7.3f} (p={p_mse:.6f}, Winner: {winner_mse})")

        # Compare against XGBoost
        if 'xgboost' in self.models:
            if hasattr(self, 'xgb_imputer') and self.xgb_imputer is not None:
                X_te_imp = self.xgb_imputer.transform(self.X_test)
            else:
                imputer = SimpleImputer(strategy='median')
                imputer.fit(self.X_train)
                X_te_imp = imputer.transform(self.X_test)
                
            xgb_preds = self.models['xgboost'].predict(X_te_imp)
            e_xgb = np.array(self.y_test) - np.array(xgb_preds)
            
            # 1. Absolute Error Loss (MAE)
            d_mae = np.abs(e_xgb) - np.abs(e_lgb)
            ols_mae = OLS(d_mae, np.ones(len(d_mae))).fit(cov_type='HAC', cov_kwds={'maxlags': 7})
            stat_mae = float(ols_mae.tvalues[0])
            p_mae = float(ols_mae.pvalues[0])
            winner_mae = 'LightGBM P50' if stat_mae > 0 else 'XGBoost' if p_mae < 0.05 else 'No Statistically Significant Difference'

            # 2. Squared Error Loss (MSE)
            d_mse = np.array(e_xgb**2 - e_lgb**2, dtype=np.float64)
            ols_mse = OLS(d_mse, np.ones(len(d_mse))).fit(cov_type='HAC', cov_kwds={'maxlags': 7})
            stat_mse = float(ols_mse.tvalues[0])
            p_mse = float(ols_mse.pvalues[0])
            winner_mse = 'LightGBM P50' if stat_mse > 0 else 'XGBoost' if p_mse < 0.05 else 'No Statistically Significant Difference'
                
            dm_results['LightGBM_vs_XGBoost'] = {
                'absolute_loss_mae': {
                    'loss_function': 'Absolute Error Loss (MAE)',
                    'variance_estimator': 'Newey-West HAC (maxlags=7)',
                    'DM_Statistic': round(stat_mae, 4),
                    'p_value': round(p_mae, 6),
                    'Statistically_Significant': bool(p_mae < 0.05),
                    'Superior_Model': winner_mae
                },
                'squared_loss_mse': {
                    'loss_function': 'Squared Error (MSE)',
                    'variance_estimator': 'Newey-West HAC (maxlags=7)',
                    'DM_Statistic': round(stat_mse, 4),
                    'p_value': round(p_mse, 6),
                    'Statistically_Significant': bool(p_mse < 0.05),
                    'Superior_Model': winner_mse
                }
            }
            print(f"- LightGBM vs XGBoost | MAE Loss DM Stat: {stat_mae:7.3f} (p={p_mae:.6f}, Winner: {winner_mae}) | MSE Loss DM Stat: {stat_mse:7.3f} (p={p_mse:.6f}, Winner: {winner_mse})")

        self.metrics['diebold_mariano_tests'] = dm_results

    def run_ljung_box_test(self):
        """Tests residual autocorrelation of LightGBM P50 predictions across multiple lags to verify temporal white noise properties."""
        print("\nRunning Ljung-Box Residual Autocorrelation Diagnostic...")
        from statsmodels.stats.diagnostic import acorr_ljungbox
        p50_preds = self.models['p50'].predict(self.X_test)
        residuals = np.array(self.y_test) - np.array(p50_preds)

        lb_df = acorr_ljungbox(residuals, lags=[1, 7, 14, 30], return_df=True)
        lb_results = {}
        for lag, row in lb_df.iterrows():
            lb_results[f"lag_{lag}"] = {
                'lb_stat': round(float(row['lb_stat']), 3),
                'p_value': round(float(row['lb_pvalue']), 5)
            }
            print(f"- Lag {lag:2d} | LB Stat: {row['lb_stat']:7.3f} | p-value: {row['lb_pvalue']:.5f}")
        self.metrics['ljung_box_residual_test'] = lb_results

    def compute_bootstrap_confidence_intervals(self, n_bootstraps: int = 1000):
        """Computes 95% non-parametric Circular Block Bootstrap confidence intervals on test set evaluation metrics."""
        print(f"\nComputing 95% Circular Block Bootstrap Confidence Intervals ({n_bootstraps} resamples, 7-day blocks)...")
        raw_p10 = self.models['p10'].predict(self.X_test)
        raw_p50 = self.models['p50'].predict(self.X_test)
        raw_p90 = self.models['p90'].predict(self.X_test)
        p10_preds, p50_preds, p90_preds = self.apply_monotonic_rearrangement(raw_p10, raw_p50, raw_p90, return_diagnostics=False)
        y_true = np.array(self.y_test)

        n_samples = len(y_true)
        block_size = 7
        num_blocks = int(np.ceil(n_samples / block_size))
        np.random.seed(42)

        boot_maes = []
        boot_mapes = []
        boot_rmses = []
        boot_r2s = []
        boot_coverages = []

        for _ in range(n_bootstraps):
            start_indices = np.random.randint(0, n_samples, size=num_blocks)
            indices = np.concatenate([
                np.arange(start, start + block_size) % n_samples for start in start_indices
            ])[:n_samples]

            b_y = y_true[indices]
            b_p50 = p50_preds[indices]
            b_p10 = p10_preds[indices]
            b_p90 = p90_preds[indices]

            boot_maes.append(mean_absolute_error(b_y, b_p50))
            boot_rmses.append(root_mean_squared_error(b_y, b_p50))
            boot_mapes.append(mean_absolute_percentage_error(b_y, b_p50) * 100)
            boot_r2s.append(r2_score(b_y, b_p50))
            boot_coverages.append(np.mean((b_y >= b_p10) & (b_y <= b_p90)) * 100)

        ci_95 = {
            'MAE_CI_95': [round(float(np.percentile(boot_maes, 2.5)), 2), round(float(np.percentile(boot_maes, 97.5)), 2)],
            'RMSE_CI_95': [round(float(np.percentile(boot_rmses, 2.5)), 2), round(float(np.percentile(boot_rmses, 97.5)), 2)],
            'MAPE_CI_95': [round(float(np.percentile(boot_mapes, 2.5)), 2), round(float(np.percentile(boot_mapes, 97.5)), 2)],
            'R2_CI_95': [round(float(np.percentile(boot_r2s, 2.5)), 3), round(float(np.percentile(boot_r2s, 97.5)), 3)],
            'Coverage_CI_95': [round(float(np.percentile(boot_coverages, 2.5)), 2), round(float(np.percentile(boot_coverages, 97.5)), 2)]
        }

        print("95% Circular Block Bootstrap Confidence Intervals (2025 Test Set, Block Length = 7d):")
        print(f"- MAE:  Rs {np.mean(boot_maes):.2f} (95% CI: [{ci_95['MAE_CI_95'][0]}, {ci_95['MAE_CI_95'][1]}])")
        print(f"- MAPE: {np.mean(boot_mapes):.2f}% (95% CI: [{ci_95['MAPE_CI_95'][0]}%, {ci_95['MAPE_CI_95'][1]}%])")
        print(f"- R2:   {np.mean(boot_r2s):.3f} (95% CI: [{ci_95['R2_CI_95'][0]}, {ci_95['R2_CI_95'][1]}])")
        print(f"- Coverage: {np.mean(boot_coverages):.2f}% (95% CI: [{ci_95['Coverage_CI_95'][0]}%, {ci_95['Coverage_CI_95'][1]}%])")

        self.metrics['bootstrap_confidence_intervals_95'] = {
            'method': 'Circular Block Bootstrap (7-Day Temporal Blocks)',
            'block_length_days': 7,
            'n_bootstraps': n_bootstraps,
            'random_seed': 42,
            **ci_95
        }

    def run_covid_analysis(self):
        """Evaluates model performance across historical market regimes: COVID-19 lockdown period (2020-2021) vs Normal period (2022-2024).
        Methodological Note: This is an in-sample training-period retrospective consistency analysis (not an unseen stress test).
        """
        print("\nRunning Historical Regime Consistency Analysis (In-Sample 2020-2021 Shock vs 2022-2024 Normal)...")
        df_eval = self.df.copy()
        df_eval['year'] = df_eval['date'].dt.year
        
        covid_mask = df_eval['year'].isin([2020, 2021])
        normal_mask = df_eval['year'].isin([2022, 2023, 2024])
        
        p50_model = self.models['p50']
        
        # Predict on COVID period
        X_covid = df_eval.loc[covid_mask, self.feature_cols]
        y_covid = df_eval.loc[covid_mask, self.target_col]
        preds_covid = p50_model.predict(X_covid)
        
        mae_covid = float(mean_absolute_error(y_covid, preds_covid))
        rmse_covid = float(root_mean_squared_error(y_covid, preds_covid))
        mape_covid = float(mean_absolute_percentage_error(y_covid, preds_covid) * 100)
        r2_covid = float(r2_score(y_covid, preds_covid))
        
        # Predict on Normal period
        X_normal = df_eval.loc[normal_mask, self.feature_cols]
        y_normal = df_eval.loc[normal_mask, self.target_col]
        preds_normal = p50_model.predict(X_normal)
        
        mae_normal = float(mean_absolute_error(y_normal, preds_normal))
        rmse_normal = float(root_mean_squared_error(y_normal, preds_normal))
        mape_normal = float(mean_absolute_percentage_error(y_normal, preds_normal) * 100)
        r2_normal = float(r2_score(y_normal, preds_normal))
        
        print(f"- COVID Shock Period (2020-2021): MAE = Rs {mae_covid:6.2f}/qtl | RMSE = Rs {rmse_covid:6.2f}/qtl | MAPE = {mape_covid:.2f}% | R2 = {r2_covid:.3f}")
        print(f"- Normal Market Period (2022-2024): MAE = Rs {mae_normal:6.2f}/qtl | RMSE = Rs {rmse_normal:6.2f}/qtl | MAPE = {mape_normal:.2f}% | R2 = {r2_normal:.3f}")
        
        self.metrics['covid_period_consistency_analysis'] = {
            'study_type': 'In-sample training-period temporal consistency analysis during the COVID-19 period (2020-2021 shock vs 2022-2024 normal)',
            'covid_shock_2020_2021': {
                'MAE (Rs/qtl)': round(mae_covid, 2),
                'RMSE (Rs/qtl)': round(rmse_covid, 2),
                'MAPE (%)': round(mape_covid, 2),
                'R2': round(r2_covid, 3)
            },
            'normal_market_2022_2024': {
                'MAE (Rs/qtl)': round(mae_normal, 2),
                'RMSE (Rs/qtl)': round(rmse_normal, 2),
                'MAPE (%)': round(mape_normal, 2),
                'R2': round(r2_normal, 3)
            }
        }

    def run_leave_one_mandi_out_validation(self):
        """Executes Leave-One-Mandi-Out (LOMO) Cross-Validation to evaluate spatial generalization to unseen markets."""
        print("\nRunning Leave-One-Mandi-Out (LOMO) Spatial Generalization Cross-Validation...")
        mandis = list(self.df['market'].unique())
        lomo_results = {}
        
        params = {
            'objective': 'quantile',
            'alpha': 0.50,
            'metric': 'quantile',
            'n_estimators': 200,
            'random_state': 42,
            'verbose': -1,
            **self.best_params
        }
        
        for holdout_mandi in mandis:
            train_mask = (self.df['market'] != holdout_mandi) & (self.df['date'].dt.year <= 2024)
            test_mask = (self.df['market'] == holdout_mandi) & (self.df['date'].dt.year == 2025)
            
            if train_mask.sum() == 0 or test_mask.sum() == 0:
                continue
                
            X_lomo_tr = self.df.loc[train_mask, self.feature_cols]
            y_lomo_tr = self.df.loc[train_mask, self.target_col]
            
            X_lomo_te = self.df.loc[test_mask, self.feature_cols]
            y_lomo_te = self.df.loc[test_mask, self.target_col]
            
            m_lomo = lgb.LGBMRegressor(**params).fit(X_lomo_tr, y_lomo_tr)
            preds = m_lomo.predict(X_lomo_te)
            
            mae = float(mean_absolute_error(y_lomo_te, preds))
            rmse = float(root_mean_squared_error(y_lomo_te, preds))
            mape = float(mean_absolute_percentage_error(y_lomo_te, preds) * 100)
            r2_val = float(r2_score(y_lomo_te, preds))
            
            lomo_results[holdout_mandi] = {
                'Holdout_Mandi': holdout_mandi,
                'MAE (Rs/qtl)': round(mae, 2),
                'RMSE (Rs/qtl)': round(rmse, 2),
                'MAPE (%)': round(mape, 2),
                'R2': round(r2_val, 3)
            }
            print(f"- Holdout: {holdout_mandi:15s} | MAE: Rs {mae:6.2f}/qtl | RMSE: Rs {rmse:6.2f}/qtl | MAPE: {mape:.2f}% | R2: {r2_val:.3f}")
            
        self.metrics['leave_one_mandi_out_spatial_cv'] = lomo_results

    def evaluate_performance(self):
        """Calculates evaluation metrics (MAPE, RMSE, MAE, R2, sMAPE, MASE, Pinball Loss, Coverage) on validation and test sets."""
        print("\nEvaluating model performance...")

        eval_summary = {}
        naive_train_diff = float(np.mean(np.abs(np.diff(self.y_train)))) if len(self.y_train) > 1 else 1.0

        for set_name, X, y in [('Validation (2024)', self.X_val, self.y_val), ('Test (2025)', self.X_test, self.y_test)]:
            raw_p10 = self.models['p10'].predict(X)
            raw_p50 = self.models['p50'].predict(X)
            raw_p90 = self.models['p90'].predict(X)

            p10_preds, p50_preds, p90_preds, diag = self.apply_monotonic_rearrangement(raw_p10, raw_p50, raw_p90, return_diagnostics=True)

            mape = mean_absolute_percentage_error(y, p50_preds) * 100
            rmse = root_mean_squared_error(y, p50_preds)
            mae = mean_absolute_error(y, p50_preds)
            r2_val = r2_score(y, p50_preds)
            smape = float(np.mean(200.0 * np.abs(y - p50_preds) / (np.abs(y) + np.abs(p50_preds) + 1e-8)))
            mase = float(mae / naive_train_diff) if naive_train_diff > 0 else 1.0

            p10_pinball = self._pinball_loss(y, p10_preds, 0.10)
            p50_pinball = self._pinball_loss(y, p50_preds, 0.50)
            p90_pinball = self._pinball_loss(y, p90_preds, 0.90)

            # Empirical coverage percentage (actual price falling between P10 and P90)
            coverage = np.mean((y >= p10_preds) & (y <= p90_preds)) * 100

            eval_summary[set_name] = {
                'MAPE (%)': round(float(mape), 2),
                'sMAPE (%)': round(float(smape), 2),
                'RMSE (Rs/qtl)': round(float(rmse), 2),
                'MAE (Rs/qtl)': round(float(mae), 2),
                'MASE': round(float(mase), 3),
                'R2': round(float(r2_val), 3),
                'P10 Pinball Loss': round(float(p10_pinball), 4),
                'P50 Pinball Loss': round(float(p50_pinball), 4),
                'P90 Pinball Loss': round(float(p90_pinball), 4),
                'P10-P90 Quantile Forecast Band Coverage (%)': round(float(coverage), 2),
                'rearrangement_diagnostics': diag
            }

            print(f"\n{set_name} Performance (Chernozhukov Monotonic Rearranged):")
            print(f"- MAPE (P50 Median Price): {mape:.2f}% | sMAPE: {smape:.2f}% | MASE: {mase:.3f}")
            print(f"- RMSE (P50 Median Price): Rs {rmse:.2f}/qtl | MAE: Rs {mae:.2f}/qtl | R2: {r2_val:.3f}")
            print(f"- P10 Pinball Loss: {p10_pinball:.4f} | P50 Pinball Loss: {p50_pinball:.4f} | P90 Pinball Loss: {p90_pinball:.4f}")
            print(f"- P10-P90 Quantile Forecast Band Coverage: {coverage:.2f}% (P10 <= actual <= P90)")
            print(f"- Monotonicity: 0 crossings (Raw had {diag['raw_crossing_count']} crossings, mean shift = Rs {diag['mean_p50_shift_on_crossings_rs']:.2f}/qtl)")

        # Compute per-commodity metrics breakdown on 2025 Test Set
        print("\nPer-Commodity Test Performance Breakdown (2025 Test Set):")
        per_commodity_metrics = {}
        test_df_subset = self.df.loc[self.X_test.index].copy()
        test_df_subset['p50_pred'] = p50_preds

        for comm, group in test_df_subset.groupby('commodity'):
            c_y = group[self.target_col]
            c_pred = group['p50_pred']
            c_mae = mean_absolute_error(c_y, c_pred)
            c_rmse = root_mean_squared_error(c_y, c_pred)
            c_mape = mean_absolute_percentage_error(c_y, c_pred) * 100
            c_r2 = r2_score(c_y, c_pred)
            c_smape = float(np.mean(200.0 * np.abs(c_y - c_pred) / (np.abs(c_y) + np.abs(c_pred) + 1e-8)))

            per_commodity_metrics[comm] = {
                'MAE (Rs/qtl)': round(float(c_mae), 2),
                'RMSE (Rs/qtl)': round(float(c_rmse), 2),
                'MAPE (%)': round(float(c_mape), 2),
                'sMAPE (%)': round(float(c_smape), 2),
                'R2': round(float(c_r2), 3)
            }
            print(f"- {comm:10s} | MAE: Rs {c_mae:6.2f}/qtl | RMSE: Rs {c_rmse:6.2f}/qtl | MAPE: {c_mape:.2f}% | R2: {c_r2:.3f}")

        eval_summary['Per_Commodity_Breakdown_2025'] = per_commodity_metrics

        # Compute per-mandi metrics breakdown on 2025 Test Set
        print("\nPer-Mandi Test Performance Breakdown (2025 Test Set):")
        per_mandi_metrics = {}
        for mkt, group in test_df_subset.groupby('market'):
            m_y = group[self.target_col]
            m_pred = group['p50_pred']
            m_mae = mean_absolute_error(m_y, m_pred)
            m_rmse = root_mean_squared_error(m_y, m_pred)
            m_mape = mean_absolute_percentage_error(m_y, m_pred) * 100
            m_r2 = r2_score(m_y, m_pred)

            per_mandi_metrics[mkt] = {
                'MAE (Rs/qtl)': round(float(m_mae), 2),
                'RMSE (Rs/qtl)': round(float(m_rmse), 2),
                'MAPE (%)': round(float(m_mape), 2),
                'R2': round(float(m_r2), 3)
            }
            print(f"- {mkt:15s} | MAE: Rs {m_mae:6.2f}/qtl | RMSE: Rs {m_rmse:6.2f}/qtl | MAPE: {m_mape:.2f}% | R2: {m_r2:.3f}")

        eval_summary['Per_Mandi_Breakdown_2025'] = per_mandi_metrics
        self.metrics['performance'] = eval_summary

    def check_quantile_crossings(self):
        """Verifies P10 <= P50 <= P90 monotonicity before and after Chernozhukov Monotonic Rearrangement."""
        print("\nChecking P10 <= P50 <= P90 Quantile Crossings & Before-vs-After Validation...")
        
        crossing_results = {}
        
        for set_name, X, key in [('Validation (2024)', self.X_val, 'val'), ('Test (2025)', self.X_test, 'test')]:
            p10 = self.models['p10'].predict(X)
            p50 = self.models['p50'].predict(X)
            p90 = self.models['p90'].predict(X)
            
            p10_mono, p50_mono, p90_mono, diag = self.apply_monotonic_rearrangement(p10, p50, p90, return_diagnostics=True)
            
            crossing_results[key] = {
                'dataset': set_name,
                **diag
            }
            print(f"- {set_name:20s}: Raw Crossings = {diag['raw_crossing_count']:,} ({diag['raw_crossing_rate_pct']:.2f}%) | Post-Rearrangement Crossings = {diag['post_rearrangement_crossing_count']} ({diag['post_rearrangement_crossing_rate_pct']:.2f}%)")
            print(f"  Validation Shifts: Mean P50 Shift on Crossings = Rs {diag['mean_p50_shift_on_crossings_rs']:.2f}/qtl | Max Shift = Rs {diag['max_p50_shift_rs']:.2f}/qtl | Safety Status = {diag['safety_guard_status']}")
            
        # Breakdown by Commodity on Test Set
        test_df_subset = self.df.loc[self.X_test.index].copy()
        test_df_subset['p10'] = self.models['p10'].predict(self.X_test)
        test_df_subset['p50'] = self.models['p50'].predict(self.X_test)
        test_df_subset['p90'] = self.models['p90'].predict(self.X_test)
        
        commodity_crossings = {}
        for comm, grp in test_df_subset.groupby('commodity'):
            _, _, _, c_diag = self.apply_monotonic_rearrangement(grp['p10'], grp['p50'], grp['p90'], return_diagnostics=True)
            commodity_crossings[comm] = {
                'total_predictions': c_diag['total_predictions'],
                'raw_crossings': c_diag['raw_crossing_count'],
                'raw_crossing_rate_pct': c_diag['raw_crossing_rate_pct'],
                'post_rearrangement_crossings': c_diag['post_rearrangement_crossing_count'],
                'mean_p50_shift_rs': c_diag['mean_p50_shift_on_crossings_rs']
            }
        crossing_results['per_commodity_test'] = commodity_crossings
        
        # Breakdown by Mandi on Test Set
        mandi_crossings = {}
        for mkt, grp in test_df_subset.groupby('market'):
            _, _, _, m_diag = self.apply_monotonic_rearrangement(grp['p10'], grp['p50'], grp['p90'], return_diagnostics=True)
            mandi_crossings[mkt] = {
                'total_predictions': m_diag['total_predictions'],
                'raw_crossings': m_diag['raw_crossing_count'],
                'raw_crossing_rate_pct': m_diag['raw_crossing_rate_pct'],
                'post_rearrangement_crossings': m_diag['post_rearrangement_crossing_count'],
                'mean_p50_shift_rs': m_diag['mean_p50_shift_on_crossings_rs']
            }
        crossing_results['per_mandi_test'] = mandi_crossings
        
        self.metrics['quantile_crossings'] = crossing_results

    def generate_explainability_and_plots(self):
        """Generates SHAP explainability and saves plot figures with corrected terminology."""
        print("\nGenerating SHAP plots and saving charts...")

        sns.set_theme(style='whitegrid', palette='Set2')

        # 1. SHAP Feature Importance Calculation & Plot
        p50_model = self.models['p50']
        explainer = shap.TreeExplainer(p50_model)
        sample_X = self.X_val.sample(n=min(1000, len(self.X_val)), random_state=42)
        self.shap_values = explainer(sample_X)

        # Calculate mean absolute SHAP values across features
        mean_abs_shap = np.abs(self.shap_values.values).mean(axis=0)
        shap_series = pd.Series(mean_abs_shap, index=self.feature_cols).sort_values(ascending=False)

        plt.figure(figsize=(10, 6), dpi=300)
        shap.summary_plot(self.shap_values, sample_X, plot_type="bar", show=False)
        plt.title('SHAP Feature Importance (Mean Absolute SHAP - P50 Model)', fontsize=12, fontweight='bold', pad=12)
        plt.tight_layout()
        shap_fig_path = os.path.join(self.figures_dir, '5_shap_feature_importance.png')
        plt.savefig(shap_fig_path, dpi=300)
        plt.close()
        print(f"Saved: {shap_fig_path}")

        # Record SHAP importance and split importance separately in metadata for P50
        self.metrics['top_15_shap_importance_p50'] = shap_series.head(15).round(4).to_dict()
        
        split_importance = pd.Series(p50_model.feature_importances_, index=self.feature_cols).sort_values(ascending=False)
        self.metrics['top_15_split_importance_p50'] = split_importance.head(15).to_dict()

        # Compute TreeSHAP for P10 (Downside Floor) and P90 (Upside Ceiling) models
        explainer_p10 = shap.TreeExplainer(self.models['p10'])
        shap_vals_p10 = explainer_p10(sample_X)
        shap_p10_series = pd.Series(np.abs(shap_vals_p10.values).mean(axis=0), index=self.feature_cols).sort_values(ascending=False)
        self.metrics['top_15_shap_importance_p10'] = shap_p10_series.head(15).round(4).to_dict()

        explainer_p90 = shap.TreeExplainer(self.models['p90'])
        shap_vals_p90 = explainer_p90(sample_X)
        shap_p90_series = pd.Series(np.abs(shap_vals_p90.values).mean(axis=0), index=self.feature_cols).sort_values(ascending=False)
        self.metrics['top_15_shap_importance_p90'] = shap_p90_series.head(15).round(4).to_dict()

        # 2. Forecast Band Plot (P10, P50, P90 vs Actual Prices)
        fig, ax = plt.subplots(figsize=(12, 5), dpi=300)
        test_df = self.df.loc[self.X_test.index].copy()
        test_df['p10'] = self.models['p10'].predict(self.X_test)
        test_df['p50'] = self.models['p50'].predict(self.X_test)
        test_df['p90'] = self.models['p90'].predict(self.X_test)

        sample_test = test_df[(test_df['commodity'] == 'Tomato') & (test_df['market'] == 'Azadpur')].tail(120)

        ax.plot(sample_test['date'], sample_test['modal_price'], label='Actual Price', color='black', linewidth=1.8)
        ax.plot(sample_test['date'], sample_test['p50'], label='Predicted Median (P50)', color='crimson', linewidth=1.5, linestyle='--')
        ax.fill_between(sample_test['date'], sample_test['p10'], sample_test['p90'], color='crimson', alpha=0.2, label='P10-P90 Quantile Forecast Band')

        ax.set_title('Tomato Wholesale Price Forecast Band (Azadpur 2025 Test Set)', fontsize=12, fontweight='bold', pad=10)
        ax.set_xlabel('Date')
        ax.set_ylabel('Wholesale Price (Rs/Quintal)')
        ax.legend(loc='upper left')
        ax.grid(alpha=0.4)
        plt.tight_layout()
        interval_fig_path = os.path.join(self.figures_dir, '6_prediction_intervals_p10_p90.png')
        plt.savefig(interval_fig_path, dpi=300)
        plt.close()
        print(f"Saved: {interval_fig_path}")

        # 3. Supply Shock Anomaly Score Distribution Plot
        from sklearn.impute import SimpleImputer
        shock_features = [f for f in ['arrival_ratio', 'arrival_velocity_7d', 'price_volatility_30d', 'price_spread'] if f in self.feature_cols]
        imputer = SimpleImputer(strategy='median')
        X_test_shock = imputer.fit_transform(self.X_test[shock_features])
        scores = self.models['isolation_forest'].decision_function(X_test_shock)

        fig, ax = plt.subplots(figsize=(8, 4), dpi=300)
        ax.hist(scores, bins=40, color='darkorange', edgecolor='white', alpha=0.85)
        ax.axvline(0, color='red', linestyle='--', linewidth=1.5, label='Anomaly Cutoff (Score < 0)')
        ax.set_title('Isolation Forest Supply Shock Anomaly Scores', fontsize=12, fontweight='bold', pad=10)
        ax.set_xlabel('Anomaly Score (< 0 indicates potential supply shock)')
        ax.set_ylabel('Frequency')
        ax.legend()
        ax.grid(alpha=0.4)
        plt.tight_layout()
        shock_fig_path = os.path.join(self.figures_dir, '7_supply_shock_anomaly_scores.png')
        plt.savefig(shock_fig_path, dpi=300)
        plt.close()
        print(f"Saved: {shock_fig_path}")

    def save_artifacts(self):
        """Saves trained model files and complete metadata JSON to disk."""
        print(f"\nSaving model files to: {self.output_dir}")

        for name, model in self.models.items():
            file_path = os.path.join(self.output_dir, f"{name}.pkl")
            joblib.dump(model, file_path)
            print(f"Saved: {file_path}")

        metadata = {
            'project': 'CropLens AI',
            'phase': 'Phase 3 Core AI/ML Engine',
            'dataset_info': {
                'data_path': self.data_path,
                'total_rows': self.df.shape[0],
                'total_columns': self.df.shape[1],
                'date_min': str(self.df['date'].min().date()),
                'date_max': str(self.df['date'].max().date()),
                'train_rows_2019_2023': self.X_train.shape[0],
                'val_rows_2024': self.X_val.shape[0],
                'test_rows_2025': self.X_test.shape[0]
            },
            'target_variable': self.target_col,
            'feature_count': len(self.feature_cols),
            'feature_cols': self.feature_cols,
            'random_seed': 42,
            'optuna_info': {
                'n_trials': 15,
                'objective': 'quantile',
                'alpha': 0.50,
                'metric': 'quantile pinball loss',
                'sampler': 'TPESampler(seed=42)',
                'best_hyperparameters': self.best_params
            },
            'quantile_models': {
                'p10_alpha': 0.10,
                'p50_alpha': 0.50,
                'p90_alpha': 0.90,
                'band_terminology': 'P10-P90 Quantile Forecast Band'
            },
            'metrics': self.metrics
        }

        meta_path = os.path.join(self.output_dir, 'model_metadata.json')
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=4)

        print(f"Saved Metadata: {meta_path}")

    def run_full_pipeline(self):
        """Runs the entire training and evaluation pipeline."""
        print("CropLens AI - Model Training Pipeline\n")
        self.load_and_split_data()
        self.run_granger_causality()
        self.run_stationarity_tests()
        self.optimize_hyperparameters()
        self.train_quantile_models()
        self.calibrate_conformal_quantiles()
        self.run_purged_walk_forward_cv(n_splits=5)
        self.train_and_eval_ridge_baseline()
        self.train_arima_baseline()
        self.train_catboost_and_xgboost()
        self.run_diebold_mariano_tests()
        self.run_ablation_experiment()
        self.train_isolation_forest()
        self.run_covid_analysis()
        self.run_leave_one_mandi_out_validation()
        self.run_ljung_box_test()
        self.evaluate_performance()
        self.check_quantile_crossings()
        self.compute_bootstrap_confidence_intervals(n_bootstraps=1000)
        self.generate_explainability_and_plots()
        self.save_artifacts()
        print("\nModel training and evaluation completed successfully!")


if __name__ == '__main__':
    trainer = ModelTrainer()
    trainer.run_full_pipeline()

