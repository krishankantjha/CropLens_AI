"""
lstm_benchmark.py — Standalone PyTorch LSTM and GRU Sequence Baselines

Implements lightweight 2-layer recurrent sequence models (LSTM and GRU) on 7-day lookback
windows to benchmark deep learning sequence extraction against tabular gradient boosting.
"""

import os
import json
import time
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Set PyTorch and NumPy random seed for 100% reproducibility
torch.manual_seed(42)
np.random.seed(42)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "features_master.parquet")
MODELS_DIR = os.path.join(BASE_DIR, "backend", "app", "models")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")


# Sequence Model Definitions
class RecurrentPricePredictor(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 2, rnn_type: str = "LSTM"):
        super().__init__()
        self.rnn_type = rnn_type
        if rnn_type == "LSTM":
            self.rnn = nn.LSTM(input_dim, hidden_dim, num_layers=num_layers, batch_first=True, dropout=0.15)
        else:
            self.rnn = nn.GRU(input_dim, hidden_dim, num_layers=num_layers, batch_first=True, dropout=0.15)
            
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )

    def forward(self, x):
        out, _ = self.rnn(x)
        # Take hidden state of last timestep
        last_out = out[:, -1, :]
        return self.fc(last_out).squeeze(-1)


def create_sliding_sequences(df: pd.DataFrame, feature_cols: list, target_col: str, seq_length: int = 7):
    """Creates 7-day lookback sequences grouped per commodity and market."""
    X_seqs = []
    y_seqs = []
    dates_seqs = []
    
    for _, group in df.groupby(['commodity', 'market']):
        group = group.sort_values('date').reset_index(drop=True)
        if len(group) <= seq_length:
            continue
            
        feat_vals = group[feature_cols].values
        target_vals = group[target_col].values
        date_vals = group['date'].values
        
        for i in range(seq_length, len(group)):
            X_seqs.append(feat_vals[i-seq_length:i])
            y_seqs.append(target_vals[i])
            dates_seqs.append(date_vals[i])
            
    return np.array(X_seqs, dtype=np.float32), np.array(y_seqs, dtype=np.float32), pd.to_datetime(dates_seqs)



