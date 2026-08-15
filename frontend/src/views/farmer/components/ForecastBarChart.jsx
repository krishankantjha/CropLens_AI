import React from 'react';
import { BarChart3, Star } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

const DEFAULT_BARS = [
  { day: "Mon", dayHi: "सोम", price: 1650, height: "65%" },
  { day: "Tue", dayHi: "मंगल", price: 1680, height: "72%" },
  { day: "Wed", dayHi: "बुध", price: 1710, height: "78%" },
  { day: "Thu", dayHi: "गुरु", price: 1750, height: "88%" },
  { day: "Fri", dayHi: "शुक्र", price: 1780, height: "98%", isPeak: true },
  { day: "Sat", dayHi: "शनि", price: 1740, type: "drop", height: "85%" },
  { day: "Sun", dayHi: "रवि", price: 1690, height: "74%" }
];

export default function ForecastBarChart({ mandi = "Agra APMC", bars = DEFAULT_BARS }) {
  const { lang, t } = useLanguage();
  const chartBars = bars || DEFAULT_BARS;
  const isHi = lang === 'hi';

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-md space-y-4 hover:shadow-lg transition-all duration-300 font-['Inter']">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-[#046c4e]" />
          </div>
          {t("farmer.chart.title")} ({mandi})
        </h4>
      </div>

      {/* Bar Chart Container with Background Gridlines */}
      <div className="relative h-48 pt-6 pb-2 px-2 border-b border-slate-200 flex items-end justify-between gap-2">
        {/* Subtle Horizontal Gridlines */}
        <div className="absolute inset-x-0 top-6 border-t border-slate-100 flex justify-end pr-1 text-[9px] font-medium text-slate-300">₹1,800</div>
        <div className="absolute inset-x-0 top-20 border-t border-slate-100 flex justify-end pr-1 text-[9px] font-medium text-slate-300">₹1,700</div>
        <div className="absolute inset-x-0 top-32 border-t border-slate-100 flex justify-end pr-1 text-[9px] font-medium text-slate-300">₹1,600</div>

        {chartBars.map((d, idx) => (
          <div key={idx} className="relative z-10 flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
            {/* Floating Price Tag */}
            <span className={`text-[10px] font-extrabold tracking-tight ${d.isPeak ? 'text-[#046c4e] text-xs scale-110' : 'text-slate-700'}`}>
              ₹{d.price}
            </span>

            {/* Rounded Gradient Visual Bar */}
            <div
              className={`w-full max-w-[36px] rounded-t-xl transition-all duration-300 relative group-hover:scale-105 ${
                d.isPeak
                  ? 'bg-gradient-to-t from-[#046c4e] via-[#10b981] to-[#34d399] shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                  : d.type === 'drop'
                  ? 'bg-gradient-to-t from-rose-500 to-rose-400'
                  : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
              }`}
              style={{ height: d.height }}
            >
              {d.isPeak && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-br from-amber-300 to-amber-400 rounded-full p-1 shadow-md shadow-amber-400/40">
                  <Star className="h-3 w-3 text-amber-950 fill-amber-950" />
                </div>
              )}
            </div>

            {/* Day Label */}
            <span className={`text-[11px] font-semibold ${d.isPeak ? 'text-[#046c4e] font-extrabold' : 'text-slate-500'}`}>
              {isHi ? (d.dayHi || d.day) : d.day}
            </span>
          </div>
        ))}
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 font-semibold pt-1">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm"></span> {t("farmer.chart.rise")}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-sm"></span> {t("farmer.chart.drop")}</span>
        <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" /> {t("farmer.chart.peak")}</span>
      </div>
    </div>
  );
}
