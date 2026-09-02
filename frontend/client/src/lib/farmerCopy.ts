import type { ForecastResponse } from "@/types/api";
import type { Language } from "@/contexts/LanguageContext";
import { money, type DecisionTone } from "@/lib/format";

type CopyKey = {
  actionSellToday: string;
  actionWaitFewDays: string;
  actionGoodChance: string;
  gainMoreThanToday: string;
  gainLessThanToday: string;
  trustHigh: string;
  trustMedium: string;
  trustLow: string;
  mandiMoreGain: string;
};

export function farmerDecisionText(forecast: ForecastResponse | null | undefined, language: Language): string {
  if (!forecast) return "";
  const localized = language === "hi" ? forecast.decision_hi : forecast.decision;
  if (localized?.trim()) return simplifyDecisionText(localized, language);
  return "";
}

function simplifyDecisionText(text: string, language: Language): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (language === "en") {
    return normalized
      .replace(/\/\s*within\s*24\s*hours/gi, " within 24 hours")
      .replace(/\s*\/\s*/g, " — ")
      .replace(/\s{2,}/g, " ");
  }
  return normalized;
}

export function farmerActionFromTone(tone: DecisionTone, copy: CopyKey): string {
  if (tone === "sell") return copy.actionSellToday;
  if (tone === "profit") return copy.actionGoodChance;
  return copy.actionWaitFewDays;
}

export function farmerGainMessage(gain: number | undefined, copy: Pick<CopyKey, "gainMoreThanToday" | "gainLessThanToday">): { text: string; positive: boolean } | null {
  if (typeof gain !== "number" || !Number.isFinite(gain)) return null;
  const amount = money(Math.abs(gain));
  if (gain > 0) return { text: copy.gainMoreThanToday.replace("{amount}", amount), positive: true };
  if (gain < 0) return { text: copy.gainLessThanToday.replace("{amount}", amount), positive: false };
  return null;
}

export function farmerTrustLabel(confidence: string | undefined, copy: Pick<CopyKey, "trustHigh" | "trustMedium" | "trustLow">): string | null {
  if (!confidence?.trim()) return null;
  const numeric = Number.parseFloat(confidence.replace("%", "").trim());
  if (Number.isFinite(numeric)) {
    if (numeric >= 80) return copy.trustHigh;
    if (numeric >= 55) return copy.trustMedium;
    return copy.trustLow;
  }
  const lower = confidence.toLowerCase();
  if (lower.includes("high") || lower.includes("उच्च") || lower.includes("अच्छ")) return copy.trustHigh;
  if (lower.includes("low") || lower.includes("कम")) return copy.trustLow;
  return copy.trustMedium;
}

export function farmerMandiGainLabel(amount: number | undefined, copy: Pick<CopyKey, "mandiMoreGain">): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return copy.mandiMoreGain.replace("{amount}", money(Math.round(amount)));
}

export function farmerMandiNetGainLabel(
  net: number | null,
  copy: { mandiNetGain: string; mandiNotWorth: string },
): string {
  if (net === null || !Number.isFinite(net)) return "—";
  if (net <= 0) return copy.mandiNotWorth;
  return copy.mandiNetGain.replace("{amount}", money(Math.round(net)));
}

export function buildFarmerAdvisorySpeech(params: {
  cropLabel: string;
  mandiLabel: string;
  action: string;
  price?: number;
  quintalLabel: string;
  gainMessage?: string | null;
  language: Language;
}): string {
  const { cropLabel, mandiLabel, action, price, quintalLabel, gainMessage, language } = params;
  const pricePart = typeof price === "number" ? `${money(price)} ${quintalLabel}` : "";
  if (language === "hi") {
    return [cropLabel, mandiLabel, action, pricePart ? `लगभग ${pricePart}` : "", gainMessage].filter(Boolean).join("। ");
  }
  return [cropLabel, mandiLabel, action, pricePart ? `About ${pricePart}` : "", gainMessage].filter(Boolean).join(". ");
}