def run_lstm_and_gru_benchmarks():
    print("Loading master feature dataset for LSTM/GRU benchmark...")
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Features file not found: {DATA_PATH}")
        
    df = pd.read_parquet(DATA_PATH)
    df['date'] = pd.to_datetime(df['date'])
    
    target_col = "modal_price"
    metadata_cols = [
        'state', 'district', 'market', 'commodity', 'variety',
        'market_id', 'harvest_season_type', 'festival_name', 'date',
        'latitude', 'longitude', 'modal_price', 'min_price', 'max_price'
    ]
    # Use the full, fair 47 numeric features matching LightGBM/XGBoost/CatBoost/Ridge
    feature_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c not in metadata_cols]
    print(f"Total features selected for LSTM/GRU: {len(feature_cols)} (100% parity with tabular models)")
    
    # Chronological Split Mask: Train strictly <= 2023
    train_mask_df = df['date'].dt.year <= 2023
    
    # Cast feature columns to float64 and impute NaNs with training set feature median only to prevent leakage
    df[feature_cols] = df[feature_cols].astype(np.float64)
    train_medians = df.loc[train_mask_df, feature_cols].median()
    df[feature_cols] = df[feature_cols].fillna(train_medians)
        
    # Fit StandardScaler ONLY on training data (2019-2023)
    scaler = StandardScaler()
    df.loc[train_mask_df, feature_cols] = scaler.fit_transform(df.loc[train_mask_df, feature_cols])
    df.loc[~train_mask_df, feature_cols] = scaler.transform(df.loc[~train_mask_df, feature_cols])
    
    print(f"Creating 7-day lookback sequences across {len(feature_cols)} core price & weather features...")
    X_all, y_all, seq_dates = create_sliding_sequences(df, feature_cols, target_col, seq_length=7)
    
    # Split by Year (2019-2023 Train, 2024 Val, 2025 Test)
    train_mask = seq_dates.year <= 2023
    val_mask = seq_dates.year == 2024
    test_mask = seq_dates.year == 2025
    
    X_train, y_train = torch.tensor(X_all[train_mask]), torch.tensor(y_all[train_mask])
    X_val, y_val = torch.tensor(X_all[val_mask]), torch.tensor(y_all[val_mask])
    X_test, y_test = torch.tensor(X_all[test_mask]), torch.tensor(y_all[test_mask])
    
    train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=256, shuffle=True)
    val_loader = DataLoader(TensorDataset(X_val, y_val), batch_size=512, shuffle=False)
    
    results = {}
    
    # Train both LSTM and GRU
    for rnn_name in ["LSTM", "GRU"]:
        print(f"\n--- Training 2-Layer PyTorch {rnn_name} Price Forecaster (47 Features, Leakage-Free) ---")
        model = RecurrentPricePredictor(input_dim=len(feature_cols), hidden_dim=64, num_layers=2, rnn_type=rnn_name)
        optimizer = torch.optim.Adam(model.parameters(), lr=0.005, weight_decay=1e-5)
        criterion = nn.HuberLoss()
        
        t0 = time.time()
        model.train()
        for epoch in range(12):
            epoch_loss = 0.0
            for batch_x, batch_y in train_loader:
                optimizer.zero_grad()
                preds = model(batch_x)
                loss = criterion(preds, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
                
        train_duration = time.time() - t0
        print(f"Trained {rnn_name} in {train_duration:.2f}s across 12 epochs")
        
        # Evaluate on 2025 Holdout Test Set
        model.eval()
        with torch.no_grad():
            test_preds = model(X_test).numpy()
            y_test_np = y_test.numpy()
            
        mae = float(mean_absolute_error(y_test_np, test_preds))
        rmse = float(np.sqrt(mean_squared_error(y_test_np, test_preds)))
        mape = float(np.mean(np.abs((y_test_np - test_preds) / (y_test_np + 1e-8))) * 100)
        smape = float(np.mean(200.0 * np.abs(y_test_np - test_preds) / (np.abs(y_test_np) + np.abs(test_preds) + 1e-8)))
        r2 = float(r2_score(y_test_np, test_preds))
        
        print(f"{rnn_name} 2025 Test Performance:")
        print(f"- MAE:  Rs {mae:6.2f}/qtl | RMSE: Rs {rmse:6.2f}/qtl")
        print(f"- MAPE: {mape:.2f}% | sMAPE: {smape:.2f}% | R2: {r2:.3f}")
        
        results[f"{rnn_name.lower()}_benchmark"] = {
            "model_type": f"PyTorch 2-Layer {rnn_name}",
            "lookback_window_days": 7,
            "hidden_units": 64,
            "feature_count": len(feature_cols),
            "MAE (Rs/qtl)": round(mae, 2),
            "RMSE (Rs/qtl)": round(rmse, 2),
            "MAPE (%)": round(mape, 2),
            "sMAPE (%)": round(smape, 2),
            "R2": round(r2, 3),
            "train_duration_sec": round(train_duration, 2)
        }
        
    # Update model_metadata.json
    if os.path.exists(METADATA_PATH):
        with open(METADATA_PATH, "r") as f:
            metadata = json.load(f)
            
        metadata["metrics"]["lstm_benchmark"] = results["lstm_benchmark"]
        metadata["metrics"]["gru_benchmark"] = results["gru_benchmark"]
        
        with open(METADATA_PATH, "w") as f:
            json.dump(metadata, f, indent=4)
        print(f"\nSaved LSTM & GRU benchmark metrics to {METADATA_PATH}")

    return results

if __name__ == "__main__":
    run_lstm_and_gru_benchmarks()
