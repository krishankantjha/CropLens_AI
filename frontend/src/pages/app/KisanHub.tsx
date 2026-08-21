import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, RefreshCw, Sparkles, CloudRain } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { DecisionCardWidget } from "@/components/kisan/DecisionCardWidget";
import { SignalRow } from "@/components/landing/LandingPrimitives";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { demoForecasts, demoMandis, demoSignals } from "@/data/demo";
import { getTranslation } from "@/i18n/translations";
import { cropLensService } from "@/services/cropLensService";
import type { CropForecast, CropKey } from "@/types/demo";

const money = (val: number) => `₹${val.toLocaleString("en-IN")}`;

export default function KisanHub() {
  const { user, weather, marketChanged, simulateMarketChange, recalculate } = useAuth();
  const copy = getTranslation(user.language);
  const cropKey = (user.primaryCrop.toLowerCase() || 'potato') as CropKey;
  const [forecast, setForecast] = useState<CropForecast | null>(null);
  const [bestMandi, setBestMandi] = useState<any | null>(null);
  const [activeSignal, setActiveSignal] = useState<number | null>(0);
  const [showProof, setShowProof] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [forecastData, signalData, mandiData] = await Promise.all([
        cropLensService.getForecast(cropKey, user.homeMandi),
        cropLensService.getMarketSignals(user.primaryCrop, user.homeMandi),
        cropLensService.getMandis(user.primaryCrop, user.homeMandi)
      ]);
      setForecast(forecastData);
      setSignals(signalData);
      if (mandiData && mandiData.length > 0) {
        setBestMandi(mandiData[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to communicate with CropLens AI backend.');
    } finally {
      setLoading(false);
    }
  }, [cropKey, user.homeMandi, user.primaryCrop]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    await loadData();
    recalculate();
    setRecalculating(false);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-8 pb-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-.05em] text-[#0E4D35]">{copy.goodMorning} 👋</h1>
            <p className="mt-1 text-sm text-[#66716A]">{copy.todayMessage} For {user.primaryCrop} in {user.homeMandi}.</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={simulateMarketChange} className="inline-flex items-center gap-2 rounded-full border border-[#DDE4DE] bg-white px-4 py-2 text-xs font-extrabold text-[#0E4D35] transition-colors hover:border-[#176B45]">
              <RefreshCw className="size-3.5" /> Simulate Market Shift
            </button>
          </div>
        </div>

        {marketChanged && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 rounded-2xl border border-[#F0D9B0] bg-[#FFF8E8] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#D99A21] text-white">⚠️</span>
              <div>
                <p className="text-sm font-extrabold text-[#17201B]">Market conditions changed</p>
                <p className="mt-0.5 text-xs text-[#66716A]">Agra arrivals increased sharply. Recalculate to update your advisory.</p>
              </div>
            </div>
            <button type="button" onClick={handleRecalculate} disabled={recalculating} className="rounded-full bg-[#176B45] px-5 py-2.5 text-xs font-extrabold text-white shadow hover:bg-[#0E4D35] disabled:opacity-50">
              {recalculating ? "Rechecking..." : "Recalculate"}
            </button>
          </motion.div>
        )}

        <DecisionCardWidget forecast={forecast} />

        <div id="why-section" className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#DDE4DE] bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Evidence</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35]">Why this decision?</h2>
              </div>
              <Sparkles className="size-5 text-[#176B45]" />
            </div>
            <div className="mt-6">
              {loading && <p className="text-xs text-[#66716A]">Analyzing live market indicators...</p>}
              {error && <p className="text-xs text-rose-700">{error}</p>}
              {!loading && !error && signals.map((signal, index) => (
                <SignalRow key={signal.label} signal={signal} active={activeSignal === index} onClick={() => setActiveSignal(activeSignal === index ? null : index)} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-[#DDE4DE] bg-white p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">Risk protection</p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35]">What if price falls?</h2>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-[#F8F7F2] p-4"><p className="data-mono text-lg font-extrabold text-[#66716A]">{money(forecast.range.floor)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#66716A]">Safety floor</p></div>
                <div className="rounded-2xl bg-[#F8F7F2] p-4"><p className="data-mono text-lg font-extrabold text-[#176B45]">{money(forecast.range.expected)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#66716A]">Expected</p></div>
                <div className="rounded-2xl bg-[#F8F7F2] p-4"><p className="data-mono text-lg font-extrabold text-[#0E4D35]">{money(forecast.range.upside)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#66716A]">Upside</p></div>
              </div>
              <div className="relative mt-6 h-2 rounded-full bg-[#DDE4DE]"><span className="absolute left-0 top-0 h-2 w-[38%] rounded-full bg-[#B8D8C5]" /><span className="absolute left-[38%] top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#176B45] shadow-sm" /><span className="absolute left-[80%] top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#0E4D35] shadow-sm" /></div>
              <button type="button" onClick={() => setShowProof((v) => !v)} className="mt-6 flex w-full items-center justify-between border-t border-[#EDF0EB] pt-4 text-xs font-bold text-[#176B45]">
                <span>Technical details (P10 / P50 / P90)</span>
                <ChevronDown className={`size-4 transition-transform ${showProof ? "rotate-180" : ""}`} />
              </button>
              {showProof && (
                <div className="mt-4 rounded-xl bg-[#F8F7F2] p-4 text-xs text-[#66716A] leading-5">
                  Conformal calibration keeps the range honest based on historical volatility and regional arrivals.
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-[#DDE4DE] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#E8F4ED] text-[#176B45]"><CloudRain className="size-5" /></span>
                <div>
                  <p className="eyebrow">Weather impact</p>
                  <h3 className="text-lg font-extrabold text-[#0E4D35]">Transit weather check</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#66716A]">{weather.summary}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#EDF0EB] pt-4 text-xs font-extrabold">
                <span className="text-[#66716A]">Transport risk: {weather.rainfallRisk}</span>
                <span className="text-[#176B45]">{weather.impact}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#DDE4DE] bg-[#0E4D35] p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded-full bg-[#D99A21] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-white">⭐ Best Net Profit</span>
              <h3 className="mt-3 text-2xl font-extrabold">{bestMandi.name} Mandi</h3>
              <p className="mt-1 text-sm text-[#C5D9CA]">{money(bestMandi.net)} estimated net · {bestMandi.distance} away · optimal net realization route</p>
            </div>
            <Link href="/mandi" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#0E4D35] transition-transform hover:scale-105">
              Compare Mandis <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
