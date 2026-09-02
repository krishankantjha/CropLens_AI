import { memo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ForecastPoint } from "@/types/api";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ForecastChartProps = { points: ForecastPoint[] };

type ChartPoint = ForecastPoint & { label: string; low: number | null; mid: number; high: number | null; peak: boolean };

function value(point: ForecastPoint, key: "p10" | "p50" | "p90") {
  const raw = key === "p10"
    ? point.p10_floor_price ?? point.p10
    : key === "p50"
      ? point.p50_median_price ?? point.price ?? point.p50 ?? point.expected_price
      : point.p90_ceiling_price ?? point.p90;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function money(valueToFormat: number | null) {
  return valueToFormat === null ? "—" : `₹${Math.round(valueToFormat).toLocaleString("en-IN")}`;
}

function axisTick(valueToFormat: number) {
  const rounded = Math.round(valueToFormat);
  if (Math.abs(rounded) >= 10000) return `₹${Math.round(rounded / 1000)}k`;
  return `₹${rounded}`;
}

export const ForecastChart = memo(function ForecastChart({ points }: ForecastChartProps) {
  const { language, t } = useLanguage();
  const usable: ChartPoint[] = points
    .map((point, index) => {
      const mid = value(point, "p50");
      return mid === null ? null : {
        ...point,
        label: language === "hi" ? point.day_name_hi ?? point.day_name ?? point.day ?? point.date ?? `${t("day")} ${index + 1}` : point.day_name ?? point.day ?? point.date ?? `${t("day")} ${index + 1}`,
        low: value(point, "p10"),
        mid,
        high: value(point, "p90"),
        peak: Boolean(point.is_peak),
      };
    })
    .filter((point): point is ChartPoint => point !== null);

  if (usable.length < 2) return null;
  const peak = usable.reduce((best, point) => point.mid > best.mid ? point : best, usable[0]);

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={usable} margin={{ top: 12, right: 18, left: 4, bottom: 8 }}>
          <defs>
            <linearGradient id="forecast-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--green)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 5" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} tickFormatter={axisTick} width={52} />
          <Tooltip
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as ChartPoint | undefined;
              if (!active || !point) return null;
              return <div className="chart-tooltip"><strong>{point.label}</strong><span>{t("p10Floor")}: {money(point.low)}</span><span>{t("p50Median")}: {money(point.mid)}</span><span>{t("p90Ceiling")}: {money(point.high)}</span></div>;
            }}
          />
          <Area type="monotone" dataKey="high" stroke="transparent" fill="url(#forecast-band)" connectNulls name="high" />
          <Area type="monotone" dataKey="low" stroke="transparent" fill="var(--paper)" fillOpacity={1} connectNulls name="low" />
          <Area type="monotone" dataKey="mid" stroke="var(--green)" strokeWidth={3} fill="transparent" dot={{ r: 4, strokeWidth: 2, fill: "var(--paper)" }} activeDot={{ r: 6 }} connectNulls name="mid" />
          <ReferenceDot x={peak.label} y={peak.mid} r={7} fill="var(--amber)" stroke="var(--paper)" strokeWidth={3} ifOverflow="extendDomain" label={{ value: "★", position: "top", fill: "var(--amber)", fontSize: 16 }} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="chart-caption">{t("chartExplanation")}</p>
      <p className="sr-only">{t("peakDayIs")} {peak.label}. {t("chartExplanation")}</p>
    </div>
  );
});
