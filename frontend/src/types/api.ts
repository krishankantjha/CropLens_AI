export interface PricePredictionResponse {
  commodity: string;
  market: string;
  date: string;
  p10_floor_price: number;
  p50_median_price: number;
  p90_ceiling_price: number;
  band_width: number;
  band_terminology: string;
  model_version: string;
}

export interface DailyForecastPoint {
  day_index: number;
  date: string;
  day_name: string;
  day_name_hi: string;
  price: number;
  p10_floor_price: number;
  p50_median_price: number;
  p90_ceiling_price: number;
  band_width: number;
  height: string;
  is_peak: boolean;
  type: string;
}

export interface Forecast7DayResponse {
  commodity: string;
  market: string;
  forecast_horizon_days: number;
  current_price: number;
  forecasts: DailyForecastPoint[];
  peak_day: DailyForecastPoint;
  decision: string;
  decision_hi: string;
  expected_gain: number;
  confidence: string;
  model_version: string;
}

export interface ArbitrageOpportunityItem {
  commodity: string;
  source_market: string;
  destination_market: string;
  source_price: number;
  destination_price: number;
  gross_price_difference: number;
  price_gradient_percentage: number;
  recommendation: string;
}

export interface ArbitrageResponse {
  commodity: string;
  base_market: string;
  date: string;
  opportunities: ArbitrageOpportunityItem[];
  disclaimer: string;
}

export interface SupplyShockItem {
  commodity: string;
  market: string;
  date: string;
  anomaly_status: string;
  is_anomaly: boolean;
  anomaly_score: number;
  arrival_ratio: number;
  price_velocity_7d: number;
  message: string;
}

export interface SupplyShockResponse {
  total_records_analyzed: number;
  total_anomalies_detected: number;
  anomalies: SupplyShockItem[];
}
