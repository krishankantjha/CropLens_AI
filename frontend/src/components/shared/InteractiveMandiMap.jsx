import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, AlertCircle } from 'lucide-react';
import { MANDI_COORDINATES } from '../../utils/mapConstants';

// Helper hook to update map bounds dynamically when points change
function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [bounds, map]);
  return null;
}

// Custom Leaflet DivIcon Creator for Mandi Markers
const createMandiIcon = (row) => {
  const isBest = row.badgeType === 'best';
  const isNearest = row.badgeType === 'nearest';

  const bgClass = isBest
    ? 'bg-amber-400 text-amber-950 border-amber-300 ring-4 ring-amber-400/40 font-extrabold scale-110 shadow-xl'
    : isNearest
    ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-md'
    : 'bg-slate-800 text-slate-100 border-slate-600 font-semibold shadow-sm';

  const htmlStr = `
    <div class="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 whitespace-nowrap text-xs ${bgClass} transition-all duration-300">
      <span class="text-sm">${isBest ? '⭐' : '📍'}</span>
      <span>${row.name.replace(' APMC', '')}: ₹${row.rate}</span>
    </div>
  `;

  return L.divIcon({
    html: htmlStr,
    className: 'custom-mandi-marker',
    iconSize: [120, 36],
    iconAnchor: [60, 18]
  });
};

export default function InteractiveMandiMap({
  rows = [],
  routes = [],
  height = "380px",
  center = [27.4, 77.8]
}) {
  const [mapError, setMapError] = useState(false);

  // Map Mandi Rows to Coordinates
  const markers = rows.map(r => {
    const coords = MANDI_COORDINATES[r.name] || MANDI_COORDINATES[r.name.replace(' APMC', '')] || { lat: 27.1767, lng: 78.0081 };
    return {
      ...r,
      lat: coords.lat,
      lng: coords.lng
    };
  });

  const bounds = markers.length > 0 ? markers.map(m => [m.lat, m.lng]) : [center];

  if (mapError) {
    return (
      <div style={{ height }} className="w-full bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
        <AlertCircle className="h-8 w-8 text-amber-500" />
        <p className="text-sm font-bold text-slate-200">Interactive Mandi Map Unavailable</p>
        <p className="text-xs text-slate-500">Map tile server unreachable. Switching to table view fallback.</p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md relative z-0">
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        onError={() => setMapError(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {bounds.length > 0 && <ChangeView bounds={bounds} />}

        {/* Render Mandi Markers */}
        {markers.map((m, idx) => (
          <Marker
            key={idx}
            position={[m.lat, m.lng]}
            icon={createMandiIcon(m)}
          >
            <Popup className="custom-mandi-popup">
              <div className="p-1 space-y-2 font-['Inter']">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                  <h5 className="font-extrabold text-sm text-slate-900 flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-[#046c4e]" />
                    {m.name}
                  </h5>
                  {m.badgeType === 'best' && (
                    <span className="bg-amber-400 text-amber-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                      BEST PROFIT
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold block">MARKET RATE</span>
                    <span className="font-extrabold text-slate-900 text-sm">₹{m.rate?.toLocaleString()} /qtl</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold block">TRANSPORT</span>
                    <span className="font-bold text-rose-600 text-sm">₹{Math.abs(m.transport || 40)} /qtl</span>
                  </div>
                </div>

                <div className="bg-[#f0fdf4] border border-[#bbf7d0] p-2 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-[#166534]">ESTIMATED NET PROFIT</span>
                  <span className="font-extrabold text-base text-[#046c4e]">₹{m.netProfit?.toLocaleString()}</span>
                </div>

                <p className="text-[11px] text-slate-500 font-medium">📍 Distance: {m.distance || '15 km'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Spatial Arbitrage Corridors for Trader View */}
        {routes.map((r, idx) => {
          const originCoords = MANDI_COORDINATES[r.origin] || { lat: 13.1367, lng: 78.1292 };
          const destCoords = MANDI_COORDINATES[r.destination] || { lat: 28.7159, lng: 77.1767 };
          const path = [[originCoords.lat, originCoords.lng], [destCoords.lat, destCoords.lng]];
          const strokeColor = r.marginType === 'high' ? '#22c55e' : r.marginType === 'medium' ? '#eab308' : '#f43f5e';

          return (
            <Polyline
              key={idx}
              positions={path}
              pathOptions={{ color: strokeColor, weight: 4, dashArray: '6, 8', opacity: 0.9 }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
