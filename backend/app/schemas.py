"""
Pydantic Schemas for CropLens AI Production API Endpoints.
Defines strict validation for price prediction, supply shock alerts, spatial arbitrage, and analytics trends.
"""

from datetime import date as Date
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from backend.app.core.constants import VALID_COMMODITIES, VALID_MARKETS


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


class MultiDayForecastRequest(BaseModel):
    commodity: str = Field(..., description="Target commodity name", json_schema_extra={"example": "Potato"})
    market: str = Field(..., description="Target APMC mandi name", json_schema_extra={"example": "Agra"})
    start_date: Optional[str] = Field(None, description="Starting reference date (YYYY-MM-DD)", json_schema_extra={"example": "2025-06-15"})
    horizon_days: int = Field(default=7, ge=1, le=14, description="Forecast horizon in days (default 7)", json_schema_extra={"example": 7})

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
    current_price: float = Field(..., description="Day-0 closing reference price (Rs/qtl)", json_schema_extra={"example": 1650.0})
    forecasts: List[DailyForecastPoint] = Field(..., description="List of daily forecast trajectories")
    peak_day: DailyForecastPoint = Field(..., description="Forecast point with highest projected price")
    decision: str = Field(..., description="Recommended marketing action in English", json_schema_extra={"example": "HOLD FOR 5 DAYS"})
    decision_hi: str = Field(..., description="Recommended marketing action in Hindi", json_schema_extra={"example": "5 दिन रुकें और बेचें"})
    expected_gain: float = Field(..., description="Expected profit gain over current price (Rs/qtl)", json_schema_extra={"example": 130.0})
    confidence: str = Field("95.2%", description="Model confidence score", json_schema_extra={"example": "95.2%"})
    model_version: str = Field("7-Day Recursive Roll-Forward v1.0", json_schema_extra={"example": "7-Day Recursive Roll-Forward v1.0"})


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

class UserRegisterRequest(BaseModel):
    mobile_number: str = Field(..., description="10-digit Indian mobile number", json_schema_extra={"example": "9876543210"})
    password: str = Field(..., description="User account password", json_schema_extra={"example": "farmer123"})
    full_name: str = Field(..., description="User display name", json_schema_extra={"example": "Kisan User"})
    role: Optional[str] = Field("farmer", description="User role: farmer or trader", json_schema_extra={"example": "farmer"})
    home_mandi: Optional[str] = Field("Azadpur", description="Default home mandi", json_schema_extra={"example": "Azadpur"})
    preferred_commodity: Optional[str] = Field("Tomato", description="Default preferred crop", json_schema_extra={"example": "Tomato"})
    language: Optional[str] = Field("en", description="Preferred language code", json_schema_extra={"example": "hi"})


class UserLoginRequest(BaseModel):
    mobile_number: str = Field(..., description="Registered mobile number", json_schema_extra={"example": "9876543210"})
    password: str = Field(..., description="Account password", json_schema_extra={"example": "farmer123"})


class UserOTPRequest(BaseModel):
    mobile_number: str = Field(..., description="Mobile number for OTP verification", json_schema_extra={"example": "9876543210"})


class UserOTPVerifyRequest(BaseModel):
    mobile_number: str = Field(..., description="Mobile number", json_schema_extra={"example": "9876543210"})
    otp_code: str = Field(..., description="6-digit OTP code", json_schema_extra={"example": "123456"})


class UserPreferencesRequest(BaseModel):
    home_mandi: Optional[str] = Field(None, json_schema_extra={"example": "Lasalgaon"})
    preferred_commodity: Optional[str] = Field(None, json_schema_extra={"example": "Onion"})
    language: Optional[str] = Field(None, json_schema_extra={"example": "hi"})


class UserResponse(BaseModel):
    id: int
    mobile_number: str
    full_name: str
    role: str
    home_mandi: str
    preferred_commodity: str
    language: str
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid JWT refresh token")
