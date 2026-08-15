import React, { useState, useEffect } from 'react';
import onionImg from '../../assets/crops/onion.png';
import tomatoImg from '../../assets/crops/tomato.png';
import potatoImg from '../../assets/crops/potato.png';
import { useLanguage } from '../../context/LanguageContext';

const SNAPSHOTS = [
  {
    crop: "Onion",
    mandi: "Lasalgaon Mandi",
    state: "Maharashtra",
    price: "₹2,850",
    forecast: "₹3,050",
    change: "+7.0% ↑",
    isUp: true,
    img: onionImg,
    sparkline: "M4 32 Q 25 28, 40 20 T 76 10"
  },
  {
    crop: "Tomato",
    mandi: "Azadpur Mandi",
    state: "Delhi",
    price: "₹2,100",
    forecast: "₹2,350",
    change: "+11.9% ↑",
    isUp: true,
    img: tomatoImg,
    sparkline: "M4 35 Q 25 30, 45 18 T 76 6"
  },
  {
    crop: "Potato",
    mandi: "Kolar Mandi",
    state: "Karnataka",
    price: "₹1,650",
    forecast: "₹1,780",
    change: "+7.8% ↑",
    isUp: true,
    img: potatoImg,
    sparkline: "M4 30 Q 25 24, 45 16 T 76 12"
  }
];

export default function LandingHero() {
  const { t } = useLanguage();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SNAPSHOTS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const snapshot = SNAPSHOTS[activeIdx];

  return (
    <div className="space-y-4 font-['Inter']">
      {/* Headline & Subtitle */}
      <div className="space-y-2.5">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F6F4EC] leading-[1.15] tracking-tight">
          AI-Powered <br />
          Market Intelligence <br />
          <span className="text-[#2DFF68]">for Farmers & Traders</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#B5C0BD] font-medium max-w-xl">
          Real-time prices. AI forecasts. Smarter decisions for better tomorrow.
        </p>
      </div>

      {/* Streamlined Live Market Snapshot Card */}
      <div className="rounded-2xl p-4 border border-[#2DFF68]/25 bg-[#021a12]/80 backdrop-blur-2xl shadow-2xl space-y-4 font-['Inter']">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#2DFF68] font-bold uppercase tracking-wider text-[10px]">
            {t("snapshot.title")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#2DFF68] text-[10px] font-bold bg-[#041514] px-2 py-0.5 rounded-full border border-[#2DFF68]/40 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2DFF68] live-dot"></span>
            {t("snapshot.live")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Left: Crop Image & Price */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 h-16 w-16 relative flex items-center justify-center">
              <img
                key={snapshot.crop}
                src={snapshot.img}
                alt={snapshot.crop}
                className="h-16 w-16 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] transform transition-transform duration-500 hover:scale-110"
              />
            </div>
            <div>
              <p className="text-xs text-[#B5C0BD] font-extrabold">{snapshot.crop} • {snapshot.mandi}</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-[#F6F4EC] tracking-tight">{snapshot.price}</span>
                <span className="text-[10px] text-[#889693] font-normal">{t("snapshot.perQuintal")}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-extrabold text-[#2DFF68] bg-[#087A45]/30 px-2 py-0.5 rounded-full border border-[#2DFF68]/30">
                  +3.2%
                </span>
                <span className="text-[10px] text-[#B5C0BD]">vs yesterday</span>
              </div>
            </div>
          </div>

          {/* Right: 7-Day Forecast & Glowing Sparkline */}
          <div className="flex flex-col items-start sm:items-end justify-between space-y-2">
            <div className="text-left sm:text-right">
              <p className="text-[10px] text-[#B5C0BD] font-medium">{t("snapshot.forecast")}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-[#2DFF68]">{snapshot.forecast}</span>
                <span className="text-[10px] font-bold text-[#2DFF68] bg-[#041514] px-1.5 py-0.5 rounded border border-[#2DFF68]/30">
                  {snapshot.change}
                </span>
              </div>
            </div>

            {/* Glowing Node Sparkline */}
            <div className="w-28 h-7 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                <path
                  d="M 5 32 Q 30 28, 55 18 T 95 8"
                  fill="none"
                  stroke="#2DFF68"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="5" cy="32" r="2.5" fill="#2DFF68" />
                <circle cx="35" cy="25" r="2.5" fill="#2DFF68" />
                <circle cx="65" cy="15" r="2.5" fill="#2DFF68" />
                <circle cx="95" cy="8" r="3.5" fill="#2DFF68" className="animate-ping opacity-75" />
                <circle cx="95" cy="8" r="3.5" fill="#2DFF68" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Row: Forecast Confidence */}
        <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[#B5C0BD] font-medium">Forecast Confidence</span>
            <span className="text-[#2DFF68] font-bold">92%</span>
            <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#2DFF68] h-full rounded-full w-[92%]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
