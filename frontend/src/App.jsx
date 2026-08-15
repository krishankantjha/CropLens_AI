import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/auth/LandingPage';

const KisanAdvisoryHub = lazy(() => import('./views/farmer/KisanAdvisoryHub'));

import Header from './components/shared/Header';
import KpiMetricsBar from './components/shared/KpiMetricsBar';
import Footer from './components/shared/Footer';

import QuantileForecastChart from './views/trader/components/QuantileForecastChart';
import WhatIfControls from './views/trader/components/WhatIfControls';
import SupplyShockFeed from './views/trader/components/SupplyShockFeed';
import ArbitrageMatrix from './views/trader/components/ArbitrageMatrix';
import AnalyticsTrendChart from './views/trader/components/AnalyticsTrendChart';
import ModelBenchmarksCard from './views/trader/components/ModelBenchmarksCard';
import GuestNoticeToast from './components/shared/GuestNoticeToast';
import { Download, Lock } from 'lucide-react';

import { getTodayDateString, getRecentHistoricalSequence } from './utils/dateUtils';
import {
  fetchHealthCheck,
  fetchPricePrediction,
  fetchSupplyShocks,
  fetchArbitrage,
  fetchAnalyticsTrends,
  downloadProcurementPdfApi
} from './services/api';

function MainAppContent() {
  const { isAuthenticated, user, token, logout, activeMode, setActiveMode, authLoading } = useAuth();

  const isGuest = !token || token.startsWith('demo_jwt_token');

  const todayStr = getTodayDateString();

  const [commodity, setCommodity] = useState('Tomato');
  const [market, setMarket] = useState('Azadpur');
  const [date, setDate] = useState(todayStr);

  const [arrivals, setArrivals] = useState(1250);
  const [rainfall, setRainfall] = useState(0);
  const [tempMax, setTempMax] = useState(36.5);
  const [useOverrides, setUseOverrides] = useState(false);

  const [toastMsg, setToastMsg] = useState(null);

  const [health, setHealth] = useState(null);
  const [prediction, setPrediction] = useState({
    commodity: 'Tomato',
    market: 'Azadpur',
    date: todayStr,
    p10_floor_price: 1850.25,
    p50_median_price: 2100.50,
    p90_ceiling_price: 2420.75,
    band_width: 570.50,
    band_terminology: 'P10-P90 Quantile Forecast Band',
    model_version: 'LightGBM Multi-Quantile v1.0'
  });
  const [shocks, setShocks] = useState(null);
  const [arbitrage, setArbitrage] = useState(null);
  const [trends, setTrends] = useState({
    commodity: 'Tomato',
    market: 'Azadpur',
    timeframe_days: 30,
    min_price: 1800.0,
    max_price: 2400.0,
    avg_price: 2125.50,
    price_volatility_30d: 145.20,
    price_trend_direction: 'Upward',
    historical_points: getRecentHistoricalSequence(7)
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHealthCheck().then((data) => setHealth(data));
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const reqPayload = { commodity, market, date };
      if (useOverrides) {
        reqPayload.arrivals_in_qtl = arrivals;
        reqPayload.rainfall_mm = rainfall;
        reqPayload.temp_max = tempMax;
      }

      const [predData, shockData, arbData, trendData] = await Promise.all([
        fetchPricePrediction(reqPayload),
        fetchSupplyShocks(commodity, market, 30),
        fetchArbitrage(commodity, market, date),
        fetchAnalyticsTrends(commodity, market, 30)
      ]);

      setPrediction(predData);
      setShocks(shockData);
      setArbitrage(arbData);
      setTrends(trendData);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [commodity, market, date, arrivals, rainfall, tempMax, useOverrides]);

  useEffect(() => {
    if (isAuthenticated && activeMode === 'trader') {
      loadDashboardData();
    }
  }, [commodity, market, date, isAuthenticated, activeMode, loadDashboardData]);

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (isGuest) {
      setToastMsg("Please login to download PDF report.");
      return;
    }
    if (pdfLoading) return;

    setPdfLoading(true);
    try {
      const response = await downloadProcurementPdfApi(commodity, market);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      let filename = `CropLens_Procurement_${commodity}_${market}.pdf`;
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup DOM node & Blob object URL memory
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Download Error:", err);
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setToastMsg("Session expired. Please login again.");
      } else {
        setToastMsg(err.response?.data?.detail || "Failed to download procurement PDF report.");
      }
    } finally {
      setPdfLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#071109] flex flex-col items-center justify-center text-white space-y-4 font-['Inter']">
        <div className="h-12 w-12 rounded-2xl bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <span className="h-4 w-4 rounded-full bg-[#22c55e] animate-ping"></span>
        </div>
        <p className="text-xs font-bold text-emerald-300 tracking-wider uppercase animate-pulse">
          Validating CropLens Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // IF FARMER ROLE: Render Kisan Advisory Hub
  if (activeMode === 'farmer') {
    return (
      <Suspense fallback={
        <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center text-slate-700 space-y-3 font-['Inter']">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="h-4 w-4 rounded-full bg-[#046c4e] animate-ping"></span>
          </div>
          <p className="text-xs font-bold text-[#046c4e] tracking-wide">Loading Kisan Advisory Hub...</p>
        </div>
      }>
        <KisanAdvisoryHub />
      </Suspense>
    );
  }

  // IF TRADER ROLE: Render Quantitative Analytics Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-['Inter']">
      {/* Top User Bar & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e] animate-pulse"></span>
          <span className="text-slate-300 font-semibold">
            Logged in as: <strong className="text-white font-extrabold">{user?.full_name || 'Trader User'}</strong> {isGuest && '(Guest)'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <button
            onClick={handleDownloadPdf}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm border ${
              isGuest ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            {isGuest ? <Lock className="h-4 w-4 text-amber-400" /> : <Download className="h-4 w-4" />} Download PDF Report
          </button>

          <button
            onClick={() => setActiveMode('farmer')}
            className="px-3.5 py-2 rounded-xl bg-[#22c55e]/20 text-emerald-300 font-bold border border-[#22c55e]/40 hover:bg-[#22c55e]/30 transition shadow-sm"
          >
            Switch to 🌾 Kisan Advisory
          </button>

          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 hover:bg-rose-500/30 transition shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <Header
        commodity={commodity}
        setCommodity={setCommodity}
        market={market}
        setMarket={setMarket}
        date={date}
        setDate={setDate}
        onRefresh={loadDashboardData}
        loading={loading}
        health={health}
      />

      <KpiMetricsBar prediction={prediction} trends={trends} />

      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <QuantileForecastChart prediction={prediction} trends={trends} />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <WhatIfControls
              arrivals={arrivals}
              setArrivals={setArrivals}
              rainfall={rainfall}
              setRainfall={setRainfall}
              tempMax={tempMax}
              setTempMax={setTempMax}
              onApplyOverrides={() => { setUseOverrides(true); loadDashboardData(); }}
              onReset={() => { setArrivals(1250); setRainfall(0); setTempMax(36.5); setUseOverrides(false); loadDashboardData(); }}
            />
            <SupplyShockFeed shocks={shocks} />
          </div>
        </div>

        <ArbitrageMatrix arbitrage={arbitrage} />
        <AnalyticsTrendChart trends={trends} />
        <ModelBenchmarksCard />
      </div>

      <Footer prediction={prediction} />
      <GuestNoticeToast message={toastMsg} onClose={() => setToastMsg(null)} />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CropLens UI Error Boundary Caught Exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#041514] flex flex-col items-center justify-center p-6 text-white text-center font-['Inter'] space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-2xl font-black shadow-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-white">Something went wrong while rendering</h2>
          <p className="text-xs text-slate-400 max-w-md">
            A temporary UI rendering issue occurred. Click below to refresh your session.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2DFF68] to-[#159447] text-slate-950 font-black text-xs shadow-lg hover:brightness-110 transition"
          >
            🔄 Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Toaster } from 'sonner';

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <MainAppContent />
          <Toaster position="bottom-right" theme="dark" richColors />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
