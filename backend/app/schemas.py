"""
Pydantic Schemas for CropLens AI Production API Endpoints.
Defines strict validation for price prediction, supply shock alerts, spatial arbitrage, and analytics trends.
"""

from datetime import date as Date
import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from backend.app.core.constants import VALID_COMMODITIES, VALID_MARKETS


class ResourceCommodity(BaseModel):
    id: str
    label: str
    variety: str


class SystemResourcesResponse(BaseModel):
    status: str
    commodities: List[ResourceCommodity]
    mandis: List[str]


# --- Price Prediction Schemas ---

class PricePredictionRequest(BaseModel):
    commodity: str = Field(..., description="Target commodity name", json_schema_extra={"example": "Potato"})
    market: str = Field(..., description="Target APMC mandi name", json_schema_extra={"example": "Agra"})
    date: Optional[str] = Field(None, description="Forecast target date (YYYY-MM-DD)", json_schema_extra={"example": "2025-06-15"})
    arrivals_in_qtl: Optional[float] = Field(None, ge=0.0, le=50000.0, description="Optional custom mandi arrival quantity in quintals", json_schema_extra={"example": 1250.0})
    rainfall_mm: Optional[float] = Field(None, ge=0.0, le=500.0, description="Optional custom daily rainfall in mm", json_schema_extra={"example": 0.0})
    temp_max: Optional[float] = Field(None, ge=-10.0, le=60.0, description="Optional custom maximum temperature in Celsius", json_schema_extra={"example": 36.5})

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        try:
            return Date.fromisoformat(v.strip()).isoformat()
        except (TypeError, ValueError) as exc:
            raise ValueError("date must use YYYY-MM-DD format.") from exc

    @field_validator("commodity")
    @classmethod
    def validate_commodity(cls, v: str) -> str:
        v_title = v.strip().title()
        # Handle special capitalization like Gram(Chana) and Paddy(Dhan)
        for valid in VALID_COMMODITIES:
            if v.strip().lower() == valid.lower():
                return valid
        if v_title not in VALID_COMMODITIES:
            raise ValueError(f"Invalid commodity '{v}'. Must be one of: {', '.join(VALID_COMMODITIES)}")
        return v_title

    @field_validator("market")
    @classmethod
    def validate_market(cls, v: str) -> str:
        v_title = v.strip().title()
        for valid in VALID_MARKETS:
            if v.strip().lower() == valid.lower():
                return valid
        if v_title not in VALID_MARKETS:
            raise ValueError(f"Invalid market '{v}'. Must be one of: {', '.join(VALID_MARKETS)}")
        return v_title


class PricePredictionResponse(BaseModel):
    commodity: str = Field(..., json_schema_extra={"example": "Potato"})
    market: str = Field(..., json_schema_extra={"example": "Agra"})
    date: str = Field(..., json_schema_extra={"example": "2025-06-15"})
    p10_floor_price: float = Field(..., description="P10 lower risk floor price forecast (Rs/qtl)", json_schema_extra={"example": 1650.25})
    p50_median_price: float = Field(..., description="P50 base expected median price forecast (Rs/qtl)", json_schema_extra={"example": 1720.50})
    p90_ceiling_price: float = Field(..., description="P90 upper stress ceiling price forecast (Rs/qtl)", json_schema_extra={"example": 1790.75})
    band_width: float = Field(..., description="P10-P90 forecast band width (Rs/qtl)", json_schema_extra={"example": 140.50})
    band_terminology: str = Field("P10-P90 Quantile Forecast Band", json_schema_extra={"example": "P10-P90 Quantile Forecast Band"})
    model_version: str = Field("LightGBM Multi-Quantile v1.0", json_schema_extra={"example": "LightGBM Multi-Quantile v1.0"})


# --- 7-Day Recursive Multi-Day Forecast Schemas ---

