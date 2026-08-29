// Earthline Intelligence: the farmer sees the decision path first; business values render only after live responses.
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Info, Leaf, MapPin, MessageCircle, RefreshCw, ShieldAlert, Sparkles, Volume2 } from "lucide-react";
import { getForecast, getProcurement, getResources, getRisk } from "@/api/client";
import { ForecastChart } from "@/components/data-display/ForecastChart";
import { MandiCombobox } from "./MandiCombobox";
import { StatePanel } from "@/components/feedback/StatePanel";
import { AlertsPanel } from "@/features/home/AlertsPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ApiError, ForecastPoint, ForecastResponse, ProcurementResponse, ResourceEntry, ResourceOption, ResourcesResponse, RiskResponse } from "@/types/api";
import { asApiError, isUnavailable, isValidSelection, toFarmerMessage, type Selection } from "./serviceState";

function forecastPoints(data: ForecastResponse | null): ForecastPoint[] { return data?.forecast ?? data?.forecasts ?? data?.daily_forecast ?? []; }
function money(value: number | undefined) { return typeof value === "number" && Number.isFinite(value) ? `₹${Math.round(value).toLocaleString("en-IN")}` : "—"; }
function formatMetric(value: number | undefined, suffix = "") { return typeof value === "number" && Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}` : "—"; }
function decisionTone(decision: string | undefined) { const text = (decision ?? "").toLowerCase(); return text.includes("sell") || text.includes("बेच") ? "sell" : text.includes("profit") || text.includes("लाभ") ? "profit" : "hold"; }
function percentage(value: number, min: number, max: number) { return Math.max(0, Math.min(100, ((value - min) / Math.max(max - min, 1)) * 100)); }

function LoadingSkeleton({ label }: { label: string }) { return <div className="loading-skeleton" role="status" aria-label={label}><span className="skeleton-line skeleton-line--wide" /><span className="skeleton-line" /><span className="skeleton-line skeleton-line--short" /></div>; }

function PriceCorridor({ current, low, median, high, label }: { current?: number; low?: number; median?: number; high?: number; label: string }) {
  const values = [current, low, median, high].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length < 3 || current === undefined || low === undefined || high === undefined) return null;
  const min = Math.min(...values); const max = Math.max(...values);
  return <div className="corridor" aria-label={label}><div className="corridor-head"><span>{label}</span><strong>₹{Math.round(current).toLocaleString("en-IN")}</strong></div><div className="corridor-track"><span className="corridor-band" /><span className="corridor-marker" style={{ left: `${percentage(current, min, max)}%` }} /></div><div className="corridor-labels"><span>₹{Math.round(low).toLocaleString("en-IN")}</span><span>{median !== undefined ? `₹${Math.round(median).toLocaleString("en-IN")}` : "—"}</span><span>₹{Math.round(high).toLocaleString("en-IN")}</span></div></div>;
}

type ServiceState<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  requestedFor: Selection | null;
};

const emptyState = <T,>(): ServiceState<T> => ({ data: null, error: null, loading: false, requestedFor: null });

export default function HomePage() {
  const { language, t } = useLanguage();
  const [resources, setResources] = useState<ResourcesResponse | null>(null);
  const [resourceError, setResourceError] = useState<ApiError | null>(null);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [commodity, setCommodity] = useState("");
  const [market, setMarket] = useState("");
  const [horizon, setHorizon] = useState(7);
  const [forecastState, setForecastState] = useState<ServiceState<ForecastResponse>>(emptyState);
  const [riskState, setRiskState] = useState<ServiceState<RiskResponse>>(emptyState);
  const [procurementState, setProcurementState] = useState<ServiceState<ProcurementResponse>>(emptyState);
  const [hasRequested, setHasRequested] = useState(false);
  const forecastRequestId = useRef(0);
  const riskRequestId = useRef(0);
  const procurementRequestId = useRef(0);
  const popularCrops = ["Potato", "Onion", "Tomato", "Wheat"];

  const loadResources = async () => {
    setResourceLoading(true); setResourceError(null);
    try { setResources(await getResources()); } catch (error) { setResourceError(asApiError(error)); } finally { setResourceLoading(false); }
  };
  useEffect(() => { void loadResources(); }, []);

  const commodities = useMemo<ResourceOption[]>(() => resources?.commodities ?? [], [resources]);
  const markets = useMemo<ResourceOption[]>(() => (resources?.mandis ?? []).map((item: ResourceEntry) => typeof item === "string" ? { id: item, label: item } : item), [resources]);
  const selectedCommodity = commodities.find((item) => item.id === commodity);
  const selectedMarket = markets.find((item) => item.id === market);
  const hasSelection = Boolean(commodity && market);
  const selection = (): Selection => ({ commodity, market, horizon });
  const validSelection = isValidSelection(selection(), commodities.map((item) => item.id), markets.map((item) => item.id));

  const runForecast = async (current: Selection, id: number) => {
    setForecastState({ data: null, error: null, loading: true, requestedFor: current });
    try {
      const data = await getForecast(current);
      if (forecastRequestId.current === id) setForecastState({ data, error: null, loading: false, requestedFor: current });
    } catch (error) {
      if (forecastRequestId.current === id) setForecastState({ data: null, error: asApiError(error), loading: false, requestedFor: current });
    }
  };

  const runRisk = async (current: Selection, id: number) => {
    setRiskState({ data: null, error: null, loading: true, requestedFor: current });
    try {
      const data = await getRisk(current);
      if (riskRequestId.current === id) setRiskState({ data, error: null, loading: false, requestedFor: current });
    } catch (error) {
      if (riskRequestId.current === id) setRiskState({ data: null, error: asApiError(error), loading: false, requestedFor: current });
    }
  };

  const runProcurement = async (current: Selection, id: number) => {
    setProcurementState({ data: null, error: null, loading: true, requestedFor: current });
    try {
      const data = await getProcurement({ commodity: current.commodity, base_market: current.market });
      if (procurementRequestId.current === id) setProcurementState({ data, error: null, loading: false, requestedFor: current });
    } catch (error) {
      if (procurementRequestId.current === id) setProcurementState({ data: null, error: asApiError(error), loading: false, requestedFor: current });
    }
  };

  const submitForecast = (event?: FormEvent) => {
    event?.preventDefault();
    if (!validSelection) {
      setHasRequested(true);
      setForecastState({ data: null, error: { status: 422, message: "Please choose a valid crop and mandi, then try again." }, loading: false, requestedFor: null });
      return;
    }
    const current = selection();
    const forecastId = ++forecastRequestId.current;
    const riskId = ++riskRequestId.current;
    const procurementId = ++procurementRequestId.current;
    setHasRequested(true);
    void runForecast(current, forecastId);
    void runRisk(current, riskId);
    void runProcurement(current, procurementId);
  };

  const retryForecast = () => { if (validSelection) { const id = ++forecastRequestId.current; void runForecast(selection(), id); } };
  const retryRisk = () => { if (validSelection) { const id = ++riskRequestId.current; void runRisk(selection(), id); } };
  const retryProcurement = () => { if (validSelection) { const id = ++procurementRequestId.current; void runProcurement(selection(), id); } };

  const forecast = forecastState.data;
  const risk = riskState.data;
  const procurement = procurementState.data;
  const displayedSelection = forecastState.requestedFor ?? riskState.requestedFor ?? procurementState.requestedFor;
  const displayedCommodity = commodities.find((item) => item.id === displayedSelection?.commodity) ?? selectedCommodity;
  const displayedMarket = markets.find((item) => item.id === displayedSelection?.market) ?? selectedMarket;
  const points = forecastPoints(forecast);
  const riskRecords = risk?.anomalies ?? risk?.records ?? [];
  const opportunities = procurement?.opportunities ?? procurement?.results ?? [];
  const primaryForecast = points[0];
  const p50Price = forecast?.p50_median_price ?? primaryForecast?.p50_median_price ?? primaryForecast?.price ?? forecast?.current_price;
  const p10Price = forecast?.p10_floor_price ?? primaryForecast?.p10_floor_price;
  const p90Price = forecast?.p90_ceiling_price ?? primaryForecast?.p90_ceiling_price;
  const currentPrice = forecast?.current_price;
  const peakDay = forecast?.peak_day ?? points.find((point) => point.is_peak);
  const tone = decisionTone(forecast?.decision_en ?? forecast?.decision);
  const advisoryDecision = language === "hi" ? forecast?.decision_hi ?? forecast?.decision : forecast?.decision_en ?? forecast?.decision;
  const advisoryText = forecast ? `${displayedCommodity?.label ?? forecast.commodity ?? commodity} ${displayedMarket?.label ?? forecast.market ?? market}. ${advisoryDecision ?? t("seeLiveGuidance")}. ${t("expectedMarketPrice")}: ${money(p50Price)} ${t("quintal")}. ${typeof forecast.expected_gain === "number" ? `${t("expectedGain")}: ${money(forecast.expected_gain)}.` : ""}` : "";
  const speakAdvisory = () => { if (!("speechSynthesis" in window) || !advisoryText) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(advisoryText); utterance.lang = language === "hi" ? "hi-IN" : "en-IN"; utterance.rate = 0.9; window.speechSynthesis.speak(utterance); };
  const shareAdvisory = () => { if (!advisoryText) return; window.open(`https://wa.me/?text=${encodeURIComponent(advisoryText)}`, "_blank", "noopener,noreferrer"); };

  const recordsAnalyzed = risk?.total_records_analyzed ?? risk?.records_analyzed;
  const anomaliesCount = risk?.total_anomalies_detected ?? risk?.anomalies_detected ?? riskRecords.length;
  const resourceUnavailable = isUnavailable(resourceError);

  const serviceErrorPanel = (service: "forecast" | "risk" | "procurement", state: ServiceState<unknown>, retry: () => void) => {
    if (!state.error) return null;
    const unavailable = isUnavailable(state.error);
    return <StatePanel kind="error" title={unavailable ? `${service === "risk" ? "Market risk" : service === "procurement" ? "Mandi comparison" : "Forecast"} temporarily unavailable` : `We could not load ${service === "risk" ? "market risk" : service === "procurement" ? "mandi comparison" : "this forecast"}`} message={toFarmerMessage(state.error, service)} actionLabel={t("retry")} onAction={retry} />;
  };

  return (
    <div className="page-content" id="home">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow"><Sparkles size={15} /> {t("liveMandiIntelligence")}</p><h1 id="hero-title">{t("checkCropMarket")}</h1><p>{t("chooseCropMandi")}</p></div>
        <div className="crop-chips" aria-label={t("popularCrops")}>
          <span className="chip-label">{t("popularCrops")}</span>
          {popularCrops.map((cropId) => {
            const crop = commodities.find((item) => item.id === cropId);
            return crop ? <button className={`crop-chip${commodity === crop.id ? " crop-chip--active" : ""}`} key={crop.id} type="button" onClick={() => { setCommodity(crop.id); window.setTimeout(() => document.querySelector<HTMLButtonElement>("[data-mandi-combobox] .combobox-trigger")?.click(), 120); }} disabled={resourceLoading || !!resourceError}>{crop.label}</button> : null;
          })}
        </div>
        <form className="market-form" onSubmit={submitForecast}>
          <label className="field"><span>{t("crop")}</span><span className="select-wrap"><Leaf size={18} /><select value={commodity} onChange={(event) => setCommodity(event.target.value)} disabled={resourceLoading || !!resourceError} aria-label={t("crop")}><option value="">{t("selectCrop")}</option>{commodities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={17} /></span></label>
          <label className="field"><span>{t("mandi")}</span><MandiCombobox items={markets} value={market} onChange={setMarket} disabled={resourceLoading || !!resourceError} /></label>
          <label className="field"><span>{t("forecastDays")}</span><span className="select-wrap"><CalendarDays size={18} /><select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} aria-label={t("forecastDays")}>{[1, 3, 7, 14].map((days) => <option key={days} value={days}>{days} {t("days")}</option>)}</select><ChevronDown size={17} /></span></label>
          <button className={`primary-button${hasSelection && validSelection ? " primary-button--ready" : ""}`} type="submit" disabled={!hasSelection || resourceLoading || forecastState.loading}><span>{forecastState.loading ? t("checkingLiveMarket") : t("checkTodaysMarket")}</span><ArrowRight size={18} /></button>
        </form>
        {resourceLoading ? <p className="form-note">{t("loadingChoices")}</p> : null}
        {resourceError ? <StatePanel kind="error" title={resourceUnavailable ? t("liveServiceUnavailable") : t("couldNotLoadChoices")} message={resourceUnavailable ? t("liveChoicesUnavailable") : t("couldNotLoadChoicesMessage")} actionLabel={t("retry")} onAction={() => void loadResources()} /> : null}
      </section>

      <section className="result-section" aria-live="polite" lang={language}>
        {!hasRequested ? (
          <div className="onboarding-guide">
            <div className="guide-header">
              <span className="guide-badge"><Sparkles size={15} /> {language === "en" ? "Live Mandi Intelligence" : "लाइव मंडी इंटेलिजेंस"}</span>
              <h3>{language === "en" ? "Get the Best Price for Your Crop — in 3 Steps" : "3 आसान कदमों में अपनी फसल का सबसे अच्छा भाव पाएँ"}</h3>
              <p>{language === "en" ? "Choose your crop and nearest market above. We'll tell you the best day and the best place to sell." : "ऊपर अपनी फसल और नज़दीकी मंडी चुनें — हम आपको बताएँगे कि कब और कहाँ बेचना सबसे फायदेमंद है।"}</p>
            </div>
            <div className="guide-steps">
              <div className="guide-step">
                <div className="guide-step-icon">1</div>
                <div>
                  <strong>{language === "en" ? "Choose Your Crop & Market" : "फसल और मंडी चुनें"}</strong>
                  <p>{language === "en" ? "Select from crops like Potato, Onion, Tomato — then pick the nearest mandi to you." : "आलू, प्याज, टमाटर जैसी फसल चुनें — फिर अपनी नज़दीकी मंडी चुनें।"}</p>
                </div>
              </div>
              <div className="guide-step">
                <div className="guide-step-icon">2</div>
                <div>
                  <strong>{language === "en" ? "See Prices for the Next 7 Days" : "अगले 7 दिन के भाव देखें"}</strong>
                  <p>{language === "en" ? "Find out which day prices will be highest — so you know the best time to sell." : "जानें किस दिन सबसे ज़्यादा भाव मिलेगा — ताकि आप सही समय पर बेच सकें।"}</p>
                </div>
              </div>
              <div className="guide-step">
                <div className="guide-step-icon">3</div>
                <div>
                  <strong>{language === "en" ? "Should You Sell Today or Wait?" : "आज बेचें या रुकें?"}</strong>
                  <p>{language === "en" ? "Get a clear \"Sell Now\" or \"Wait\" advice, plus which nearby mandi gives you a better price." : "सीधी सलाह — अभी बेचें या रुकें, और कौन सी मंडी में ज़्यादा पैसा मिलेगा।"}</p>
                </div>
              </div>
            </div>

          </div>
        ) : null}
        {hasRequested && forecastState.error ? serviceErrorPanel("forecast", forecastState, retryForecast) : null}
        {hasRequested && forecastState.loading ? <LoadingSkeleton label={t("checkForecast")} /> : null}
        {hasRequested && (forecast || risk || procurement || riskState.loading || procurementState.loading || riskState.error || procurementState.error) ? <>
          {forecast ? <div className="result-intro"><div><p className="eyebrow"><span className="eyebrow-dot" /> {t("liveResponse")}</p><h2>{displayedCommodity?.label ?? forecast.commodity ?? t("selectCrop")}<span className="result-context">{displayedMarket?.label ?? forecast.market ?? t("selectMandi")}</span></h2></div><button className="quiet-button" type="button" onClick={retryForecast}><RefreshCw size={16} /> {t("refreshForecast")}</button></div> : null}
          <div className="result-grid" aria-live="polite">
            {forecast ? <article className={`decision-card decision-card--${tone}`}><div className="decision-heading"><div className="card-kicker">{t("todaysDecision")}</div><div className="decision-actions"><button className="icon-button" type="button" onClick={speakAdvisory} aria-label={t("voiceAdvisory")} title={t("voiceAdvisory")}><Volume2 size={17} /></button><button className="icon-button" type="button" onClick={shareAdvisory} aria-label={t("shareWhatsapp")} title={t("shareWhatsapp")}><MessageCircle size={17} /></button></div></div><div className="decision-main"><div><span className="muted-label">{t("expectedMarketPrice")}</span><strong className="price-value">{money(p50Price)} <small>{t("quintal")}</small></strong><span className="muted-label">{t("likelyRange")}</span><strong className="range-value">{p10Price !== undefined && p90Price !== undefined ? `${money(p10Price)} – ${money(p90Price)}` : money(forecast.current_price)}</strong>{typeof forecast.expected_gain === "number" ? <span className="gain-badge">{forecast.expected_gain >= 0 ? "+" : ""}{money(forecast.expected_gain)} {t("expectedGain")}</span> : null}</div><div className="action-block"><span className="muted-label">{t("suggestedAction")}</span><strong>{forecast.decision_en ?? forecast.decision ?? t("seeLiveGuidance")}</strong>{forecast.decision_hi ? <p lang="hi">{forecast.decision_hi}</p> : null}{forecast.confidence ? <span className="muted-label">{forecast.confidence}</span> : null}{tone === "sell" ? <p className="decision-hint">{t("sellUrgency")}</p> : null}</div></div><PriceCorridor current={currentPrice} low={p10Price} median={p50Price} high={p90Price} label={t("priceCorridor")} /><div className="card-footnote"><Info size={15} /> {t("modelDisclaimer")}</div></article> : null}
            {forecast ? <article className="forecast-card" id="forecast"><div className="card-kicker">{t("nextDays")} {forecast.forecast_horizon_days ?? forecast.horizon ?? horizon} {t("days")}</div><div className="chart-legend"><span className="legend-line" /> {t("expectedPrice")} <span className="legend-band" /> {t("likelyRangeLegend")}</div>{points.length >= 2 ? <ForecastChart points={points} /> : <StatePanel kind="empty" title={t("forecastPointsMissing")} message={t("notEnoughPoints")} actionLabel={t("retry")} onAction={retryForecast} />}</article> : null}
            {riskState.loading ? <article className="support-card" id="risk"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><div><span className="card-kicker">{t("checkingMarketRisk")}</span><LoadingSkeleton label={t("reviewingMovement")} /></div></article> : null}
            {riskState.error ? <article className="support-card" id="risk"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><div>{serviceErrorPanel("risk", riskState, retryRisk)}</div></article> : null}
            {risk ? <article className="support-card" id="risk"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><div><span className="card-kicker">{t("marketWarning")}</span>{riskRecords.length ? <><h3>{anomaliesCount} {t("returnedWarningRecords")}</h3><p>{risk.message ?? t("noRiskWarnings")}</p><div className="mini-metrics"><span>{t("recordsAnalyzed")} <strong>{recordsAnalyzed ?? "—"}</strong></span><span>{t("latestMovement")} <strong>{riskRecords[0] ? formatMetric(riskRecords[0].price_velocity_7d, "%") : "—"}</strong></span></div></> : <><h3>{t("noWarningRecords")}</h3><p>{risk.message ?? t("noRiskWarnings")}</p></>}</div></article> : null}
            {procurementState.loading ? <article className="support-card" id="mandi"><div className="support-icon"><MapPin size={20} /></div><div><span className="card-kicker">{t("checkingMandiPrices")}</span><LoadingSkeleton label={t("comparingMarkets")} /></div></article> : null}
            {procurementState.error ? <article className="support-card" id="mandi"><div className="support-icon"><MapPin size={20} /></div><div>{serviceErrorPanel("procurement", procurementState, retryProcurement)}</div></article> : null}
            {procurement ? <article className="support-card" id="mandi"><div className="support-icon"><MapPin size={20} /></div><div className="opportunity-content"><div className="card-kicker">{t("bestMandiLabel")}</div>{opportunities.length ? <><h3>{opportunities.length} {t("liveOpportunities")}</h3><div className="opportunity-list">{opportunities.slice(0, 3).map((opportunity, index) => <div className="opportunity-row" key={`${opportunity.destination_market ?? "mandi"}-${index}`}><span className="rank-badge">{index + 1}</span><div><strong>{opportunity.destination_market ?? t("mandi")}</strong><small>{opportunity.recommendation ?? t("farmerMandiGuidance")}</small></div><strong className="opportunity-gain">{money(opportunity.gross_price_difference)}<small> {t("grossDifference")}</small></strong></div>)}</div></> : <><h3>{t("noOpportunity")}</h3><p>{procurement.message ?? t("noBetterOpportunity")}</p></>}<small className="disclaimer">{procurement.disclaimer ?? t("modelDisclaimer")}</small></div></article> : null}
          </div>
        </> : null}
      </section>
      <AlertsPanel commodity={commodity} market={market} />
      <section className="trust-strip">
        <span><ShieldAlert size={18} /> {language === "en" ? "Transparent price ranges" : "पारदर्शी कीमत सीमा"}</span>
        <span><Leaf size={18} /> {language === "en" ? "Live backend data" : "लाइव बैकएंड डेटा"}</span>
        <span><Info size={18} /> {language === "en" ? "Farmer-first guidance" : "किसान-प्रथम सलाह"}</span>
      </section>
      <section className="sr-only" id="risk-details" aria-label={t("marketRisk")}><h2>{t("marketRisk")}</h2></section>
      <section className="sr-only" id="mandi-details" aria-label={t("bestMandi")}><h2>{t("bestMandi")}</h2></section>
      <section className="sr-only" id="account" aria-label={t("account")}><h2>{t("account")}</h2></section>
    </div>
  );
}
