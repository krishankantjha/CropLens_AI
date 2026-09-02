import { Info, MessageCircle, Volume2 } from "lucide-react";
import { DecisionBadge } from "./DecisionBadge";
import { PriceCorridor } from "./PriceCorridor";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ForecastPoint, ForecastResponse } from "@/types/api";
import { farmerDecisionText, farmerGainMessage, farmerTrustLabel } from "@/lib/farmerCopy";
import { formatDataAsOf, money, pointLabel, type DecisionTone } from "@/lib/format";

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
  dataAsOf?: Date | null;
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
  dataAsOf,
}: DecisionHeroCardProps) {
  const { t } = useLanguage();
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
          {tone === "sell" ? <p className="decision-hint">{t("sellUrgency")}</p> : null}
        </div>
      </div>
      <PriceCorridor current={currentPrice} low={p10Price} median={p50Price} high={p90Price} label={t("priceCorridor")} />
      {voiceError ? <p className="form-note" role="alert">{voiceError}</p> : null}
      {dataAsOf || forecast.model_version ? (
        <div className="decision-trust" lang={language}>
          {dataAsOf ? <span>{t("dataAsOf").replace("{datetime}", formatDataAsOf(dataAsOf, language))}</span> : null}
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
