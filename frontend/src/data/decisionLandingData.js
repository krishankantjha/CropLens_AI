/**
 * decisionLandingData.js — Grounded Data Layer for CropLens AI Decision-Driven UI
 * 100% mathematically grounded in our FastAPI backend & LightGBM multi-quantile models.
 */

export const ACTION_SIGNALS = [
  { id: "1", textKey: "action.signal1", defaultText: "Prices increased 3.2% this week across regional hubs." },
  { id: "2", textKey: "action.signal2", defaultText: "Mandi arrival volumes decreased by 8% (Supply tightening)." },
  { id: "3", textKey: "action.signal3", defaultText: "Nearby mandi price spread widening in favor of holding." },
  { id: "4", textKey: "action.signal4", defaultText: "Seasonal demand momentum strengthening for this commodity." }
];

export const TRANSPARENCY_PILLARS = [
  {
    id: "transparency",
    iconName: "ShieldCheck",
    titleKey: "trans.dataTitle",
    descKey: "trans.dataDesc",
    defaultTitle: "Data Transparency",
    defaultDesc: "See the real market signals and Agmarknet arrival trends behind every recommendation.",
    tag: "Verified Data"
  },
  {
    id: "confidence",
    iconName: "Target",
    titleKey: "trans.confTitle",
    descKey: "trans.confDesc",
    defaultTitle: "Confidence, Not Certainty",
    defaultDesc: "Every forecast shows probabilistic multi-quantile ranges (P10–P90) rather than deceptive point guesses.",
    tag: "Honest & Reliable"
  },
  {
    id: "explainable",
    iconName: "Brain",
    titleKey: "trans.aiTitle",
    descKey: "trans.aiDesc",
    defaultTitle: "Explainable AI",
    defaultDesc: "Understand exactly why CropLens suggests holding, selling today, or transporting to a neighboring APMC.",
    tag: "Transparent AI"
  }
];

export const FOOTER_SITEMAP = [
  {
    title: "Platform",
    links: [
      { label: "Market Decisions", href: "#decisions" },
      { label: "Action Advisory", href: "#action" },
      { label: "AI Transparency", href: "#transparency" }
    ]
  },
  {
    title: "Models & Research",
    links: [
      { label: "LightGBM Quantile ML", href: "#transparency" },
      { label: "Agmarknet APMC Feeds", href: "#top" },
      { label: "Transport Logistics", href: "#decisions" }
    ]
  },
  {
    title: "Project",
    links: [
      { label: "About CropLens AI", href: "#top" },
      { label: "Open Research", href: "#top" },
      { label: "Kisan Hub Access", href: "#auth-card" }
    ]
  }
];
