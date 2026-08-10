import React from 'react';
import { Sprout, MapPin, Calendar, Activity, RefreshCw } from 'lucide-react';

const COMMODITIES = ['Tomato', 'Potato', 'Onion'];
const MARKETS = ['Azadpur', 'Kolar', 'Lasalgaon', 'Agra', 'Narayangaon'];

export default function Header({
  commodity,
  setCommodity,
  market,
  setMarket,
  date,
  setDate,
  onRefresh,
  loading,
  health
}) {
  return (
    <header className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
          }}>
            <Sprout size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CropLens AI
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              APMC Market Intelligence & Price Forecasting Platform
            </p>
          </div>
        </div>

        {/* Mandi controls and date filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Commodity selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Sprout size={16} color="var(--accent-emerald)" />
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', fontWeight: '600', cursor: 'pointer' }}
            >
              {COMMODITIES.map((c) => (
                <option key={c} value={c} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{c}</option>
              ))}
            </select>
          </div>

          {/* Market selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <MapPin size={16} color="var(--accent-teal)" />
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', fontWeight: '600', cursor: 'pointer' }}
            >
              {MARKETS.map((m) => (
                <option key={m} value={m} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{m} Mandi</option>
              ))}
            </select>
          </div>

          {/* Target date selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', fontWeight: '500', fontSize: '0.85rem' }}
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--accent-emerald)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 0.9rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Update'}</span>
          </button>

          {/* Backend health status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.7rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span className={health ? 'pulse-dot' : 'pulse-dot danger'} />
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: health ? 'var(--accent-emerald)' : '#ef4444' }}>
              {health ? 'Backend Live' : 'Connecting...'}
            </span>
          </div>

        </div>
      </div>
    </header>
  );
}
