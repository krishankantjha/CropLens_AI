import React, { useState } from 'react';
import { 
  Home, TrendingUp, MapPin, Bell, Menu, ChevronDown, 
  User, LogOut, Globe, Bookmark, PhoneCall
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

export default function FarmerNavbar({
  activeTab,
  setActiveTab,
  crop,
  setCrop,
  mandi,
  setMandi,
  alertsCount = 0
}) {
  const { lang, setLang, languages } = useLanguage();
  const { logout, user } = useAuth();
  const isHi = lang === 'hi';

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const NAV_ITEMS = [
    { id: 'dashboard', label: isHi ? 'मुख्य पृष्ठ' : 'Home', icon: Home },
    { id: 'forecast', label: isHi ? 'कीमत और पूर्वानुमान' : 'Prices', icon: TrendingUp },
    { id: 'mandi', label: isHi ? 'मंडी तुलना' : 'Mandis', icon: MapPin },
    { id: 'alerts', label: isHi ? 'चेतावनी' : 'Alerts', icon: Bell, badge: alertsCount > 0 ? alertsCount : null },
    { id: 'more', label: isHi ? 'अधिक' : 'More', icon: Menu },
  ];

  const CROPS = [
    { id: 'Potato', labelEn: 'Potato', labelHi: 'आलू', icon: '🥔' },
    { id: 'Onion', labelEn: 'Onion', labelHi: 'प्याज', icon: '🧅' },
    { id: 'Tomato', labelEn: 'Tomato', labelHi: 'टमाटर', icon: '🍅' },
    { id: 'Wheat', labelEn: 'Wheat', labelHi: 'गेहूं', icon: '🌾' },
    { id: 'Paddy(Dhan)', labelEn: 'Paddy / Rice', labelHi: 'धान / चावल', icon: '🌾' },
    { id: 'Maize', labelEn: 'Maize', labelHi: 'मक्का', icon: '🌽' },
    { id: 'Soyabean', labelEn: 'Soybean', labelHi: 'सोयाबीन', icon: '🟡' },
    { id: 'Mustard', labelEn: 'Mustard', labelHi: 'सरसों', icon: '🟡' },
    { id: 'Gram(Chana)', labelEn: 'Gram (Chana)', labelHi: 'चना', icon: '🫘' },
    { id: 'Chilli Red', labelEn: 'Dry Chilli', labelHi: 'लाल मिर्च', icon: '🌶️' },
  ];

  const MANDIS = [
    { id: 'Agra APMC', labelEn: 'Agra APMC (UP)', labelHi: 'आगरा मंडी (उ.प्र.)' },
    { id: 'Khanna APMC', labelEn: 'Khanna APMC (Punjab)', labelHi: 'खन्ना मंडी (पंजाब)' },
    { id: 'Azadpur APMC', labelEn: 'Azadpur APMC (Delhi)', labelHi: 'आज़ादपुर मंडी (दिल्ली)' },
    { id: 'Mathura APMC', labelEn: 'Mathura APMC (UP)', labelHi: 'मथुरा मंडी (उ.प्र.)' },
    { id: 'Lasalgaon APMC', labelEn: 'Lasalgaon APMC (MH)', labelHi: 'लासलगांव मंडी (महा.)' },
    { id: 'Karnal APMC', labelEn: 'Karnal APMC (Haryana)', labelHi: 'करनाल मंडी (हरियाणा)' },
    { id: 'Indore APMC', labelEn: 'Indore APMC (MP)', labelHi: 'इंदौर मंडी (म.प्र.)' },
    { id: 'Farrukhabad APMC', labelEn: 'Farrukhabad APMC (UP)', labelHi: 'फर्रुखाबाद मंडी (उ.प्र.)' },
    { id: 'Guntur APMC', labelEn: 'Guntur APMC (AP)', labelHi: 'गुंटूर मंडी (आं.प्र.)' },
    { id: 'Kolkata APMC', labelEn: 'Kolkata APMC (WB)', labelHi: 'कोलकाता मंडी (प.बंगाल)' },
  ];

  const farmerName = user?.full_name?.split(' ')[0] || (isHi ? "किसान मित्र" : "Kisan Mitra");

  return (
    <header className="sticky top-0 z-50 bg-[#041514]/95 backdrop-blur-xl border-b border-[#087A45]/40 px-4 sm:px-6 py-2.5 font-['Inter'] shadow-xl">
      <div className="max-w-[1550px] mx-auto flex items-center justify-between gap-2.5">
        
        {/* Cluster 1: Brand Identity Logo */}
        <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <img
            src="/logo.png"
            alt="CropLens AI — Kisan ki Smart Salah"
            className="h-12 sm:h-14 md:h-15 max-h-16 w-auto object-contain drop-shadow-[0_2px_12px_rgba(45,255,104,0.4)] hover:scale-105 transition-all duration-200"
          />
        </div>

        {/* Cluster 2: 5 Horizontal Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#030B07] p-1 rounded-2xl border border-[#087A45]/40 shadow-inner">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (activeTab === 'advisory' && item.id === 'dashboard');
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#087A45] to-[#046c4e] text-white shadow-md shadow-emerald-950/80 border border-[#2DFF68]/40'
                    : 'text-slate-400 hover:text-white hover:bg-[#087A45]/20'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#2DFF68]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Agricultural Context & User Preferences (Separated by Vertical Dividers) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Cluster 3: Agricultural Context Selectors (Crop & Mandi) */}
          <div className="flex items-center gap-2">
            {/* State-Bound Crop Selector */}
            <div className="flex items-center gap-1 bg-[#082018] border border-[#087A45]/60 hover:border-[#2DFF68]/60 rounded-xl px-2.5 py-1.5 text-xs text-white shadow-sm transition">
              <span className="text-sm">🥔</span>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-white focus:outline-none cursor-pointer"
              >
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#041514] text-white">
                    {c.icon} {isHi ? c.labelHi : c.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* State-Bound Mandi Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-[#082018] border border-[#087A45]/60 hover:border-[#2DFF68]/60 rounded-xl px-2.5 py-1.5 text-xs text-white shadow-sm transition">
              <MapPin className="h-3.5 w-3.5 text-[#2DFF68] shrink-0" />
              <select
                value={mandi}
                onChange={(e) => setMandi(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-white focus:outline-none cursor-pointer"
              >
                {MANDIS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#041514] text-white">
                    {isHi ? m.labelHi : m.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtle Vertical Divider 1 */}
          <div className="hidden md:block h-6 w-px bg-slate-800/80 mx-0.5" />

          {/* Cluster 4: App Preferences & User Profile */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#082018] border border-[#087A45]/60 hover:border-[#2DFF68]/60 rounded-xl px-2.5 py-1.5 text-xs text-white shadow-sm transition">
              <Globe className="h-3.5 w-3.5 text-[#2DFF68] shrink-0" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-white focus:outline-none cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#041514] text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Profile Dropdown Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 bg-[#082018] border border-[#087A45]/60 hover:border-[#2DFF68] rounded-xl p-1 pr-2.5 text-xs text-white shadow-sm transition"
              >
                <div className="h-7 w-7 rounded-lg bg-[#2DFF68]/20 border border-[#2DFF68]/40 flex items-center justify-center font-black text-xs text-[#2DFF68]">
                  👨‍🌾
                </div>
                <span className="hidden sm:inline text-xs font-extrabold text-slate-200">{farmerName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#041514] border border-[#087A45]/60 shadow-2xl p-1.5 space-y-1 z-50 text-xs font-semibold text-slate-300">
                  <button
                    onClick={() => { setActiveTab('more'); setShowProfileMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#087A45]/40 hover:text-white transition"
                  >
                    <User className="h-4 w-4 text-[#2DFF68]" /> {isHi ? "प्रोफ़ाइल और सेटिंग्स" : "Profile & Farm Settings"}
                  </button>

                  <button
                    onClick={() => { setActiveTab('more'); setShowProfileMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#087A45]/40 hover:text-white transition"
                  >
                    <Bookmark className="h-4 w-4 text-amber-400" /> {isHi ? "सहेजे गए परामर्श" : "Saved Advisories"}
                  </button>

                  <a
                    href="tel:18001801551"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#087A45]/40 hover:text-white transition text-emerald-400 font-bold"
                  >
                    <PhoneCall className="h-4 w-4 text-[#2DFF68] animate-bounce" /> {isHi ? "किसान कॉल सेंटर: 1800-180-1551" : "Kisan Helpline: 1800-180-1551"}
                  </a>

                  <div className="border-t border-[#087A45]/40 my-1" />

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
