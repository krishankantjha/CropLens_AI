import type { ForecastPoint, ForecastResponse } from "@/types/api";

/** Day-0 observed price from the forecast API, followed by model forecast days (1..n). */
export function chartPointsWithToday(forecast: ForecastResponse | null | undefined): ForecastPoint[] {
  const forecasts = forecast?.forecasts ?? [];
  const current = forecast?.current_price;
  if (typeof current !== "number" || !Number.isFinite(current)) return forecasts;

  const todayPoint: ForecastPoint = {
    day_index: 0,
    price: current,
    p50_median_price: current,
    type: "current",
  };

  return [todayPoint, ...forecasts];
}

/** Today plus up to `horizonDays` future forecast days from live API data. */
export function chartPointsForHorizon(forecast: ForecastResponse | null | undefined, horizonDays: number): ForecastPoint[] {
  const series = chartPointsWithToday(forecast);
  if (!series.length) return [];
  const today = series[0]?.day_index === 0 ? 1 : 0;
  return series.slice(0, today + Math.max(1, horizonDays));
}
