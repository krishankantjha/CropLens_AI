import React, { useState } from 'react';
import { User, ShieldCheck, MapPin, Sprout, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';

export default function FarmerProfileView({ crop, mandi }) {
  const { user, updateUser } = useAuth();
  const { lang } = useLanguage();
  const isHi = lang === 'hi';

  const hasRealMobile = user?.mobile_number && !user.mobile_number.includes("98765 43210");
  const [mobileInput, setMobileInput] = useState(user?.mobile_number || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const userName = user?.full_name || (isHi ? "किसान मित्र" : "Kisan Mitra");
  const userEmail = user?.email || (isHi ? "पंजीकृत उपयोगकर्ता" : "Registered User");
  const role = user?.role === 'trader' ? "Registered Mandi Trader" : "Verified APMC Kisan";

  const handleSaveMobile = (e) => {
    e.preventDefault();
    if (!mobileInput || mobileInput.length < 10) return;
    updateUser({ mobile_number: mobileInput });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-['Inter']">
      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        {user?.picture ? (
          <img src={user.picture} alt={userName} className="h-20 w-20 rounded-full border-2 border-emerald-500 shadow-md shrink-0 object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#046c4e] to-[#22c55e] flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
            {userName.charAt(0)}
          </div>
        )}

        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">{userName}</h2>
            <span className="bg-emerald-50 text-[#046c4e] border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#046c4e]" /> VERIFIED KISAN
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">{role} • {userEmail}</p>
        </div>
      </div>

      {/* Account Details Form */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-[#046c4e]" />
          {isHi ? "किसान प्रोफ़ाइल विवरण" : "Farmer Profile & Agricultural Details"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 font-medium block">{isHi ? "पूरा नाम" : "Full Name"}</span>
            <span className="font-extrabold text-slate-900 text-sm">{userName}</span>
          </div>

          {/* Interactive Mobile Linking Card */}
          <div className={`p-3.5 rounded-2xl border transition ${hasRealMobile ? 'bg-slate-50 border-slate-100' : 'bg-emerald-50/60 border-emerald-200'}`}>
            <span className="text-slate-500 font-bold block mb-1 flex items-center justify-between">
              <span>{isHi ? "मोबाइल नंबर" : "Mobile Number"}</span>
              {hasRealMobile && <span className="text-[10px] text-emerald-700 font-extrabold">✓ Saved</span>}
            </span>

            {hasRealMobile ? (
              <span className="font-extrabold text-slate-900 text-sm">{user.mobile_number}</span>
            ) : (
              <form onSubmit={handleSaveMobile} className="flex gap-2 mt-1">
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit mobile number"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold outline-none focus:border-[#046c4e]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#046c4e] hover:bg-[#065f46] text-white font-extrabold text-xs shadow-sm flex items-center gap-1 shrink-0"
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </form>
            )}

            {savedSuccess && (
              <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Phone number saved! WhatsApp alerts activated.
              </p>
            )}
          </div>

          <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 font-medium block">{isHi ? "प्राथमिक फसल" : "Primary Crop"}</span>
            <span className="font-extrabold text-[#046c4e] text-sm flex items-center gap-1">
              <Sprout className="h-4 w-4" /> {crop}
            </span>
          </div>

          <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 font-medium block">{isHi ? "पंजीकृत मंडी" : "Registered Mandi Hub"}</span>
            <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1">
              <MapPin className="h-4 w-4 text-rose-500" /> {mandi} APMC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
