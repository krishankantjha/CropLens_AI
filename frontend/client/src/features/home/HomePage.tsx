import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Info, Leaf, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { getForecast, getProcurement, getResources, getRisk } from "@/api/client";
import { StatePanel } from "@/components/feedback/StatePanel";
import { AlertsPanel } from "@/features/home/AlertsPanel";
import { DecisionHeroCard } from "@/features/home/DecisionHeroCard";
import { LoadingSkeleton } from "@/features/home/LoadingSkeleton";
import { MandiWorkspace } from "@/features/home/MandiWorkspace";
import { MarketSelectorForm } from "@/features/home/MarketSelectorForm";
import { PriceChartCard } from "@/features/home/PriceChartCard";
import { RiskWorkspace } from "@/features/home/RiskWorkspace";
import { StickyMarketCta } from "@/features/home/StickyMarketCta";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { decisionTone, money } from "@/lib/format";
import { buildFarmerAdvisorySpeech, farmerDecisionText, farmerGainMessage } from "@/lib/farmerCopy";
import { getRecentCommodityIds, getRecentMarketIds, rememberMarketSelection } from "@/lib/marketRecents";
import { hasMarketCheckedBefore, isHomeGuideSeen, markHomeGuideSeen, markMarketCheckedBefore } from "@/lib/homeExperience";
import { ONBOARDING_COMPLETE_EVENT, type OnboardingCompleteDetail } from "@/lib/onboarding";
import type { ApiError, ForecastPoint, ForecastResponse, ProcurementResponse, ResourceEntry, ResourceOption, ResourcesResponse, RiskResponse } from "@/types/api";
import { asApiError, isUnavailable, isValidSelection, toFarmerMessage, type Selection } from "./serviceState";

type ChartHorizon = 7 | 14;

