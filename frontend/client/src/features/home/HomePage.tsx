import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, ChevronDown, Info, Leaf, MapPin, MessageCircle, RefreshCw, ShieldAlert, Sparkles, Volume2 } from "lucide-react";
import { getForecast, getProcurement, getResources, getRisk } from "@/api/client";
const ForecastChart = lazy(() => import("@/components/data-display/ForecastChart").then(({ ForecastChart: Chart }) => ({ default: Chart })));
import { MandiCombobox } from "./MandiCombobox";
import { StatePanel } from "@/components/feedback/StatePanel";
import { AlertsPanel } from "@/features/home/AlertsPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import type { ApiError, ForecastPoint, ForecastResponse, ProcurementResponse, ResourceEntry, ResourceOption, ResourcesResponse, RiskResponse } from "@/types/api";
import { asApiError, isUnavailable, isValidSelection, toFarmerMessage, type Selection } from "./serviceState";

function forecastPoints(data: ForecastResponse | null): ForecastPoint[] { return data?.forecasts ?? []; }
function money(value: number | undefined) { return typeof value === "number" && Number.isFinite(value) ? `₹${Math.round(value).toLocaleString("en-IN")}` : "—"; }
function formatVelocity(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value > 0 ? "+" : ""}₹${Math.round(value).toLocaleString("en-IN")}` : "—";
}
function decisionTone(decision: string | undefined) {
  const text = (decision ?? "").toLowerCase();
  return text.includes("sell") || text.includes("बेच") ? "sell" : text.includes("profit") || text.includes("लाभ") ? "profit" : "hold";
}
function percentage(value: number, min: number, max: number) { return Math.max(0, Math.min(100, ((value - min) / Math.max(max - min, 1)) * 100)); }
function pointLabel(point: ForecastPoint, language: string, fallback: string) {
  return language === "hi" ? point.day_name_hi ?? point.day_name ?? point.day ?? point.date ?? fallback : point.day_name ?? point.day ?? point.date ?? fallback;
}

function LoadingSkeleton({ label }: { label: string }) {
  return <div className="loading-skeleton" role="status" aria-label={label}><span className="skeleton-line skeleton-line--wide" /><span className="skeleton-line" /><span className="skeleton-line skeleton-line--short" /></div>;
}

const PriceCorridor = memo(function PriceCorridor({ current, low, median, high, label }: { current?: number; low?: number; median?: number; high?: number; label: string }) {
  const values = [current, low, median, high].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length < 3 || current === undefined || low === undefined || high === undefined) return null;
  const min = Math.min(...values); const max = Math.max(...values);
  return (
    <div className="corridor" aria-label={label}>
      <div className="corridor-head"><span>{label}</span><strong>₹{Math.round(current).toLocaleString("en-IN")}</strong></div>
      <div className="corridor-track"><span className="corridor-band" /><span className="corridor-marker" style={{ left: `${percentage(current, min, max)}%` }} /></div>
      <div className="corridor-labels"><span>₹{Math.round(low).toLocaleString("en-IN")}</span><span>{median !== undefined ? `₹${Math.round(median).toLocaleString("en-IN")}` : "—"}</span><span>₹{Math.round(high).toLocaleString("en-IN")}</span></div>
    </div>
  );
});

type ServiceState<T> = { data: T | null; error: ApiError | null; loading: boolean; requestedFor: Selection | null };
const emptyState = <T,>(): ServiceState<T> => ({ data: null, error: null, loading: false, requestedFor: null });

export default function HomePage() {
  const { language, t } = useLanguage();
  const { isAuthenticated, isSessionReady, user } = useSession();
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
  const [voiceError, setVoiceError] = useState("");
  const [mandiFocusRequest, setMandiFocusRequest] = useState(0);
  const preferencesApplied = useRef(false);
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

  useEffect(() => {
    if (preferencesApplied.current || !isSessionReady || !user || !commodities.length || !markets.length) return;
    const preferredCrop = commodities.find((item) => item.id === user.preferred_commodity);
    const preferredMandi = markets.find((item) => item.id === user.home_mandi);
    if (preferredCrop && !commodity) setCommodity(preferredCrop.id);
    if (preferredMandi && !market) setMarket(preferredMandi.id);
    preferencesApplied.current = true;
  }, [isSessionReady, user, commodities, markets, commodity, market]);

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
      const data = await getRisk(current, { notifyUnauthorized: false });
      if (riskRequestId.current === id) setRiskState({ data, error: null, loading: false, requestedFor: current });
    } catch (error) {
      if (riskRequestId.current === id) setRiskState({ data: null, error: asApiError(error), loading: false, requestedFor: current });
    }
  };

  const runProcurement = async (current: Selection, id: number) => {
    setProcurementState({ data: null, error: null, loading: true, requestedFor: current });
    try {
      const data = await getProcurement({ commodity: current.commodity, base_market: current.market }, { notifyUnauthorized: false });
      if (procurementRequestId.current === id) setProcurementState({ data, error: null, loading: false, requestedFor: current });
    } catch (error) {
      if (procurementRequestId.current === id) setProcurementState({ data: null, error: asApiError(error), loading: false, requestedFor: current });
    }
  };

  const submitForecast = (event?: FormEvent) => {
    event?.preventDefault();
    if (!validSelection) {
      setHasRequested(true);
      setForecastState({ data: null, error: { status: 422, message: t("invalidSelection") }, loading: false, requestedFor: null });
      return;
    }
    const current = selection();
    const forecastId = ++forecastRequestId.current;
    setHasRequested(true);
    void runForecast(current, forecastId);
    if (isAuthenticated) {
      void runRisk(current, ++riskRequestId.current);
      void runProcurement(current, ++procurementRequestId.current);
    } else {
      setRiskState(emptyState());
      setProcurementState(emptyState());
    }
  };

  const retryForecast = () => { if (validSelection) { const id = ++forecastRequestId.current; void runForecast(selection(), id); } };
  const retryRisk = () => { if (validSelection && isAuthenticated) { const id = ++riskRequestId.current; void runRisk(selection(), id); } };
  const retryProcurement = () => { if (validSelection && isAuthenticated) { const id = ++procurementRequestId.current; void runProcurement(selection(), id); } };
  const retryAll = () => submitForecast();

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
  const tone = decisionTone(forecast?.decision_en ?? forecast?.decision_hi ?? forecast?.decision);
  const advisoryDecision = language === "hi" ? forecast?.decision_hi ?? forecast?.decision_en ?? forecast?.decision : forecast?.decision_en ?? forecast?.decision;
  const secondaryDecision = language === "hi" ? forecast?.decision_en : forecast?.decision_hi;
  const advisoryText = forecast ? `${displayedCommodity?.label ?? forecast.commodity ?? commodity} ${displayedMarket?.label ?? forecast.market ?? market}. ${advisoryDecision ?? t("seeLiveGuidance")}. ${t("expectedMarketPrice")}: ${money(p50Price)} ${t("quintal")}. ${typeof forecast.expected_gain === "number" ? `${t("expectedGain")}: ${money(forecast.expected_gain)}.` : ""}` : "";
  const voiceSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  const speakAdvisory = () => {
    setVoiceError("");
    if (!voiceSupported) { setVoiceError(t("voiceUnavailable")); return; }
    if (!advisoryText) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(advisoryText);
      utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = 0.9;
      utterance.onerror = () => setVoiceError(t("voiceFailed"));
      window.speechSynthesis.speak(utterance);
    } catch { setVoiceError(t("voiceFailed")); }
  };
  const shareAdvisory = () => { if (!advisoryText) return; window.open(`https://wa.me/?text=${encodeURIComponent(advisoryText)}`, "_blank", "noopener,noreferrer"); };

  const recordsAnalyzed = risk?.total_records_analyzed;
  const anomaliesCount = risk?.total_anomalies_detected ?? riskRecords.length;
  const resourceUnavailable = isUnavailable(resourceError);

  const serviceErrorPanel = (service: "forecast" | "risk" | "procurement", state: ServiceState<unknown>, retry: () => void) => {
    if (!state.error) return null;
    const unavailable = isUnavailable(state.error);
    return <StatePanel kind="error" title={unavailable ? t("serviceUnavailableTitle") : t("serviceCouldNotLoadTitle")} message={toFarmerMessage(state.error, service, { invalidSelection: t("invalidSelection"), unavailable: t("serviceUnavailable"), serviceTrouble: t("serviceTrouble"), couldNotLoad: t("serviceCouldNotLoad") })} actionLabel={t("retry")} onAction={retry} />;
  };

  return (
    <div className="page-content" id="home">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={15} /> {t("liveMandiIntelligence")}</p>
          <h1 id="hero-title">{t("checkCropMarket")}</h1>
          <p>{t("chooseCropMandi")}</p>
        </div>
        <div className="crop-chips" aria-label={t("popularCrops")}>
          <span className="chip-label">{t("popularCrops")}</span>
          {popularCrops.map((cropId) => {
            const crop = commodities.find((item) => item.id === cropId);
            return crop ? <button className={`crop-chip${commodity === crop.id ? " crop-chip--active" : ""}`} key={crop.id} type="button" onClick={() => { setCommodity(crop.id); setMandiFocusRequest((request) => request + 1); }} disabled={resourceLoading || !!resourceError} aria-pressed={commodity === crop.id}>{crop.label}</button> : null;
          })}
        </div>
        <form className="market-form" onSubmit={submitForecast}>
          <label className="field"><span>{t("crop")}</span><span className="select-wrap"><Leaf size={18} /><select value={commodity} onChange={(event) => setCommodity(event.target.value)} disabled={resourceLoading || !!resourceError} aria-label={t("crop")}><option value="">{t("selectCrop")}</option>{commodities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={17} /></span></label>
          <label className="field"><span>{t("mandi")}</span><MandiCombobox items={markets} value={market} onChange={setMarket} disabled={resourceLoading || !!resourceError} focusRequest={mandiFocusRequest} /></label>
          <label className="field"><span>{t("forecastDays")}</span><span className="select-wrap"><CalendarDays size={18} /><select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} aria-label={t("forecastDays")}>{[1, 3, 7, 14].map((days) => <option key={days} value={days}>{days} {t("days")}</option>)}</select><ChevronDown size={17} /></span></label>
          <button className={`primary-button${hasSelection && validSelection ? " primary-button--ready" : ""}`} type="submit" disabled={!hasSelection || resourceLoading || forecastState.loading}><span>{forecastState.loading ? t("checkingLiveMarket") : t("checkTodaysMarket")}</span><ArrowRight size={18} /></button>
        </form>
        {resourceLoading ? <p className="form-note">{t("loadingChoices")}</p> : null}
        {resourceError ? <StatePanel kind="error" title={resourceUnavailable ? t("liveServiceUnavailable") : t("couldNotLoadChoices")} message={resourceUnavailable ? t("liveChoicesUnavailable") : t("couldNotLoadChoicesMessage")} actionLabel={t("retry")} onAction={() => void loadResources()} /> : null}
      </section>

      <span id="forecast" className="section-anchor" />
      <span id="risk" className="section-anchor" />
      <span id="mandi" className="section-anchor" />

      <section className="result-section" aria-live="polite" lang={language}>
        {!hasRequested ? (
          <div className="onboarding-guide">
            <div className="guide-header">
              <span className="guide-badge"><Sparkles size={15} /> {t("liveMandiIntelligence")}</span>
              <h3>{t("onboardingTitle")}</h3>
              <p>{t("onboardingIntro")}</p>
            </div>
            <div className="guide-steps">
              <div className="guide-step"><div className="guide-step-icon">1</div><div><strong>{t("chooseCropTitle")}</strong><p>{t("chooseCropDescription")}</p></div></div>
              <div className="guide-step"><div className="guide-step-icon">2</div><div><strong>{t("seePricesTitle")}</strong><p>{t("seePricesDescription")}</p></div></div>
              <div className="guide-step"><div className="guide-step-icon">3</div><div><strong>{t("getAdviceTitle")}</strong><p>{t("getAdviceDescription")}</p></div></div>
            </div>
          </div>
        ) : null}
        {hasRequested && forecastState.error ? serviceErrorPanel("forecast", forecastState, retryForecast) : null}
        {hasRequested && forecastState.loading ? <LoadingSkeleton label={t("checkForecast")} /> : null}
        {hasRequested && (forecast || risk || procurement || riskState.loading || procurementState.loading || riskState.error || procurementState.error || !isAuthenticated) ? <>
          {forecast ? (
            <div className="result-intro">
              <div>
                <p className="eyebrow"><span className="eyebrow-dot" /> {t("liveResponse")}</p>
                <h2>{displayedCommodity?.label ?? forecast.commodity ?? t("selectCrop")}<span className="result-context">{displayedMarket?.label ?? forecast.market ?? t("selectMandi")}</span></h2>
              </div>
              <button className="quiet-button" type="button" onClick={retryAll}><RefreshCw size={16} /> {t("refreshAll")}</button>
            </div>
          ) : null}
          <div className="result-grid" aria-live="polite">
            {forecast ? (
              <article className={`decision-card decision-card--${tone}`}>
                <div className="decision-heading">
                  <div className="card-kicker">{t("todaysDecision")}</div>
                  <div className="decision-actions">
                    <button className="icon-button-quiet" type="button" onClick={speakAdvisory} aria-label={voiceSupported ? t("voiceAdvisory") : t("voiceUnavailable")} disabled={!voiceSupported || !advisoryText}><Volume2 size={17} /></button>
                    <button className="icon-button-quiet" type="button" onClick={shareAdvisory} aria-label={t("shareWhatsapp")}><MessageCircle size={17} /></button>
                  </div>
                </div>
                <div className="decision-main">
                  <div>
                    <span className="muted-label">{t("expectedMarketPrice")}</span>
                    <strong className="price-value">{money(p50Price)} <small>{t("quintal")}</small></strong>
                    <span className="muted-label">{t("likelyRange")}</span>
                    <strong className="range-value">{p10Price !== undefined && p90Price !== undefined ? `${money(p10Price)} – ${money(p90Price)}` : money(forecast.current_price)}</strong>
                    {typeof forecast.expected_gain === "number" ? <span className="gain-badge">{forecast.expected_gain >= 0 ? "+" : ""}{money(forecast.expected_gain)} {t("expectedGain")}</span> : null}
                  </div>
                  <div className="action-block">
                    <span className="muted-label">{t("suggestedAction")}</span>
                    <strong>{advisoryDecision ?? t("seeLiveGuidance")}</strong>
                    {secondaryDecision ? <p lang={language === "hi" ? "en" : "hi"}>{secondaryDecision}</p> : null}
                    {forecast.confidence ? <span className="muted-label">{forecast.confidence}</span> : null}
                    {peakDay ? <span className="peak-chip">{t("bestDay")}: {pointLabel(peakDay, language, t("day"))}</span> : null}
                    {tone === "sell" ? <p className="decision-hint">{t("sellUrgency")}</p> : null}
                  </div>
                </div>
                <PriceCorridor current={currentPrice} low={p10Price} median={p50Price} high={p90Price} label={t("priceCorridor")} />
                {voiceError ? <p className="form-note" role="alert">{voiceError}</p> : null}
                <div className="card-footnote"><Info size={15} /> {t("modelDisclaimer")}</div>
              </article>
            ) : null}
            {forecast ? (
              <article className="forecast-card">
                <div className="card-kicker">{t("nextDays")} {forecast.forecast_horizon_days ?? forecast.horizon ?? horizon} {t("days")}</div>
                <div className="chart-legend"><span className="legend-line" /> {t("expectedPrice")} <span className="legend-band" /> {t("likelyRangeLegend")}</div>
                {points.length >= 2 ? (
                  <Suspense fallback={<LoadingSkeleton label={t("checkingLiveMarket")} />}><ForecastChart points={points} /></Suspense>
                ) : points.length === 1 ? (
                  <div className="single-day-outlook">
                    <span className="muted-label">{t("singleDayOutlook")}</span>
                    <strong>{money(points[0].p50_median_price ?? points[0].price)}</strong>
                    <p>{pointLabel(points[0], language, `${t("day")} 1`)} · {t("likelyRange")}: {money(points[0].p10_floor_price)} – {money(points[0].p90_ceiling_price)}</p>
                  </div>
                ) : (
                  <StatePanel kind="empty" title={t("forecastPointsMissing")} message={t("notEnoughPoints")} actionLabel={t("retry")} onAction={retryForecast} />
                )}
              </article>
            ) : null}

            {!isAuthenticated ? (
              <article className="support-card gated-card">
                <div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div>
                <div>
                  <span className="card-kicker">{t("marketWarning")}</span>
                  <h3>{t("marketRisk")}</h3>
                  <p>{t("signInForRisk")}</p>
                  <Link className="primary-button alert-link" href="/auth">{t("loginOrCreate")}</Link>
                </div>
              </article>
            ) : null}
            {isAuthenticated && riskState.loading ? <article className="support-card"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><div><span className="card-kicker">{t("checkingMarketRisk")}</span><LoadingSkeleton label={t("reviewingMovement")} /></div></article> : null}
            {isAuthenticated && riskState.error ? <article className="support-card"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><div>{serviceErrorPanel("risk", riskState, retryRisk)}</div></article> : null}
            {risk ? (
              <article className="support-card">
                <div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div>
                <div>
                  <span className="card-kicker">{t("marketWarning")}</span>
                  {riskRecords.length ? (
                    <>
                      <h3>{anomaliesCount} {t("warningsFound")}</h3>
                      <p>{risk.message ?? t("unusualPriceMovement")}</p>
                      <div className="mini-metrics">
                        <span>{t("recordsAnalyzed")} <strong>{recordsAnalyzed ?? "—"}</strong></span>
                        <span>{t("latestMovement")} <strong>{riskRecords[0] ? `${formatVelocity(riskRecords[0].price_velocity_7d)} ${t("latestMovementUnit")}` : "—"}</strong></span>
                      </div>
                    </>
                  ) : (
                    <><h3>{t("noWarningRecords")}</h3><p>{risk.message ?? t("noRiskWarnings")}</p></>
                  )}
                </div>
              </article>
            ) : null}

            {!isAuthenticated ? (
              <article className="support-card gated-card">
                <div className="support-icon"><MapPin size={20} /></div>
                <div>
                  <span className="card-kicker">{t("bestMandiLabel")}</span>
                  <h3>{t("bestMandi")}</h3>
                  <p>{t("signInForMandi")}</p>
                  <Link className="primary-button alert-link" href="/auth">{t("loginOrCreate")}</Link>
                </div>
              </article>
            ) : null}
            {isAuthenticated && procurementState.loading ? <article className="support-card"><div className="support-icon"><MapPin size={20} /></div><div><span className="card-kicker">{t("checkingMandiPrices")}</span><LoadingSkeleton label={t("comparingMarkets")} /></div></article> : null}
            {isAuthenticated && procurementState.error ? <article className="support-card"><div className="support-icon"><MapPin size={20} /></div><div>{serviceErrorPanel("procurement", procurementState, retryProcurement)}</div></article> : null}
            {procurement ? (
              <article className="support-card">
                <div className="support-icon"><MapPin size={20} /></div>
                <div className="opportunity-content">
                  <div className="card-kicker">{t("bestMandiLabel")}</div>
                  {opportunities.length ? (
                    <>
                      <h3>{opportunities.length} {t("liveOpportunities")}</h3>
                      <div className="opportunity-list">
                        {opportunities.slice(0, 3).map((opportunity, index) => (
                          <div className="opportunity-row" key={`${opportunity.destination_market ?? "mandi"}-${index}`}>
                            <span className="rank-badge">{index + 1}</span>
                            <div>
                              <strong>{opportunity.destination_market ?? t("mandi")}</strong>
                              <small>{opportunity.recommendation ?? t("farmerMandiGuidance")}</small>
                            </div>
                            <strong className="opportunity-gain">{money(opportunity.gross_price_difference)}<small> {t("grossDifference")}</small></strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <><h3>{t("noOpportunity")}</h3><p>{procurement.message ?? t("noBetterOpportunity")}</p></>
                  )}
                  <small className="disclaimer">{procurement.disclaimer ?? t("modelDisclaimer")}</small>
                </div>
              </article>
            ) : null}
          </div>
        </> : null}
      </section>
      <AlertsPanel commodity={commodity} market={market} />
      <section className="trust-strip">
        <span><ShieldAlert size={18} /> {t("trustTransparent")}</span>
        <span><Leaf size={18} /> {t("trustLiveBackend")}</span>
        <span><Info size={18} /> {t("trustFarmerFirst")}</span>
      </section>
    </div>
  );
}
