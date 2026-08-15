import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Layers } from 'lucide-react';

export default function QuantileForecastChart({ prediction, trends }) {
  if (!prediction || !trends?.historical_points) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading Quantile Price Forecast Chart...</p>
      </div>
    );
  }

  const points = trends.historical_points.slice(-14).map((pt) => ({
    date: pt.date.slice(5),
    price: pt.modal_price,
    p10: null,
    p50: null,
    p90: null,
  }));

  points.push({
    date: `FC (${prediction.date.slice(5)})`,
    price: prediction.p50_median_price,
    p10: prediction.p10_floor_price,
    p50: prediction.p50_median_price,
    p90: prediction.p90_ceiling_price,
  });

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)' }}>
            <Layers size={18} color="var(--accent-emerald)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Quantile Price Forecast Band</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              LightGBM P10 Floor, P50 Median, and P90 Ceiling Interval
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--p10-color)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--p10-color)' }} /> P10 Floor
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--p50-color)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--p50-color)' }} /> P50 Median
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--p90-color)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--p90-color)' }} /> P90 Ceiling
          </span>
        </div>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit=" ₹" />
            <Tooltip
              contentStyle={{ background: '#121824', borderColor: '#2a364f', borderRadius: '8px', color: '#fff' }}
              formatter={(value, name) => [`₹${value} / qtl`, name === 'price' ? 'Modal Price' : name.toUpperCase()]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorBand)"
            />
            <ReferenceLine y={prediction.p50_median_price} label={{ value: `P50: ₹${prediction.p50_median_price}`, fill: '#10b981', fontSize: 11, position: 'right' }} stroke="#10b981" strokeDasharray="3 3" />
            <ReferenceLine y={prediction.p10_floor_price} label={{ value: `P10: ₹${prediction.p10_floor_price}`, fill: '#f59e0b', fontSize: 11, position: 'right' }} stroke="#f59e0b" strokeDasharray="3 3" />
            <ReferenceLine y={prediction.p90_ceiling_price} label={{ value: `P90: ₹${prediction.p90_ceiling_price}`, fill: '#ef4444', fontSize: 11, position: 'right' }} stroke="#ef4444" strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Band Width Uncertainty: <strong style={{ color: 'var(--text-primary)' }}>₹{prediction.band_width} / qtl</strong></span>
        <span>Terminology: <strong style={{ color: 'var(--accent-emerald)' }}>{prediction.band_terminology}</strong></span>
      </div>
    </div>
  );
}
