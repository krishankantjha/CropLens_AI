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

export type NetProfitSellAdvisory = {
  method_version?: string;
  commodity?: string;
  sale_quintals?: number;
  storage_cost_per_day_rs?: number;
  transport_cost_rs?: number;
  spoilage_half_life_days?: number;
  optimal_day_index?: number;
  optimal_date?: string;
  optimal_day_name?: string;
  optimal_day_name_hi?: string;
  optimal_price_per_qtl?: number;
  marketable_fraction?: number;
  sellable_quintals?: number;
  spoilage_loss_quintals?: number;
  spoilage_loss_percent?: number;
  gross_revenue_rs?: number;
  storage_cost_total_rs?: number;
  net_profit_total_rs?: number;
  net_profit_per_quintal_rs?: number;
  peak_price_day_index?: number;
  peak_price_per_qtl?: number;
  peak_day_net_profit_rs?: number;
  net_advantage_vs_peak_rs?: number;
  overrides_peak_price_advice?: boolean;
  decision?: string;
  decision_hi?: string;
};

export type ForecastResponse = {
  commodity?: string;
  market?: string;
  forecast_horizon_days?: number;
  horizon?: number;
  last_observed_date?: string;
  current_price?: number;
  forecasts?: DailyForecastPoint[];
  peak_day?: DailyForecastPoint;
  decision?: string;
  decision_hi?: string;
  expected_gain?: number;
  confidence?: string;
  model_version?: string;
  net_profit_advisory?: NetProfitSellAdvisory;
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
