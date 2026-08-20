export interface PricePredictionResponse {
  p10_floor_price: number;
  p50_median_price: number;
  p90_ceiling_price: number;
  expected_price: number;
  conformal_band_width: number;
  prediction_date: string;
}

export interface ForecastDayItem {
  day: string;
  date: string;
  price: number;
  p10: number;
  p90: number;
  recommended?: boolean;
}

export interface Forecast7DayResponse {
  commodity: string;
  market: string;
  forecast: ForecastDayItem[];
  peak_day?: {
    day: string;
    date: string;
    price: number;
    days_ahead: number;
  };
}

export interface ArbitrageRouteItem {
  destination_market: string;
  distance_km: number;
  destination_price: number;
  transport_cost_per_qtl: number;
  net_gain_per_qtl: number;
  is_optimal: boolean;
  transit_risk?: string;
}

export interface ArbitrageResponse {
  source_market: string;
  commodity: string;
  routes: ArbitrageRouteItem[];
  optimal_route: ArbitrageRouteItem;
}

export interface SupplyShockItem {
  id: string;
  mandi: string;
  commodity: string;
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: string;
}
