// Earthline Intelligence: the farmer sees the decision path first; business values render only after live responses.
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Info, Leaf, MapPin, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { getForecast, getProcurement, getResources, getRisk } from "@/api/client";
import { ForecastChart } from "@/components/data-display/ForecastChart";
import { StatePanel } from "@/components/feedback/StatePanel";
import { AlertsPanel } from "@/features/home/AlertsPanel";
import type { ApiError, ForecastPoint, ForecastResponse, ProcurementResponse, ResourceEntry, ResourceOption, ResourcesResponse, RiskResponse } from "@/types/api";
import { asApiError, isUnavailable, isValidSelection, toFarmerMessage, type Selection } from "./serviceState";

function forecastPoints(data: ForecastResponse | null): ForecastPoint[] { return data?.forecast ?? data?.forecasts ?? data?.daily_forecast ?? []; }
function money(value: number | undefined) { return typeof value === "number" && Number.isFinite(value) ? `₹${Math.round(value).toLocaleString("en-IN")}` : "—"; }
function formatMetric(value: number | undefined, suffix = "") { return typeof value === "number" && Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}` : "—"; }

type ServiceState<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  requestedFor: Selection | null;
};

const emptyState = <T,>(): ServiceState<T> => ({ data: null, error: null, loading: false, requestedFor: null });

export default function HomePage() {
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
  const recordsAnalyzed = risk?.total_records_analyzed ?? risk?.records_analyzed;
  const anomaliesCount = risk?.total_anomalies_detected ?? risk?.anomalies_detected ?? riskRecords.length;
  const resourceUnavailable = isUnavailable(resourceError);

  const serviceErrorPanel = (service: "forecast" | "risk" | "procurement", state: ServiceState<unknown>, retry: () => void) => {
    if (!state.error) return null;
    const unavailable = isUnavailable(state.error);
    return <StatePanel kind="error" title={unavailable ? `${service === "risk" ? "Market risk" : service === "procurement" ? "Mandi comparison" : "Forecast"} temporarily unavailable` : `We could not load ${service === "risk" ? "market risk" : service === "procurement" ? "mandi comparison" : "this forecast"}`} message={toFarmerMessage(state.error, service)} actionLabel="Try again" onAction={retry} />;
  };

  return (
    <div className="page-content" id="home">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow"><Sparkles size={15} /> Live mandi intelligence</p><h1 id="hero-title">Check your crop market.</h1><p>Choose your crop and mandi to see a clear, live market decision.</p></div>
        <form className="market-form" onSubmit={submitForecast}>
          <label className="field"><span>Crop</span><span className="select-wrap"><Leaf size={18} /><select value={commodity} onChange={(event) => setCommodity(event.target.value)} disabled={resourceLoading || !!resourceError} aria-label="Crop"><option value="">Select crop</option>{commodities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={17} /></span></label>
          <label className="field"><span>Mandi</span><span className="select-wrap"><MapPin size={18} /><select value={market} onChange={(event) => setMarket(event.target.value)} disabled={resourceLoading || !!resourceError} aria-label="Mandi"><option value="">Select mandi</option>{markets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={17} /></span></label>
          <label className="field"><span>Forecast days</span><span className="select-wrap"><CalendarDays size={18} /><select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} aria-label="Forecast days">{[1, 3, 7, 14].map((days) => <option key={days} value={days}>{days} days</option>)}</select><ChevronDown size={17} /></span></label>
          <button className="primary-button" type="submit" disabled={!hasSelection || resourceLoading || forecastState.loading}><span>{forecastState.loading ? "Checking live market…" : "Check Today’s Market"}</span><ArrowRight size={18} /></button>
        </form>
        {resourceLoading ? <p className="form-note">Loading live crop and mandi choices…</p> : null}
        {resourceError ? <StatePanel kind="error" title={resourceUnavailable ? "Live service unavailable" : "Could not load market choices"} message={resourceUnavailable ? "Live crop and mandi choices are temporarily unavailable. Please try again." : "We could not load the live crop and mandi choices. Please try again."} actionLabel="Try again" onAction={() => void loadResources()} /> : null}
      </section>

      <section className="result-section" aria-live="polite">
        {!hasRequested ? <StatePanel kind="empty" title="Your live market decision will appear here" message="Select your crop and mandi to view real-time prices, forecasts, and market guidance." /> : null}
        {hasRequested && forecastState.error ? serviceErrorPanel("forecast", forecastState, retryForecast) : null}
        {hasRequested && forecastState.loading ? <StatePanel kind="loading" title="Checking the live forecast" message="Your risk and mandi checks continue independently." /> : null}
        {hasRequested && (forecast || risk || procurement || riskState.loading || procurementState.loading || riskState.error || procurementState.error) ? <>
          {forecast ? <div className="result-intro"><div><p className="eyebrow"><span className="eyebrow-dot" /> Live response</p><h2>{displayedCommodity?.label ?? forecast.commodity ?? "Selected crop"}<span className="result-context">{displayedMarket?.label ?? forecast.market ?? "Selected mandi"}</span></h2></div><button className="quiet-button" type="button" onClick={retryForecast}><RefreshCw size={16} /> Refresh forecast</button></div> : null}
          <div className="result-grid">
            {forecast ? <article className="decision-card"><div className="card-kicker">Today’s market decision</div><div className="decision-main"><div><span className="muted-label">Expected market price</span><strong className="price-value">{money(p50Price)} <small>/ quintal</small></strong><span className="muted-label">Likely range</span><strong className="range-value">{p10Price !== undefined && p90Price !== undefined ? `${money(p10Price)} – ${money(p90Price)}` : money(forecast.current_price)}</strong></div><div className="action-block"><span className="muted-label">Suggested action</span><strong>{forecast.decision_en ?? forecast.decision ?? "See live guidance"}</strong>{forecast.decision_hi ? <p lang="hi">{forecast.decision_hi}</p> : null}{forecast.confidence ? <span className="muted-label">{forecast.confidence}</span> : null}</div></div><div className="card-footnote"><Info size={15} /> Model-supported guidance, not a guarantee. Costs such as transport and commission may not be included.</div></article> : null}
            {forecast ? <article className="forecast-card" id="forecast"><div className="card-kicker">Next {forecast.forecast_horizon_days ?? forecast.horizon ?? horizon} days</div><div className="chart-legend"><span className="legend-line" /> Expected price <span className="legend-band" /> Likely range</div>{points.length >= 2 ? <ForecastChart points={points} /> : <StatePanel kind="empty" title="Forecast points were not returned" message="The live service did not provide enough points to draw the forecast." actionLabel="Try again" onAction={retryForecast} />}</article> : null}
            {riskState.loading ? <article className="support-card" id="risk"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><StatePanel kind="loading" title="Checking market risk" message="Reviewing recent supply and price movement." /></article> : null}
            {riskState.error ? <article className="support-card" id="risk"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><div>{serviceErrorPanel("risk", riskState, retryRisk)}</div></article> : null}
            {risk ? <article className="support-card" id="risk"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><div><div className="card-kicker">Market warning</div>{riskRecords.length ? <><h3>{anomaliesCount} returned warning records</h3><p>{risk.message ?? "Review the returned supply-shock records for this crop and mandi."}</p><div className="mini-metrics"><span>Records analyzed <strong>{recordsAnalyzed ?? "—"}</strong></span><span>Latest movement <strong>{riskRecords[0] ? formatMetric(riskRecords[0].price_velocity_7d, "%") : "—"}</strong></span></div></> : <><h3>No warning records returned</h3><p>{risk.message ?? "No supply-risk warnings were returned for this selection."}</p></>}</div></article> : null}
            {procurementState.loading ? <article className="support-card" id="mandi"><div className="support-icon"><MapPin size={20} /></div><StatePanel kind="loading" title="Checking mandi prices" message="Comparing live destination-market information." /></article> : null}
            {procurementState.error ? <article className="support-card" id="mandi"><div className="support-icon"><MapPin size={20} /></div><div>{serviceErrorPanel("procurement", procurementState, retryProcurement)}</div></article> : null}
            {procurement ? <article className="support-card" id="mandi"><div className="support-icon"><MapPin size={20} /></div><div><div className="card-kicker">Best mandi</div>{opportunities.length ? <><h3>{opportunities.length} live opportunities returned</h3><p>{opportunities[0].source_market ?? "Source market"} → {opportunities[0].destination_market ?? "Destination market"}<br /><strong>{money(opportunities[0].gross_price_difference)} gross difference</strong></p></> : <><h3>No opportunity returned</h3><p>{procurement.message ?? "No better mandi opportunity was returned for this selection."}</p></>}<small className="disclaimer">{procurement.disclaimer ?? "Prices may not include transport, loading, or commission costs."}</small></div></article> : null}
          </div>
        </> : null}
      </section>
      <AlertsPanel commodity={commodity} market={market} />
      <section className="trust-strip"><span><ShieldAlert size={18} /> Honest uncertainty</span><span><Leaf size={18} /> Live backend data</span><span><Info size={18} /> Farmer-first guidance</span></section>
      <section className="sr-only" id="risk-details" aria-label="Market risk details"><h2>Market risk details</h2></section>
      <section className="sr-only" id="mandi-details" aria-label="Mandi details"><h2>Mandi details</h2></section>
      <section className="sr-only" id="account" aria-label="Account"><h2>Account</h2></section>
    </div>
  );
}
