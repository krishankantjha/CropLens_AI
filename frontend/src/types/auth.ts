// Field Notes Intelligence reminder: keep models clean, typed, and frontend-only so future backend integration requires zero UI changes.
export type AuthStateStatus = "unauthenticated" | "authenticated" | "guest";

export interface UserProfile {
  name: string;
  mobile: string;
  language: string;
  homeMandi: string;
  primaryCrop: string;
  quantity: string;
  storage: string;
}

export interface AlertItem {
  id: string;
  category: "Market" | "Weather" | "Forecast" | "Transport";
  title: string;
  body: string;
  time: string;
  tone: "favorable" | "neutral" | "caution" | "negative";
  actionLabel?: string;
}

export interface WeatherData {
  summary: string;
  rainfallRisk: string; // e.g. "●●●○"
  impact: string;
}

export interface HistoryItem {
  id: string;
  date: string;
  crop: string;
  market: string;
  decision: string;
  tone: "favorable" | "neutral" | "caution";
}
