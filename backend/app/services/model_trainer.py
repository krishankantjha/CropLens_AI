"""
Model training script for CropLens AI.
Trains LightGBM price forecast quantile models, Isolation Forest anomaly detector, Ridge baseline,
runs Optuna tuning, grouped Granger tests, SHAP explainability, ablation study, and exports model files.
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
from sklearn.metrics import mean_absolute_percentage_error, root_mean_squared_error, mean_absolute_error
from statsmodels.tsa.stattools import grangercausalitytests

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
                results[var] = {
                    'avg_min_p_value': round(avg_p, 4),
                    'significant_groups': significant_groups,
                    'total_groups': total_groups,
                    'significant_percentage': round(sig_pct, 2)
                }
                print(f"- {var:20s}: {significant_groups}/{total_groups} groups significant (avg p = {avg_p:.4f})")

        self.metrics['granger_causality'] = {
            'methodology': 'Grouped per commodity-market time series (lags 1-7 days)',
            'note': 'Measures statistical Granger-predictive association, not real-world physical causal proof.',
            'results': results
        }

    def optimize_hyperparameters(self, n_trials: int = 15):
        """Tunes LightGBM quantile hyperparameters using Optuna on validation set pinball loss."""
        print(f"\nTuning LightGBM quantile hyperparameters with Optuna ({n_trials} trials)...")

        def objective(trial):
            params = {
                'objective': 'quantile',
                'alpha': 0.50,
                'metric': 'quantile',
                'boosting_type': 'gbdt',
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.15, log=True),
                'num_leaves': trial.suggest_int('num_leaves', 15, 63),
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'min_child_samples': trial.suggest_int('min_child_samples', 10, 50),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'random_state': 42,
                'verbose': -1
            }

            model = lgb.LGBMRegressor(**params, n_estimators=200)
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

    def run_ablation_experiment(self):
        """Runs ablation study comparing Model A (All Features) vs Model B (No Historical Price Lags)."""
        print("\nRunning ablation experiment (Model A: All Features vs Model B: No Price Lags)...")
        lag_cols = [c for c in self.feature_cols if 'lag' in c or 'velocity' in c or 'reversal' in c]
        no_lag_features = [c for c in self.feature_cols if c not in lag_cols]

        params = {
            'objective': 'quantile',
            'alpha': 0.50,
            'metric': 'quantile',
            'n_estimators': 300,
            'random_state': 42,
            'verbose': -1,
            **self.best_params
        }

        model_no_lag = lgb.LGBMRegressor(**params)
        model_no_lag.fit(
            self.X_train[no_lag_features], self.y_train,
            eval_set=[(self.X_val[no_lag_features], self.y_val)],
            callbacks=[lgb.early_stopping(stopping_rounds=30, verbose=False)]
        )

        preds_no_lag = model_no_lag.predict(self.X_test[no_lag_features])
        mape_no_lag = mean_absolute_percentage_error(self.y_test, preds_no_lag) * 100
        rmse_no_lag = root_mean_squared_error(self.y_test, preds_no_lag)
        mae_no_lag = mean_absolute_error(self.y_test, preds_no_lag)

        print("Ablation Results (Model B without price lag/velocity features):")
        print(f"- Removed lag features count: {len(lag_cols)}")
        print(f"- MAPE: {mape_no_lag:.2f}%")
        print(f"- RMSE: Rs {rmse_no_lag:.2f}/qtl")
        print(f"- MAE:  Rs {mae_no_lag:.2f}/qtl")

        self.metrics['ablation_no_lag'] = {
            'removed_features': lag_cols,
            'MAPE (%)': round(float(mape_no_lag), 2),
            'RMSE (Rs/qtl)': round(float(rmse_no_lag), 2),
            'MAE (Rs/qtl)': round(float(mae_no_lag), 2)
        }

    def train_isolation_forest(self):
        """Trains Isolation Forest for unsupervised supply shock detection and evaluates against rule-based proxy labels."""
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
        test_scores = iso_forest.decision_function(X_test_shock)
        test_preds = iso_forest.predict(X_test_shock)
        flagged_anomalies = int(np.sum(test_preds == -1))
        total_test_rows = len(test_preds)
        flagged_pct = float((flagged_anomalies / total_test_rows) * 100)

        print("Isolation Forest Unsupervised Summary (2025 Test Set):")
        print(f"- Contamination parameter: 0.05")
        print(f"- Flagged supply shock anomalies: {flagged_anomalies} out of {total_test_rows} days ({flagged_pct:.2f}%)")

        # Proxy rule evaluation notice
        proxy_label = ((self.X_test['arrival_ratio'] > 1.5) | (self.X_test['price_velocity_7d'] < -50)).astype(int)
        predicted_label = (test_preds == -1).astype(int)

        tp = np.sum((proxy_label == 1) & (predicted_label == 1))
        tn = np.sum((proxy_label == 0) & (predicted_label == 0))
        fp = np.sum((proxy_label == 0) & (predicted_label == 1))
        fn = np.sum((proxy_label == 1) & (predicted_label == 0))

        accuracy = float((tp + tn) / len(proxy_label) * 100)
        specificity = float(tn / (tn + fp) * 100) if (tn + fp) > 0 else 0.0
        precision = float(tp / (tp + fp) * 100) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn) * 100) if (tp + fn) > 0 else 0.0

        print("Operational Proxy Evaluation (against rule-based proxy label):")
        print(f"- Accuracy:    {accuracy:.2f}%")
        print(f"- Specificity: {specificity:.2f}% (Normal day detection)")
        print(f"- Precision:   {precision:.2f}%")
        print(f"- Recall:      {recall:.2f}%")

        self.metrics['isolation_forest'] = {
            'contamination': 0.05,
            'test_flagged_anomalies': flagged_anomalies,
            'test_flagged_percentage': round(flagged_pct, 2),
            'proxy_evaluation_notice': 'Evaluated against operational rule-based proxy labels (arrival_ratio > 1.5 or price_velocity < -50 Rs/qtl/day), not verified historical ground-truth events.',
            'proxy_metrics': {
                'accuracy_pct': round(accuracy, 2),
                'specificity_pct': round(specificity, 2),
                'precision_pct': round(precision, 2),
                'recall_pct': round(recall, 2)
            }
        }

    def evaluate_performance(self):
        """Calculates evaluation metrics (MAPE, RMSE, MAE, Pinball Loss, Coverage) on validation and test sets."""
        print("\nEvaluating model performance...")

        eval_summary = {}

        for set_name, X, y in [('Validation (2024)', self.X_val, self.y_val), ('Test (2025)', self.X_test, self.y_test)]:
            p10_preds = self.models['p10'].predict(X)
            p50_preds = self.models['p50'].predict(X)
            p90_preds = self.models['p90'].predict(X)

            mape = mean_absolute_percentage_error(y, p50_preds) * 100
            rmse = root_mean_squared_error(y, p50_preds)
            mae = mean_absolute_error(y, p50_preds)

            p10_pinball = self._pinball_loss(y, p10_preds, 0.10)
            p50_pinball = self._pinball_loss(y, p50_preds, 0.50)
            p90_pinball = self._pinball_loss(y, p90_preds, 0.90)

            # Empirical coverage percentage (actual price falling between P10 and P90)
            coverage = np.mean((y >= p10_preds) & (y <= p90_preds)) * 100

            eval_summary[set_name] = {
                'MAPE (%)': round(float(mape), 2),
                'RMSE (Rs/qtl)': round(float(rmse), 2),
                'MAE (Rs/qtl)': round(float(mae), 2),
                'P10 Pinball Loss': round(float(p10_pinball), 4),
                'P50 Pinball Loss': round(float(p50_pinball), 4),
                'P90 Pinball Loss': round(float(p90_pinball), 4),
                'P10-P90 Quantile Forecast Band Coverage (%)': round(float(coverage), 2)
            }

            print(f"\n{set_name} Performance:")
            print(f"- MAPE (P50 Median Price): {mape:.2f}%")
            print(f"- RMSE (P50 Median Price): Rs {rmse:.2f}/qtl")
            print(f"- MAE  (P50 Median Price): Rs {mae:.2f}/qtl")
            print(f"- P10 Pinball Loss: {p10_pinball:.4f}")
            print(f"- P50 Pinball Loss: {p50_pinball:.4f}")
            print(f"- P90 Pinball Loss: {p90_pinball:.4f}")
            print(f"- P10-P90 Quantile Forecast Band Coverage: {coverage:.2f}% (P10 <= actual <= P90)")

        self.metrics['performance'] = eval_summary

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

        # Record SHAP importance and split importance separately in metadata
        self.metrics['top_15_shap_importance_p50'] = shap_series.head(15).round(4).to_dict()
        
        split_importance = pd.Series(p50_model.feature_importances_, index=self.feature_cols).sort_values(ascending=False)
        self.metrics['top_15_split_importance_p50'] = split_importance.head(15).to_dict()

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
        self.optimize_hyperparameters()
        self.train_quantile_models()
        self.train_and_eval_ridge_baseline()
        self.run_ablation_experiment()
        self.train_isolation_forest()
        self.evaluate_performance()
        self.generate_explainability_and_plots()
        self.save_artifacts()
        print("\nModel training and evaluation completed successfully!")


if __name__ == '__main__':
    trainer = ModelTrainer()
    trainer.run_full_pipeline()
