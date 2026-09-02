import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { MapPin, Truck } from "lucide-react";
import { StatePanel } from "@/components/feedback/StatePanel";
import { LoadingSkeleton } from "@/features/home/LoadingSkeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { farmerMandiGainLabel, farmerMandiNetGainLabel } from "@/lib/farmerCopy";
import { money } from "@/lib/format";
import type { ProcurementOpportunity, ProcurementResponse } from "@/types/api";
import type { ReactNode } from "react";

const TRANSPORT_KEY = "croplens_transport_cost";
const QUINTALS_KEY = "croplens_sale_quintals";

type MandiWorkspaceProps = {
  isAuthenticated: boolean;
  loading: boolean;
  errorPanel: ReactNode;
  procurement: ProcurementResponse | null;
  opportunities: ProcurementOpportunity[];
  baseMarketLabel?: string;
};

function readStoredNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const parsed = raw === null ? fallback : Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function netGainPerQuintal(gross: number | undefined, transportCost: number, quintals: number): number | null {
  if (typeof gross !== "number" || !Number.isFinite(gross)) return null;
  if (!transportCost || quintals <= 0) return gross;
  return gross - transportCost / quintals;
}

export function MandiWorkspace({
  isAuthenticated,
  loading,
  errorPanel,
  procurement,
  opportunities,
  baseMarketLabel,
}: MandiWorkspaceProps) {
  const { t } = useLanguage();
  const [transportCost, setTransportCost] = useState(0);
  const [quintals, setQuintals] = useState(10);
  const farmerCopy = { mandiMoreGain: t("mandiMoreGain"), mandiNetGain: t("mandiNetGain"), mandiNotWorth: t("mandiNotWorth") };

  useEffect(() => {
    setTransportCost(readStoredNumber(TRANSPORT_KEY, 0));
    setQuintals(readStoredNumber(QUINTALS_KEY, 10) || 10);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TRANSPORT_KEY, String(transportCost));
  }, [transportCost]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(QUINTALS_KEY, String(quintals));
  }, [quintals]);

  const ranked = useMemo(() => {
    const useNet = transportCost > 0 && quintals > 0;
    return [...opportunities]
      .sort((left, right) => {
        const leftValue = useNet
          ? netGainPerQuintal(left.gross_price_difference, transportCost, quintals) ?? Number.NEGATIVE_INFINITY
          : left.gross_price_difference ?? Number.NEGATIVE_INFINITY;
        const rightValue = useNet
          ? netGainPerQuintal(right.gross_price_difference, transportCost, quintals) ?? Number.NEGATIVE_INFINITY
          : right.gross_price_difference ?? Number.NEGATIVE_INFINITY;
        return rightValue - leftValue;
      })
      .slice(0, 5);
  }, [opportunities, transportCost, quintals]);

  const bestNet = ranked.length && transportCost > 0 && quintals > 0
    ? netGainPerQuintal(ranked[0].gross_price_difference, transportCost, quintals)
    : null;

  if (!isAuthenticated) {
    return (
      <article className="support-card gated-card mandi-workspace" id="mandi">
        <div className="support-icon">
          <MapPin size={20} />
        </div>
        <div>
          <span className="card-kicker">{t("bestMandiLabel")}</span>
          <h3>{t("bestMandi")}</h3>
          <p>{t("signInForMandi")}</p>
          <Link className="primary-button alert-link" href="/auth">
            {t("loginOrCreate")}
          </Link>
        </div>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="support-card mandi-workspace" id="mandi">
        <div className="support-icon">
          <MapPin size={20} />
        </div>
        <div>
          <span className="card-kicker">{t("checkingMandiPrices")}</span>
          <LoadingSkeleton label={t("comparingMarkets")} />
        </div>
      </article>
    );
  }

  if (errorPanel) {
    return (
      <article className="support-card mandi-workspace" id="mandi">
        <div className="support-icon">
          <MapPin size={20} />
        </div>
        <div>{errorPanel}</div>
      </article>
    );
  }

  if (!procurement) return null;

  return (
    <article className="support-card mandi-workspace" id="mandi">
      <div className="support-icon">
        <MapPin size={20} />
      </div>
      <div className="mandi-workspace__content">
        <div className="card-kicker">{t("bestMandiLabel")}</div>
        {baseMarketLabel ? <p className="mandi-workspace__base">{t("mandiComparedFrom")} <strong>{baseMarketLabel}</strong></p> : null}
        {ranked.length ? (
          <>
            <h3>{t("mandiOthersPayingMore")}</h3>
            <p>{t("farmerMandiGuidance")}</p>
            <div className="mandi-transport-fields">
              <label className="field">
                <span>{t("transportCost")}</span>
                <span className="transport-input-wrap">
                  <Truck size={17} aria-hidden />
                  <input
                    type="number"
                    min={0}
                    step={50}
                    inputMode="numeric"
                    value={transportCost || ""}
                    placeholder="0"
                    onChange={(event) => setTransportCost(Math.max(0, Number(event.target.value) || 0))}
                    aria-label={t("transportCost")}
                  />
                </span>
                <small className="field-hint">{t("transportCostHint")}</small>
              </label>
              <label className="field">
                <span>{t("saleQuintals")}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={quintals}
                  onChange={(event) => setQuintals(Math.max(1, Number(event.target.value) || 1))}
                  aria-label={t("saleQuintals")}
                />
                <small className="field-hint">{t("saleQuintalsHint")}</small>
              </label>
            </div>
            {bestNet !== null ? (
              <p className={`mandi-trip-verdict${bestNet > 0 ? " mandi-trip-verdict--positive" : " mandi-trip-verdict--negative"}`} role="status">
                {bestNet > 0 ? t("mandiWorthTrip").replace("{amount}", money(Math.round(bestNet))) : t("mandiNotWorthTrip")}
              </p>
            ) : null}
            <div className="mandi-table" role="table" aria-label={t("mandiOthersPayingMore")}>
              <div className="mandi-table__head" role="row">
                <span role="columnheader">#</span>
                <span role="columnheader">{t("mandi")}</span>
                <span role="columnheader">{t("mandiExtraPerQuintal")}</span>
                {transportCost > 0 ? <span role="columnheader">{t("mandiNetPerQuintal")}</span> : null}
              </div>
              {ranked.map((opportunity, index) => {
                const gross = opportunity.gross_price_difference;
                const net = netGainPerQuintal(gross, transportCost, quintals);
                return (
                  <div className="mandi-table__row" role="row" key={`${opportunity.destination_market ?? "mandi"}-${index}`}>
                    <span className="rank-badge" role="cell">{index + 1}</span>
                    <strong role="cell">{opportunity.destination_market ?? t("mandi")}</strong>
                    <span className="mandi-table__gross" role="cell">
                      <small className="mandi-metric-label">{t("mandiExtraPerQuintal")}</small>
                      {farmerMandiGainLabel(gross, farmerCopy)}
                    </span>
                    {transportCost > 0 ? (
                      <span className={`mandi-table__net${net !== null && net <= 0 ? " mandi-table__net--negative" : ""}`} role="cell">
                        <small className="mandi-metric-label">{t("mandiNetPerQuintal")}</small>
                        {farmerMandiNetGainLabel(net, farmerCopy)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h3>{t("noOpportunity")}</h3>
            <p>{procurement.message ?? t("noBetterOpportunity")}</p>
          </>
        )}
        <small className="disclaimer">{procurement.disclaimer ?? t("modelDisclaimer")}</small>
      </div>
    </article>
  );
}
