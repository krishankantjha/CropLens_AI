import React, { useState } from 'react';
import { User, Bookmark, Settings, Newspaper, HelpCircle, PhoneCall, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import FarmerProfileView from './FarmerProfileView';
import FarmerActivityView from './FarmerActivityView';
import FarmerSettingsView from './FarmerSettingsView';
import FarmerNewsView from './FarmerNewsView';
import FarmerHelpView from './FarmerHelpView';

export default function FarmerMoreView({ crop, mandi, setCrop, setMandi }) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isHi = lang === 'hi';

  const [activeSection, setActiveSection] = useState('menu');

  if (activeSection === 'profile') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSection('menu')}
          className="text-xs font-extrabold text-[#046c4e] hover:underline flex items-center gap-1 mb-2"
        >
          ← {isHi ? "वापस 'अधिक' मेनू पर जाएं" : "Back to More Menu"}
        </button>
        <FarmerProfileView crop={crop} mandi={mandi} />
      </div>
    );
  }

  if (activeSection === 'saved') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSection('menu')}
          className="text-xs font-extrabold text-[#046c4e] hover:underline flex items-center gap-1 mb-2"
        >
          ← {isHi ? "वापस 'अधिक' मेनू पर जाएं" : "Back to More Menu"}
        </button>
        <FarmerActivityView />
      </div>
    );
  }

  if (activeSection === 'settings') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSection('menu')}
          className="text-xs font-extrabold text-[#046c4e] hover:underline flex items-center gap-1 mb-2"
        >
          ← {isHi ? "वापस 'अधिक' मेनू पर जाएं" : "Back to More Menu"}
        </button>
        <FarmerSettingsView crop={crop} mandi={mandi} setCrop={setCrop} setMandi={setMandi} />
      </div>
    );
  }

  if (activeSection === 'news') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSection('menu')}
          className="text-xs font-extrabold text-[#046c4e] hover:underline flex items-center gap-1 mb-2"
        >
          ← {isHi ? "वापस 'अधिक' मेनू पर जाएं" : "Back to More Menu"}
        </button>
        <FarmerNewsView />
      </div>
    );
  }

  if (activeSection === 'help') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSection('menu')}
          className="text-xs font-extrabold text-[#046c4e] hover:underline flex items-center gap-1 mb-2"
        >
          ← {isHi ? "वापस 'अधिक' मेनू पर जाएं" : "Back to More Menu"}
        </button>
        <FarmerHelpView />
      </div>
    );
  }

  return (
    <div className="space-y-4 font-['Inter']">
      {/* User Quick Header Banner */}
      <div className="bg-gradient-to-r from-[#046c4e] to-[#0b805d] rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl font-black border border-white/30">
            👨‍🌾
          </div>
          <div>
            <h3 className="text-base font-extrabold">
              {user?.full_name || (isHi ? "किसान मित्र" : "Kisan Mitra")}
            </h3>
            <p className="text-xs text-emerald-100 font-medium">Agra, Uttar Pradesh • {crop} ({mandi} APMC)</p>
          </div>
        </div>

        <button
          onClick={() => setActiveSection('profile')}
          className="px-3.5 py-1.5 rounded-xl bg-white text-[#046c4e] font-extrabold text-xs shadow-md hover:bg-emerald-50 transition"
        >
          {isHi ? "प्रोफ़ाइल देखें" : "Edit Profile"}
        </button>
      </div>

      {/* Menu Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setActiveSection('profile')}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#046c4e] flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">{isHi ? "किसान प्रोफ़ाइल" : "Farmer Profile"}</p>
              <p className="text-[11px] text-slate-500 font-medium">{isHi ? "भूमि आकार, फसल और मंडी विवरण" : "Land size, crops, and default mandi"}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#046c4e] transition" />
        </button>

        <button
          onClick={() => setActiveSection('saved')}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">{isHi ? "सहेजे गए परामर्श और इतिहास" : "Saved Advisories & History"}</p>
              <p className="text-[11px] text-slate-500 font-medium">{isHi ? "पुराने निर्णय और डाउनलोड की गई PDF रिपोर्ट" : "Past decisions & downloaded PDF reports"}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#046c4e] transition" />
        </button>

        <button
          onClick={() => setActiveSection('news')}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">{isHi ? "मंडी समाचार और सरकारी योजनाएं" : "Market News & Govt Schemes"}</p>
              <p className="text-[11px] text-slate-500 font-medium">{isHi ? "MSP अपडेट, PM-किसान और नीति समाचार" : "MSP updates, PM-Kisan & policy news"}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#046c4e] transition" />
        </button>

        <button
          onClick={() => setActiveSection('settings')}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">{isHi ? "ऐप सेटिंग्स और भाषा" : "App Settings & Accessibility"}</p>
              <p className="text-[11px] text-slate-500 font-medium">{isHi ? "भाषा चुनें, टेक्स्ट आकार और सूचनाएं" : "Language selection, text size & alerts"}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#046c4e] transition" />
        </button>

        <button
          onClick={() => setActiveSection('help')}
          className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition text-left flex items-center justify-between group sm:col-span-2"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-[#046c4e] flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">{isHi ? "सहायता केंद्र और किसान कॉल सेंटर" : "Help Center & Kisan Call Center"}</p>
              <p className="text-[11px] text-slate-500 font-medium">{isHi ? "अक्सर पूछे जाने वाले प्रश्न और टोल-फ्री 1800-180-1551" : "FAQ accordion & Toll-Free 1800-180-1551 helpline"}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#046c4e] transition" />
        </button>
      </div>

      {/* Toll Free Helpline Direct CTA Card */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#046c4e] text-white flex items-center justify-center shrink-0">
            <PhoneCall className="h-5 w-5 animate-bounce" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900">{isHi ? "किसान कॉल सेंटर टोल-फ्री हेल्पलाइन" : "Kisan Call Center Toll-Free Helpline"}</p>
            <p className="text-[11px] text-slate-600 font-medium">{isHi ? "निःशुल्क कृषि विशेषज्ञ सहायता • सुबह 6 बजे से रात 10 बजे तक" : "Free agricultural expert advice • 6 AM to 10 PM daily"}</p>
          </div>
        </div>

        <a
          href="tel:18001801551"
          className="px-4 py-2 rounded-xl bg-[#046c4e] hover:bg-[#065f46] text-white font-black text-xs shadow-md transition shrink-0"
        >
          📞 1800-180-1551
        </a>
      </div>
    </div>
  );
}
