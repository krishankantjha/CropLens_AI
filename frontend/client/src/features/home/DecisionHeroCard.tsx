import { Info, MessageCircle, Volume2 } from "lucide-react";
import { DecisionBadge } from "./DecisionBadge";
import { PriceCorridor } from "./PriceCorridor";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ForecastPoint, ForecastResponse } from "@/types/api";
import type { SellParams } from "@/features/home/serviceState";
import { farmerDecisionText, farmerGainMessage, farmerTrustLabel } from "@/lib/farmerCopy";
import { daysSinceIsoDate, formatMarketDate, money, pointLabel, type DecisionTone } from "@/lib/format";

type DecisionHeroCardProps = {
  forecast: ForecastResponse;
  tone: DecisionTone;
  language: "en" | "hi";
  p50Price?: number;
  p10Price?: number;
  p90Price?: number;
  currentPrice?: number;
  peakDay?: ForecastPoint;
  voiceSupported: boolean;
  voiceError: string;
  onSpeak: () => void;
  onShare: () => void;
  lastObservedDate?: string;
  sellParams: SellParams;
  onSellParamsChange: (next: SellParams) => void;
};

export function DecisionHeroCard({
  forecast,
  tone,
  language,
  p50Price,
  p10Price,
  p90Price,
  currentPrice,
  peakDay,
  voiceSupported,
  voiceError,
  onSpeak,
  onShare,
  lastObservedDate,
  sellParams,
  onSellParamsChange,
}: DecisionHeroCardProps) {
  const { t } = useLanguage();
  const net = forecast.net_profit_advisory;
  const mandiAgeDays = lastObservedDate ? daysSinceIsoDate(lastObservedDate) : null;
  const mandiReportIsStale = mandiAgeDays !== null && mandiAgeDays > 2;
  const peakDayLabel = peakDay ? pointLabel(peakDay, language, t("day")) : undefined;
  const farmerCopy = {
    actionSellToday: t("actionSellToday"),
    actionWaitFewDays: t("actionWaitFewDays"),
    actionGoodChance: t("actionGoodChance"),
    gainMoreThanToday: t("gainMoreThanToday"),
    gainLessThanToday: t("gainLessThanToday"),
    trustHigh: t("trustHigh"),
    trustMedium: t("trustMedium"),
    trustLow: t("trustLow"),
    mandiMoreGain: t("mandiMoreGain"),
  };
  const actionText = farmerDecisionText(forecast, language);
  const gain = farmerGainMessage(forecast.expected_gain, farmerCopy);
  const trust = farmerTrustLabel(forecast.confidence, farmerCopy);

  return (
    <article className={`decision-card decision-card--${tone}`} lang={language}>
      <div className="decision-heading">
        <div className="decision-heading__lead">
          <div className="card-kicker">{t("todaysDecision")}</div>
          <DecisionBadge tone={tone} />
        </div>
        <div className="decision-actions">
          <button
            className="icon-button-quiet"
            type="button"
            onClick={onSpeak}
            aria-label={voiceSupported ? t("voiceAdvisory") : t("voiceUnavailable")}
            disabled={!voiceSupported}
          >
            <Volume2 size={17} />
          </button>
          <button className="icon-button-quiet" type="button" onClick={onShare} aria-label={t("shareWhatsapp")}>
            <MessageCircle size={17} />
          </button>
        </div>
      </div>
      <div className="decision-main">
        <div>
          <span className="muted-label">{t("expectedMarketPrice")}</span>
          <strong className="price-value">
            {money(p50Price)} <small>{t("quintal")}</small>
          </strong>
          <span className="muted-label">{t("likelyRange")}</span>
          <strong className="range-value">
            {p10Price !== undefined && p90Price !== undefined ? `${money(p10Price)} – ${money(p90Price)}` : money(forecast.current_price)}
          </strong>
          {gain ? <span className={`gain-badge ${gain.positive ? "gain-badge--positive" : "gain-badge--negative"}`}>{gain.text}</span> : null}
        </div>
        <div className="action-block">
          <span className="muted-label">{t("suggestedAction")}</span>
          <strong>{actionText}</strong>
          {trust ? <span className="muted-label">{t("trustLabel")}: {trust}</span> : null}
          {peakDayLabel ? (
            <span className="peak-chip">
              {t("bestDay")}: {peakDayLabel}
            </span>
          ) : null}
          {net?.overrides_peak_price_advice && typeof net.net_advantage_vs_peak_rs === "number" && net.net_advantage_vs_peak_rs > 0 ? (
            <p className="decision-hint">{t("overridesPeakNote").replace("{amount}", money(net.net_advantage_vs_peak_rs))}</p>
          ) : tone === "sell" ? (
            <p className="decision-hint">{t("sellUrgency")}</p>
          ) : null}
        </div>
      </div>
      <div className="sell-optimizer">
        <div className="sell-optimizer__title">{t("netProfitTitle")}</div>
        <div className="sell-optimizer__grid">
          <label className="field">
            <span>{t("saleQuantity")}</span>
            <input
              type="number"
              min={0.1}
              step={1}
              value={sellParams.sale_quintals}
              onChange={(event) => onSellParamsChange({ ...sellParams, sale_quintals: Math.max(0.1, Number.parseFloat(event.target.value) || 0.1) })}
            />
          </label>
          <label className="field">
            <span>{t("storageCostPerDay")}</span>
            <input
              type="number"
              min={0}
              step={10}
              value={sellParams.storage_cost_per_day}
              onChange={(event) => onSellParamsChange({ ...sellParams, storage_cost_per_day: Math.max(0, Number.parseFloat(event.target.value) || 0) })}
            />
          </label>
          <label className="field">
            <span>{t("transportCostTotal")}</span>
            <input
              type="number"
              min={0}
              step={50}
              value={sellParams.transport_cost}
              onChange={(event) => onSellParamsChange({ ...sellParams, transport_cost: Math.max(0, Number.parseFloat(event.target.value) || 0) })}
            />
          </label>
        </div>
        {net ? (
          <div className="sell-optimizer__summary">
            <span>{t("netProfitTotal")}: <strong>{money(net.net_profit_total_rs)}</strong></span>
            {typeof net.spoilage_loss_percent === "number" && net.spoilage_loss_percent > 0 ? (
              <span>{t("spoilageLoss")}: {net.spoilage_loss_percent}% ({net.spoilage_loss_quintals} qtl)</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <PriceCorridor current={currentPrice} low={p10Price} median={p50Price} high={p90Price} label={t("priceCorridor")} />
      {voiceError ? <p className="form-note" role="alert">{voiceError}</p> : null}
      {lastObservedDate || forecast.model_version ? (
        <div className="decision-trust" lang={language}>
          {lastObservedDate ? (
            <span>{t("lastMandiReport").replace("{date}", formatMarketDate(lastObservedDate, language))}</span>
          ) : null}
          {mandiReportIsStale && mandiAgeDays !== null ? (
            <span className="decision-trust--stale" role="note">
              {t("mandiReportStale").replace("{days}", String(mandiAgeDays))}
            </span>
          ) : null}
          {forecast.model_version ? (
            <span>
              {t("modelVersionLabel")}: {forecast.model_version}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="card-footnote">
        <Info size={15} />
        <span>{t("modelDisclaimer")}</span>
      </div>
    </article>
  );
}
