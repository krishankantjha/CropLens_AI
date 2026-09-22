"""
Perishability-aware net-profit sell optimizer for APMC perishable commodities.

Combines quantile price forecasts with crop-specific spoilage decay and farmer
logistics costs to recommend the sell day that maximizes net revenue — not
simply the highest forecast price day.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence

DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DAY_NAMES_HI = ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"]

# Ambient open-yard storage half-life (days until 50% of crop is unmarketable).
CROP_SPOILAGE_PROFILES: Dict[str, Dict[str, float]] = {
    "Tomato": {"half_life_days": 4.0, "min_marketable_fraction": 0.08},
    "Onion": {"half_life_days": 21.0, "min_marketable_fraction": 0.15},
    "Potato": {"half_life_days": 45.0, "min_marketable_fraction": 0.20},
}

DEFAULT_HALF_LIFE_DAYS = 14.0
DEFAULT_MIN_MARKETABLE_FRACTION = 0.10


@dataclass(frozen=True)
class SellDayCandidate:
    day_index: int
    date: str
    day_name: str
    day_name_hi: str
    price_per_qtl: float
    marketable_fraction: float
    sellable_quintals: float
    spoilage_quintals: float
    gross_revenue_rs: float
    storage_cost_rs: float
    transport_cost_rs: float
    net_profit_rs: float
    net_profit_per_quintal_rs: float


def _profile(commodity: str) -> Dict[str, float]:
    key = commodity.strip().title()
    for name, profile in CROP_SPOILAGE_PROFILES.items():
        if key.lower() == name.lower():
            return profile
    return {
        "half_life_days": DEFAULT_HALF_LIFE_DAYS,
        "min_marketable_fraction": DEFAULT_MIN_MARKETABLE_FRACTION,
    }


def marketable_fraction(commodity: str, hold_days: int) -> float:
    """Exponential spoilage curve: fraction of crop still sellable after hold_days."""
    hold_days = max(0, int(hold_days))
    profile = _profile(commodity)
    half_life = max(float(profile["half_life_days"]), 0.5)
    floor = float(profile["min_marketable_fraction"])
    decay = math.exp(-math.log(2.0) * hold_days / half_life)
    return max(floor, decay)


def _candidate(
    *,
    commodity: str,
    day_index: int,
    date: str,
    day_name: str,
    day_name_hi: str,
    price_per_qtl: float,
    quintals: float,
    storage_cost_per_day_rs: float,
    transport_cost_rs: float,
) -> SellDayCandidate:
    fraction = marketable_fraction(commodity, day_index)
    sellable = quintals * fraction
    spoilage = max(0.0, quintals - sellable)
    gross = price_per_qtl * sellable
    storage_total = storage_cost_per_day_rs * day_index
    net = gross - storage_total - transport_cost_rs
    net_per_qtl = net / quintals if quintals > 0 else 0.0
    return SellDayCandidate(
        day_index=day_index,
        date=date,
        day_name=day_name,
        day_name_hi=day_name_hi,
        price_per_qtl=round(price_per_qtl, 2),
        marketable_fraction=round(fraction, 4),
        sellable_quintals=round(sellable, 2),
        spoilage_quintals=round(spoilage, 2),
        gross_revenue_rs=round(gross, 2),
        storage_cost_rs=round(storage_total, 2),
        transport_cost_rs=round(transport_cost_rs, 2),
        net_profit_rs=round(net, 2),
        net_profit_per_quintal_rs=round(net_per_qtl, 2),
    )


def _day_labels(day_index: int, forecast_point: Optional[Dict[str, Any]]) -> tuple[str, str, str]:
    if forecast_point:
        return (
            str(forecast_point.get("date") or ""),
            str(forecast_point.get("day_name") or DAY_NAMES[day_index % 7]),
            str(forecast_point.get("day_name_hi") or DAY_NAMES_HI[day_index % 7]),
        )
    return ("", DAY_NAMES[day_index % 7], DAY_NAMES_HI[day_index % 7])


def optimize_net_profit_sell_day(
    *,
    commodity: str,
    current_price: float,
    last_observed_date: str,
    forecasts: Sequence[Dict[str, Any]],
    sale_quintals: float = 10.0,
    storage_cost_per_day_rs: float = 0.0,
    transport_cost_rs: float = 0.0,
) -> Dict[str, Any]:
    """
    Evaluate sell-today plus each forecast day; return the day with maximum net profit.
    """
    quintals = max(float(sale_quintals), 0.1)
    storage_cost_per_day_rs = max(float(storage_cost_per_day_rs), 0.0)
    transport_cost_rs = max(float(transport_cost_rs), 0.0)

    candidates: List[SellDayCandidate] = []

    # Day 0: sell today at observed modal price.
    candidates.append(
        _candidate(
            commodity=commodity,
            day_index=0,
            date=last_observed_date,
            day_name="Today",
            day_name_hi="आज",
            price_per_qtl=current_price,
            quintals=quintals,
            storage_cost_per_day_rs=storage_cost_per_day_rs,
            transport_cost_rs=transport_cost_rs,
        )
    )

    for point in forecasts:
        day_index = int(point.get("day_index") or 0)
        if day_index <= 0:
            continue
        price = float(point.get("price") or point.get("p50_median_price") or 0.0)
        date_str, day_name, day_name_hi = _day_labels(day_index, point)
        candidates.append(
            _candidate(
                commodity=commodity,
                day_index=day_index,
                date=date_str,
                day_name=day_name,
                day_name_hi=day_name_hi,
                price_per_qtl=price,
                quintals=quintals,
                storage_cost_per_day_rs=storage_cost_per_day_rs,
                transport_cost_rs=transport_cost_rs,
            )
        )

    if not candidates:
        raise ValueError("At least one sell-day candidate is required.")

    best = max(candidates, key=lambda item: item.net_profit_rs)

    peak_price_candidate = max(candidates, key=lambda item: item.price_per_qtl)
    peak_net = peak_price_candidate.net_profit_rs
    net_advantage = round(best.net_profit_rs - peak_net, 2)
    overrides_peak = best.day_index != peak_price_candidate.day_index

    profile = _profile(commodity)
    decision_en, decision_hi = _build_decision_text(best, net_advantage, overrides_peak)

    return {
        "method_version": "Perishability-Aware Net Profit Optimizer v1.0",
        "commodity": commodity.strip().title(),
        "sale_quintals": round(quintals, 2),
        "storage_cost_per_day_rs": round(storage_cost_per_day_rs, 2),
        "transport_cost_rs": round(transport_cost_rs, 2),
        "spoilage_half_life_days": profile["half_life_days"],
        "optimal_day_index": best.day_index,
        "optimal_date": best.date,
        "optimal_day_name": best.day_name,
        "optimal_day_name_hi": best.day_name_hi,
        "optimal_price_per_qtl": best.price_per_qtl,
        "marketable_fraction": best.marketable_fraction,
        "sellable_quintals": best.sellable_quintals,
        "spoilage_loss_quintals": best.spoilage_quintals,
        "spoilage_loss_percent": round((best.spoilage_quintals / quintals) * 100.0, 1),
        "gross_revenue_rs": best.gross_revenue_rs,
        "storage_cost_total_rs": best.storage_cost_rs,
        "net_profit_total_rs": best.net_profit_rs,
        "net_profit_per_quintal_rs": best.net_profit_per_quintal_rs,
        "peak_price_day_index": peak_price_candidate.day_index,
        "peak_price_per_qtl": peak_price_candidate.price_per_qtl,
        "peak_day_net_profit_rs": peak_net,
        "net_advantage_vs_peak_rs": net_advantage,
        "overrides_peak_price_advice": overrides_peak,
        "decision": decision_en,
        "decision_hi": decision_hi,
    }


def _build_decision_text(
    best: SellDayCandidate,
    net_advantage_vs_peak: float,
    overrides_peak: bool,
) -> tuple[str, str]:
    if best.day_index == 0:
        en = "SELL TODAY — highest net profit after spoilage and costs"
        hi = "आज बेचें — खराबी और खर्च के बाद सबसे अधिक शुद्ध लाभ"
        if overrides_peak and net_advantage_vs_peak > 0:
            en += f" (₹{net_advantage_vs_peak:.0f} better than waiting for peak price)"
            hi += f" (चरम भाव का इंतज़ार करने से ₹{net_advantage_vs_peak:.0f} बेहतर)"
        return en, hi

    if overrides_peak and net_advantage_vs_peak > 0:
        en = (
            f"SELL ON {best.day_name.upper()} — net profit ₹{best.net_profit_rs:.0f} "
            f"beats peak-price day by ₹{net_advantage_vs_peak:.0f} after spoilage"
        )
        hi = (
            f"{best.day_name_hi} को बेचें — खराबी के बाद शुद्ध लाभ ₹{best.net_profit_rs:.0f} "
            f"(चरम भाव से ₹{net_advantage_vs_peak:.0f} बेहतर)"
        )
        return en, hi

    en = f"SELL ON {best.day_name.upper()} — highest net profit in forecast window"
    hi = f"{best.day_name_hi} को बेचें — पूर्वानुमान में सबसे अधिक शुद्ध लाभ"
    return en, hi
