import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSelector() {
  const { lang, setLang, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const activeLangObj = languages.find(l => l.code === lang) || languages[0];

  return (
    <div className="relative inline-block text-left" style={{ zIndex: 50 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900/80 px-3.5 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/30 hover:bg-slate-800 transition"
      >
        <Globe className="h-4 w-4 text-emerald-400" />
        <span>{activeLangObj.label}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-700 bg-slate-900/95 py-1.5 shadow-2xl backdrop-blur-md">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition flex items-center justify-between ${
                lang === l.code
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{l.label}</span>
              {lang === l.code && <span className="text-emerald-400 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
