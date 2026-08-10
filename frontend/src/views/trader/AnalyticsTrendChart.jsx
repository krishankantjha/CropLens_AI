import React from 'react';
import { LineChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function AnalyticsTrendChart({ trends }) {
  if (!trends?.historical_points) {
    return null;
  }

  const data = trends.historical_points.map((pt) => ({
    date: pt.date.slice(5),
    price: pt.modal_price,
    arrivals: pt.arrivals_in_qtl,
  }));

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)' }}>
            <TrendingUp size={18} color="var(--accent-teal)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>30-Day Historical Trend & Arrival Volume</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Historical Modal Prices (₹/qtl) & Arrival Quantities (qtl) for {trends.commodity} ({trends.market})
            </p>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 10 }} unit=" ₹" domain={['auto', 'auto']} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 10 }} unit=" qtl" />
            <Tooltip
              contentStyle={{ background: '#121824', borderColor: '#2a364f', borderRadius: '8px', color: '#fff' }}
              formatter={(val, name) => [name === 'price' ? `₹${val} / qtl` : `${val} qtl`, name === 'price' ? 'Modal Price' : 'Arrival Volume']}
            />
            <Bar yAxisId="right" dataKey="arrivals" fill="#243049" radius={[4, 4, 0, 0]} opacity={0.6} />
            <Line yAxisId="left" type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
