import React, { useState } from 'react';
import { ArrowRightLeft, Info, Map, Table } from 'lucide-react';
import InteractiveMandiMap from '../../../components/shared/InteractiveMandiMap';

export default function ArbitrageMatrix({ arbitrage }) {
  const [viewMode, setViewMode] = useState('table');
  const opportunities = arbitrage?.opportunities || [];
  const baseMarket = arbitrage?.base_market || 'Kolar';
  const commodity = arbitrage?.commodity || 'Crop';
  const disclaimer = arbitrage?.disclaimer || '';

  // Format spatial transport corridor routes for Leaflet map
  const routes = opportunities.map(opp => ({
    origin: baseMarket,
    destination: opp.target_market,
    marginType: opp.price_difference > 150 ? 'high' : opp.price_difference > 50 ? 'medium' : 'low'
  }));

  const mapRows = opportunities.map((opp, idx) => ({
    name: opp.target_market,
    rate: Math.round(opp.modal_price),
    transport: -Math.round(Math.abs(opp.transport_cost_per_qtl || 50)),
    netProfit: Math.round(opp.net_gain_per_qtl),
    badgeType: opp.is_recommended ? 'best' : idx === 0 ? 'nearest' : 'normal'
  }));

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)' }}>
            <ArrowRightLeft size={18} color="var(--accent-emerald)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Spatial Price Arbitrage Matrix</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Cross-Mandi Price Differences for {commodity} (Base: {baseMarket})
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              viewMode === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table size={14} /> Table
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
              viewMode === 'map' ? 'bg-[#046c4e] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Map size={14} /> Corridor Map
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <InteractiveMandiMap rows={mapRows} routes={routes} height="350px" />
      ) : opportunities.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No active arbitrage records found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.6rem 0.5rem' }}>Destination Mandi</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Base Price</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Dest Price</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Gross Diff</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Gradient %</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Opportunity Advisory</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp, i) => {
                const isPositive = opp.gross_price_difference > 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-surface)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {opp.destination_market}
                    </td>
                    <td className="font-numeric" style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                      ₹{opp.source_price}
                    </td>
                    <td className="font-numeric" style={{ padding: '0.75rem 0.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                      ₹{opp.destination_price}
                    </td>
                    <td className="font-numeric" style={{ padding: '0.75rem 0.5rem', fontWeight: '700', color: isPositive ? 'var(--accent-emerald)' : '#ef4444' }}>
                      {isPositive ? '+' : ''}₹{opp.gross_price_difference} / qtl
                    </td>
                    <td className="font-numeric" style={{ padding: '0.75rem 0.5rem', fontWeight: '700', color: isPositive ? 'var(--accent-emerald)' : '#ef4444' }}>
                      {isPositive ? '+' : ''}{opp.price_gradient_percentage}%
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: isPositive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {opp.recommendation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {disclaimer && (
        <div style={{ marginTop: '1rem', padding: '0.5rem 0.8rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Info size={14} color="var(--accent-teal)" style={{ flexShrink: 0 }} />
          <span>{disclaimer}</span>
        </div>
      )}
    </div>
  );
}
