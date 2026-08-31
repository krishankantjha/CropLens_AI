// Earthline Intelligence: live-data-first contracts for the farmer UI. Never add sample business values here.
export type ResourceOption = {
  id: string;
  label: string;
  variety?: string;
};

export type ResourceEntry = ResourceOption | string;

export type ResourcesResponse = {
  status?: string;
  commodities: ResourceOption[];
  mandis: ResourceEntry[];
};

export type DailyForecastPoint = {
  day_index?: number;
  date?: string;
  day_name?: string;
  day_name_hi?: string;
  price?: number;
  p10_floor_price?: number;
  p50_median_price?: number;
  p90_ceiling_price?: number;
  band_width?: number;
  height?: string;
  is_peak?: boolean;
  type?: string;
  // Aliases for compatibility
  day?: string;
  p10?: number;
  p50?: number;
  p90?: number;
  expected_price?: number;
};

export type ForecastPoint = DailyForecastPoint;

export type ForecastResponse = {
  commodity?: string;
  market?: string;
  forecast_horizon_days?: number;
  horizon?: number;
  current_price?: number;
  forecasts?: DailyForecastPoint[];
  peak_day?: DailyForecastPoint;
  decision?: string;
  decision_en?: string;
  decision_hi?: string;
  expected_gain?: number;
  confidence?: string;
  model_version?: string;
  p10_floor_price?: number;
  p50_median_price?: number;
  p90_ceiling_price?: number;
  band_width?: number;
  message?: string;
};

export type RiskRecord = {
  commodity?: string;
  market?: string;
  date?: string;
  anomaly_status?: string;
  status?: string;
  is_anomaly?: boolean;
  anomaly_score?: number;
  arrival_ratio?: number;
  price_velocity_7d?: number;
  message?: string;
};

export type RiskResponse = {
  total_records_analyzed?: number;
  total_anomalies_detected?: number;
  anomalies?: RiskRecord[];
  records?: RiskRecord[];
  message?: string;
};

export type ProcurementOpportunity = {
  commodity?: string;
  source_market?: string;
  destination_market?: string;
  source_price?: number;
  destination_price?: number;
  gross_price_difference?: number;
  price_gradient_percentage?: number;
  percentage_difference?: number;
  recommendation?: string;
};

export type ProcurementResponse = {
  commodity?: string;
  base_market?: string;
  date?: string;
  opportunities?: ProcurementOpportunity[];
  results?: ProcurementOpportunity[];
  disclaimer?: string;
  message?: string;
};

export type HealthResponse = {
  status: string;
  version?: string;
  models_loaded?: boolean;
  dataset_loaded?: boolean;
  loaded_models?: string[];
  dataset_rows?: number;
  feature_count?: number;
  startup_timestamp?: string;
  startup_duration_ms?: number;
  startup_error?: string | null;
};

export type ApiError = {
  status: number;
  message: string;
};
