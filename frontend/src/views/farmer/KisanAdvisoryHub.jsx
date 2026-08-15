import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FarmerNavbar from './components/FarmerNavbar';
import FarmerHeader from './components/FarmerHeader';
import FarmerFooter from './components/FarmerFooter';
import AdvisoryDecisionCard from './components/AdvisoryDecisionCard';
import VoiceAdvisoryCard from './components/VoiceAdvisoryCard';
import NetProfitTable from './components/NetProfitTable';
import ForecastBarChart from './components/ForecastBarChart';
import { fetchPricePrediction, fetch7DayForecast, fetchArbitrage, fetchAnalyticsTrends, fetchSupplyShocks } from '../../services/api';
import { getTodayDateString, formatWeekday } from '../../utils/dateUtils';

import FarmerAlertsView from './pages/FarmerAlertsView';
import FarmerMoreView from './pages/FarmerMoreView';

const CROP_DATA_PRESETS = {
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

export default function KisanAdvisoryHub() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [crop, setCrop] = useState('Potato');
  const [mandi, setMandi] = useState('Agra');

  const [prediction, setPrediction] = useState(null);
  const [forecast7d, setForecast7d] = useState(null);
  const [arbitrage, setArbitrage] = useState(null);
  const [trends, setTrends] = useState(null);
  const [shocks, setShocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const currentRequestId = useRef(0);

  const loadKisanData = useCallback(async () => {
    const requestId = ++currentRequestId.current;
    setLoading(true);
    setApiError(null);

    const todayDate = getTodayDateString();

    try {
      const [predRes, forecast7dRes, arbRes, trendRes, shockRes] = await Promise.all([
        fetchPricePrediction({ commodity: crop, market: mandi, date: todayDate }).catch(() => null),
        fetch7DayForecast(crop, mandi, todayDate).catch(() => null),
        fetchArbitrage(crop, mandi, todayDate).catch(() => null),
        fetchAnalyticsTrends(crop, mandi, 7).catch(() => null),
        fetchSupplyShocks(crop, mandi).catch(() => null)
      ]);

      if (requestId === currentRequestId.current) {
        if (predRes) setPrediction(predRes);
        if (forecast7dRes) setForecast7d(forecast7dRes);
        if (arbRes) setArbitrage(arbRes);
        if (trendRes) setTrends(trendRes);
        if (shockRes) setShocks(shockRes?.shocks || []);
      }
    } catch (err) {
      if (requestId === currentRequestId.current) {
        console.error('Kisan Hub Live Data Fetch Error:', err);
        setApiError(err.message || 'Live API connection error. Showing fallback advisory preset.');
      }
    } finally {
      if (requestId === currentRequestId.current) {
        setLoading(false);
      }
    }
  }, [crop, mandi]);

  useEffect(() => {
    loadKisanData();
  }, [loadKisanData]);

  const preset = CROP_DATA_PRESETS[crop] || CROP_DATA_PRESETS.Potato;

  const currentPrice = forecast7d?.current_price
    ? Math.round(forecast7d.current_price)
    : (prediction?.p50_median_price ? Math.round(prediction.p50_median_price) : preset.currentPrice);

  const targetPrice = forecast7d?.peak_day?.price
    ? Math.round(forecast7d.peak_day.price)
    : (prediction?.p90_ceiling_price ? Math.round(prediction.p90_ceiling_price) : preset.targetPrice);

  const expectedGain = forecast7d?.expected_gain !== undefined
    ? Math.round(forecast7d.expected_gain)
    : Math.max(0, targetPrice - currentPrice);

  const decision = forecast7d?.decision || (expectedGain > 50 ? "HOLD FOR 5 DAYS" : "SELL NOW");
  const decisionHi = forecast7d?.decision_hi || (expectedGain > 50 ? "5 दिन फसल रोके रखें" : "आज ही फसल बेचें");

  const confidence = forecast7d?.confidence || preset.confidence;

  const mandiRows = arbitrage?.opportunities && arbitrage.opportunities.length > 0
    ? arbitrage.opportunities.map((op, idx) => ({
        name: op.target_market || op.destination_market,
        distance: `${op.distance_km || (idx + 1) * 15} km`,
        rate: Math.round(op.modal_price || op.destination_price),
        transport: -Math.round(Math.abs(op.transport_cost_per_qtl || 50)),
        badgeHi: op.is_recommended ? `⭐ सर्वाधिक मुनाफा (+₹${Math.round(op.price_difference)})` : idx === 0 ? "निकटतम" : "सामान्य",
        badgeType: op.is_recommended ? 'best' : idx === 0 ? 'nearest' : 'normal'
      }))
    : preset.mandiRows;

  // Format dynamic 7-Day Forecast Bars from Roll-Forward ML Engine (or trends/preset fallback)
  const bars = forecast7d?.forecasts && forecast7d.forecasts.length >= 7
    ? forecast7d.forecasts.map((pt) => ({
        day: pt.day_name,
        dayHi: pt.day_name_hi,
        price: Math.round(pt.price),
        height: pt.height,
        isPeak: pt.is_peak,
        type: pt.type
      }))
    : (trends?.historical_points && trends.historical_points.length >= 5
      ? trends.historical_points.map((pt, idx) => {
          const dayEn = formatWeekday(pt.date, 'en-US');
          const dayHiMap = { Mon: "सोम", Tue: "मंगल", Wed: "बुध", Thu: "गुरु", Fri: "शुक्र", Sat: "शनि", Sun: "रवि" };
          const priceVal = Math.round(pt.modal_price);
          const maxPrice = Math.max(...trends.historical_points.map(p => p.modal_price));
          const minPrice = Math.min(...trends.historical_points.map(p => p.modal_price));
          const heightPct = Math.max(40, Math.min(98, ((priceVal - minPrice * 0.8) / ((maxPrice - minPrice * 0.8) || 1)) * 100));

          return {
            day: dayEn,
            dayHi: dayHiMap[dayEn] || dayEn,
            price: priceVal,
            height: `${heightPct.toFixed(0)}%`,
            isPeak: priceVal === Math.round(maxPrice),
            type: idx > 0 && priceVal < Math.round(trends.historical_points[idx - 1].modal_price) ? 'drop' : 'rise'
          };
        })
      : preset.bars);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-['Inter']">
      {/* Top Sticky Horizontal Navbar */}
      <FarmerNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        crop={crop}
        setCrop={setCrop}
        mandi={mandi}
        setMandi={setMandi}
        alertsCount={shocks ? shocks.length : 0}
      />

      {/* Main Full-Width Dashboard Area */}
      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1550px] mx-auto w-full">
        {/* Personalized Greeting & 5 Quick Stat Summary Pills */}
        <FarmerHeader
          crop={crop}
          mandi={mandi}
          prediction={prediction}
          arbitrage={arbitrage}
        />

        {/* Loading Indicator Bar */}
        {loading && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#046c4e] text-xs font-bold shadow-sm animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin text-[#046c4e]" />
            Fetching Live FastAPI Market Advisory for {crop} ({mandi} Mandi)...
          </div>
        )}

        {/* API Error Notification Banner */}
        {apiError && !loading && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>⚠️ <strong>Live API Status:</strong> {apiError}</span>
            </div>
            <button
              onClick={loadKisanData}
              className="px-3 py-1 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold flex items-center gap-1 transition text-[11px]"
            >
              <RefreshCw className="h-3 w-3" /> Retry API
            </button>
          </div>
        )}

        {/* Dynamic Sub-View Switcher */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${crop}-${mandi}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'forecast' && (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                <ForecastBarChart mandi={`${mandi} APMC`} bars={bars} />
              </div>
            )}

            {activeTab === 'mandi' && (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                <NetProfitTable rows={mandiRows} />
              </div>
            )}

            {activeTab === 'alerts' && (
              <FarmerAlertsView crop={crop} mandi={mandi} />
            )}

            {activeTab === 'more' && (
              <FarmerMoreView
                crop={crop}
                mandi={mandi}
                setCrop={setCrop}
                setMandi={setMandi}
              />
            )}

            {(activeTab === 'dashboard' || activeTab === 'advisory' || !['forecast', 'mandi', 'alerts', 'more'].includes(activeTab)) && (
              <div className="space-y-6">
                {/* 3-Column Full-Width Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Column 1 (Left 5 Cols): Recommendation Card + 7-Day Forecast Bar Chart */}
                  <div className="lg:col-span-5 space-y-6">
                    <AdvisoryDecisionCard
                      decision={decision}
                      decisionHi={decisionHi}
                      currentPrice={currentPrice}
                      targetPrice={targetPrice}
                      expectedGain={expectedGain}
                      confidence={confidence}
                      crop={crop}
                      mandi={mandi}
                    />

                    <ForecastBarChart mandi={`${mandi} APMC`} bars={bars} />
                  </div>

                  {/* Column 2 (Middle 4 Cols): Voice Advisory + Net Profit Table */}
                  <div className="lg:col-span-4 space-y-6">
                    <VoiceAdvisoryCard
                      mandi={mandi}
                      crop={crop}
                      currentPrice={currentPrice}
                      targetPrice={targetPrice}
                    />

                    <NetProfitTable rows={mandiRows} />
                  </div>

                  {/* Column 3 (Right 3 Cols): Market Risk Alerts */}
                  <div className="lg:col-span-3 space-y-6">
                    <FarmerAlertsView crop={crop} mandi={mandi} />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Footer Bar */}
      <FarmerFooter />
    </div>
  );
}
