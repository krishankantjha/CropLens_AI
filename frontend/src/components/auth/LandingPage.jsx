import React from 'react';
import LandingHero from './LandingHero';
import AuthPanel from './AuthPanel';
import MandiTicker from './MandiTicker';
import heroImg from '../../assets/hero/background.png';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../../context/LanguageContext';

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen w-full relative bg-[#071109] text-white font-['Inter'] flex flex-col justify-between overflow-x-hidden">
      {/* Fixed Viewport Background Image with Shifted Sunrise Focal Alignment */}
      <img
        src={heroImg}
        alt="Farmland background"
        className="fixed inset-0 h-screen w-full object-cover object-[78%_35%] pointer-events-none z-0"
      />

      {/* Soft Multi-Stop Dark Forest Gradient Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'linear-gradient(90deg, rgba(0, 10, 7, 0.88) 0%, rgba(3, 20, 15, 0.2) 50%, rgba(0, 10, 7, 0.8) 100%)'
        }}
      />

      {/* Top Fixed Marquee Ticker */}
      <div className="relative z-20">
        <MandiTicker />
      </div>

      {/* Top Navbar Header */}
      <header className="relative z-20 max-w-[1500px] w-full mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="CropLens AI" className="h-16 sm:h-20 md:h-22 w-auto object-contain filter drop-shadow-lg" />
        </div>

        {/* Top Right Language Selector */}
        <div className="bg-emerald-950/70 border border-emerald-500/30 rounded-2xl px-3 py-1 shadow-lg backdrop-blur-md">
          <LanguageSelector />
        </div>
      </header>

      {/* Side-by-Side Grid Layout with Open Sunrise Central Gap */}
      <main className="relative z-10 max-w-[1500px] w-full mx-auto px-4 sm:px-8 py-2 flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Marketing Hero (6 columns) */}
        <div className="md:col-span-6 lg:col-span-6 space-y-4">
          <LandingHero />
        </div>

        {/* Right Glassmorphism Login Modal (5 columns with 1-column central gap) */}
        <div className="md:col-span-6 lg:col-span-5 lg:col-start-8 w-full">
          <AuthPanel />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-emerald-950/80 py-2.5 text-center text-xs text-slate-300 font-semibold tracking-wide">
        CropLens AI © 2026 • {t("trust.made")}
      </footer>
    </div>
  );
}
