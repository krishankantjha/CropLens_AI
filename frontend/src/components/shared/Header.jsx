import React, { useState } from 'react';
import { Sprout, MapPin, Calendar, RefreshCw, ChevronDown, Search } from 'lucide-react';

const COMMODITIES = [
  'Potato', 'Onion', 'Tomato', 'Wheat', 'Paddy(Dhan)',
  'Maize', 'Soyabean', 'Mustard', 'Gram(Chana)', 'Chilli Red'
];
const MARKETS = [
  'Agra', 'Khanna', 'Azadpur', 'Mathura', 'Lasalgaon',
  'Karnal', 'Indore', 'Farrukhabad', 'Guntur', 'Kolkata'
];

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
  const [showMandiSearch, setShowMandiSearch] = useState(false);
  const [mandiQuery, setMandiQuery] = useState('');

  const filteredMarkets = MARKETS.filter(m => m.toLowerCase().includes(mandiQuery.toLowerCase()));

  return (
    <header className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="CropLens AI" style={{ height: '52px', width: 'auto', objectFit: 'contain', borderRadius: '14px' }} />
        </div>

        {/* Mandi controls and date filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Commodity selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Sprout size={16} color="var(--accent-emerald)" />
            <select
              aria-label="Select Commodity"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', fontWeight: '600', cursor: 'pointer' }}
            >
              {COMMODITIES.map((c) => (
                <option key={c} value={c} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{c}</option>
              ))}
            </select>
          </div>

          {/* Searchable Mandi selector */}
          <div className="relative">
            <button
              onClick={() => setShowMandiSearch(!showMandiSearch)}
              aria-label="Select Mandi Market"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
            >
              <MapPin size={16} color="var(--accent-teal)" />
              <span>{market} Mandi</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showMandiSearch && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1.5 font-['Inter']">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search APMC mandi..."
                    value={mandiQuery}
                    onChange={(e) => setMandiQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                    autoFocus
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredMarkets.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMarket(m);
                        setShowMandiSearch(false);
                        setMandiQuery('');
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                        market === m ? 'bg-[#046c4e] text-white font-extrabold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{m} APMC</span>
                      {market === m && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
