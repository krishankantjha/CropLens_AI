import React, { useState } from 'react';
import { Truck, MapPin, Award, Map, Table } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import InteractiveMandiMap from '../../../components/shared/InteractiveMandiMap';
import { safeNumber, formatCurrency, calculateNetProfit } from '../../../utils/numberUtils';

const DEFAULT_ROWS = [
  {
    name: "Agra APMC",
    distance: "12 km",
    rate: 1650,
    transport: -40,
    netProfit: 1610,
    badge: "Nearest",
    badgeHi: "निकटतम",
    badgeType: "nearest"
  },
  {
    name: "Farrukhabad APMC",
    distance: "110 km",
    rate: 1590,
    transport: -70,
    netProfit: 1520,
    badge: "⭐ Best Profit (+₹80)",
    badgeHi: "⭐ सर्वाधिक मुनाफा (+₹80)",
    badgeType: "best"
  },
  {
    name: "Mathura APMC",
    distance: "45 km",
    rate: 1710,
    transport: -95,
    netProfit: 1615,
    badge: "Normal",
    badgeHi: "सामान्य",
    badgeType: "normal"
  }
];

export default function NetProfitTable({ rows }) {
  const { lang, t } = useLanguage();
  const [viewMode, setViewMode] = useState('table');
  const isHi = lang === 'hi';

  const validRows = (rows && rows.length > 0) ? rows : DEFAULT_ROWS;

  const mandiRows = validRows.map((r, idx) => {
    const rateNum = safeNumber(r.rate || r.modal_price);
    const transportRaw = safeNumber(r.transport || r.estimated_transport_cost);
    const transportNum = transportRaw !== null ? -Math.abs(transportRaw) : null;
    const netProfitNum = (rateNum !== null && transportNum !== null) 
      ? calculateNetProfit(rateNum, transportNum)
      : safeNumber(r.netProfit || r.net_profit);

    return {
      name: r.name || r.mandi_name || `Mandi ${idx + 1}`,
      distance: r.distance || (idx === 1 ? "35 km" : idx === 2 ? "45 km" : "12 km"),
      rate: rateNum,
      transport: transportNum,
      netProfit: netProfitNum,
      badge: r.badge || (idx === 1 ? "⭐ Best Choice" : idx === 0 ? "Nearest" : "Normal"),
      badgeHi: r.badgeHi || (idx === 1 ? "⭐ सर्वाधिक मुनाफा" : idx === 0 ? "निकटतम" : "सामान्य"),
      badgeType: r.badgeType || (idx === 1 ? "best" : idx === 0 ? "nearest" : "normal")
    };
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 hover:shadow-lg transition-all duration-300 font-['Inter']">
      {/* Header Title & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Truck className="h-5 w-5 text-[#046c4e]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {t("farmer.table.title")}
              <span className="text-xs text-slate-500 font-medium">{t("farmer.table.subtitle")}</span>
            </h4>
          </div>
        </div>

        {/* View Toggle Controls */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            {isHi ? "तालिका देखें" : "Table View"}
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'map'
                ? 'bg-[#046c4e] text-white shadow-sm border border-[#046c4e]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Map className="h-3.5 w-3.5" />
            {isHi ? "मानचित्र देखें" : "Map View"}
          </button>
        </div>
      </div>

      {/* Conditionally Render Table or Interactive Map */}
      {viewMode === 'map' ? (
        <InteractiveMandiMap rows={mandiRows} height="360px" />
      ) : (
        <div className="space-y-2.5">
          {mandiRows.map((row, idx) => (
            <div
              key={idx}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                row.badgeType === 'best'
                  ? 'bg-gradient-to-r from-[#fffdf0] via-[#fefce8] to-[#fffdf0] border-amber-300 shadow-md ring-1 ring-amber-300/60'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Left: Mandi Name & Distance */}
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  row.badgeType === 'best' ? 'bg-amber-400/20 border border-amber-400 text-amber-900' : 'bg-slate-200/60 text-slate-600'
                }`}>
                  {row.badgeType === 'best' ? <Award className="h-5 w-5 text-amber-600" /> : <MapPin className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{row.name}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                    📍 {row.distance}
                  </span>
                </div>
              </div>

              {/* Middle: Market Rate & Transport Cost */}
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t("farmer.table.rate")}</p>
                  <p className="font-extrabold text-slate-900">{formatCurrency(row.rate)}</p>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t("farmer.table.transport")}</p>
                  <p className="font-bold text-rose-500">{row.transport !== null ? `-₹${Math.abs(row.transport)}` : '₹—'}</p>
                </div>
              </div>

              {/* Right: Net Profit & Badge */}
              <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                <div className="text-right">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{t("farmer.table.profit")}</p>
                  <p className="text-base font-black text-[#046c4e]">{formatCurrency(row.netProfit, '—')}</p>
                </div>

                {row.badgeType === 'best' ? (
                  <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1">
                    {isHi ? (row.badgeHi || row.badge) : row.badge}
                  </span>
                ) : row.badgeType === 'nearest' ? (
                  <span className="px-3 py-1.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] font-semibold text-xs">
                    {isHi ? (row.badgeHi || row.badge) : row.badge}
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-medium text-xs">
                    {isHi ? (row.badgeHi || row.badge) : row.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
