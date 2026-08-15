import React from 'react';
import heroImg from '../../../assets/hero/background.png';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

export default function FarmerHeader({
  crop = "Potato",
  mandi = "Agra",
  prediction = null,
  arbitrage = null
}) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isHi = lang === 'hi';

  const defaultDemoName = isHi ? "किसान मित्र" : "Kisan Mitra";
  const farmerName = user?.full_name?.split(' ')[0] || defaultDemoName;

  const cropNamesHi = {
    Potato: "आलू",
    Onion: "प्याज",
    Tomato: "टमाटर",
    Wheat: "गेहूं",
    "Paddy(Dhan)": "धान / चावल",
    Maize: "मक्का",
    Soyabean: "सोयाबीन",
    Mustard: "सरसों",
    "Gram(Chana)": "चना",
    "Chilli Red": "लाल मिर्च"
  };
  const activeCropName = isHi ? (cropNamesHi[crop] || crop) : crop;

  // Dynamic calculations from prediction & arbitrage props across 5 sectors
  const defaultPrices = {
    Potato: 1480,
    Onion: 2250,
    Tomato: 2420,
    Wheat: 2180,
    "Paddy(Dhan)": 2120,
    Maize: 1890,
    Soyabean: 4650,
    Mustard: 5350,
    "Gram(Chana)": 5280,
    "Chilli Red": 16800
  };
  const defaultMsps = {
    Potato: 800,
    Onion: 1200,
    Tomato: 1500,
    Wheat: 2275,
    "Paddy(Dhan)": 2183,
    Maize: 2090,
    Soyabean: 4600,
    Mustard: 5650,
    "Gram(Chana)": 5440,
    "Chilli Red": 12000
  };

  const currentPrice = prediction?.p50_median_price ? Math.round(prediction.p50_median_price) : (defaultPrices[crop] || 1650);
  const cropMsp = defaultMsps[crop] || 800;
  const mspDifference = Math.max(0, currentPrice - cropMsp);

  const bestMandiOpportunity = arbitrage?.opportunities && arbitrage.opportunities.length > 0 ? arbitrage.opportunities[0] : null;
  const bestMandiName = bestMandiOpportunity?.target_market || (crop === 'Onion' ? 'Lasalgaon APMC' : 'Khanna APMC');
  const netGainVal = Number(bestMandiOpportunity?.net_gain_per_qtl) || 50;
  const bestMandiNet = Math.round(currentPrice + netGainVal);

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#041514] via-[#07241c] to-[#087A45] border border-[#2DFF68]/30 shadow-2xl p-5 sm:p-6 text-white space-y-4 font-['Inter']">
      {/* Background Hero Asset with Soft Dark Overlay */}
      <img
        src={heroImg}
        alt="AgriTech Field"
        className="absolute right-0 top-0 h-full w-full md:w-3/5 object-cover object-[75%_center] opacity-40 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#041514] via-[#041514]/85 to-transparent pointer-events-none" />

      {/* Greeting Title & Quick Summary Stat Pills */}
      <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Left: Personalized Greeting */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            {isHi ? `नमस्ते, ${farmerName}! 👋` : `Welcome, ${farmerName}! 👋`}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/90 font-medium">
            {isHi ? `आज का ${activeCropName} का (${mandi}) मार्केट कैसा है?` : `How is the ${crop.toLowerCase()} market in ${mandi} today?`}
          </p>
        </div>

        {/* Right: 5 Quick-Summary Glass Stat Cards */}
        <div className="w-full xl:w-auto flex flex-wrap items-center gap-2">
          {/* Stat 1: Today's Rate */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#082018]/80 backdrop-blur-md border border-[#087A45]/60 shadow-md text-xs">
            <div className="h-8 w-8 rounded-xl bg-[#2DFF68]/20 border border-[#2DFF68]/30 text-[#2DFF68] flex items-center justify-center font-black text-sm">
              ₹
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-emerald-400/90 uppercase tracking-wider">{isHi ? "आज का भाव" : "TODAY'S RATE"}</p>
              <p className="text-xs font-black text-white">₹{currentPrice.toLocaleString('en-IN')} <span className="text-[10px] text-[#2DFF68] font-bold">↑ ₹18 (1.7%)</span></p>
            </div>
          </div>

          {/* Stat 2: Arrivals */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#082018]/80 backdrop-blur-md border border-[#087A45]/60 shadow-md text-xs">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center font-bold text-xs">
              🚚
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">{isHi ? "आवक" : "ARRIVALS"}</p>
              <p className="text-xs font-black text-rose-400">1,250 qtl <span className="text-[10px] text-slate-300 font-normal">{isHi ? "(सामान्य आवक)" : "(vs 7d avg)"}</span></p>
            </div>
          </div>

          {/* Stat 3: Weather Risk */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#082018]/80 backdrop-blur-md border border-[#087A45]/60 shadow-md text-xs">
            <div className="h-8 w-8 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center font-bold text-xs">
              🌧️
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider">{isHi ? "मौसम" : "WEATHER"}</p>
              <p className="text-xs font-black text-white">{isHi ? "सामान्य वर्षा पूर्वानुमान" : "Moderate Rain Risk"}</p>
            </div>
          </div>

          {/* Stat 4: Best Mandi */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#082018]/80 backdrop-blur-md border border-amber-400/50 shadow-md text-xs">
            <div className="h-8 w-8 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-300 flex items-center justify-center font-bold text-xs">
              🏆
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">{isHi ? "सर्वश्रेष्ठ मंडी" : "BEST MANDI"}</p>
              <p className="text-xs font-black text-white">{bestMandiName} <span className="text-[10px] text-[#2DFF68] font-bold">₹{bestMandiNet.toLocaleString('en-IN')} net</span></p>
            </div>
          </div>

          {/* Stat 5: MSP Benchmark */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#082018]/80 backdrop-blur-md border border-[#087A45]/60 shadow-md text-xs">
            <div className="h-8 w-8 rounded-xl bg-[#2DFF68]/20 border border-[#2DFF68]/30 text-[#2DFF68] flex items-center justify-center font-bold text-xs">
              🛡️
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">{isHi ? `MSP (${crop.toUpperCase()})` : `MSP (${crop.toUpperCase()})`}</p>
              <p className="text-xs font-black text-white">₹{cropMsp} <span className="text-[10px] text-[#2DFF68] font-bold">+₹{mspDifference} above</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
