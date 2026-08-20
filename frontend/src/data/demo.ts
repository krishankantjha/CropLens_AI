// Field Notes Intelligence reminder: all values in this file are clearly labeled frontend example data, never live or personalized.
import type { CropForecast, MarketSignal, Mandi } from "@/types/demo";

export const demoForecasts: Record<string, CropForecast> = {
  potato: {
    key: "potato",
    name: "Potato",
    variety: "Table potato · Agra",
    market: "Agra",
    today: 1480,
    outlook: [
      { label: "Today", day: "Today", price: 1480 },
      { label: "Thu", day: "Thursday", price: 1590 },
      { label: "Fri", day: "Friday", price: 1620, recommended: true },
    ],
    potentialUpside: 140,
    recommendation: "Waiting may offer better value",
    recommendationTone: "favorable",
    range: { floor: 1360, expected: 1480, upside: 1620 },
  },
  onion: {
    key: "onion",
    name: "Onion",
    variety: "Red onion · Lasalgaon",
    market: "Lasalgaon",
    today: 2240,
    outlook: [
      { label: "Today", day: "Today", price: 2240 },
      { label: "Thu", day: "Thursday", price: 2180 },
      { label: "Fri", day: "Friday", price: 2320, recommended: true },
    ],
    potentialUpside: 80,
    recommendation: "Friday shows a steadier upside",
    recommendationTone: "neutral",
    range: { floor: 2080, expected: 2240, upside: 2320 },
  },
  tomato: {
    key: "tomato",
    name: "Tomato",
    variety: "Hybrid tomato · Kolar",
    market: "Kolar",
    today: 1860,
    outlook: [
      { label: "Today", day: "Today", price: 1860 },
      { label: "Thu", day: "Thursday", price: 1790 },
      { label: "Fri", day: "Friday", price: 1710, recommended: true },
    ],
    potentialUpside: -150,
    recommendation: "Selling sooner may reduce downside",
    recommendationTone: "caution",
    range: { floor: 1580, expected: 1860, upside: 1980 },
  },
};

export const demoTicker = [
  { market: "Agra", price: "₹1,480", change: "↑", tone: "up" },
  { market: "Azadpur", price: "₹1,520", change: "→", tone: "steady" },
  { market: "Lasalgaon", price: "₹2,340", change: "↑", tone: "up" },
  { market: "Indore", price: "₹1,890", change: "↓", tone: "down" },
  { market: "Khanna", price: "₹1,610", change: "↑", tone: "up" },
] as const;

export const demoSignals: MarketSignal[] = [
  { label: "Price trend", value: "Rising", explanation: "Prices have moved up across the last few comparable market days.", tone: "favorable", icon: "↗" },
  { label: "Arrivals", value: "Normal", explanation: "Current arrivals are not showing unusual supply pressure.", tone: "neutral", icon: "▣" },
  { label: "Weather", value: "Stable", explanation: "The next few days show no major weather disruption across the regional mandi cluster.", tone: "neutral", icon: "◌" },
  { label: "Demand", value: "Strong", explanation: "Demand is holding above the 30-day regional moving average.", tone: "favorable", icon: "✦" },
  { label: "Transport", value: "Normal", explanation: "Typical transport cost is already included in the net-money comparison.", tone: "neutral", icon: "→" },
];

export const demoMandis: Mandi[] = [
  { name: "Agra", distance: "12 km", rate: 1480, transport: 1200, net: 72800, x: 34, y: 44 },
  { name: "Mathura", distance: "34 km", rate: 1540, transport: 2800, net: 74200, x: 62, y: 29, featured: true },
  { name: "Delhi", distance: "210 km", rate: 1620, transport: 9500, net: 71500, x: 77, y: 58 },
];

export const decisionCards = [
  { title: "Should I sell now?", body: "Today's price vs expected price.", icon: "scale", href: "#home" },
  { title: "Should I wait?", body: "A simple 7-day price outlook.", icon: "calendar", href: "#home" },
  { title: "Where should I sell?", body: "Compare nearby mandi options.", icon: "map", href: "#markets" },
  { title: "Is another mandi worth it?", body: "See net money after transport.", icon: "git-merge", href: "#markets" },
] as const;
