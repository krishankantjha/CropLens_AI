// Field Notes Intelligence reminder: the map is a decision aid—keep labels legible, routes quiet, and net money more prominent than distance.
import { MapPin, Navigation, Star } from "lucide-react";
import { useState } from "react";
import { demoMandis } from "@/data/demo";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function MandiMap() {
  const [selectedName, setSelectedName] = useState("Mathura");
  const selected = demoMandis.find((mandi) => mandi.name === selectedName) ?? demoMandis[1];

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#DDE4DE] bg-white paper-shadow">
      <div className="relative h-[310px] overflow-hidden bg-[#EEF4ED] sm:h-[360px]">
        <div className="absolute inset-0 contour-lines opacity-70" aria-hidden="true" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M 9 73 C 29 61, 38 44, 62 29 S 75 47, 80 62" fill="none" stroke="#9DBDA8" strokeWidth="0.7" className="map-route" />
          <path d="M 9 73 C 32 79, 53 70, 80 62" fill="none" stroke="#C5D9CA" strokeWidth="0.55" />
          <path d="M 25 16 C 37 35, 42 55, 62 29" fill="none" stroke="#D4E2D5" strokeWidth="0.5" />
        </svg>
        <div className="absolute left-[9%] top-[73%] -translate-x-1/2 -translate-y-1/2">
          <span className="map-pulse absolute inset-0 rounded-full bg-[#176B45]/25" aria-hidden="true" />
          <span className="relative grid size-9 place-items-center rounded-full border-4 border-white bg-[#176B45] text-white shadow-lg"><Navigation className="size-4 fill-current" /></span>
          <span className="absolute left-1/2 top-11 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-[#0E4D35] shadow-sm">You · Agra</span>
        </div>
        {demoMandis.map((mandi) => (
          <button key={mandi.name} type="button" aria-label={`Select ${mandi.name} mandi`} onClick={() => setSelectedName(mandi.name)} className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45] focus-visible:ring-offset-2 ${selectedName === mandi.name ? "z-10" : "z-[1]"}`} style={{ left: `${mandi.x}%`, top: `${mandi.y}%` }}>
            <span className={`grid size-9 place-items-center rounded-full border-4 border-white shadow-md ${selectedName === mandi.name ? "bg-[#D99A21] text-white" : "bg-white text-[#176B45]"}`}>
              {mandi.featured ? <Star className="size-4 fill-current" /> : <MapPin className="size-4" />}
            </span>
            <span className={`mt-1 block whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-extrabold shadow-sm ${selectedName === mandi.name ? "bg-[#0E4D35] text-white" : "bg-white/90 text-[#0E4D35]"}`}>{mandi.name}</span>
          </button>
        ))}
        <div className="absolute left-4 top-4 rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-[10px] font-extrabold text-[#0E4D35] backdrop-blur-sm">Interactive APMC Route Map</div>
      </div>
      <div className="grid gap-4 border-t border-[#EDF0EB] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#0E4D35]"><Star className="size-4 fill-[#D99A21] text-[#D99A21]" /> {selected.name} APMC Corridor · Optimal Arbitrage Route</div>
          <p className="mt-1 text-xs leading-5 text-[#66716A]">{selected.distance} away · {money(selected.rate)}/qtl rate · {money(selected.transport)} estimated transport</p>
        </div>
        <div className="text-left sm:text-right"><p className="eyebrow">Estimated net money</p><p className="mt-1 data-mono text-2xl font-extrabold text-[#176B45]">{money(selected.net)}</p></div>
      </div>
    </div>
  );
}
