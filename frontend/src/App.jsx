import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/shared/Header';
import KpiMetricsBar from './components/shared/KpiMetricsBar';
import Footer from './components/shared/Footer';

import QuantileForecastChart from './views/trader/QuantileForecastChart';
import WhatIfControls from './views/trader/WhatIfControls';
import SupplyShockFeed from './views/trader/SupplyShockFeed';
import ArbitrageMatrix from './views/trader/ArbitrageMatrix';
import AnalyticsTrendChart from './views/trader/AnalyticsTrendChart';

import {
  fetchHealthCheck,
  fetchPricePrediction,
  fetchSupplyShocks,
  fetchArbitrage,
  fetchAnalyticsTrends
} from './services/api';

export default function App() {
  const [commodity, setCommodity] = useState('Tomato');
  const [market, setMarket] = useState('Azadpur');
  const [date, setDate] = useState('2025-06-15');

  // Feature override state for what-if scenarios
  const [arrivals, setArrivals] = useState(1250);
  const [rainfall, setRainfall] = useState(0);
  const [tempMax, setTempMax] = useState(36.5);
  const [useOverrides, setUseOverrides] = useState(false);

  // Dashboard data state
  const [health, setHealth] = useState(null);
  const [prediction, setPrediction] = useState({
    commodity: 'Tomato',
    market: 'Azadpur',
    date: '2025-06-15',
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
    historical_points: [
      { date: '2025-06-01', modal_price: 1950.0, arrivals_in_qtl: 1100.0 },
      { date: '2025-06-02', modal_price: 1980.0, arrivals_in_qtl: 1120.0 },
      { date: '2025-06-03', modal_price: 2020.0, arrivals_in_qtl: 1150.0 },
      { date: '2025-06-04', modal_price: 2050.0, arrivals_in_qtl: 1180.0 },
      { date: '2025-06-05', modal_price: 2080.0, arrivals_in_qtl: 1200.0 },
      { date: '2025-06-06', modal_price: 2100.0, arrivals_in_qtl: 1220.0 },
      { date: '2025-06-07', modal_price: 2100.5, arrivals_in_qtl: 1250.0 }
    ]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(0);

  // Check backend health status on mount
  useEffect(() => {
    fetchHealthCheck().then((data) => setHealth(data));
  }, []);

  // Fetch price predictions and market analytics
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const startMs = performance.now();

    try {
      // Construct prediction payload
      const reqPayload = {
        commodity,
        market,
        date,
      };

      if (useOverrides) {
        reqPayload.arrivals_in_qtl = arrivals;
        reqPayload.rainfall_mm = rainfall;
        reqPayload.temp_max = tempMax;
      }

      // Run API requests in parallel
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

      const elapsed = Math.round(performance.now() - startMs);
      setLatency(elapsed);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to connect to FastAPI backend. Ensure server is running on http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  }, [commodity, market, date, arrivals, rainfall, tempMax, useOverrides]);

  // Re-fetch when crop, mandi, or target date changes
  useEffect(() => {
    loadDashboardData();
  }, [commodity, market, date]);

  const handleApplyOverrides = () => {
    setUseOverrides(true);
    loadDashboardData();
  };

  const handleResetOverrides = () => {
    setArrivals(1250);
    setRainfall(0);
    setTempMax(36.5);
    setUseOverrides(false);
    loadDashboardData();
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Top Header Controls */}
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

      {/* Backend Connection Error Banner */}
      {error && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '500' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <KpiMetricsBar prediction={prediction} trends={trends} />

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem' }}>
        
        {/* Quantile Chart & What-If Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <QuantileForecastChart prediction={prediction} trends={trends} />
          
          <div>
            <WhatIfControls
              arrivals={arrivals}
              setArrivals={setArrivals}
              rainfall={rainfall}
              setRainfall={setRainfall}
              tempMax={tempMax}
              setTempMax={setTempMax}
              onApplyOverrides={handleApplyOverrides}
              onReset={handleResetOverrides}
            />

            <SupplyShockFeed shocks={shocks} />
          </div>
        </div>

        {/* Spatial Arbitrage Table */}
        <ArbitrageMatrix arbitrage={arbitrage} />

        {/* 30-Day Trend Chart */}
        <AnalyticsTrendChart trends={trends} />

      </div>

      {/* System Footer */}
      <Footer latency={latency} prediction={prediction} />

    </div>
  );
}
