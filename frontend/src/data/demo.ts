export const demoForecasts = [];
export const demoSignals = [
  { label: "Price trend", value: "Stable", explanation: "30-day average price is holding steady within expected volatility bounds.", tone: "neutral", icon: "↗" },
  { label: "Arrivals", value: "Normal", explanation: "Calculated from Agmarknet rolling modal volume moving averages.", tone: "neutral", icon: "▣" },
  { label: "Weather", value: "Stable", explanation: "NASA POWER meteorological index indicates favorable conditions.", tone: "neutral", icon: "◌" },
  { label: "Demand", value: "Active", explanation: "Regional demand holding steady above baseline.", tone: "favorable", icon: "✦" },
  { label: "Transport", value: "Optimal", explanation: "Spatial gradient pricing evaluated across regional mandis.", tone: "neutral", icon: "→" }
];
export const demoMandis = [
  { name: "Agra", distance: "0 km", rate: 1650, transport: 0, net: 82500, x: 50, y: 50, featured: true },
  { name: "Azadpur", distance: "180 km", rate: 1720, transport: 120, net: 80000, x: 45, y: 35, featured: true },
  { name: "Lasalgaon", distance: "1100 km", rate: 1850, transport: 450, net: 70000, x: 30, y: 70, featured: false }
];
export const demoTicker = [
  { market: "Agra", price: "₹1,650", change: "↑", tone: "up" },
  { market: "Azadpur", price: "₹1,720", change: "↑", tone: "up" },
  { market: "Lasalgaon", price: "₹1,850", change: "→", tone: "steady" }
];
export const decisionCards = [
  {
    id: "1",
    title: "Hold for 4 Days in Agra",
    subtitle: "Predicted price surge of +₹120/qtl by Friday",
    category: "Price Advisory",
    tone: "favorable"
  },
  {
    id: "2",
    title: "Arbitrage Opportunity: Azadpur",
    subtitle: "Higher wholesale margins (+₹250/qtl) available in Azadpur mandi",
    category: "Spatial Arbitrage",
    tone: "favorable"
  }
];
export const cropConstants = {};
export const mandiConstants = {};
