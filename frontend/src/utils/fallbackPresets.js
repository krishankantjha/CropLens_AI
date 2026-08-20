/**
 * fallbackPresets.js — Canonical Fallback & Demo Advisory Data for Offline / Disconnected Mode
 * Provides realistic fail-safe market presets for UI rendering when the live FastAPI backend is offline.
 * Decoupled from KisanAdvisoryHub.jsx to maintain clean component architecture and single source of truth.
 */

export const CROP_DATA_PRESETS = {
  Potato: {
    decision: "HOLD FOR 5 DAYS",
    decisionHi: "5 दिन फसल रोके रखें",
    currentPrice: 1480,
    targetPrice: 1620,
    expectedGain: 140,
    confidence: "94.2%",
    mandiRows: [
      { name: "Agra APMC", distance: "12 km", rate: 1480, transport: -40, netProfit: 1440, badge: "Nearest", badgeHi: "निकटतम", badgeType: "nearest" },
      { name: "Farrukhabad APMC", distance: "110 km", rate: 1590, transport: -70, netProfit: 1520, badge: "⭐ Best Profit (+₹80)", badgeHi: "⭐ सर्वाधिक मुनाफा (+₹80)", badgeType: "best" },
      { name: "Mathura APMC", distance: "45 km", rate: 1510, transport: -55, netProfit: 1455, badge: "Normal", badgeHi: "सामान्य", badgeType: "normal" }
    ],
    bars: [
      { day: "Mon", dayHi: "सोम", price: 1480, height: "65%" },
      { day: "Tue", dayHi: "मंगल", price: 1510, height: "72%" },
      { day: "Wed", dayHi: "बुध", price: 1550, height: "78%" },
      { day: "Thu", dayHi: "गुरु", price: 1590, height: "88%" },
      { day: "Fri", dayHi: "शुक्र", price: 1620, height: "98%", isPeak: true },
      { day: "Sat", dayHi: "शनि", price: 1580, type: "drop", height: "85%" },
      { day: "Sun", dayHi: "रवि", price: 1530, height: "74%" }
    ]
  },
  Onion: {
    decision: "HOLD FOR 3 DAYS",
    decisionHi: "3 दिन प्याज रोके रखें",
    currentPrice: 2250,
    targetPrice: 2480,
    expectedGain: 230,
    confidence: "91.8%",
    mandiRows: [
      { name: "Lasalgaon APMC", distance: "15 km", rate: 2250, transport: -40, netProfit: 2210, badge: "Nearest", badgeHi: "निकटतम", badgeType: "nearest" },
      { name: "Indore APMC", distance: "380 km", rate: 2540, transport: -180, netProfit: 2360, badge: "⭐ Best Profit (+₹150)", badgeHi: "⭐ सर्वाधिक मुनाफा (+₹150)", badgeType: "best" },
      { name: "Azadpur APMC", distance: "1150 km", rate: 2680, transport: -420, netProfit: 2260, badge: "Normal", badgeHi: "सामान्य", badgeType: "normal" }
    ],
    bars: [
      { day: "Mon", dayHi: "सोम", price: 2250, height: "65%" },
      { day: "Tue", dayHi: "मंगल", price: 2340, height: "76%" },
      { day: "Wed", dayHi: "बुध", price: 2480, height: "98%", isPeak: true },
      { day: "Thu", dayHi: "गुरु", price: 2410, type: "drop", height: "88%" },
      { day: "Fri", dayHi: "शुक्र", price: 2370, type: "drop", height: "80%" },
      { day: "Sat", dayHi: "शनि", price: 2310, type: "drop", height: "70%" },
      { day: "Sun", dayHi: "रवि", price: 2260, type: "drop", height: "62%" }
    ]
  },
  Tomato: {
    decision: "SELL WITHIN 2 DAYS",
    decisionHi: "2 दिनों के भीतर बेचें",
    currentPrice: 2420,
    targetPrice: 2680,
    expectedGain: 260,
    confidence: "96.5%",
    mandiRows: [
      { name: "Azadpur APMC", distance: "18 km", rate: 2420, transport: -50, netProfit: 2370, badge: "Nearest", badgeHi: "निकटतम", badgeType: "nearest" },
      { name: "Karnal APMC", distance: "125 km", rate: 2650, transport: -90, netProfit: 2560, badge: "⭐ Best Profit (+₹190)", badgeHi: "⭐ सर्वाधिक मुनाफा (+₹190)", badgeType: "best" },
      { name: "Mathura APMC", distance: "140 km", rate: 2510, transport: -100, netProfit: 2410, badge: "Normal", badgeHi: "सामान्य", badgeType: "normal" }
    ],
    bars: [
      { day: "Mon", dayHi: "सोम", price: 2420, height: "60%" },
      { day: "Tue", dayHi: "मंगल", price: 2550, height: "82%" },
      { day: "Wed", dayHi: "बुध", price: 2680, height: "98%", isPeak: true },
      { day: "Thu", dayHi: "गुरु", price: 2450, type: "drop", height: "72%" },
      { day: "Fri", dayHi: "शुक्र", price: 2380, type: "drop", height: "66%" },
      { day: "Sat", dayHi: "शनि", price: 2290, type: "drop", height: "55%" },
      { day: "Sun", dayHi: "रवि", price: 2200, type: "drop", height: "50%" }
    ]
  },
  Wheat: {
    decision: "SELL AT MSP OR HOLD",
    decisionHi: "एमएसपी पर बेचें या रोके रखें",
    currentPrice: 2180,
    targetPrice: 2310,
    expectedGain: 130,
    confidence: "98.1%",
    mandiRows: [
      { name: "Khanna APMC", distance: "10 km", rate: 2180, transport: -30, netProfit: 2150, badge: "Nearest", badgeHi: "निकटतम", badgeType: "nearest" },
      { name: "Karnal APMC", distance: "95 km", rate: 2290, transport: -65, netProfit: 2225, badge: "⭐ Best Profit (+₹75)", badgeHi: "⭐ सर्वाधिक मुनाफा (+₹75)", badgeType: "best" },
      { name: "Azadpur APMC", distance: "280 km", rate: 2380, transport: -140, netProfit: 2240, badge: "Normal", badgeHi: "सामान्य", badgeType: "normal" }
    ],
    bars: [
      { day: "Mon", dayHi: "सोम", price: 2180, height: "65%" },
      { day: "Tue", dayHi: "मंगल", price: 2210, height: "72%" },
      { day: "Wed", dayHi: "बुध", price: 2260, height: "85%" },
      { day: "Thu", dayHi: "गुरु", price: 2310, height: "98%", isPeak: true },
      { day: "Fri", dayHi: "शुक्र", price: 2280, height: "88%" },
      { day: "Sat", dayHi: "शनि", price: 2250, height: "78%" },
      { day: "Sun", dayHi: "रवि", price: 2210, height: "70%" }
    ]
  },
  "Paddy(Dhan)": {
    decision: "HOLD FOR 4 DAYS",
    decisionHi: "4 दिन धान रोके रखें",
    currentPrice: 2120,
    targetPrice: 2240,
    expectedGain: 120,
    confidence: "97.4%",
    mandiRows: [
      { name: "Karnal APMC", distance: "12 km", rate: 2120, transport: -35, netProfit: 2085, badge: "Nearest", badgeHi: "निकटतम", badgeType: "nearest" },
      { name: "Khanna APMC", distance: "95 km", rate: 2230, transport: -65, netProfit: 2165, badge: "⭐ Best Profit (+₹80)", badgeHi: "⭐ सर्वाधिक मुनाफा (+₹80)", badgeType: "best" },
      { name: "Azadpur APMC", distance: "130 km", rate: 2260, transport: -85, netProfit: 2175, badge: "Normal", badgeHi: "सामान्य", badgeType: "normal" }
    ],
    bars: [
      { day: "Mon", dayHi: "सोम", price: 2120, height: "62%" },
      { day: "Tue", dayHi: "मंगल", price: 2150, height: "70%" },
      { day: "Wed", dayHi: "बुध", price: 2190, height: "82%" },
      { day: "Thu", dayHi: "गुरु", price: 2240, height: "98%", isPeak: true },
      { day: "Fri", dayHi: "शुक्र", price: 2210, height: "88%" },
      { day: "Sat", dayHi: "शनि", price: 2170, height: "74%" },
      { day: "Sun", dayHi: "रवि", price: 2140, height: "66%" }
    ]
  },
  Maize: {
    decision: "SELL WITHIN 3 DAYS",
    decisionHi: "3 दिन में मक्का बेचें",
    currentPrice: 1890,
    targetPrice: 1980,
    expectedGain: 90,
    confidence: "96.2%",
    mandiRows: [
      { name: "Farrukhabad APMC", distance: "15 km", rate: 1890, transport: -40, netProfit: 1850, badge: "Nearest", badgeHi: "निकटतम", badgeType: "nearest" },
      { name: "Indore APMC", distance: "450 km", rate: 2080, transport: -160, netProfit: 1920, badge: "⭐ Best Profit (+₹70)", badgeHi: "⭐ सर्वाधिक मुनाफा (+₹70)", badgeType: "best" },
      { name: "Agra APMC", distance: "110 km", rate: 1940, transport: -65, netProfit: 1875, badge: "Normal", badgeHi: "सामान्य", badgeType: "normal" }
    ],
    bars: [
      { day: "Mon", dayHi: "सोम", price: 1890, height: "65%" },
      { day: "Tue", dayHi: "मंगल", price: 1930, height: "78%" },
      { day: "Wed", dayHi: "बुध", price: 1980, height: "98%", isPeak: true },
      { day: "Thu", dayHi: "गुरु", price: 1940, type: "drop", height: "80%" },
      { day: "Fri", dayHi: "शुक्र", price: 1910, type: "drop", height: "70%" },
      { day: "Sat", dayHi: "शनि", price: 1880, type: "drop", height: "60%" },
      { day: "Sun", dayHi: "रवि", price: 1850, type: "drop", height: "50%" }
    ]
  },
  Soyabean: {
    decision: "HOLD FOR 5 DAYS",
    decisionHi: "5 दिन सोयाबीन रोकें",
    currentPrice: 5280,
    targetPrice: 5510,
    expectedGain: 230,
    confidence: "95.1%",
    mandiRows: [
      { name: "Indore APMC", distance: "18 km", rate: 5280, transport: -45, netProfit: 5235, badge: "Nearest", badgeHi: "निकटतम", badgeType: "nearest" },
      { name: "Farrukhabad APMC", distance: "450 km", rate: 5540, transport: -190, netProfit: 5350, badge: "⭐ Best Profit (+₹115)", badgeHi: "⭐ सर्वाधिक मुनाफा (+₹115)", badgeType: "best" },
      { name: "Mathura APMC", distance: "480 km", rate: 5490, transport: -200, netProfit: 5290, badge: "Normal", badgeHi: "सामान्य", badgeType: "normal" }
    ],
    bars: [
      { day: "Mon", dayHi: "सोम", price: 5280, height: "60%" },
      { day: "Tue", dayHi: "मंगल", price: 5340, height: "70%" },
      { day: "Wed", dayHi: "बुध", price: 5410, height: "80%" },
      { day: "Thu", dayHi: "गुरु", price: 5470, height: "90%" },
      { day: "Fri", dayHi: "शुक्र", price: 5510, height: "98%", isPeak: true },
      { day: "Sat", dayHi: "शनि", price: 5460, height: "85%" },
      { day: "Sun", dayHi: "रवि", price: 5400, height: "75%" }
    ]
  },
  "Chilli Red": {
    decision: "SELL WITHIN 2 DAYS",
    decisionHi: "2 दिन में लाल मिर्च बेचें",
    currentPrice: 16800,
    targetPrice: 17650,
    expectedGain: 850,
    confidence: "93.4%",
    mandiRows: [
      { name: "Guntur APMC", distance: "10 km", rate: 16800, transport: -60, netProfit: 16740, badge: "Nearest", badgeHi: "निकटतम", badgeType: "nearest" },
      { name: "Kolkata APMC", distance: "1180 km", rate: 18400, transport: -550, netProfit: 17850, badge: "⭐ Best Profit (+₹1110)", badgeHi: "⭐ सर्वाधिक मुनाफा (+₹1110)", badgeType: "best" },
      { name: "Azadpur APMC", distance: "1720 km", rate: 18900, transport: -780, netProfit: 18120, badge: "Normal", badgeHi: "सामान्य", badgeType: "normal" }
    ],
    bars: [
      { day: "Mon", dayHi: "सोम", price: 16800, height: "65%" },
      { day: "Tue", dayHi: "मंगल", price: 17200, height: "80%" },
      { day: "Wed", dayHi: "बुध", price: 17650, height: "98%", isPeak: true },
      { day: "Thu", dayHi: "गुरु", price: 17150, type: "drop", height: "78%" },
      { day: "Fri", dayHi: "शुक्र", price: 16700, type: "drop", height: "65%" },
      { day: "Sat", dayHi: "शनि", price: 16200, type: "drop", height: "55%" },
      { day: "Sun", dayHi: "रवि", price: 15900, type: "drop", height: "45%" }
    ]
  }
};

/**
 * Returns fallback preset data for a given crop ID, defaulting to Potato.
 * @param {string} crop
 * @returns {object}
 */
export function getFallbackPreset(crop) {
  return CROP_DATA_PRESETS[crop] || CROP_DATA_PRESETS.Potato;
}
