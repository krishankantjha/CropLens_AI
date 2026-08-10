import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SupplyShockFeed({ shocks }) {
  const anomalies = shocks?.anomalies || [];
  const totalAnalyzed = shocks?.total_records_analyzed || 0;
  const totalDetected = shocks?.total_anomalies_detected || 0;

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: totalDetected > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }}>
            <AlertTriangle size={18} color={totalDetected > 0 ? '#ef4444' : 'var(--accent-emerald)'} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Supply Shock & Anomaly Feed</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Isolation Forest Anomaly Detection Engine
            </p>
          </div>
        </div>

        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', fontWeight: '600' }}>
          {totalDetected} / {totalAnalyzed} Flagged
        </span>
      </div>

      {anomalies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
          <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '0.85rem' }}>No recent supply shock anomalies detected across active mandis.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {anomalies.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: item.is_anomaly ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-surface)',
                borderLeft: item.is_anomaly ? '3px solid #ef4444' : '3px solid var(--accent-emerald)',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: '700', color: item.is_anomaly ? '#ef4444' : 'var(--accent-emerald)' }}>
                  {item.commodity} ({item.market})
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.date}</span>
              </div>
              <p style={{ color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: '1.4' }}>
                {item.message}
              </p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <span>Arrival Ratio: <strong style={{ color: 'var(--text-primary)' }}>{item.arrival_ratio}x</strong></span>
                <span>Velocity: <strong style={{ color: 'var(--text-primary)' }}>{item.price_velocity_7d} Rs/qtl/day</strong></span>
                <span>Score: <strong style={{ color: 'var(--text-primary)' }}>{item.anomaly_score}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
