// Field Notes Intelligence reminder: keep demo models calm, explicit, farmer-friendly, and ready to swap for backend responses.

export type CropKey = "potato" | "onion" | "tomato";
export type SignalTone = "favorable" | "neutral" | "caution" | "negative";

export interface CropForecast {
  key: CropKey;
  name: string;
  variety: string;
  market: string;
  today: number;
  outlook: Array<{ label: string; day: string; price: number; recommended?: boolean }>;
  potentialUpside: number;
  recommendation: string;
  recommendationTone: SignalTone;
  range: { floor: number; expected: number; upside: number };
}

export interface MarketSignal {
  label: string;
  value: string;
  explanation: string;
  tone: SignalTone;
  icon: string;
}

export interface Mandi {
  name: string;
  distance: string;
  rate: number;
  transport: number;
  net: number;
  x: number;
  y: number;
  featured?: boolean;
}
