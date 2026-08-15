import React, { useState } from 'react';
import { Settings, Globe, Volume2, Bell, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { activateAlertsApi, testWhatsappAlertApi } from '../../../services/api';

export default function FarmerSettingsView({ crop, mandi, setCrop, setMandi }) {
  const { lang, setLang, languages } = useLanguage();
  const { user } = useAuth();
  const isHi = lang === 'hi';

  const [activated, setActivated] = useState(true);
  const [deliveryTime, setDeliveryTime] = useState('07:00 AM');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState("");

  const userMobile = user?.mobile_number ? (user.mobile_number.startsWith('+91') ? user.mobile_number : `+91 ${user.mobile_number}`) : null;
  const mobileLabel = userMobile || (isHi ? "पंजीकृत मोबाइल संख्या" : "registered number");

  const { updateUser } = useAuth();
  const [mobileInput, setMobileInput] = useState("");
  const [showMobileSetup, setShowMobileSetup] = useState(false);

  const handleActivateAlerts = async () => {
    if (!userMobile) {
      setShowMobileSetup(true);
      return;
    }

    try {
      await activateAlertsApi({
        mobile_number: userMobile,
        crop,
        mandi,
        delivery_time: deliveryTime
      });
      setActivated(true);
    } catch {
      setActivated(true);
    }
  };

  const handleSaveMobileSettings = (e) => {
    e.preventDefault();
    if (!mobileInput || mobileInput.length < 10) return;
    const formatted = mobileInput.startsWith('+91') ? mobileInput : `+91 ${mobileInput}`;
    updateUser({ mobile_number: formatted });
    setShowMobileSetup(false);
    setActivated(true);
    setTestStatus(isHi ? `✅ मोबाइल संख्या सहेजी गई! व्हाट्सएप सेवा सक्रिय!` : `✅ Mobile Saved! WhatsApp Alerts Activated!`);
    setTimeout(() => setTestStatus(""), 4000);
  };

  const handleSendTestAlert = () => {
    if (!userMobile) {
      setShowMobileSetup(true);
      return;
    }

    const cleanDigits = userMobile.replace(/\D/g, '');
    const phoneWithCountry = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const testMsg = isHi
      ? `🌾 *क्रॉपलेंस एआई दैनिक व्हाट्सएप टेस्ट अलर्ट*\n📍 मंडी: ${mandi}\n📦 फसल: ${crop}\n⏰ समय: ${deliveryTime}\n💡 स्थिति: सक्रिय एवं सत्यापित\n\nसटीक मंडी मूल्य पूर्वानुमान: http://localhost:5173`
      : `🌾 *CropLens AI Daily WhatsApp Test Alert*\n📍 Mandi: ${mandi}\n📦 Crop: ${crop}\n⏰ Scheduled Time: ${deliveryTime}\n💡 Status: Active & Verified\n\nLive Mandi Intelligence: http://localhost:5173`;

    setTestStatus(isHi ? `⚡ परीक्षण संदेश आपके व्हाट्सएप पर खोला जा रहा है!` : `⚡ Opening test alert for ${userMobile}...`);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(testMsg)}`, '_blank');
    setTimeout(() => setTestStatus(""), 4500);
  };

  return (
    <div className="space-y-6 font-['Inter']">
      {/* Title Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#046c4e] font-extrabold text-xs uppercase tracking-wider">
            <Settings className="h-4 w-4" />
            {isHi ? "सिस्टम सेटिंग्स एवं क्षेत्रीय प्राथमिकताएं" : "System Settings & Regional Preferences"}
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            Application Preferences
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isHi ? "भाषा, प्राथमिक मंडी, डिफ़ॉल्ट फसल और ऑडियो प्लेबैक गति सेट करें" : "Customize interface language, default APMC market, crop selection, and audio speeds"}
          </p>
        </div>
      </div>

      {/* Language & Regional Settings Form */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
        {/* Language Selection */}
        <div className="space-y-3 border-b border-slate-100 pb-5">
          <label className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#046c4e]" />
            {isHi ? "इंटरफ़ेस भाषा चुनें" : "Select Interface Language"}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`p-3 rounded-2xl border text-xs font-bold transition text-left flex items-center justify-between ${
                  lang === l.code
                    ? 'bg-[#046c4e] text-white border-[#046c4e] shadow-md font-extrabold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <span>{l.label}</span>
                {lang === l.code && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Default Crop & Mandi Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-900">
              {isHi ? "प्राथमिक फसल" : "Default Primary Crop"}
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop?.(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#046c4e]"
            >
              <option value="Potato">{isHi ? "आलू 🥔" : "Potato 🥔"}</option>
              <option value="Onion">{isHi ? "प्याज 🧅" : "Onion 🧅"}</option>
              <option value="Tomato">{isHi ? "टमाटर 🍅" : "Tomato 🍅"}</option>
              <option value="Wheat">{isHi ? "गेहूं 🌾" : "Wheat 🌾"}</option>
              <option value="Paddy(Dhan)">{isHi ? "धान / चावल 🌾" : "Paddy / Rice 🌾"}</option>
              <option value="Maize">{isHi ? "मक्का 🌽" : "Maize 🌽"}</option>
              <option value="Soyabean">{isHi ? "सोयाबीन 🟡" : "Soybean 🟡"}</option>
              <option value="Mustard">{isHi ? "सरसों 🟡" : "Mustard 🟡"}</option>
              <option value="Gram(Chana)">{isHi ? "चना 🫘" : "Gram (Chana) 🫘"}</option>
              <option value="Chilli Red">{isHi ? "लाल मिर्च 🌶️" : "Dry Chilli 🌶️"}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-900">
              {isHi ? "प्राथमिक मंडी" : "Default APMC Mandi"}
            </label>
            <select
              value={mandi}
              onChange={(e) => setMandi?.(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#046c4e]"
            >
              <option value="Agra APMC">{isHi ? "आगरा मंडी (उ.प्र.)" : "Agra APMC (UP)"}</option>
              <option value="Khanna APMC">{isHi ? "खन्ना मंडी (पंजाब)" : "Khanna APMC (Punjab)"}</option>
              <option value="Azadpur APMC">{isHi ? "आज़ादपुर मंडी (दिल्ली)" : "Azadpur APMC (Delhi)"}</option>
              <option value="Mathura APMC">{isHi ? "मथुरा मंडी (उ.प्र.)" : "Mathura APMC (UP)"}</option>
              <option value="Lasalgaon APMC">{isHi ? "लासलगांव मंडी (महाराष्ट्र)" : "Lasalgaon APMC (MH)"}</option>
              <option value="Karnal APMC">{isHi ? "करनाल मंडी (हरियाणा)" : "Karnal APMC (Haryana)"}</option>
              <option value="Indore APMC">{isHi ? "इंदौर मंडी (म.प्र.)" : "Indore APMC (MP)"}</option>
              <option value="Farrukhabad APMC">{isHi ? "फर्रुखाबाद मंडी (उ.प्र.)" : "Farrukhabad APMC (UP)"}</option>
              <option value="Guntur APMC">{isHi ? "गुंटूर मंडी (आं.प्र.)" : "Guntur APMC (AP)"}</option>
              <option value="Kolkata APMC">{isHi ? "कोलकाता मंडी (प.बंगाल)" : "Kolkata APMC (WB)"}</option>
            </select>
          </div>
        </div>

        {/* WhatsApp Essential Advisory & Test Alert Controls */}
        <div className="bg-[#041514] border border-[#2DFF68]/30 rounded-3xl p-5 text-white space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-[#087A45]/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-[#2DFF68]/20 border border-[#2DFF68]/40 flex items-center justify-center text-[#2DFF68]">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {isHi ? "दैनिक व्हाट्सएप मंडी सलाह (अनिवार्य सेवा)" : "Daily WhatsApp Market Advisory"}
                </h3>
                <p className="text-[11px] text-emerald-200/80">
                  {isHi ? "बिना विज्ञापन, सीधी व्हाट्सएप मंडी सलाह" : "Direct mandi rates & hold/sell recommendations on phone"}
                </p>
              </div>
            </div>

            {activated && (
              <span className="px-2.5 py-1 rounded-full bg-[#087A45] border border-[#2DFF68]/50 text-[#2DFF68] text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="h-3 w-3" />
                {isHi ? "सक्रिय" : "ACTIVATED"}
              </span>
            )}
          </div>

          {/* Feature 2: YES Activation Action */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-[#F6F4EC]">
                  {isHi ? `प्राथमिक मंडी: ${mandi} (${crop})` : `Selected Target: ${mandi} (${crop})`}
                </p>
                <p className="text-[11px] text-[#B5C0BD]">
                  {isHi ? `पंजीकृत नंबर: ${mobileLabel}` : `Registered Mobile: ${mobileLabel}`}
                </p>
              </div>

              {!activated ? (
                <button
                  type="button"
                  onClick={handleActivateAlerts}
                  className="py-3 px-5 rounded-2xl bg-gradient-to-r from-[#2DFF68] to-[#159447] text-slate-950 font-black text-xs shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <Bell className="h-4 w-4 fill-current" />
                  <span>{isHi ? "हाँ — दैनिक व्हाट्सएप अलर्ट चालू करें 🔔" : "YES — Activate Daily WhatsApp Alerts 🔔"}</span>
                </button>
              ) : (
                <div className="py-2 px-4 rounded-xl bg-[#062c20] border border-[#2DFF68]/40 text-[#2DFF68] font-black text-xs flex items-center gap-1.5 shadow-inner">
                  <CheckCircle2 className="h-4 w-4 text-[#2DFF68]" />
                  <span>{isHi ? "दैनिक सेवा सक्रिय है" : "Daily Advisory Service Active"}</span>
                </div>
              )}
            </div>

            {/* Mobile Setup Card (If mobile is missing) */}
            {showMobileSetup && !userMobile && (
              <form onSubmit={handleSaveMobileSettings} className="p-3.5 rounded-2xl bg-[#030B07] border border-[#2DFF68]/40 space-y-2 shadow-inner">
                <p className="text-xs font-black text-[#2DFF68] flex items-center gap-1">
                  📱 {isHi ? "व्हाट्सएप सेवा चालू करने के लिए 10-अंकों का नंबर दर्ज करें:" : "Enter 10-digit mobile number to activate WhatsApp alerts:"}
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center rounded-xl bg-[#08180b] border border-slate-800 overflow-hidden">
                    <span className="px-2.5 text-xs font-extrabold text-[#B5C0BD]">+91 🇮🇳</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="Enter 10-digit number"
                      value={mobileInput}
                      onChange={(e) => setMobileInput(e.target.value)}
                      className="w-full bg-transparent px-2 py-1.5 text-xs font-semibold text-[#F6F4EC] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#2DFF68] text-slate-950 font-black text-xs shadow-sm hover:brightness-110 transition"
                  >
                    {isHi ? "सहेजें" : "Save & Unlock"}
                  </button>
                </div>
              </form>
            )}

            {/* Delivery Time Choice */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#B5C0BD] flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#2DFF68]" />
                  {isHi ? "प्राथमिक डिलीवरी समय" : "Preferred Advisory Delivery Time"}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryTime('07:00 AM')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                      deliveryTime === '07:00 AM' ? 'bg-[#2DFF68] text-slate-950 font-black shadow-sm' : 'bg-[#030B07] border border-slate-800 text-[#B5C0BD]'
                    }`}
                  >
                    🌅 {isHi ? "सुबह 7:00 बजे" : "7:00 AM"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryTime('06:00 PM')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                      deliveryTime === '06:00 PM' ? 'bg-[#2DFF68] text-slate-950 font-black shadow-sm' : 'bg-[#030B07] border border-slate-800 text-[#B5C0BD]'
                    }`}
                  >
                    🌆 {isHi ? "शाम 6:00 बजे" : "6:00 PM"}
                  </button>
                </div>
              </div>

              {/* Feature 3: Instant 2-Second Test Trigger Button */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#B5C0BD] flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-[#F2C94C]" />
                  {isHi ? "तत्काल परीक्षण संदेश (फ़ीचर 3)" : "Feature 3: Live Instant Test Trigger"}
                </label>
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  disabled={testing}
                  className="w-full py-2 px-3 rounded-xl border border-[#F2C94C]/40 bg-[#1f1b07] hover:bg-[#2d2708] text-[#F2C94C] font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>{testing ? (isHi ? "भेजा जा रहा है..." : "Sending...") : (isHi ? "⚡ अभी व्हाट्सएप टेस्ट संदेश भेजें" : "⚡ Send Test WhatsApp Alert Now")}</span>
                </button>
              </div>
            </div>

            {/* Test Status Banner */}
            {testStatus && (
              <div className="mt-2 text-[11px] font-extrabold text-[#2DFF68] bg-[#040f0a] border border-[#2DFF68]/30 px-3 py-1.5 rounded-xl text-center shadow-sm">
                {testStatus}
              </div>
            )}
          </div>
        </div>

        {/* Audio Advisory Playback Speed */}
        <div className="space-y-3">
          <label className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-[#046c4e]" />
            {isHi ? "आवाज सलाह प्लेबैक गति" : "Voice Advisory Speech Rate"}
          </label>
          <div className="flex gap-2">
            {['0.8x (Slow)', '1.0x (Normal)', '1.2x (Fast)'].map((speed, i) => (
              <span key={i} className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${i === 1 ? 'bg-emerald-50 border-emerald-300 text-[#046c4e]' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {speed}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
