import React, { useState, useEffect } from 'react';
import { ShieldCheck, PhoneCall, Clock } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export default function FarmerFooter() {
  const { lang } = useLanguage();
  const isHi = lang === 'hi';
  const [syncTime, setSyncTime] = useState("");

  useEffect(() => {
    setSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);

  return (
    <footer className="mt-8 border-t border-slate-200 bg-white py-3 px-4 sm:px-6 font-['Inter'] text-slate-600 text-xs shadow-sm">
      <div className="max-w-[1550px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Dynamic Live Sync Timestamp */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <Clock className="h-3.5 w-3.5 text-[#046c4e] shrink-0" />
          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
            {isHi ? "लाइव डेटा स्थिति:" : "LIVE SYNC:"}
          </span>
          <span className="text-slate-700 font-bold">
            {isHi ? `आज सिंक हुआ: ${syncTime || "07:24 PM"}` : `Updated today at ${syncTime || "07:24 PM"}`}
          </span>
        </div>

        {/* Center: Brand Intelligence Label */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-[#046c4e]" />
          <span>{isHi ? "CropLens AI © 2026 • आधिकारिक मंडी इंटेलिजेंस इंजन" : "CropLens AI © 2026 • Official Mandi Intelligence Engine"}</span>
        </div>

        {/* Right: Official Government Kisan Call Center Hotline */}
        <a
          href="tel:18001801551"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#046c4e] hover:bg-[#065f46] text-white font-extrabold text-[11px] shadow-sm transition"
        >
          <PhoneCall className="h-3.5 w-3.5 text-white animate-bounce" />
          <span>{isHi ? "किसान कॉल सेंटर: 1800-180-1551" : "Govt Kisan Call Center: 1800-180-1551"}</span>
        </a>
      </div>
    </footer>
  );
}
