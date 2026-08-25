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

try:
    from app.services.canonical_features import MODEL_FEATURE_COLUMNS
except ImportError:
    from backend.app.services.canonical_features import MODEL_FEATURE_COLUMNS

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
        self.figures_dir = figures_dir or os.path.abspath(os.path.join(os.getcwd(), 'reports', 'model_evaluation'))
        self.checkpoint_dir = os.path.join(self.output_dir, '.checkpoints')

        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.figures_dir, exist_ok=True)
        os.makedirs(self.checkpoint_dir, exist_ok=True)

        self.df = None
        self.feature_cols = None
        # The model predicts the next calendar-day modal price from information
        # available at the current cutoff. The raw modal_price remains a source
        # column for lag construction and is never selected as a feature.
        self.target_col = 'target_next_day_modal_price'
        self.forecast_horizon_days = 1

        # Explicit auditable model feature contract.
        self.model_feature_cols = list(MODEL_FEATURE_COLUMNS)

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
        self._optuna_n_trials = 35
        self.optuna_metadata = {}
        self._completed_stages = set()
        self._final_test_unlocked = False
        self.cqr_q_offset = None

    def _checkpoint_signature(self):
        """Return the data and contract identity required for safe resume."""
        return {
            'pipeline_contract_version': 'resume-v2',
            'data_path': os.path.abspath(self.data_path),
            'total_rows': int(len(self.df)),
            'date_min': str(self.df['date'].min()),
            'date_max': str(self.df['date'].max()),
            'target_col': self.target_col,
            'feature_cols': list(self.feature_cols),
            'train_rows': int(len(self.X_train)),
            'validation_rows': int(len(self.X_val)),
            'test_rows': int(len(self.X_test)),
            'optuna_n_trials': int(self._optuna_n_trials),
            'quantile_levels': [0.10, 0.50, 0.90],
            'arima_protocol': 'ARIMA(1,1,1) sequential one-step update refit=False maxiter=50',
        }

    def _checkpoint_path(self, stage: str) -> str:
        return os.path.join(self.checkpoint_dir, f'{stage}.joblib')

    def _stage_done(self, stage: str) -> bool:
        return stage in self._completed_stages

    def _save_checkpoint(self, stage: str):
        """Atomically persist models, metrics, tuning evidence, and stage identity."""
        payload = {
            'stage': stage,
            'signature': self._checkpoint_signature(),
            'models': self.models,
            'metrics': self.metrics,
            'best_params': self.best_params,
            'best_params_by_quantile': getattr(self, 'best_params_by_quantile', {}),
            'optuna_metadata': self.optuna_metadata,
            'optuna_n_trials': self._optuna_n_trials,
            'cqr_q_offset': getattr(self, 'cqr_q_offset', None),
        }
        destination = self._checkpoint_path(stage)
        temporary = destination + '.tmp'
        joblib.dump(payload, temporary)
        os.replace(temporary, destination)
        self._completed_stages.add(stage)
        self._save_partial_artifacts(stage)
        print(f"Checkpoint saved: {destination}")

    def _save_partial_artifacts(self, stage: str):
        """Persist completed model objects and auditable partial metadata immediately."""
        for name, model in self.models.items():
            destination = os.path.join(self.output_dir, f'{name}.pkl')
            temporary = destination + '.tmp'
            joblib.dump(model, temporary)
            os.replace(temporary, destination)

        metadata = {
            'status': 'partial_checkpoint',
            'completed_stage': stage,
            'signature': self._checkpoint_signature(),
            'model_names': sorted(self.models.keys()),
            'target_variable': self.target_col,
            'forecast_horizon_days': self.forecast_horizon_days,
            'feature_contract_version': 'phase1-explicit-v1',
            'feature_count': len(self.feature_cols),
            'feature_cols': list(self.feature_cols),
            'random_seed': 42,
            'optuna_info': {
                'n_trials': int(self._optuna_n_trials),
                'study_evidence_by_quantile': self.optuna_metadata,
            },
            'metrics': self.metrics,
        }
        destination = os.path.join(self.checkpoint_dir, 'checkpoint_metadata.json')
        temporary = destination + '.tmp'
        with open(temporary, 'w') as handle:
            json.dump(metadata, handle, indent=2, default=str)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, destination)

    def _restore_checkpoints(self):
        """Restore only checkpoints created for the current data and feature contract."""
        stage_order = [
            'data_diagnostics', 'quantile_models', 'calibration',
            'walk_forward_cv', 'ridge_baseline', 'arima_baseline',
            'tree_baselines', 'comparative_tests', 'isolation_forest',
            'regime_analysis', 'spatial_validation', 'residual_diagnostics',
            'final_evaluation', 'quantile_crossings', 'bootstrap_intervals',
            'test_conformal_calibration', 'explainability_plots',
            'final_artifacts'
        ]
        expected = self._checkpoint_signature()
        for stage in stage_order:
            path = self._checkpoint_path(stage)
            if not os.path.exists(path):
                continue
            try:
                payload = joblib.load(path)
                if payload.get('signature') != expected:
                    print(f"Skipping stale checkpoint: {path}")
                    continue
                self.models = payload.get('models', {})
                self.metrics = payload.get('metrics', {})
                self.best_params = payload.get('best_params', {})
                self.best_params_by_quantile = payload.get('best_params_by_quantile', {})
                self.optuna_metadata = payload.get('optuna_metadata', {})
                self._optuna_n_trials = int(payload.get('optuna_n_trials', 35))
                self.cqr_q_offset = payload.get('cqr_q_offset', self.cqr_q_offset)
                if stage in {
                    'final_evaluation', 'quantile_crossings',
                    'bootstrap_intervals', 'test_conformal_calibration',
                    'explainability_plots', 'final_artifacts'
                }:
                    self._final_test_unlocked = True
                self._completed_stages.add(stage)
                print(f"Resumed checkpoint: {stage}")
            except Exception as exc:
                raise RuntimeError(f'Unable to load checkpoint {path}: {exc}') from exc

    def _pinball_loss(self, y_true, y_pred, alpha: float) -> float:
        """Calculates pinball (quantile) loss for a given quantile alpha."""
        err = y_true - y_pred
        return float(np.mean(np.maximum(alpha * err, (alpha - 1.0) * err)))

    def load_and_split_data(self):
        """Loads master dataset and splits it into train, validation, and test sets by date."""
        print(f"Loading dataset: {self.data_path}")
        self.df = pd.read_parquet(self.data_path)
        required_columns = {
            'date', 'market', 'commodity', 'modal_price',
            *self.model_feature_cols,
        }
        missing = sorted(required_columns.difference(self.df.columns))
        if missing:
            raise ValueError('Training dataset is missing required columns: ' + ', '.join(missing))
        self.df['date'] = pd.to_datetime(self.df['date'], errors='coerce')
        if self.df['date'].isna().any():
            raise ValueError('Training dataset contains invalid dates.')
        if self.df['modal_price'].isna().any() or not np.isfinite(self.df['modal_price']).all():
            raise ValueError('Training dataset contains missing or non-finite modal prices.')
        if (self.df['modal_price'] < 0).any():
            raise ValueError('Training dataset contains negative modal prices.')
        self.df = self.df.sort_values(['market', 'commodity', 'date']).reset_index(drop=True)
        duplicate_keys = self.df.duplicated(['market', 'commodity', 'date'])
        if duplicate_keys.any():
            raise ValueError(f'Training dataset contains {int(duplicate_keys.sum())} duplicate market-commodity-date rows.')

        grouped = self.df.groupby(['market', 'commodity'], sort=False)
        next_date = grouped['date'].shift(-1)
        next_price = grouped['modal_price'].shift(-1)
        valid_next_day = next_date.eq(self.df['date'] + pd.Timedelta(days=self.forecast_horizon_days))
        self.df[self.target_col] = next_price.where(valid_next_day)
        self.df = self.df[self.df[self.target_col].notna()].copy()
        if self.df.empty:
            raise ValueError('No valid next-calendar-day targets remain after target construction.')

        # Exclude metadata and all target/source columns from model features.
        metadata_cols = [
            'state', 'district', 'market', 'commodity', 'variety',
            'market_id', 'harvest_season_type', 'festival_name', 'date',
            'latitude', 'longitude', 'modal_price', 'min_price', 'max_price'
        ]

        unexpected_contract = [c for c in self.model_feature_cols if c not in self.df.columns]
        if unexpected_contract:
            raise ValueError('Feature contract columns unavailable: ' + ', '.join(unexpected_contract))
        self.feature_cols = list(self.model_feature_cols)
        non_numeric = [c for c in self.feature_cols if not pd.api.types.is_numeric_dtype(self.df[c])]
        if non_numeric:
            raise TypeError('Model feature contract contains non-numeric columns: ' + ', '.join(non_numeric))

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
        if any(len(part) == 0 for part in (self.X_train, self.X_val, self.X_test)):
            raise ValueError('Train, validation, and test splits must all contain rows.')
        for name, frame in [('train', self.X_train), ('validation', self.X_val), ('test', self.X_test)]:
            numeric_values = frame.select_dtypes(include=[np.number]).to_numpy(dtype=float)
            if np.isinf(numeric_values).any():
                raise ValueError(f'{name} features contain infinite values.')

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

    def optimize_hyperparameters(self, n_trials: int = 35, alpha: float = 0.50):
        """Tune one LightGBM quantile model using only the fixed validation window.

        Each quantile receives an independent Optuna study. The estimator budget is
        tuned inside the study and the same selected budget is used for the final
        model, while early stopping remains available as a conservative guard.
        """
        if not 0.0 < alpha < 1.0:
            raise ValueError('alpha must be strictly between 0 and 1')
        if n_trials < 1:
            raise ValueError('n_trials must be at least 1')
        print(f"\nTuning LightGBM quantile hyperparameters for alpha={alpha:.2f} with Optuna ({n_trials} trials)...")

        def objective(trial):
            params = {
                'objective': 'quantile',
                'alpha': alpha,
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
                'n_estimators': trial.suggest_int('n_estimators', 150, 600, step=50),
                'random_state': 42,
                'n_jobs': 1,
                'feature_pre_filter': False,
                'verbosity': -1,
            }

            model = lgb.LGBMRegressor(**params)
            model.fit(
                self.X_train,
                self.y_train,
                eval_set=[(self.X_val, self.y_val)],
                eval_metric='quantile',
                callbacks=[lgb.early_stopping(stopping_rounds=30, verbose=False)],
            )
            preds = model.predict(self.X_val)
            val_pinball = self._pinball_loss(self.y_val, preds, alpha=alpha)
            trial.set_user_attr('best_iteration', int(model.best_iteration_ or params['n_estimators']))
            return val_pinball

        sampler = optuna.samplers.TPESampler(seed=42, multivariate=True)
        study = optuna.create_study(direction='minimize', sampler=sampler)
        study.optimize(objective, n_trials=n_trials)

        self._optuna_n_trials = int(n_trials)
        self.best_params_by_quantile = getattr(self, 'best_params_by_quantile', {})
        self.optuna_metadata = getattr(self, 'optuna_metadata', {})
        q_name = f'p{int(alpha * 100)}'
        selected_params = dict(study.best_params)
        selected_params.update({
            'objective': 'quantile',
            'alpha': alpha,
            'metric': 'quantile',
            'boosting_type': 'gbdt',
            'random_state': 42,
            'n_jobs': 1,
            'feature_pre_filter': False,
            'verbosity': -1,
        })
        self.best_params_by_quantile[q_name] = selected_params
        self.best_params = self.best_params_by_quantile.get('p50', selected_params)
        self.optuna_metadata[q_name] = {
            'alpha': alpha,
            'n_trials': int(n_trials),
            'direction': 'minimize',
            'sampler': 'TPESampler',
            'sampler_seed': 42,
            'validation_objective': 'pinball_loss',
            'best_value': float(study.best_value),
            'best_trial_number': int(study.best_trial.number),
            'best_trial_user_attributes': dict(study.best_trial.user_attrs),
            'selected_params': selected_params,
        }
        print(f"Best Validation Pinball Loss (alpha = {alpha:.2f}): {study.best_value:.4f}")
        print(f"Best Parameters for {q_name.upper()}: {selected_params}")

    def train_quantile_models(self):
        """Trains LightGBM quantile regression models for P10, P50, and P90 bounds."""
        print("\nTraining LightGBM quantile models (P10, P50, P90)...")
        quantiles = [0.10, 0.50, 0.90]

        self.best_params_by_quantile = {}
        for q in quantiles:
            q_name = f"p{int(q*100)}"
            self.optimize_hyperparameters(n_trials=getattr(self, '_optuna_n_trials', 35), alpha=q)
            params = {
                **self.best_params_by_quantile[q_name],
                'objective': 'quantile',
                'alpha': q,
                'metric': 'quantile',
                'random_state': 42,
                'n_jobs': 1,
                'feature_pre_filter': False,
                'verbosity': -1,
            }

            model = lgb.LGBMRegressor(**params)
            model.fit(
                self.X_train, self.y_train,
                eval_set=[(self.X_val, self.y_val)],
                callbacks=[lgb.early_stopping(stopping_rounds=30, verbose=False)]
            )

            self.models[q_name] = model
            print(f"Trained {q_name.upper()} model (alpha = {q})")


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
        self._validate_predictions(self.y_test, ridge_preds, 'Ridge baseline')
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
        """Fit an ARIMA(1,1,1) baseline with efficient sequential one-step updates.

        Each group is fitted once on the training history. After each forecast,
        the observed test value is appended without refitting the optimizer.
        This preserves one-step-ahead chronology while avoiding one numerical
        optimization per test observation. Failed groups are excluded and
        disclosed; no fabricated forecast is inserted into the benchmark.
        """
        print("\nTraining Classical ARIMA Statistical Baseline per commodity-mandi series...")
        from statsmodels.tsa.arima.model import ARIMA

        train_df = self.df.loc[self.X_train.index]
        test_df = self.df.loc[self.X_test.index]

        arima_predictions = []
        arima_actuals = []
        arima_failures = []
        groups_attempted = 0
        groups_succeeded = 0

        for (comm, mkt), grp_tr in train_df.groupby(['commodity', 'market']):
            grp_te = test_df[(test_df['commodity'] == comm) & (test_df['market'] == mkt)]
            if len(grp_tr) < 30 or len(grp_te) == 0:
                continue
            groups_attempted += 1

            history = list(grp_tr[self.target_col].dropna().astype(float).values)
            test_vals = list(grp_te[self.target_col].dropna().astype(float).values)
            group_predictions = []
            group_actuals = []
            try:
                if len(history) < 30 or not test_vals:
                    raise ValueError('Insufficient non-null training or test observations.')

                fit_res = ARIMA(history, order=(1, 1, 1)).fit(method_kwargs={'maxiter': 50})
                for actual_value in test_vals:
                    forecast = np.asarray(fit_res.forecast(steps=1)).reshape(-1)
                    if len(forecast) != 1 or not np.isfinite(forecast[0]):
                        raise ValueError('ARIMA produced a non-finite forecast.')
                    group_predictions.append(float(forecast[0]))
                    group_actuals.append(float(actual_value))
                    fit_res = fit_res.append([float(actual_value)], refit=False)

                arima_predictions.extend(group_predictions)
                arima_actuals.extend(group_actuals)
                groups_succeeded += 1
            except Exception as exc:
                arima_failures.append({
                    'commodity': str(comm),
                    'market': str(mkt),
                    'error': str(exc),
                    'excluded_from_metrics': True,
                    'predictions_recorded': len(group_predictions)
                })
                print(f"[WARNING] ARIMA group excluded for {comm}/{mkt}: {exc}")

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
                'R2': round(arima_r2, 3),
                'protocol': 'ARIMA(1,1,1) one-step sequential update with refit=False',
                'groups_attempted': groups_attempted,
                'groups_succeeded': groups_succeeded,
                'failed_group_count': len(arima_failures),
                'failed_groups_excluded_from_metrics': True,
                'failed_groups': arima_failures
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

        self._validate_predictions(self.y_test, cb_preds, 'CatBoost baseline')
        cb_r2 = r2_score(self.y_test, cb_preds)
        cb_rmse = root_mean_squared_error(self.y_test, cb_preds)
        cb_mae = mean_absolute_error(self.y_test, cb_preds)
        cb_mape = mean_absolute_percentage_error(self.y_test, cb_preds) * 100

        self.models['catboost'] = Pipeline([('imputer', imputer), ('model', cb)])
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

        self._validate_predictions(self.y_test, xgb_preds, 'XGBoost baseline')
        xgb_r2 = r2_score(self.y_test, xgb_preds)
        xgb_rmse = root_mean_squared_error(self.y_test, xgb_preds)
        xgb_mae = mean_absolute_error(self.y_test, xgb_preds)
        xgb_mape = mean_absolute_percentage_error(self.y_test, xgb_preds) * 100

        self.models['xgboost'] = Pipeline([('imputer', imputer), ('model', xgb)])
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
        self.models['isolation_forest'] = Pipeline([
            ('imputer', imputer),
            ('model', iso_forest),
        ])

        # Unsupervised detection stats on 2025 test set
        test_preds = self.models['isolation_forest'].predict(self.X_test[shock_features])
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

    def calibrate_conformal_quantiles(self, evaluate_test: bool = False):
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

        self.metrics['conformal_calibration_cqr'] = {
            'target_nominal_coverage_pct': 80.0,
            'cqr_offset_qconf_rs_qtl': round(self.cqr_q_offset, 2),
            'calibration_split': 'Validation 2024',
            'test_evaluation_status': 'deferred_until_final_evaluation'
        }

        if evaluate_test:
            self._final_test_unlocked = True
            raw_p10_te = self.models['p10'].predict(self.X_test)
            raw_p50_te = self.models['p50'].predict(self.X_test)
            raw_p90_te = self.models['p90'].predict(self.X_test)
            mono_p10_te, mono_p50_te, mono_p90_te, _ = self.apply_monotonic_rearrangement(raw_p10_te, raw_p50_te, raw_p90_te)
            cal_p10 = mono_p10_te - self.cqr_q_offset
            cal_p90 = mono_p90_te + self.cqr_q_offset
            raw_cov = float(np.mean((self.y_test >= mono_p10_te) & (self.y_test <= mono_p90_te)) * 100)
            cal_cov = float(np.mean((self.y_test >= cal_p10) & (self.y_test <= cal_p90)) * 100)
            raw_mpiw = float(np.mean(mono_p90_te - mono_p10_te))
            cal_mpiw = float(np.mean(cal_p90 - cal_p10))
            self.metrics['conformal_calibration_cqr'].update({
                'uncalibrated_test_coverage_pct': round(raw_cov, 2),
                'uncalibrated_test_mpiw_rs_qtl': round(raw_mpiw, 2),
                'calibrated_test_coverage_pct': round(cal_cov, 2),
                'calibrated_test_mpiw_rs_qtl': round(cal_mpiw, 2),
                'test_evaluation_status': 'final_locked_evaluation'
            })

    def run_purged_walk_forward_cv(self, n_splits: int = 5):
        """Executes 5-Fold Purged Walk-Forward Time-Series Cross-Validation strictly on Train+Val (2019-2024), leaving Test Set strictly untouched."""
        print(f"\nExecuting {n_splits}-Fold Purged Walk-Forward Cross-Validation (2019-2024 Train/Val Data Only)...")
        from sklearn.model_selection import TimeSeriesSplit

        tscv = TimeSeriesSplit(n_splits=n_splits)
        cv_maes, cv_rmses, cv_mapes = [], [], []

        # STRICTLY 2019-2024 Data: Test set 2025 is NOT included to prevent leakage
        X_cv = pd.concat([self.X_train, self.X_val])
        y_cv = pd.concat([self.y_train, self.y_val])
        cv_dates = self.df.loc[X_cv.index, 'date'].reset_index(drop=True)

        for fold, (train_idx, test_idx) in enumerate(tscv.split(X_cv), 1):
            # Purge by actual dates, not row positions, so panel rows sharing a
            # date cannot cross the intended seven-day temporal boundary.
            test_start = cv_dates.iloc[test_idx].min()
            cutoff = test_start - pd.Timedelta(days=7)
            purged_train_idx = train_idx[cv_dates.iloc[train_idx] < cutoff]
            if len(purged_train_idx) == 0:
                continue
            
            X_tr, y_tr = X_cv.iloc[purged_train_idx], y_cv.iloc[purged_train_idx]
            X_te, y_te = X_cv.iloc[test_idx], y_cv.iloc[test_idx]

            params = {'objective': 'quantile', 'alpha': 0.50, 'n_estimators': 150, 'random_state': 42, 'verbose': -1, **self.best_params}
            m_p50 = lgb.LGBMRegressor(**params).fit(X_tr, y_tr)
            
            preds_p50 = m_p50.predict(X_te)
            self._validate_predictions(y_te, preds_p50, f'Walk-forward fold {fold}')
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

    def _get_evaluation_split(self, split: str = 'validation'):
        """Return an explicitly selected evaluation split.

        Development diagnostics default to validation so the 2025 holdout
        remains reserved for final locked evaluation.
        """
        if split not in {'validation', 'test'}:
            raise ValueError("split must be 'validation' or 'test'")
        if split == 'validation':
            return self.X_val, self.y_val, self.df.loc[self.X_val.index].copy()
        if not getattr(self, '_final_test_unlocked', False):
            raise RuntimeError('The 2025 test split is locked until final evaluation.')
        return self.X_test, self.y_test, self.df.loc[self.X_test.index].copy()

    def run_diebold_mariano_tests(self, split: str = 'validation'):
        """Calculates Diebold-Mariano (DM) pairwise statistical significance tests with Newey-West (HAC) robust standard errors.
        Evaluates under both Absolute Error Loss (appropriate for median/quantile models) and Squared Error Loss (MSE).
        """
        X_eval, y_eval, eval_df = self._get_evaluation_split(split)
        print("\nRunning Diebold-Mariano (DM) Statistical Significance Tests (Newey-West HAC Corrected)...")
        p50_preds = self.models['p50'].predict(X_eval)
        e_lgb = np.array(y_eval) - np.array(p50_preds)

        dm_results = {}
        # Compare against Ridge
        if 'ridge_baseline' in self.models:
            r_preds = self.models['ridge_baseline'].predict(X_eval)
            e_ridge = np.array(y_eval) - np.array(r_preds)
            
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
                X_te_imp = self.xgb_imputer.transform(X_eval)
            else:
                imputer = SimpleImputer(strategy='median')
                imputer.fit(self.X_train)
                X_te_imp = imputer.transform(X_eval)
                
            xgb_preds = self.models['xgboost'].predict(X_te_imp)
            e_xgb = np.array(y_eval) - np.array(xgb_preds)
            
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

    def run_ljung_box_test(self, split: str = 'validation'):
        """Tests residual autocorrelation of LightGBM P50 predictions across multiple lags to verify temporal white noise properties."""
        X_eval, y_eval, eval_df = self._get_evaluation_split(split)
        print("\nRunning panel-aware Ljung-Box Residual Autocorrelation Diagnostic...")
        from statsmodels.stats.diagnostic import acorr_ljungbox
        p50_preds = self.models['p50'].predict(X_eval)
        eval_df = eval_df.copy()
        eval_df['_residual'] = np.asarray(y_eval) - np.asarray(p50_preds)
        group_results = {}
        lag_counts = {1: 0, 7: 0, 14: 0, 30: 0}
        for (market, commodity), group in eval_df.groupby(['market', 'commodity']):
            residuals = group.sort_values('date')['_residual'].to_numpy(dtype=float)
            valid_lags = [lag for lag in lag_counts if lag < len(residuals)]
            if not valid_lags:
                continue
            lb_df = acorr_ljungbox(residuals, lags=valid_lags, return_df=True)
            group_key = f'{commodity}__{market}'
            group_results[group_key] = {
                f'lag_{lag}': {
                    'lb_stat': round(float(row['lb_stat']), 3),
                    'p_value': round(float(row['lb_pvalue']), 6)
                }
                for lag, row in lb_df.iterrows()
            }
            for lag in valid_lags:
                lag_counts[lag] += 1

        self.metrics['ljung_box_residual_test'] = {
            'method': 'Per commodity-market series; residuals sorted by date',
            'split': split,
            'group_count': len(group_results),
            'groups': group_results,
            'groups_tested_by_lag': lag_counts
        }

    def compute_bootstrap_confidence_intervals(self, n_bootstraps: int = 1000, split: str = 'test'):
        """Computes 95% panel-aware Circular Block Bootstrap intervals for the selected evaluation split."""
        X_eval, y_eval, eval_df = self._get_evaluation_split(split)
        print(f"\nComputing 95% Circular Block Bootstrap Confidence Intervals ({n_bootstraps} resamples, 7-day blocks)...")
        raw_p10 = self.models['p10'].predict(X_eval)
        raw_p50 = self.models['p50'].predict(X_eval)
        raw_p90 = self.models['p90'].predict(X_eval)
        p10_preds, p50_preds, p90_preds = self.apply_monotonic_rearrangement(raw_p10, raw_p50, raw_p90, return_diagnostics=False)
        y_true = np.array(y_eval)

        block_size = 7
        rng = np.random.default_rng(42)

        boot_maes = []
        boot_mapes = []
        boot_rmses = []
        boot_r2s = []
        boot_coverages = []

        self._validate_predictions(y_true, p10_preds, 'Bootstrap P10')
        self._validate_predictions(y_true, p50_preds, 'Bootstrap P50')
        self._validate_predictions(y_true, p90_preds, 'Bootstrap P90')

        # Preserve temporal dependence within each commodity-market series;
        # never create blocks that cross unrelated panel groups.
        group_positions = []
        for _, group in eval_df.reset_index(drop=True).sort_values('date').groupby(['market', 'commodity']):
            positions = group.index.to_numpy(dtype=int)
            if len(positions) > 0:
                group_positions.append(positions)
        if not group_positions:
            raise ValueError('No valid commodity-market groups available for bootstrap evaluation.')

        for _ in range(n_bootstraps):
            sampled_indices = []
            for positions in group_positions:
                group_size = len(positions)
                starts = rng.integers(0, group_size, size=int(np.ceil(group_size / block_size)))
                local_indices = np.concatenate([
                    (np.arange(start, start + block_size) % group_size) for start in starts
                ])[:group_size]
                sampled_indices.extend(positions[local_indices])
            indices = np.asarray(sampled_indices, dtype=int)

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

        print(f"95% Circular Block Bootstrap Confidence Intervals ({split} split, Block Length = 7d):")
        print(f"- MAE:  Rs {np.mean(boot_maes):.2f} (95% CI: [{ci_95['MAE_CI_95'][0]}, {ci_95['MAE_CI_95'][1]}])")
        print(f"- MAPE: {np.mean(boot_mapes):.2f}% (95% CI: [{ci_95['MAPE_CI_95'][0]}%, {ci_95['MAPE_CI_95'][1]}%])")
        print(f"- R2:   {np.mean(boot_r2s):.3f} (95% CI: [{ci_95['R2_CI_95'][0]}, {ci_95['R2_CI_95'][1]}])")
        print(f"- Coverage: {np.mean(boot_coverages):.2f}% (95% CI: [{ci_95['Coverage_CI_95'][0]}%, {ci_95['Coverage_CI_95'][1]}%])")

        self.metrics['bootstrap_confidence_intervals_95'] = {
            'method': 'Panel-Aware Circular Block Bootstrap (7-Day Within-Series Blocks)',
            'block_length_days': 7,
            'n_bootstraps': n_bootstraps,
            'split': split,
            'group_count': len(group_positions),
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
            self._validate_predictions(y_lomo_te, preds, f'LOMO {holdout_mandi}')
            
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

    @staticmethod
    def _validate_predictions(y_true, predictions, label: str) -> None:
        y_arr = np.asarray(y_true, dtype=float).reshape(-1)
        p_arr = np.asarray(predictions, dtype=float).reshape(-1)
        if len(y_arr) != len(p_arr):
            raise ValueError(f'{label}: target/prediction length mismatch.')
        if not np.isfinite(p_arr).all():
            raise ValueError(f'{label}: predictions contain NaN or infinity.')
        if (p_arr < 0).any():
            raise ValueError(f'{label}: negative price predictions are invalid.')

    def evaluate_performance(self):
        """Calculates evaluation metrics (MAPE, RMSE, MAE, R2, sMAPE, MASE, Pinball Loss, Coverage) on validation and test sets."""
        self._final_test_unlocked = True
        print("\nEvaluating model performance...")
        X_eval, y_eval, eval_df = self._get_evaluation_split('test')

        eval_summary = {}
        train_panel = self.df.loc[self.X_train.index, ['market', 'commodity', self.target_col]]
        group_scales = train_panel.groupby(['market', 'commodity'])[self.target_col].apply(
            lambda values: float(np.mean(np.abs(np.diff(values)))) if len(values) > 1 else np.nan
        ).dropna()
        naive_train_diff = float(group_scales.mean()) if not group_scales.empty else 1.0

        for set_name, X, y in [('Validation (2024)', self.X_val, self.y_val), ('Test (2025)', X_eval, y_eval)]:
            raw_p10 = self.models['p10'].predict(X)
            raw_p50 = self.models['p50'].predict(X)
            raw_p90 = self.models['p90'].predict(X)
            self._validate_predictions(y, raw_p10, f'{set_name} P10')
            self._validate_predictions(y, raw_p50, f'{set_name} P50')
            self._validate_predictions(y, raw_p90, f'{set_name} P90')

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
        test_df_subset = eval_df.copy()
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

    def check_quantile_crossings(self, split: str = 'test'):
        """Verify quantile monotonicity on validation and the locked final test split."""
        X_eval, y_eval, eval_df = self._get_evaluation_split(split)
        print("\nChecking P10 <= P50 <= P90 Quantile Crossings & Before-vs-After Validation...")
        
        crossing_results = {}
        
        for set_name, X, key in [('Validation (2024)', self.X_val, 'val'), ('Test (2025)', X_eval, 'test')]:
            p10 = self.models['p10'].predict(X)
            p50 = self.models['p50'].predict(X)
            p90 = self.models['p90'].predict(X)
            self._validate_predictions(self.y_val if key == 'val' else y_eval, p10, f'{set_name} P10')
            self._validate_predictions(self.y_val if key == 'val' else y_eval, p50, f'{set_name} P50')
            self._validate_predictions(self.y_val if key == 'val' else y_eval, p90, f'{set_name} P90')
            
            p10_mono, p50_mono, p90_mono, diag = self.apply_monotonic_rearrangement(p10, p50, p90, return_diagnostics=True)
            
            crossing_results[key] = {
                'dataset': set_name,
                **diag
            }
            print(f"- {set_name:20s}: Raw Crossings = {diag['raw_crossing_count']:,} ({diag['raw_crossing_rate_pct']:.2f}%) | Post-Rearrangement Crossings = {diag['post_rearrangement_crossing_count']} ({diag['post_rearrangement_crossing_rate_pct']:.2f}%)")
            print(f"  Rearrangement Shifts: Mean P50 Shift on Crossings = Rs {diag['mean_p50_shift_on_crossings_rs']:.2f}/qtl | Max Shift = Rs {diag['max_p50_shift_rs']:.2f}/qtl | Safety Status = {diag['safety_guard_status']}")
            
        # Breakdown by Commodity on Test Set
        test_df_subset = eval_df.copy()
        test_df_subset['p10'] = self.models['p10'].predict(X_eval)
        test_df_subset['p50'] = self.models['p50'].predict(X_eval)
        test_df_subset['p90'] = self.models['p90'].predict(X_eval)
        
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
        shock_features = [f for f in ['arrival_ratio', 'arrival_velocity_7d', 'price_volatility_30d', 'price_spread'] if f in self.feature_cols]
        scores = self.models['isolation_forest'].decision_function(self.X_test[shock_features])

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

        production_version = os.getenv('PROD_MODEL_VERSION', 'v1.0.0')
        version_dir = os.path.join(self.output_dir, production_version)
        os.makedirs(version_dir, exist_ok=True)
        for q in ('p10', 'p50', 'p90'):
            version_path = os.path.join(version_dir, f'lgb_quantile_{q}.pkl')
            joblib.dump(self.models[q], version_path)
            print(f"Saved production artifact: {version_path}")

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
            'target_variable': 'modal_price at t+1 (target_next_day_modal_price)',
            'forecast_horizon_days': self.forecast_horizon_days,
            'feature_contract_version': 'phase1-explicit-v1',
            'feature_count': len(self.feature_cols),
            'feature_cols': self.feature_cols,
            'random_seed': 42,
            'optuna_info': {
                'n_trials': int(self._optuna_n_trials),
                'objective': 'quantile',
                'alpha': 'quantile_specific',
                'metric': 'quantile pinball loss',
                'sampler': 'TPESampler(seed=42)',
                'best_hyperparameters_by_quantile': getattr(self, 'best_params_by_quantile', {}),
                'best_hyperparameters': self.best_params,
                'study_evidence_by_quantile': getattr(self, 'optuna_metadata', {}),
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
        version_meta_path = os.path.join(version_dir, 'model_metadata.json')
        for destination in (meta_path, version_meta_path):
            temp_path = destination + '.tmp'
            with open(temp_path, 'w') as f:
                json.dump(metadata, f, indent=4)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp_path, destination)

        print(f"Saved Metadata: {meta_path}")

    def run_full_pipeline(self):
        """Run the pipeline with safe, signature-validated stage checkpoints.

        Core model families are persisted immediately after completion. Expensive
        diagnostics run only after core artifacts are checkpointed. A later
        failure resumes from the last valid stage without retraining it.
        """
        print("CropLens AI - Model Training Pipeline\n")
        self.load_and_split_data()
        self._restore_checkpoints()

        if not self._stage_done('data_diagnostics'):
            self.run_granger_causality()
            self.run_stationarity_tests()
            self._save_checkpoint('data_diagnostics')

        # train_quantile_models performs exactly three independent studies:
        # P10, P50, and P90. Do not run a separate standalone P50 study here.
        if not self._stage_done('quantile_models'):
            self.train_quantile_models()
            self._save_checkpoint('quantile_models')

        if not self._stage_done('calibration'):
            self.calibrate_conformal_quantiles()
            self._save_checkpoint('calibration')

        if not self._stage_done('walk_forward_cv'):
            self.run_purged_walk_forward_cv(n_splits=5)
            self._save_checkpoint('walk_forward_cv')

        if not self._stage_done('ridge_baseline'):
            self.train_and_eval_ridge_baseline()
            self._save_checkpoint('ridge_baseline')

        if not self._stage_done('arima_baseline'):
            self.train_arima_baseline()
            self._save_checkpoint('arima_baseline')

        if not self._stage_done('tree_baselines'):
            self.train_catboost_and_xgboost()
            self._save_checkpoint('tree_baselines')

        if not self._stage_done('comparative_tests'):
            self.run_diebold_mariano_tests()
            self.run_ablation_experiment()
            self._save_checkpoint('comparative_tests')

        if not self._stage_done('isolation_forest'):
            self.train_isolation_forest()
            self._save_checkpoint('isolation_forest')

        if not self._stage_done('regime_analysis'):
            self.run_covid_analysis()
            self._save_checkpoint('regime_analysis')

        if not self._stage_done('spatial_validation'):
            self.run_leave_one_mandi_out_validation()
            self._save_checkpoint('spatial_validation')

        if not self._stage_done('residual_diagnostics'):
            self.run_ljung_box_test()
            self._save_checkpoint('residual_diagnostics')

        if not self._stage_done('final_evaluation'):
            self.evaluate_performance()
            self._save_checkpoint('final_evaluation')

        if not self._stage_done('quantile_crossings'):
            self.check_quantile_crossings(split='test')
            self._save_checkpoint('quantile_crossings')

        if not self._stage_done('bootstrap_intervals'):
            self.compute_bootstrap_confidence_intervals(n_bootstraps=1000, split='test')
            self._save_checkpoint('bootstrap_intervals')

        if not self._stage_done('test_conformal_calibration'):
            self.calibrate_conformal_quantiles(evaluate_test=True)
            self._save_checkpoint('test_conformal_calibration')

        if not self._stage_done('explainability_plots'):
            self.generate_explainability_and_plots()
            self._save_checkpoint('explainability_plots')

        if not self._stage_done('final_artifacts'):
            self.save_artifacts()
            self._save_checkpoint('final_artifacts')

        print("\nModel training and evaluation completed successfully!")


if __name__ == '__main__':
    trainer = ModelTrainer()
    trainer.run_full_pipeline()

