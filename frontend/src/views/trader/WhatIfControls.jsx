import React from 'react';
import { Sliders, CloudRain, Thermometer, Truck } from 'lucide-react';

export default function WhatIfControls({
  arrivals,
  setArrivals,
  rainfall,
  setRainfall,
  tempMax,
  setTempMax,
  onApplyOverrides,
  onReset
}) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)' }}>
            <Sliders size={18} color="var(--accent-teal)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>What-If Scenario Simulator</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Test custom mandi arrival & weather shock inputs
            </p>
          </div>
        </div>
        
        <button
          onClick={onReset}
          style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', cursor: 'pointer' }}
        >
          Reset Defaults
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        
        {/* Arrival Override */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
              <Truck size={14} color="var(--accent-teal)" /> Arrival (qtl)
            </span>
            <span className="font-numeric" style={{ fontWeight: '700', color: 'var(--accent-teal)' }}>{arrivals} qtl</span>
          </div>
          <input
            type="range"
            min="100"
            max="5000"
            step="50"
            value={arrivals}
            onChange={(e) => setArrivals(Number(e.target.value))}
          />
        </div>

        {/* Rainfall Override */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
              <CloudRain size={14} color="var(--accent-teal)" /> Rainfall (mm)
            </span>
            <span className="font-numeric" style={{ fontWeight: '700', color: 'var(--accent-teal)' }}>{rainfall} mm</span>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            step="1"
            value={rainfall}
            onChange={(e) => setRainfall(Number(e.target.value))}
          />
        </div>

        {/* Max Temp Override */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
              <Thermometer size={14} color="var(--p90-color)" /> Max Temp (°C)
            </span>
            <span className="font-numeric" style={{ fontWeight: '700', color: 'var(--p90-color)' }}>{tempMax} °C</span>
          </div>
          <input
            type="range"
            min="15"
            max="50"
            step="0.5"
            value={tempMax}
            onChange={(e) => setTempMax(Number(e.target.value))}
          />
        </div>

      </div>

      <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
        <button
          onClick={onApplyOverrides}
          style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '0.45rem 1rem',
            fontWeight: '600',
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)'
          }}
        >
          Recalculate Model Forecast
        </button>
      </div>
    </div>
  );
}
