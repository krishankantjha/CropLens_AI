// Earthline Intelligence: live-data-first contracts for the farmer UI. Never add sample business values here.
export type ResourceOption = {
  id: string;
  label: string;
  variety?: string;
};

export type ResourceEntry = ResourceOption | string;

export type ResourcesResponse = {
  commodities: ResourceOption[];
  mandis: ResourceEntry[];
};

export type ForecastPoint = {
  date?: string;
  day?: string;
  p10?: number;
  p50?: number;
  p90?: number;
  expected_price?: number;
};

export type ForecastResponse = {
  commodity?: string;
  market?: string;
  horizon?: number;
  forecast?: ForecastPoint[];
  forecasts?: ForecastPoint[];
  daily_forecast?: ForecastPoint[];
  p10_floor_price?: number;
  p50_median_price?: number;
  p90_ceiling_price?: number;
  band_width?: number;
  decision?: string;
  decision_en?: string;
  decision_hi?: string;
  expected_gain?: number;
  confidence?: string;
  model_version?: string;
  peak_day?: string;
  message?: string;
};

export type RiskRecord = {
  commodity?: string;
  market?: string;
  date?: string;
  anomaly_status?: string;
  status?: string;
  anomaly_score?: number;
  arrival_ratio?: number;
  price_velocity_7d?: number;
  message?: string;
};

export type RiskResponse = {
  records_analyzed?: number;
  anomalies_detected?: number;
  anomalies?: RiskRecord[];
  records?: RiskRecord[];
  message?: string;
};

export type ProcurementOpportunity = {
  source_market?: string;
  destination_market?: string;
  source_price?: number;
  destination_price?: number;
  gross_price_difference?: number;
  percentage_difference?: number;
  recommendation?: string;
};

export type ProcurementResponse = {
  opportunities?: ProcurementOpportunity[];
  results?: ProcurementOpportunity[];
  disclaimer?: string;
  message?: string;
};

export type ApiError = {
  status: number;
  message: string;
};
