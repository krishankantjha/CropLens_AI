"""
granger_causality.py — Statistical Causality Testing Engine
Runs Granger causality tests using statsmodels between weather/arrivals and wholesale prices.
"""

import os
import pandas as pd


def run_granger_causality_test(data_path: str = None, max_lag: int = 7) -> dict:
    """
    Runs bivariate Granger predictive causality tests between mandi arrivals and wholesale modal prices.
    Note: Granger causality measures temporal statistical precedence and predictability,
    not direct physical causality.
    """
    if data_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        data_path = os.path.join(base_dir, "data", "processed", "features_master.parquet")

    if not os.path.exists(data_path):
        raise FileNotFoundError(
            f"Master dataset parquet not found at '{data_path}'. "
            "Granger causality tests require real preprocessed market data."
        )

    df = pd.read_parquet(data_path)
    if 'modal_price' not in df.columns or 'arrivals_in_qtl' not in df.columns:
        raise ValueError("Dataset missing required 'modal_price' or 'arrivals_in_qtl' columns.")

    from statsmodels.tsa.stattools import grangercausalitytests
    test_df = df[['modal_price', 'arrivals_in_qtl']].dropna().diff().dropna()

    if len(test_df) < max_lag * 2:
        raise ValueError(f"Insufficient time-series observations ({len(test_df)}) for Granger test with max_lag={max_lag}.")

    gc_res = grangercausalitytests(test_df[['modal_price', 'arrivals_in_qtl']], maxlag=max_lag)

    p_val = gc_res[1][0]['ssr_ftest'][1]
    f_stat = gc_res[1][0]['ssr_ftest'][0]

    return {
        "status": "success",
        "methodology": "Bivariate Granger Predictive Association (1-day differenced stationarity)",
        "observations": len(test_df),
        "max_lag_days": max_lag,
        "arrivals_predicts_price": {
            "p_value": round(float(p_val), 6),
            "is_statistically_significant": bool(p_val < 0.05),
            "f_statistic": round(float(f_stat), 4),
            "interpretation": "Arrival volumes contain statistically significant temporal predictive information for next-day wholesale price." if p_val < 0.05 else "No statistically significant Granger predictive relationship detected at alpha=0.05."
        }
    }


if __name__ == "__main__":
    try:
        res = run_granger_causality_test()
        print("Granger Causality Test Results:", res)
    except Exception as e:
        print("Granger test execution:", e)