class DailyForecastPoint(BaseModel):
    day_index: int = Field(..., description="Forecast horizon index (1 to 7)", json_schema_extra={"example": 1})
    date: str = Field(..., description="Forecast date (YYYY-MM-DD)", json_schema_extra={"example": "2025-06-16"})
    day_name: str = Field(..., description="English day name abbreviation", json_schema_extra={"example": "Mon"})
    day_name_hi: str = Field(..., description="Hindi day name abbreviation", json_schema_extra={"example": "सोम"})
    price: float = Field(..., description="P50 expected price for display (Rs/qtl)", json_schema_extra={"example": 1720.0})
    p10_floor_price: float = Field(..., description="P10 lower risk floor (Rs/qtl)", json_schema_extra={"example": 1650.0})
    p50_median_price: float = Field(..., description="P50 expected median price (Rs/qtl)", json_schema_extra={"example": 1720.0})
    p90_ceiling_price: float = Field(..., description="P90 upper stress ceiling (Rs/qtl)", json_schema_extra={"example": 1790.0})
    band_width: float = Field(..., description="P10-P90 uncertainty width (Rs/qtl)", json_schema_extra={"example": 140.0})
    height: str = Field(..., description="Relative chart height percentage", json_schema_extra={"example": "75%"})
    is_peak: bool = Field(default=False, description="True if this day represents the 7-day peak price", json_schema_extra={"example": False})
    type: str = Field(default="normal", description="Trend type: normal, drop, or peak", json_schema_extra={"example": "normal"})


class NetProfitSellAdvisory(BaseModel):
    method_version: str = Field(..., json_schema_extra={"example": "Perishability-Aware Net Profit Optimizer v1.0"})
    commodity: str = Field(..., json_schema_extra={"example": "Tomato"})
    sale_quintals: float = Field(..., ge=0.1, le=50000.0, json_schema_extra={"example": 10.0})
    storage_cost_per_day_rs: float = Field(..., ge=0.0, json_schema_extra={"example": 15.0})
    transport_cost_rs: float = Field(..., ge=0.0, json_schema_extra={"example": 200.0})
    spoilage_half_life_days: float = Field(..., description="Crop-specific ambient spoilage half-life in days")
    optimal_day_index: int = Field(..., description="0 = sell today; 1..N = forecast day index")
    optimal_date: str = Field(..., json_schema_extra={"example": "2026-06-10"})
    optimal_day_name: str = Field(..., json_schema_extra={"example": "Today"})
    optimal_day_name_hi: str = Field(..., json_schema_extra={"example": "आज"})
    optimal_price_per_qtl: float = Field(..., json_schema_extra={"example": 1650.0})
    marketable_fraction: float = Field(..., description="Fraction of crop still sellable on optimal day")
    sellable_quintals: float = Field(..., json_schema_extra={"example": 8.5})
    spoilage_loss_quintals: float = Field(..., json_schema_extra={"example": 1.5})
    spoilage_loss_percent: float = Field(..., json_schema_extra={"example": 15.0})
    gross_revenue_rs: float = Field(..., json_schema_extra={"example": 14025.0})
    storage_cost_total_rs: float = Field(..., json_schema_extra={"example": 45.0})
    net_profit_total_rs: float = Field(..., json_schema_extra={"example": 13780.0})
    net_profit_per_quintal_rs: float = Field(..., json_schema_extra={"example": 1378.0})
    peak_price_day_index: int = Field(..., json_schema_extra={"example": 5})
    peak_price_per_qtl: float = Field(..., json_schema_extra={"example": 1800.0})
    peak_day_net_profit_rs: float = Field(..., json_schema_extra={"example": 12000.0})
    net_advantage_vs_peak_rs: float = Field(..., description="Net profit gain vs selling on peak-price day")
    overrides_peak_price_advice: bool = Field(..., description="True when net-optimal day differs from peak price day")
    decision: str = Field(..., json_schema_extra={"example": "SELL TODAY — highest net profit after spoilage and costs"})
    decision_hi: str = Field(..., json_schema_extra={"example": "आज बेचें — खराबी और खर्च के बाद सबसे अधिक शुद्ध लाभ"})


