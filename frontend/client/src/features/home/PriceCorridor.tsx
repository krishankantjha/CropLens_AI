import { memo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { money, percentage } from "@/lib/format";

type PriceCorridorProps = {
  current?: number;
  low?: number;
  median?: number;
  high?: number;
  label: string;
};

export const PriceCorridor = memo(function PriceCorridor({ current, low, median, high, label }: PriceCorridorProps) {
  const { t } = useLanguage();
  const values = [current, low, median, high].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length < 3 || current === undefined || low === undefined || high === undefined) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="corridor" aria-label={label}>
      <div className="corridor-head">
        <span>{label}</span>
        <strong>{money(current)}</strong>
      </div>
      <div className="corridor-track">
        <span className="corridor-band" />
        <span className="corridor-marker" style={{ left: `${percentage(current, min, max)}%` }} />
      </div>
      <div className="corridor-labels">
        <span>{t("priceLow")} {money(low)}</span>
        <span>{t("priceMid")} {median !== undefined ? money(median) : "—"}</span>
        <span>{t("priceHigh")} {money(high)}</span>
      </div>
    </div>
  );
});
