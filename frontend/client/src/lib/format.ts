import type { ForecastPoint } from "@/types/api";
import type { Language } from "@/contexts/LanguageContext";

export type DecisionTone = "sell" | "hold" | "profit";

export function money(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `₹${Math.round(value).toLocaleString("en-IN")}` : "—";
}

export function formatVelocity(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value > 0 ? "+" : ""}₹${Math.round(value).toLocaleString("en-IN")}` : "—";
}

export function decisionTone(decision: string | undefined): DecisionTone {
  const text = (decision ?? "").toLowerCase();
  if (text.includes("sell") || text.includes("बेच")) return "sell";
  if (text.includes("profit") || text.includes("लाभ")) return "profit";
  return "hold";
}

export function percentage(value: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((value - min) / Math.max(max - min, 1)) * 100));
}

export function pointLabel(point: ForecastPoint, language: string, fallback: string) {
  return language === "hi"
    ? point.day_name_hi ?? point.day_name ?? point.day ?? point.date ?? fallback
    : point.day_name ?? point.day ?? point.date ?? fallback;
}

export function formatDataAsOf(date: Date, language: Language) {
  return date.toLocaleString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
