import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const TICKER_ITEMS = [
  { crop: "Tomato", mandi: "Azadpur", price: "₹2,100/qtl", change: "+3.2%", status: "up" },
  { crop: "Onion", mandi: "Lasalgaon", price: "₹2,850/qtl", change: "-1.1%", status: "down" },
  { crop: "Potato", mandi: "Kolar", price: "₹1,650/qtl", change: "+4.8%", status: "up" },
  { crop: "Tomato", mandi: "Agra", price: "₹1,920/qtl", change: "+2.6%", status: "up" },
  { crop: "Onion", mandi: "Narayangaon", price: "₹2,720/qtl", change: "-0.5%", status: "down" },
  { crop: "Potato", mandi: "Agra", price: "₹1,680/qtl", change: "+1.9%", status: "up" }
];

export default function MandiTicker() {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-[#080d09] border-b border-emerald-950/60 py-2.5 px-4 overflow-hidden flex items-center justify-between text-xs sm:text-sm">
      <div className="flex items-center gap-2 pr-4 shrink-0 border-r border-slate-800 z-10 bg-[#080d09]">
        <span className="h-2 w-2 rounded-full bg-emerald-400 live-dot"></span>
        <span className="font-semibold text-slate-300 tracking-wide">{t("ticker.live")}</span>
      </div>

      <div className="overflow-hidden whitespace-nowrap w-full flex items-center">
        <div className="inline-flex gap-8 animate-ticker">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 text-slate-300">
              <span className={item.status === 'up' ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                {item.status === 'up' ? '🟢' : '🔴'} {item.mandi} {item.crop}:
              </span>
              <span className="font-semibold text-white">{item.price}</span>
              <span className={item.status === 'up' ? 'text-emerald-400 text-xs font-bold' : 'text-rose-400 text-xs font-bold'}>
                ({item.change} {item.status === 'up' ? '↑' : '↓'})
              </span>
              <span className="text-slate-700 ml-4">|</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pl-4 shrink-0 border-l border-slate-800 z-10 bg-[#080d09] flex items-center gap-1 text-emerald-400 font-medium text-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
        Live
      </div>
    </div>
  );
}