class MultiDayForecastRequest(BaseModel):
    commodity: str = Field(..., description="Target commodity name", json_schema_extra={"example": "Potato"})
    market: str = Field(..., description="Target APMC mandi name", json_schema_extra={"example": "Agra"})
    start_date: Optional[str] = Field(None, description="Starting reference date (YYYY-MM-DD)", json_schema_extra={"example": "2025-06-15"})
    horizon_days: int = Field(default=7, ge=1, le=14, description="Forecast horizon in days (default 7)", json_schema_extra={"example": 7})
    sale_quintals: float = Field(default=10.0, ge=0.1, le=50000.0, description="Farmer sale quantity in quintals for net-profit optimization")
    storage_cost_per_day_rs: float = Field(default=0.0, ge=0.0, le=100000.0, description="Daily open-storage cost in rupees")
    transport_cost_rs: float = Field(default=0.0, ge=0.0, le=1000000.0, description="One-time transport cost to mandi in rupees")

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        try:
            return Date.fromisoformat(v.strip()).isoformat()
        except (TypeError, ValueError) as exc:
            raise ValueError("start_date must use YYYY-MM-DD format.") from exc

    @field_validator("commodity")
    @classmethod
    def validate_commodity(cls, v: str) -> str:
        for valid in VALID_COMMODITIES:
            if v.strip().lower() == valid.lower():
                return valid
        raise ValueError(f"Invalid commodity '{v}'. Must be one of: {', '.join(VALID_COMMODITIES)}")

    @field_validator("market")
    @classmethod
    def validate_market(cls, v: str) -> str:
        for valid in VALID_MARKETS:
            if v.strip().lower() == valid.lower():
                return valid
        raise ValueError(f"Invalid market '{v}'. Must be one of: {', '.join(VALID_MARKETS)}")


class MultiDayForecastResponse(BaseModel):
    commodity: str = Field(..., json_schema_extra={"example": "Potato"})
    market: str = Field(..., json_schema_extra={"example": "Agra"})
    forecast_horizon_days: int = Field(default=7, json_schema_extra={"example": 7})
    last_observed_date: str = Field(
        ...,
        description="Date (YYYY-MM-DD) of the latest official mandi price row used for this forecast",
        json_schema_extra={"example": "2026-08-21"},
    )
    current_price: float = Field(..., description="Day-0 closing reference price (Rs/qtl)", json_schema_extra={"example": 1650.0})
    forecasts: List[DailyForecastPoint] = Field(..., description="List of daily forecast trajectories")
    peak_day: DailyForecastPoint = Field(..., description="Forecast point with highest projected price")
    decision: str = Field(..., description="Recommended marketing action in English", json_schema_extra={"example": "HOLD FOR 5 DAYS"})
    decision_hi: str = Field(..., description="Recommended marketing action in Hindi", json_schema_extra={"example": "5 दिन रुकें और बेचें"})
    expected_gain: float = Field(..., description="Expected profit gain over current price (Rs/qtl)", json_schema_extra={"example": 130.0})
    confidence: str = Field("95.2%", description="Model confidence score", json_schema_extra={"example": "95.2%"})
    model_version: str = Field("7-Day Recursive Roll-Forward v1.0", json_schema_extra={"example": "7-Day Recursive Roll-Forward v1.0"})
    net_profit_advisory: Optional[NetProfitSellAdvisory] = Field(
        None,
        description="Perishability-aware net-profit sell recommendation (spoilage + storage + transport)",
    )


# --- Supply Shock Anomaly Schemas ---

