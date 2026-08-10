import React from 'react';
import { TrendingUp, ShieldAlert, ArrowUpRight, Activity } from 'lucide-react';

export default function KpiMetricsBar({ prediction, trends }) {
  const p50 = prediction?.p50_median_price ? `₹${prediction.p50_median_price.toLocaleString('en-IN')}` : '—';
  const p10 = prediction?.p10_floor_price ? `₹${prediction.p10_floor_price.toLocaleString('en-IN')}` : '—';
  const p90 = prediction?.p90_ceiling_price ? `₹${prediction.p90_ceiling_price.toLocaleString('en-IN')}` : '—';
  const width = prediction?.band_width ? `₹${prediction.band_width.toLocaleString('en-IN')}` : '—';
  const volatility = trends?.price_volatility_30d ? `₹${trends.price_volatility_30d.toLocaleString('en-IN')}` : '—';
  const direction = trends?.price_trend_direction || 'Stable';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      
      {/* P50 Median Price */}
      <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--p50-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            P50 Median Forecast
          </span>
          <div style={{ padding: '0.3rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)' }}>
            <TrendingUp size={18} color="var(--p50-color)" />
          </div>
        </div>
        <div className="font-numeric" style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>
          {p50} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>/ qtl</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '0.4rem', fontWeight: '500' }}>
          Base Expected Modal Price
        </div>
      </div>

      {/* P10 Risk Floor */}
      <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--p10-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            P10 Risk Floor
          </span>
          <div style={{ padding: '0.3rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)' }}>
            <ShieldAlert size={18} color="var(--p10-color)" />
          </div>
        </div>
        <div className="font-numeric" style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--p10-color)' }}>
          {p10} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>/ qtl</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--p10-color)', marginTop: '0.4rem', fontWeight: '500' }}>
          90% Safety Net Floor
        </div>
      </div>

      {/* P90 Stress Ceiling */}
      <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--p90-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            P90 Ceiling Stress
          </span>
          <div style={{ padding: '0.3rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)' }}>
            <ArrowUpRight size={18} color="var(--p90-color)" />
          </div>
        </div>
        <div className="font-numeric" style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--p90-color)' }}>
          {p90} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)' }}>/ qtl</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontWeight: '500' }}>
          Band Spread: {width}
        </div>
      </div>

      {/* 30-Day Volatility */}
      <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-teal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            30d Volatility
          </span>
          <div style={{ padding: '0.3rem', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.15)' }}>
            <Activity size={18} color="var(--accent-teal)" />
          </div>
        </div>
        <div className="font-numeric" style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>
          {volatility}
        </div>
        <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: '600', color: direction === 'Upward' ? 'var(--accent-emerald)' : direction === 'Downward' ? '#ef4444' : 'var(--accent-teal)' }}>
          Trend Direction: {direction}
        </div>
      </div>

    </div>
  );
}
