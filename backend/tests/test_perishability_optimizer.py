"""Unit tests for perishability-aware net-profit sell optimization."""

import pytest

from backend.app.services.perishability_optimizer import (
    marketable_fraction,
    optimize_net_profit_sell_day,
)


def _forecast(day_index: int, price: float, day_name: str = "Wed") -> dict:
    return {
        "day_index": day_index,
        "date": f"2026-06-{10 + day_index:02d}",
        "day_name": day_name,
        "day_name_hi": "बुध",
        "price": price,
        "p50_median_price": price,
    }


def test_tomato_prefers_early_sell_when_peak_is_late():
    """Fast-spoiling tomato should not wait for a late peak if net profit falls."""
    forecasts = [_forecast(1, 1700), _forecast(2, 1720), _forecast(3, 1750), _forecast(4, 1780), _forecast(5, 1800)]
    result = optimize_net_profit_sell_day(
        commodity="Tomato",
        current_price=1650,
        last_observed_date="2026-06-10",
        forecasts=forecasts,
        sale_quintals=20,
        storage_cost_per_day_rs=15,
        transport_cost_rs=200,
    )
    assert result["optimal_day_index"] <= 2
    assert result["overrides_peak_price_advice"] is True
    assert result["net_advantage_vs_peak_rs"] >= 0


def test_potato_can_hold_for_later_peak():
    """Slow-spoiling potato can wait for a materially higher forecast day."""
    forecasts = [_forecast(1, 1700), _forecast(2, 1750), _forecast(3, 1820), _forecast(4, 1900)]
    result = optimize_net_profit_sell_day(
        commodity="Potato",
        current_price=1650,
        last_observed_date="2026-06-10",
        forecasts=forecasts,
        sale_quintals=50,
        storage_cost_per_day_rs=2,
        transport_cost_rs=100,
    )
    assert result["optimal_day_index"] >= 3
    assert result["peak_price_day_index"] == 4


def test_marketable_fraction_decays_with_half_life():
    tomato_day0 = marketable_fraction("Tomato", 0)
    tomato_day4 = marketable_fraction("Tomato", 4)
    potato_day4 = marketable_fraction("Potato", 4)
    assert tomato_day0 == pytest.approx(1.0)
    assert tomato_day4 < potato_day4
    assert tomato_day4 <= 0.55


def test_net_profit_includes_storage_and_transport():
    result = optimize_net_profit_sell_day(
        commodity="Onion",
        current_price=2000,
        last_observed_date="2026-06-10",
        forecasts=[],
        sale_quintals=10,
        storage_cost_per_day_rs=0,
        transport_cost_rs=500,
    )
    assert result["net_profit_total_rs"] == pytest.approx(2000 * 10 - 500)
    assert result["optimal_day_index"] == 0