class SupplyShockItem(BaseModel):
    commodity: str = Field(..., json_schema_extra={"example": "Onion"})
    market: str = Field(..., json_schema_extra={"example": "Lasalgaon"})
    date: str = Field(..., json_schema_extra={"example": "2025-06-15"})
    anomaly_status: str = Field(..., description="Status: Potential Supply Shock / Anomaly or Normal Market Condition", json_schema_extra={"example": "Potential Supply Shock / Anomaly"})
    is_anomaly: bool = Field(..., json_schema_extra={"example": True})
    anomaly_score: float = Field(..., description="Isolation Forest decision score (less than 0 indicates potential shock)", json_schema_extra={"example": -0.1245})
    arrival_ratio: float = Field(..., json_schema_extra={"example": 1.85})
    price_velocity_7d: float = Field(..., json_schema_extra={"example": -65.20})
    message: str = Field(..., json_schema_extra={"example": "Potential supply shock detected due to heavy arrival glut or rapid price drop."})


class SupplyShockResponse(BaseModel):
    total_records_analyzed: int = Field(..., json_schema_extra={"example": 100})
    total_anomalies_detected: int = Field(..., json_schema_extra={"example": 5})
    anomalies: List[SupplyShockItem] = Field(...)


# --- Spatial Arbitrage Schemas ---

class ArbitrageOpportunityItem(BaseModel):
    commodity: str = Field(..., json_schema_extra={"example": "Tomato"})
    source_market: str = Field(..., json_schema_extra={"example": "Kolar"})
    destination_market: str = Field(..., json_schema_extra={"example": "Azadpur"})
    source_price: float = Field(..., description="Source market price (Rs/qtl)", json_schema_extra={"example": 1600.0})
    destination_price: float = Field(..., description="Destination market price (Rs/qtl)", json_schema_extra={"example": 2200.0})
    gross_price_difference: float = Field(..., description="Destination price minus source price (Rs/qtl)", json_schema_extra={"example": 600.0})
    price_gradient_percentage: float = Field(..., description="Gross price difference percentage", json_schema_extra={"example": 37.5})
    recommendation: str = Field(..., description="Potential selling market opportunity guidance", json_schema_extra={"example": "Potential selling opportunity from Kolar to Azadpur"})


class ArbitrageResponse(BaseModel):
    commodity: str = Field(..., json_schema_extra={"example": "Tomato"})
    base_market: str = Field(..., json_schema_extra={"example": "Kolar"})
    date: str = Field(..., json_schema_extra={"example": "2025-06-15"})
    opportunities: List[ArbitrageOpportunityItem] = Field(...)
    disclaimer: str = Field(
        "Potential price opportunity based on wholesale modal price gradients. Does not account for individual transport, loading, or commission fees.",
        json_schema_extra={"example": "Potential price opportunity based on wholesale modal price gradients."}
    )


# --- Analytics Trends Schemas ---

class TrendPoint(BaseModel):
    date: str = Field(..., json_schema_extra={"example": "2025-06-01"})
    modal_price: float = Field(..., json_schema_extra={"example": 2100.0})
    arrivals_in_qtl: float = Field(..., json_schema_extra={"example": 1450.0})


class AnalyticsTrendResponse(BaseModel):
    commodity: str = Field(..., json_schema_extra={"example": "Tomato"})
    market: str = Field(..., json_schema_extra={"example": "Azadpur"})
    timeframe_days: int = Field(30, json_schema_extra={"example": 30})
    min_price: float = Field(..., json_schema_extra={"example": 1800.0})
    max_price: float = Field(..., json_schema_extra={"example": 2400.0})
    avg_price: float = Field(..., json_schema_extra={"example": 2125.50})
    price_volatility_30d: float = Field(..., json_schema_extra={"example": 145.20})
    price_trend_direction: str = Field(..., description="Trend direction (Upward, Downward, or Stable)", json_schema_extra={"example": "Upward"})
    historical_points: List[TrendPoint] = Field(...)


# --- Authentication Schemas ---


