// Earthline Intelligence: the farmer sees the decision path first; business values render only after live responses.
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Info, Leaf, MapPin, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { getForecast, getProcurement, getResources, getRisk } from "@/api/client";
import { ForecastChart } from "@/components/data-display/ForecastChart";
import { AlertsPanel } from "@/features/home/AlertsPanel";
import { StatePanel } from "@/components/feedback/StatePanel";
import type { ApiError, ForecastPoint, ForecastResponse, ProcurementResponse, ResourceEntry, ResourceOption, ResourcesResponse, RiskResponse } from "@/types/api";

function forecastPoints(data: ForecastResponse | null): ForecastPoint[] { return data?.forecast ?? data?.forecasts ?? data?.daily_forecast ?? []; }
function money(value: number | undefined) { return typeof value === "number" && Number.isFinite(value) ? `₹${Math.round(value).toLocaleString("en-IN")}` : "—"; }
function formatMetric(value: number | undefined, suffix = "") { return typeof value === "number" && Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}` : "—"; }

export default function HomePage() {
  const [resources, setResources] = useState<ResourcesResponse | null>(null);
  const [resourceError, setResourceError] = useState<ApiError | null>(null);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [commodity, setCommodity] = useState("");
  const [market, setMarket] = useState("");
  const [horizon, setHorizon] = useState(7);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [risk, setRisk] = useState<RiskResponse | null>(null);
  const [procurement, setProcurement] = useState<ProcurementResponse | null>(null);
  const [forecastError, setForecastError] = useState<ApiError | null>(null);
  const [riskError, setRiskError] = useState<ApiError | null>(null);
  const [procurementError, setProcurementError] = useState<ApiError | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const loadResources = async () => {
    setResourceLoading(true); setResourceError(null);
    try { setResources(await getResources()); } catch (error) { setResourceError(error as ApiError); } finally { setResourceLoading(false); }
  };
  useEffect(() => { void loadResources(); }, []);

  const commodities = useMemo<ResourceOption[]>(() => resources?.commodities ?? [], [resources]);
  const markets = useMemo<ResourceOption[]>(() => (resources?.mandis ?? []).map((item: ResourceEntry) => typeof item === "string" ? { id: item, label: item } : item), [resources]);
  const selectedCommodity = commodities.find((item) => item.id === commodity);
  const selectedMarket = markets.find((item) => item.id === market);
  const points = forecastPoints(forecast);
  const hasSelection = Boolean(commodity && market);

  const submitForecast = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!hasSelection) return;
    setForecastLoading(true); setForecastError(null); setRiskError(null); setProcurementError(null);
    const [forecastResult, riskResult, procurementResult] = await Promise.allSettled([
      getForecast({ commodity, market, horizon }),
      getRisk({ commodity, market }),
      getProcurement({ commodity, base_market: market }),
    ]);
    if (forecastResult.status === "fulfilled") setForecast(forecastResult.value); else { setForecast(null); setForecastError(forecastResult.reason as ApiError); }
    if (riskResult.status === "fulfilled") setRisk(riskResult.value); else { setRisk(null); setRiskError(riskResult.reason as ApiError); }
    if (procurementResult.status === "fulfilled") setProcurement(procurementResult.value); else { setProcurement(null); setProcurementError(procurementResult.reason as ApiError); }
    setForecastLoading(false);
  };

  const riskRecords = risk?.anomalies ?? risk?.records ?? [];
  const opportunities = procurement?.opportunities ?? procurement?.results ?? [];
  const unavailable = resourceError?.status === 503 || forecastError?.status === 503;

  const primaryForecast = points[0];
  const p50Price = forecast?.p50_median_price ?? primaryForecast?.p50_median_price ?? primaryForecast?.price ?? forecast?.current_price;
  const p10Price = forecast?.p10_floor_price ?? primaryForecast?.p10_floor_price;
  const p90Price = forecast?.p90_ceiling_price ?? primaryForecast?.p90_ceiling_price;
  const recordsAnalyzed = risk?.total_records_analyzed ?? risk?.records_analyzed;
  const anomaliesCount = risk?.total_anomalies_detected ?? risk?.anomalies_detected ?? riskRecords.length;

  return (
    <div className="page-content" id="home">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={15} /> Live mandi intelligence</p>
          <h1 id="hero-title">Check your crop market.</h1>
          <p>Choose your crop and mandi to see a clear, live market decision.</p>
        </div>
        <form className="market-form" onSubmit={submitForecast}>
          <label className="field"><span>Crop</span><span className="select-wrap"><Leaf size={18} /><select value={commodity} onChange={(event) => setCommodity(event.target.value)} disabled={resourceLoading || !!resourceError} aria-label="Crop"><option value="">Select crop</option>{commodities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={17} /></span></label>
          <label className="field"><span>Mandi</span><span className="select-wrap"><MapPin size={18} /><select value={market} onChange={(event) => setMarket(event.target.value)} disabled={resourceLoading || !!resourceError} aria-label="Mandi"><option value="">Select mandi</option>{markets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={17} /></span></label>
          <label className="field"><span>Forecast days</span><span className="select-wrap"><CalendarDays size={18} /><select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} aria-label="Forecast days">{[1, 3, 7, 14].map((days) => <option key={days} value={days}>{days} days</option>)}</select><ChevronDown size={17} /></span></label>
          <button className="primary-button" type="submit" disabled={!hasSelection || forecastLoading || resourceLoading}><span>{forecastLoading ? "Checking live market…" : "Check Today’s Market"}</span><ArrowRight size={18} /></button>
        </form>
        {resourceLoading ? <p className="form-note">Loading live crop and mandi choices…</p> : null}
        {resourceError ? <StatePanel kind="error" title={unavailable ? "Live service unavailable" : "Could not load market choices"} message={resourceError.message} actionLabel="Try again" onAction={() => void loadResources()} /> : null}
      </section>

      <section className="result-section" aria-live="polite">
        {!forecast && !forecastError ? <StatePanel kind="empty" title="Your live market decision will appear here" message="Select your crop and mandi to view real-time prices, forecasts, and market guidance." /> : null}
        {forecastError ? <StatePanel kind="error" title={unavailable ? "Forecast temporarily unavailable" : "We could not load this forecast"} message={forecastError.message} actionLabel="Try again" onAction={() => void submitForecast()} /> : null}
        {forecast ? <>
          <div className="result-intro"><div><p className="eyebrow"><span className="eyebrow-dot" /> Live response</p><h2>{selectedCommodity?.label ?? forecast.commodity ?? "Selected crop"}<span className="result-context">{selectedMarket?.label ?? forecast.market ?? "Selected mandi"}</span></h2></div><button className="quiet-button" type="button" onClick={() => void submitForecast()}><RefreshCw size={16} /> Refresh</button></div>
          <div className="result-grid">
            <article className="decision-card"><div className="card-kicker">Today’s market decision</div><div className="decision-main"><div><span className="muted-label">Expected market price</span><strong className="price-value">{money(p50Price)} <small>/ quintal</small></strong><span className="muted-label">Likely range</span><strong className="range-value">{p10Price !== undefined && p90Price !== undefined ? `${money(p10Price)} – ${money(p90Price)}` : money(forecast.current_price)}</strong></div><div className="action-block"><span className="muted-label">Suggested action</span><strong>{forecast.decision_en ?? forecast.decision ?? "See live guidance"}</strong>{forecast.decision_hi ? <p lang="hi">{forecast.decision_hi}</p> : null}{forecast.confidence ? <span className="muted-label">{forecast.confidence}</span> : null}</div></div><div className="card-footnote"><Info size={15} /> Model-supported guidance, not a guarantee. Costs such as transport and commission may not be included.</div></article>
            <article className="forecast-card" id="forecast"><div className="card-kicker">Next {forecast.forecast_horizon_days ?? forecast.horizon ?? horizon} days</div><div className="chart-legend"><span className="legend-line" /> Expected price <span className="legend-band" /> Likely range</div>{points.length >= 2 ? <ForecastChart points={points} /> : <StatePanel kind="empty" title="Forecast points were not returned" message="The live service did not provide enough points to draw the forecast." />}</article>
            <article className="support-card" id="risk"><div className="support-icon support-icon--amber"><ShieldAlert size={20} /></div><div><div className="card-kicker">Market warning</div>{riskError ? <p>{riskError.message}</p> : risk ? <><h3>{anomaliesCount} returned warning records</h3><p>{risk.message ?? "Review the returned supply-shock records for this crop and mandi."}</p><div className="mini-metrics"><span>Records analyzed <strong>{recordsAnalyzed ?? "—"}</strong></span><span>Latest movement <strong>{riskRecords[0] ? formatMetric(riskRecords[0].price_velocity_7d, "%") : "—"}</strong></span></div></> : <StatePanel kind="loading" title="Loading market risk" message="Requesting live supply-shock information." />}</div></article>
            <article className="support-card" id="mandi"><div className="support-icon"><MapPin size={20} /></div><div><div className="card-kicker">Best mandi</div>{procurementError ? <p>{procurementError.message}</p> : procurement ? <><h3>{opportunities.length ? `${opportunities.length} live opportunities returned` : "No opportunity returned"}</h3>{opportunities[0] ? <p>{opportunities[0].source_market ?? "Source market"} → {opportunities[0].destination_market ?? "Destination market"}<br /><strong>{money(opportunities[0].gross_price_difference)} gross difference</strong></p> : <p>{procurement.message ?? "The live service returned no opportunity for this selection."}</p>}<small className="disclaimer">{procurement.disclaimer ?? "Prices may not include transport, loading, or commission costs."}</small></> : <StatePanel kind="loading" title="Loading mandi opportunities" message="Requesting live destination-market information." />}</div></article>
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
