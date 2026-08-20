// Field Notes Intelligence reminder: the signature decision card should visually dominate the Kisan Hub and instantly answer 'What should you do?'.
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles, Volume2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { demoForecasts } from "@/data/demo";

const money = (val: number) => `₹${val.toLocaleString("en-IN")}`;

import type { CropForecast } from "@/types/demo";

export function DecisionCardWidget({ forecast: propForecast }: { forecast?: CropForecast } = {}) {
  const { user, marketChanged } = useAuth();
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const cropKey = user.primaryCrop.toLowerCase();
  const forecast = propForecast ?? demoForecasts[cropKey] ?? demoForecasts.potato;
  const bestDay = forecast.outlook.find((point) => point.recommended) ?? forecast.outlook[forecast.outlook.length - 1];
  const decisionLabel = forecast.recommendationTone === "caution" ? "SELL SOONER" : forecast.recommendationTone === "neutral" ? "WATCH MARKET" : "WAIT ~3 DAYS";

  const handleSpeak = () => {
    if (!("speechSynthesis" in window)) {
      setVoiceError("Voice playback is not supported in this browser. You can still read the advisory below.");
      return;
    }
    setVoiceError("");
    window.speechSynthesis.cancel();
    const text = marketChanged
      ? `Market conditions have changed in ${user.homeMandi}. Your recommendation is now watch market.`
      : user.language === "हिन्दी"
        ? `${user.homeMandi} मंडी में ${forecast.name} के लिए ${bestDay?.day ?? "इस सप्ताह"} तक इंतज़ार करना बेहतर हो सकता है।`
        : `For ${forecast.name} in ${user.homeMandi}, ${forecast.recommendation.toLowerCase()}. The optimal selling window is ${bestDay?.day ?? "later this week"}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = user.language === "हिन्दी" ? "hi-IN" : "en-IN";
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#DDE4DE] bg-white paper-shadow">
      <div className="border-b border-[#EDF0EB] bg-[#F8F7F2] px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#66716A]">🥔 {user.primaryCrop.toUpperCase()} · {user.homeMandi.toUpperCase()}</span>
          <span className="rounded-full bg-[#E8F4ED] px-2.5 py-1 text-[10px] font-extrabold text-[#176B45]">Active Advisory</span>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {marketChanged ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-[#F0D9B0] bg-[#FFF8E8] p-5">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#D99A21]" />
              <div>
                <p className="text-sm font-extrabold text-[#17201B]">Market conditions changed abruptly</p>
                <p className="mt-1 text-xs leading-5 text-[#66716A]">Agra arrivals increased sharply. Your previous recommendation to wait has been revised to a caution watch state.</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[#F0D9B0]/60 pt-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#D99A21]"><span className="size-2 rounded-full bg-[#D99A21]" />🟡 WATCH MARKET · REVISED</span>
              <span className="text-xs font-bold text-[#66716A]">Updated 10m ago</span>
            </div>
          </motion.div>
        ) : (
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-[#66716A]">What should you do?</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-[#E8F4ED] px-4 py-2.5 text-base font-extrabold text-[#176B45]">
                    <span className="size-2.5 rounded-full bg-[#176B45]" />
                    {decisionLabel}
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-bold text-[#66716A]">{bestDay?.day ?? "Best expected day"} forecast</p>
                <p className="mt-1 data-mono text-3xl font-extrabold text-[#0E4D35]">{money(bestDay?.price ?? forecast.range.upside)} <span className="text-sm font-bold text-[#176B45]">/ qtl</span></p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#F8F7F2] p-4"><p className="text-[11px] font-bold text-[#66716A]">Today's baseline</p><p className="mt-1 data-mono text-lg font-extrabold text-[#17201B]">{money(forecast.today)} / qtl</p></div>
              <div className="rounded-2xl bg-[#F8F7F2] p-4"><p className="text-[11px] font-bold text-[#66716A]">Potential upside</p><p className="mt-1 data-mono text-lg font-extrabold text-[#176B45]">{forecast.potentialUpside >= 0 ? "+" : ""}{money(forecast.potentialUpside)} / qtl</p></div>
              <div className="col-span-2 rounded-2xl bg-[#E8F4ED] p-4 sm:col-span-1"><p className="text-[11px] font-bold text-[#0E4D35]">Best expected day</p><p className="mt-1 text-sm font-extrabold text-[#0E4D35]">{bestDay?.day ?? "Review soon"} ⭐</p></div>
            </div>

            <p className="mt-6 text-sm font-bold text-[#17201B]">{forecast.recommendation} for {forecast.name.toLowerCase()} in {user.homeMandi}.</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-[#EDF0EB] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button type="button" onClick={handleSpeak} aria-pressed={speaking} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#DDE4DE] bg-[#F8F7F2] px-5 py-3 text-xs font-extrabold text-[#0E4D35] transition-colors hover:border-[#176B45] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]/30">
              <Volume2 className="size-4 text-[#176B45]" /> {speaking ? "🔊 Speaking advisory..." : "Hear today's advice"}
            </button>
            {voiceError && <p role="status" className="mt-2 max-w-xs text-[11px] leading-4 text-[#66716A]">{voiceError}</p>}
          </div>
          <a href="#why-section" className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#176B45] hover:underline">
            See why <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