def canonicalize_indian_mobile(value: str) -> str:
    """Return a canonical 10-digit Indian mobile number or reject the input."""
    if not isinstance(value, str):
        raise ValueError("mobile_number must be a string")
    normalized = value.strip().replace(" ", "").replace("-", "")
    if normalized.startswith("+91"):
        normalized = normalized[3:]
    elif normalized.startswith("91") and len(normalized) == 12:
        normalized = normalized[2:]
    if not re.fullmatch(r"[6-9][0-9]{9}", normalized):
        raise ValueError("mobile_number must be a valid Indian 10-digit mobile number")
    return normalized


class UserRegisterRequest(BaseModel):
    mobile_number: str = Field(..., description="10-digit Indian mobile number", json_schema_extra={"example": "9876543210"})
    full_name: str = Field(..., description="User display name", json_schema_extra={"example": "Ramesh Patel"})
    email: Optional[str] = Field(None, description="Optional user email address", json_schema_extra={"example": "ramesh@example.com"})
    password: Optional[str] = Field(None, description="Optional account password", json_schema_extra={"example": "farmer123"})
    role: Optional[str] = Field("farmer", description="User role: farmer or trader", json_schema_extra={"example": "farmer"})
    home_mandi: Optional[str] = Field("Azadpur", description="Default home mandi", json_schema_extra={"example": "Azadpur"})
    preferred_commodity: Optional[str] = Field("Tomato", description="Default preferred crop", json_schema_extra={"example": "Tomato"})
    language: Optional[str] = Field("en", description="Preferred language code", json_schema_extra={"example": "hi"})

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: str) -> str:
        return canonicalize_indian_mobile(value)


class UserLoginRequest(BaseModel):
    mobile_number: str = Field(..., description="Registered mobile number", json_schema_extra={"example": "9876543210"})
    password: str = Field(..., description="Account password", json_schema_extra={"example": "farmer123"})

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: str) -> str:
        return canonicalize_indian_mobile(value)


class UserOTPRequest(BaseModel):
    mobile_number: str = Field(..., description="Mobile number for OTP verification", json_schema_extra={"example": "9876543210"})
    purpose: str = Field(
        "login",
        description="login = existing account only; signup = new account registration",
        json_schema_extra={"example": "login"},
    )

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: str) -> str:
        return canonicalize_indian_mobile(value)

    @field_validator("purpose")
    @classmethod
    def validate_purpose(cls, value: str) -> str:
        normalized = (value or "login").strip().lower()
        if normalized not in {"login", "signup"}:
            raise ValueError("purpose must be 'login' or 'signup'")
        return normalized


class UserOTPVerifyRequest(BaseModel):
    mobile_number: str = Field(..., description="Mobile number", json_schema_extra={"example": "9876543210"})
    otp_code: str = Field(..., min_length=6, max_length=6, pattern=r"^[0-9]{6}$", description="6-digit OTP code", json_schema_extra={"example": "123456"})
    full_name: Optional[str] = Field(None, description="Full name for new account registration", json_schema_extra={"example": "Ramesh Patel"})
    email: Optional[str] = Field(None, description="Optional email for new account registration", json_schema_extra={"example": "ramesh@example.com"})

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: str) -> str:
        return canonicalize_indian_mobile(value)


class UserPreferencesRequest(BaseModel):
    full_name: Optional[str] = Field(None, json_schema_extra={"example": "Ramesh Patel"})
    email: Optional[str] = Field(None, json_schema_extra={"example": "ramesh@example.com"})
    home_mandi: Optional[str] = Field(None, json_schema_extra={"example": "Lasalgaon"})
    preferred_commodity: Optional[str] = Field(None, json_schema_extra={"example": "Onion"})
    language: Optional[str] = Field(None, json_schema_extra={"example": "hi"})


class UserResponse(BaseModel):
    id: int
    mobile_number: str
    full_name: str
    email: Optional[str] = None
    role: str
    home_mandi: str
    preferred_commodity: str
    language: str
    created_at: Optional[str] = None


class AuthSessionResponse(BaseModel):
    csrf_token: str
    user: UserResponse


class CsrfResponse(BaseModel):
    csrf_token: str
