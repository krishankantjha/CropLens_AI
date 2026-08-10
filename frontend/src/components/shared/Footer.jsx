import React from 'react';
import { Cpu, ShieldCheck } from 'lucide-react';

export default function Footer({ latency, prediction }) {
  return (
    <footer style={{ marginTop: '2rem', padding: '1.25rem 0', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Cpu size={14} color="var(--accent-emerald)" />
        <span>Model Version: <strong style={{ color: 'var(--text-secondary)' }}>{prediction?.model_version || 'LightGBM Multi-Quantile v1.0'}</strong></span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>API Latency: <strong style={{ color: 'var(--accent-teal)' }}>{latency ? `${latency} ms` : '—'}</strong></span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-emerald)' }}>
          <ShieldCheck size={14} /> Production Ready
        </span>
      </div>
    </footer>
  );
}
