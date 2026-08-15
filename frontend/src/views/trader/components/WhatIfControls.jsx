import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Sliders, RefreshCw, Lock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import GuestNoticeToast from '../../../components/shared/GuestNoticeToast';

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
  const { token } = useAuth();
  const isGuest = !token || token.startsWith('demo_jwt_token');
  const [toastMsg, setToastMsg] = useState(null);

  const handleInteraction = (actionFn) => {
    if (isGuest) {
      setToastMsg("Please login to use What-If scenario simulation.");
      return;
    }
    if (actionFn) actionFn();
  };

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition font-['Inter']">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#046c4e]" />
            What-If Scenario Simulation
          </h4>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isGuest ? 'bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1' : 'bg-[#f0fdf4] text-[#046c4e] border-[#bbf7d0]'}`}>
            {isGuest && <Lock className="h-3 w-3 text-amber-600 inline" />}
            Real-time Overrides
          </span>
        </div>

        {/* Radix Accessible Sliders */}
        <div className="space-y-4 text-xs">
          {/* Arrivals Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold text-slate-700">
              <span>Arrival Glut / Shortage (Qtl)</span>
              <span className="font-mono text-[#046c4e] font-extrabold">{arrivals} qtl</span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
              value={[arrivals]}
              min={300}
              max={3000}
              step={50}
              aria-label="Arrival Glut / Shortage"
              onValueChange={([val]) => handleInteraction(() => setArrivals(val))}
            >
              <Slider.Track className="bg-slate-100 relative grow rounded-full h-2 border border-slate-200">
                <Slider.Range className="absolute bg-[#046c4e] rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-[#046c4e] shadow-md rounded-full hover:scale-110 focus:outline-none" />
            </Slider.Root>
          </div>

          {/* Rainfall Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold text-slate-700">
              <span>Rainfall Shock (mm)</span>
              <span className="font-mono text-[#046c4e] font-extrabold">{rainfall} mm</span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
              value={[rainfall]}
              min={0}
              max={150}
              step={5}
              aria-label="Rainfall Shock"
              onValueChange={([val]) => handleInteraction(() => setRainfall(val))}
            >
              <Slider.Track className="bg-slate-100 relative grow rounded-full h-2 border border-slate-200">
                <Slider.Range className="absolute bg-[#046c4e] rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-[#046c4e] shadow-md rounded-full hover:scale-110 focus:outline-none" />
            </Slider.Root>
          </div>

          {/* Max Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold text-slate-700">
              <span>Heatwave Temperature (°C)</span>
              <span className="font-mono text-[#046c4e] font-extrabold">{tempMax} °C</span>
            </div>
            <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
              value={[tempMax]}
              min={20}
              max={48}
              step={0.5}
              aria-label="Heatwave Temperature"
              onValueChange={([val]) => handleInteraction(() => setTempMax(val))}
            >
              <Slider.Track className="bg-slate-100 relative grow rounded-full h-2 border border-slate-200">
                <Slider.Range className="absolute bg-[#046c4e] rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-[#046c4e] shadow-md rounded-full hover:scale-110 focus:outline-none" />
            </Slider.Root>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleInteraction(onApplyOverrides)}
            className="flex-1 bg-[#046c4e] hover:bg-[#065f46] text-white py-2.5 rounded-xl font-extrabold text-xs shadow-md transition"
          >
            Apply Scenario Overrides
          </button>

          <button
            onClick={() => handleInteraction(onReset)}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Reset"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <GuestNoticeToast message={toastMsg} onClose={() => setToastMsg(null)} />
    </>
  );
}
