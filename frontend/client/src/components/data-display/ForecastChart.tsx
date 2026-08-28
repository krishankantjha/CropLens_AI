// Earthline Intelligence: uncertainty is visible, honest, and derived only from the response.
import type { ForecastPoint } from "@/types/api";

type ForecastChartProps = { points: ForecastPoint[] };

function value(point: ForecastPoint, key: "p10" | "p50" | "p90") {
  if (key === "p10") {
    const raw = point.p10_floor_price ?? point.p10;
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  }
  if (key === "p50") {
    const raw = point.p50_median_price ?? point.price ?? point.p50 ?? point.expected_price;
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  }
  if (key === "p90") {
    const raw = point.p90_ceiling_price ?? point.p90;
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  }
  return null;
}

export function ForecastChart({ points }: ForecastChartProps) {
  const usable = points
    .map((point, index) => ({ point, index, low: value(point, "p10"), mid: value(point, "p50"), high: value(point, "p90") }))
    .filter((entry) => entry.mid !== null);

  if (usable.length < 2) return null;
  const allValues = usable.flatMap((entry) => [entry.low, entry.mid, entry.high].filter((item): item is number => item !== null));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(max - min, 1);
  const width = 760;
  const height = 260;
  const x = (index: number) => (index / Math.max(usable.length - 1, 1)) * width;
  const y = (price: number) => height - ((price - min) / range) * (height - 24) - 12;
  const line = usable.map((entry, index) => `${x(index)},${y(entry.mid as number)}`).join(" ");
  const upper = usable.filter((entry) => entry.high !== null).map((entry, index) => `${x(index)},${y(entry.high as number)}`);
  const lower = usable.filter((entry) => entry.low !== null).map((entry, index) => `${x(index)},${y(entry.low as number)}`).reverse();
  const band = upper.length > 1 && lower.length > 1 ? [...upper, ...lower].join(" ") : "";

  return (
    <div className="chart-wrap">
      <svg className="forecast-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Live forecast trend with likely price range">
        <line x1="0" y1={height - 12} x2={width} y2={height - 12} className="chart-axis" />
        {band ? <polygon points={band} className="chart-band" /> : null}
        <polyline points={line} className="chart-line" />
        {usable.map((entry, index) => <circle key={`${entry.index}-${index}`} cx={x(index)} cy={y(entry.mid as number)} r="5" className="chart-dot" />)}
      </svg>
      <div className="chart-labels" aria-hidden="true">
        {usable.map((entry, index) => <span key={`${entry.index}-label`}>{entry.point.day_name ?? entry.point.day ?? entry.point.date ?? `Day ${index + 1}`}</span>)}
      </div>
      <p className="sr-only">The line shows expected price. The shaded area shows the likely lower and upper range when returned by the live service.</p>
    </div>
  );
}