function forecastPoints(data: ForecastResponse | null): ForecastPoint[] {
  return data?.forecasts ?? [];
}

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
  const [contextExpanded, setContextExpanded] = useState(false);
  const [recentsVersion, setRecentsVersion] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const [mandiFocusRequest, setMandiFocusRequest] = useState(0);
  const [chartHorizon, setChartHorizon] = useState<ChartHorizon>(7);
  const [showHomeGuide, setShowHomeGuide] = useState(false);
  const [forecastReceivedAt, setForecastReceivedAt] = useState<Date | null>(null);
  const preferencesApplied = useRef(false);
  const pendingOnboardingCheck = useRef(false);
  const forecastRequestId = useRef(0);
  const riskRequestId = useRef(0);
  const procurementRequestId = useRef(0);

  const loadResources = async () => {
    setResourceLoading(true);
    setResourceError(null);
    try {
      setResources(await getResources());
    } catch (error) {
      setResourceError(asApiError(error));
    } finally {
      setResourceLoading(false);
    }
  };

  useEffect(() => {
    void loadResources();
  }, []);

  useEffect(() => {
    if (!isHomeGuideSeen()) {
      setShowHomeGuide(true);
      markHomeGuideSeen();
    }
  }, []);

  const commodities = useMemo<ResourceOption[]>(() => resources?.commodities ?? [], [resources]);
  const popularCrops = useMemo(() => commodities.slice(0, 4).map((item) => item.id), [commodities]);
  const markets = useMemo<ResourceOption[]>(
    () => (resources?.mandis ?? []).map((item: ResourceEntry) => (typeof item === "string" ? { id: item, label: item } : item)),
    [resources],
  );
  const selectedCommodity = commodities.find((item) => item.id === commodity);
  const selectedMarket = markets.find((item) => item.id === market);
  const hasSelection = Boolean(commodity && market);
  const selection = (): Selection => ({ commodity, market, horizon });
  const validSelection = isValidSelection(selection(), commodities.map((item) => item.id), markets.map((item) => item.id));

  const recentMarketIds = useMemo(() => {
    const ids = getRecentMarketIds();
    if (user?.home_mandi && !ids.includes(user.home_mandi)) return [user.home_mandi, ...ids].slice(0, 5);
    return ids;
  }, [recentsVersion, user?.home_mandi]);

  const recentCommodityIds = useMemo(() => {
    const ids = getRecentCommodityIds();
    if (user?.preferred_commodity && !ids.includes(user.preferred_commodity)) return [user.preferred_commodity, ...ids].slice(0, 5);
    return ids;
  }, [recentsVersion, user?.preferred_commodity]);

  useEffect(() => {
    if (preferencesApplied.current || !isSessionReady || !user || !commodities.length || !markets.length) return;
    const preferredCrop = commodities.find((item) => item.id === user.preferred_commodity);
    const preferredMandi = markets.find((item) => item.id === user.home_mandi);
    if (preferredCrop && !commodity) setCommodity(preferredCrop.id);
    if (preferredMandi && !market) setMarket(preferredMandi.id);
    preferencesApplied.current = true;
  }, [isSessionReady, user, commodities, markets, commodity, market]);

  useEffect(() => {
    const handleOnboardingComplete = (event: Event) => {
      const detail = (event as CustomEvent<OnboardingCompleteDetail>).detail;
      if (!detail?.commodity || !detail.market) return;
      setCommodity(detail.commodity);
      setMarket(detail.market);
      rememberMarketSelection(detail.commodity, detail.market);
      setRecentsVersion((version) => version + 1);
      preferencesApplied.current = true;
      if (detail.autoCheckMarket) pendingOnboardingCheck.current = true;
    };
    window.addEventListener(ONBOARDING_COMPLETE_EVENT, handleOnboardingComplete);
    return () => window.removeEventListener(ONBOARDING_COMPLETE_EVENT, handleOnboardingComplete);
  }, []);

  const runForecast = async (current: Selection, id: number) => {
    setForecastState({ data: null, error: null, loading: true, requestedFor: current });
    try {
      const data = await getForecast(current);
      if (forecastRequestId.current === id) {
        setForecastState({ data, error: null, loading: false, requestedFor: current });
        setForecastReceivedAt(new Date());
      }
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
    setShowHomeGuide(false);
    markMarketCheckedBefore();
    rememberMarketSelection(current.commodity, current.market);
    setRecentsVersion((version) => version + 1);
    void runForecast(current, forecastId);
    if (isAuthenticated) {
      void runRisk(current, ++riskRequestId.current);
      void runProcurement(current, ++procurementRequestId.current);
    } else {
      setRiskState(emptyState());
      setProcurementState(emptyState());
    }
  };

  useEffect(() => {
    if (!pendingOnboardingCheck.current || !commodity || !market) return;
    pendingOnboardingCheck.current = false;
    submitForecast();
  }, [commodity, market]);

  const retryForecast = () => {
    if (validSelection) {
      const id = ++forecastRequestId.current;
      void runForecast(selection(), id);
    }
  };
  const retryRisk = () => {
    if (validSelection && isAuthenticated) {
      const id = ++riskRequestId.current;
      void runRisk(selection(), id);
    }
  };
  const retryProcurement = () => {
    if (validSelection && isAuthenticated) {
      const id = ++procurementRequestId.current;
      void runProcurement(selection(), id);
    }
  };
  const retryAll = () => submitForecast();

  const resetMarketCheck = () => {
    forecastRequestId.current += 1;
    riskRequestId.current += 1;
    procurementRequestId.current += 1;
    setHasRequested(false);
    setContextExpanded(false);
    setForecastState(emptyState());
    setRiskState(emptyState());
    setProcurementState(emptyState());
    setForecastReceivedAt(null);
    setVoiceError("");
    if (window.location.hash !== "#home") window.location.hash = "#home";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const forecast = forecastState.data;
  const risk = riskState.data;
  const procurement = procurementState.data;
  const displayedSelection = forecastState.requestedFor ?? riskState.requestedFor ?? procurementState.requestedFor;
  const displayedCommodity = commodities.find((item) => item.id === displayedSelection?.commodity) ?? selectedCommodity;
  const displayedMarket = markets.find((item) => item.id === displayedSelection?.market) ?? selectedMarket;
  const points = forecastPoints(forecast);

  const changeChartHorizon = (days: ChartHorizon) => {
    setChartHorizon(days);
    if (!validSelection) return;
    if (days === horizon && points.length >= days) return;
    setHorizon(days);
    void runForecast({ commodity, market, horizon: days }, ++forecastRequestId.current);
  };

  useEffect(() => {
    if (horizon === 14) setChartHorizon(14);
    else if (horizon <= 7) setChartHorizon(7);
  }, [horizon]);

  const opportunities = procurement?.opportunities ?? procurement?.results ?? [];
  const primaryForecast = points[0];
  const p50Price = forecast?.p50_median_price ?? primaryForecast?.p50_median_price ?? primaryForecast?.price ?? forecast?.current_price;
  const p10Price = forecast?.p10_floor_price ?? primaryForecast?.p10_floor_price;
  const p90Price = forecast?.p90_ceiling_price ?? primaryForecast?.p90_ceiling_price;
  const currentPrice = forecast?.current_price;
  const peakDay = forecast?.peak_day ?? points.find((point) => point.is_peak);
  const tone = decisionTone(language === "hi" ? forecast?.decision_hi : forecast?.decision);
  const farmerCopyKeys = {
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
  const actionText = forecast ? farmerDecisionText(forecast, language) : "";
  const gainMessage = farmerGainMessage(forecast?.expected_gain, farmerCopyKeys)?.text ?? null;
  const advisoryText = forecast
    ? buildFarmerAdvisorySpeech({
        cropLabel: displayedCommodity?.label ?? forecast.commodity ?? commodity,
        mandiLabel: displayedMarket?.label ?? forecast.market ?? market,
        action: actionText,
        price: p50Price,
        quintalLabel: t("quintal"),
        gainMessage,
        language,
      })
    : "";
  const voiceSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const speakAdvisory = () => {
    setVoiceError("");
    if (!voiceSupported) {
      setVoiceError(t("voiceUnavailable"));
      return;
    }
    if (!advisoryText) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(advisoryText);
      utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = 0.9;
      utterance.onerror = () => setVoiceError(t("voiceFailed"));
      window.speechSynthesis.speak(utterance);
    } catch {
      setVoiceError(t("voiceFailed"));
    }
  };

  const shareAdvisory = () => {
    if (!advisoryText) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(advisoryText)}`, "_blank", "noopener,noreferrer");
  };

  const resourceUnavailable = isUnavailable(resourceError);

  const serviceErrorPanel = (service: "forecast" | "risk" | "procurement", state: ServiceState<unknown>, retry: () => void) => {
    if (!state.error) return null;
    const unavailable = isUnavailable(state.error);
    return (
      <StatePanel
        kind="error"
        title={unavailable ? t("serviceUnavailableTitle") : t("serviceCouldNotLoadTitle")}
        message={toFarmerMessage(state.error, service, {
          invalidSelection: t("invalidSelection"),
          unavailable: t("serviceUnavailable"),
          serviceTrouble: t("serviceTrouble"),
          couldNotLoad: t("serviceCouldNotLoad"),
        })}
        actionLabel={t("retry")}
        onAction={retry}
      />
    );
  };

  return (
    <div className={`page-content${hasRequested ? " page-content--sticky-cta" : ""}`} id="home">
      <MarketSelectorForm
        commodities={commodities}
        markets={markets}
        commodity={commodity}
        market={market}
        horizon={horizon}
        popularCrops={popularCrops}
        recentCommodityIds={recentCommodityIds}
        recentMarketIds={recentMarketIds}
        resourceLoading={resourceLoading}
        resourceError={resourceError}
        resourceUnavailable={resourceUnavailable}
        forecastLoading={forecastState.loading}
        hasSelection={hasSelection}
        validSelection={validSelection}
        compact={hasRequested}
        contextExpanded={contextExpanded}
        mandiFocusRequest={mandiFocusRequest}
        onCommodityChange={setCommodity}
        onMarketChange={setMarket}
        onHorizonChange={setHorizon}
        onPopularCropSelect={(cropId) => {
          setCommodity(cropId);
          setMandiFocusRequest((request) => request + 1);
        }}
        onToggleContextExpanded={() => setContextExpanded((expanded) => !expanded)}
        onCheckAnotherCrop={resetMarketCheck}
        onSubmit={submitForecast}
        onRetryResources={() => void loadResources()}
      />

      {hasRequested ? (
        <StickyMarketCta
          anchorId="market-context-bar"
          disabled={!hasSelection || resourceLoading}
          loading={forecastState.loading}
          onSubmit={submitForecast}
        />
      ) : null}

      <span id="market" className="section-anchor" />
      <span id="forecast" className="section-anchor" />
      <span id="risk" className="section-anchor" />
      <span id="mandi" className="section-anchor" />

      <section className="result-section" aria-live="polite" lang={language}>
        {!hasRequested && showHomeGuide ? (
          <div className="onboarding-guide">
            <div className="guide-header">
              <span className="guide-badge">
                <Sparkles size={15} /> {t("liveMandiIntelligence")}
              </span>
              <h3>{t("onboardingTitle")}</h3>
              <p>{t("onboardingIntro")}</p>
            </div>
            <div className="guide-steps">
              <div className="guide-step">
                <div className="guide-step-icon">1</div>
                <div>
                  <strong>{t("chooseCropTitle")}</strong>
                  <p>{t("chooseCropDescription")}</p>
                </div>
              </div>
              <div className="guide-step">
                <div className="guide-step-icon">2</div>
                <div>
                  <strong>{t("seePricesTitle")}</strong>
                  <p>{t("seePricesDescription")}</p>
                </div>
              </div>
              <div className="guide-step">
                <div className="guide-step-icon">3</div>
                <div>
                  <strong>{t("getAdviceTitle")}</strong>
                  <p>{t("getAdviceDescription")}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {hasRequested && forecastState.error ? serviceErrorPanel("forecast", forecastState, retryForecast) : null}
        {hasRequested && forecastState.loading ? <LoadingSkeleton variant="decision" label={t("checkForecast")} /> : null}
        {hasRequested && (forecast || risk || procurement || riskState.loading || procurementState.loading || riskState.error || procurementState.error || !isAuthenticated) ? (
          <>
            {forecast ? (
              <div className="result-intro">
                <div>
                  <p className="eyebrow">
                    <span className="eyebrow-dot" /> {t("liveResponse")}
                  </p>
                  <h2>
                    {displayedCommodity?.label ?? forecast.commodity ?? t("selectCrop")}
                    <span className="result-context">{displayedMarket?.label ?? forecast.market ?? t("selectMandi")}</span>
                  </h2>
                </div>
                <button className="quiet-button" type="button" onClick={retryAll}>
                  <RefreshCw size={16} /> {t("refreshAll")}
                </button>
              </div>
            ) : null}
            <div className="result-grid" aria-live="polite">
              {forecast ? (
                <DecisionHeroCard
                  forecast={forecast}
                  tone={tone}
                  language={language}
                  p50Price={p50Price}
                  p10Price={p10Price}
                  p90Price={p90Price}
                  currentPrice={currentPrice}
                  peakDay={peakDay}
                  voiceSupported={voiceSupported}
                  voiceError={voiceError}
                  onSpeak={speakAdvisory}
                  onShare={shareAdvisory}
                  dataAsOf={forecastReceivedAt}
                />
              ) : null}
              {forecast ? (
                <PriceChartCard
                  forecast={forecast}
                  points={points}
                  language={language}
                  chartHorizon={chartHorizon}
                  chartLoading={forecastState.loading}
                  onChartHorizonChange={changeChartHorizon}
                  onRetry={retryForecast}
                />
              ) : null}

              <MandiWorkspace
                isAuthenticated={isAuthenticated}
                loading={isAuthenticated && procurementState.loading}
                errorPanel={isAuthenticated && procurementState.error ? serviceErrorPanel("procurement", procurementState, retryProcurement) : null}
                procurement={procurement}
                opportunities={opportunities}
                baseMarketLabel={displayedMarket?.label ?? market}
              />

              <RiskWorkspace
                isAuthenticated={isAuthenticated}
                loading={isAuthenticated && riskState.loading}
                errorPanel={isAuthenticated && riskState.error ? serviceErrorPanel("risk", riskState, retryRisk) : null}
                risk={risk}
              />
            </div>
          </>
        ) : null}
      </section>
      <AlertsPanel
        commodity={commodity}
        market={market}
        showGuestPrompt={isAuthenticated || hasRequested || hasMarketCheckedBefore()}
      />
      <section className="trust-strip">
        <span>
          <ShieldAlert size={18} /> {t("trustTransparent")}
        </span>
        <span>
          <Leaf size={18} /> {t("trustLiveBackend")}
        </span>
        <span>
          <Info size={18} /> {t("trustFarmerFirst")}
        </span>
      </section>
    </div>
  );
}
