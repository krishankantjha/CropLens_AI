import { lazy, Suspense, useMemo } from "react";
import { chartPointsForHorizon } from "@/lib/chartPoints";
import { LoadingSkeleton } from "@/features/home/LoadingSkeleton";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { money, pointLabel } from "@/lib/format";
import type { ForecastPoint, ForecastResponse } from "@/types/api";

const ForecastChart = lazy(() => import("@/components/data-display/ForecastChart").then(({ ForecastChart: Chart }) => ({ default: Chart })));

type ChartHorizon = 7 | 14;

type PriceChartCardProps = {
  forecast: ForecastResponse;
  points: ForecastPoint[];
  language: "en" | "hi";
  chartHorizon: ChartHorizon;
  chartLoading: boolean;
  onChartHorizonChange: (days: ChartHorizon) => void;
  onRetry: () => void;
};

export function PriceChartCard({
  forecast,
  points,
  language,
  chartHorizon,
  chartLoading,
  onChartHorizonChange,
  onRetry,
}: PriceChartCardProps) {
  const { t } = useLanguage();
  const visiblePoints = useMemo(() => chartPointsForHorizon(forecast, chartHorizon), [forecast, chartHorizon]);
  const futureForecastPoints = points.slice(0, chartHorizon);

  return (
    <article className="forecast-card">
      <div className="forecast-card__head">
        <div className="card-kicker">
          {t("nextDays")} {Math.min(chartHorizon, visiblePoints.length || chartHorizon)} {t("days")}
        </div>
        <div className="chart-horizon-toggle" role="group" aria-label={t("chartHorizonLabel")}>
          <button
            type="button"
            className={`chart-horizon-toggle__btn${chartHorizon === 7 ? " chart-horizon-toggle__btn--active" : ""}`}
            aria-pressed={chartHorizon === 7}
            disabled={chartLoading}
            onClick={() => onChartHorizonChange(7)}
          >
            {t("chartDays7")}
          </button>
          <button
            type="button"
            className={`chart-horizon-toggle__btn${chartHorizon === 14 ? " chart-horizon-toggle__btn--active" : ""}`}
            aria-pressed={chartHorizon === 14}
            disabled={chartLoading}
            onClick={() => onChartHorizonChange(14)}
          >
            {t("chartDays14")}
          </button>
        </div>
      </div>
      <div className="chart-legend">
        <span className="legend-line" />
        <span>{t("expectedPrice")}</span>
        <span className="legend-band" />
        <span>{t("likelyRangeLegend")}</span>
        <span className="legend-today" />
        <span>{t("chartToday")}</span>
        <span className="legend-peak">★</span>
        <span>{t("chartBestDay")}</span>
      </div>
      {visiblePoints.length >= 2 ? (
        <Suspense fallback={<LoadingSkeleton variant="chart" label={t("checkingLiveMarket")} />}>
          <ForecastChart points={visiblePoints} loading={chartLoading} />
        </Suspense>
      ) : futureForecastPoints.length === 1 ? (
        <div className="single-day-outlook">
          <span className="muted-label">{t("singleDayOutlook")}</span>
          <strong>{money(futureForecastPoints[0].p50_median_price ?? futureForecastPoints[0].price)}</strong>
          <p>
            {pointLabel(futureForecastPoints[0], language, `${t("day")} 1`)} · {t("likelyRange")}: {money(futureForecastPoints[0].p10_floor_price)} – {money(futureForecastPoints[0].p90_ceiling_price)}
          </p>
        </div>
      ) : (
        <StatePanel kind="empty" title={t("forecastPointsMissing")} message={t("notEnoughPoints")} actionLabel={t("retry")} onAction={onRetry} />
      )}
      {chartHorizon === 14 && points.length < 14 && !chartLoading ? (
        <p className="form-note">{t("chartNeed14Days")}</p>
      ) : null}
      <p className="sr-only">
        {t("peakDayIs")} {forecast.peak_day ? pointLabel(forecast.peak_day, language, t("day")) : t("bestDay")}
      </p>
    </article>
  );
}
