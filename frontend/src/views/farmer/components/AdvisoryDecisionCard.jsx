import React, { useState } from 'react';
import { Hourglass, TrendingUp, Smartphone, Share2, Copy } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency } from '../../../utils/numberUtils';
import { sendWhatsappAdvisoryApi } from '../../../services/api';

export default function AdvisoryDecisionCard({
  decision = "HOLD FOR 5 DAYS",
  decisionHi = "5 दिन फसल रोके रखें",
  currentPrice = 1650,
  targetPrice = 1780,
  expectedGain = 130,
  crop = "Potato",
  mandi = "Agra"
}) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const isHi = lang === 'hi';
  const displayDecision = isHi ? (decisionHi || "5 दिन फसल रोके रखें") : decision;
  const userMobile = user?.mobile_number ? (user.mobile_number.startsWith('+91') ? user.mobile_number : `+91 ${user.mobile_number}`) : null;
  const mobileLabel = userMobile || (isHi ? "पंजीकृत मोबाइल संख्या" : "registered number");

  const getFormattedAdvisoryText = () => {
    const cropName = isHi ? (cropNamesHi[crop] || crop) : crop;
    const mandiName = isHi ? (mandiNamesHi[mandi] || mandi) : mandi;

    if (isHi) {
      return (
        `🌾 *क्रॉपलेंस एआई बाजार सलाह*\n` +
        `📍 मंडी: ${mandiName}\n` +
        `📦 फसल: ${cropName}\n` +
        `💡 सलाह: *${displayDecision}*\n` +
        `💰 आज का भाव: ₹${currentPrice}/क्विंटल\n` +
        `📈 लक्ष्य भाव: ₹${targetPrice}/क्विंटल\n` +
        `🚀 अनुमानित लाभ: +₹${expectedGain}/क्विंटल\n\n` +
        `लाइव मंडी सलाह: http://localhost:5173`
      );
    }
    return (
      `🌾 *CropLens AI Market Advisory*\n` +
      `📍 Mandi: ${mandi} APMC\n` +
      `📦 Crop: ${crop}\n` +
      `💡 Advisory: *${decision}*\n` +
      `💰 Today's Rate: ₹${currentPrice}/qtl\n` +
      `📈 Target Price: ₹${targetPrice}/qtl\n` +
      `🚀 Expected Gain: +₹${expectedGain}/qtl\n\n` +
      `Live Mandi Intelligence at http://localhost:5173`
    );
  };

  const { updateUser } = useAuth();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [inputMobile, setInputMobile] = useState("");

  const handleSendToMyself = () => {
    if (!userMobile) {
      setShowShareMenu(false);
      setShowMobileModal(true);
      return;
    }

    const text = getFormattedAdvisoryText();
    const cleanDigits = userMobile.replace(/\D/g, '');
    const phoneWithCountry = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

    setShowShareMenu(false);
    setToastMsg(isHi ? `✅ आपके व्हाट्सएप (${userMobile}) पर सलाह खोली जा रही है!` : `✅ Opening WhatsApp for ${userMobile}...`);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleSaveMobileAndDispatch = (e) => {
    e.preventDefault();
    if (!inputMobile || inputMobile.length < 10) return;

    const formatted = inputMobile.startsWith('+91') ? inputMobile : `+91 ${inputMobile}`;
    updateUser({ mobile_number: formatted });
    setShowMobileModal(false);

    const text = getFormattedAdvisoryText();
    const cleanDigits = formatted.replace(/\D/g, '');
    const phoneWithCountry = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

    setToastMsg(isHi ? `✅ प्रोफ़ाइल सहेजी गई! व्हाट्सएप पर सलाह खोली जा रही है!` : `✅ Profile Saved! Opening WhatsApp for ${formatted}...`);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getFormattedAdvisoryText());
    setShowShareMenu(false);
    setToastMsg(isHi ? "📋 सलाह टेक्स्ट क्लिपबोर्ड पर कॉपी किया गया!" : "📋 Advisory copied to clipboard!");
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Native Hindi Translations for Crop & Mandi
  const cropNamesHi = {
    Potato: "आलू",
    Onion: "प्याज",
    Tomato: "टमाटर",
    Wheat: "गेहूं",
    "Paddy(Dhan)": "धान / चावल",
    Maize: "मक्का",
    Soyabean: "सोयाबीन",
    Mustard: "सरसों",
    "Gram(Chana)": "चना",
    "Chilli Red": "लाल मिर्च"
  };

  const mandiNamesHi = {
    Agra: "आगरा मंडी",
    Khanna: "खन्ना मंडी",
    Azadpur: "आज़ादपुर मंडी",
    Mathura: "मथुरा मंडी",
    Lasalgaon: "लासलगांव मंडी",
    Karnal: "करनाल मंडी",
    Indore: "इंदौर मंडी",
    Farrukhabad: "फर्रुखाबाद मंडी",
    Guntur: "गुंटूर मंडी",
    Kolkata: "कोलकाता मंडी"
  };

  const activeCropName = isHi ? (cropNamesHi[crop] || crop) : crop;
  const activeMandiName = isHi ? (mandiNamesHi[mandi] || `${mandi} Mandi`) : `${mandi} Mandi`;

  return (
    <div className="bg-gradient-to-br from-[#fffdf5] via-[#fffbf0] to-[#fef9c3]/30 border border-amber-300/80 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-['Inter'] hover:shadow-lg transition-all duration-300">
      {/* Left: Hourglass Icon & Advice Details */}
      <div className="flex items-start gap-4">
        {/* Hourglass 3D Badge */}
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 border border-amber-300 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20 text-slate-950">
          <Hourglass className="h-8 w-8 text-amber-950 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            {/* Inter 800 for Main Recommendation */}
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {displayDecision}
            </h3>
            {/* Gold Gradient Recommendation Badge */}
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-sm">
              {t("farmer.decision.advice")}
            </span>
          </div>

          {/* Inter 700 for Notice */}
          <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#046c4e]" />
            {t("farmer.decision.riseNotice")} {activeMandiName}
          </p>

          {/* Inter 400-500 for Supporting Description */}
          <p className="text-xs text-slate-600 leading-relaxed font-normal max-w-xl">
            {isHi ? (
              <>
                मंडी रुझान के अनुसार <strong>{activeMandiName}</strong> में <strong>{activeCropName}</strong> का भाव{' '}
                <strong className="text-slate-900 font-bold">{formatCurrency(currentPrice)}</strong> से बढ़कर{' '}
                <strong className="text-[#046c4e] font-bold">{formatCurrency(targetPrice)}</strong> होने का अनुमान है (मुनाफा:{' '}
                <strong className="text-[#046c4e] font-bold">{formatCurrency(expectedGain)}/क्विंटल</strong>)।
              </>
            ) : (
              <>
                Market trend analysis indicates that the price of {crop.toLowerCase()} in {activeMandiName} may increase from{' '}
                <strong className="text-slate-900 font-bold">{formatCurrency(currentPrice)}</strong> to{' '}
                <strong className="text-[#046c4e] font-bold">{formatCurrency(targetPrice)}</strong> in the next 5 days, an expected gain of{' '}
                <strong className="text-[#046c4e] font-bold">{formatCurrency(expectedGain)} per quintal</strong>.
              </>
            )}
          </p>
        </div>
      </div>

        {/* Right Actions: WhatsApp Share Popover & Sell vs Store Calculator */}
        <div className="shrink-0 space-y-2 w-full md:w-auto flex flex-col items-stretch relative">
          {/* Main Share Button */}
          <button
            type="button"
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.005 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>{isHi ? "व्हाट्सएप पर शेयर करें ▼" : "Share on WhatsApp ▼"}</span>
          </button>

          {/* Toast Notification Banner */}
          {toastMsg && (
            <div className="absolute -top-12 left-0 right-0 z-30 bg-[#063B2B] border border-[#2DFF68]/40 text-[#2DFF68] text-[11px] font-extrabold px-3 py-1.5 rounded-xl text-center shadow-lg animate-bounce">
              {toastMsg}
            </div>
          )}

          {/* Share Options Popover Menu */}
          {showShareMenu && (
            <div className="absolute right-0 top-12 z-20 w-64 bg-[#041514] border border-[#2DFF68]/30 rounded-2xl p-2 shadow-2xl space-y-1.5 backdrop-blur-xl">
              {/* Option 1: Send to Myself (Direct Automated Message) */}
              <button
                type="button"
                onClick={handleSendToMyself}
                disabled={sharing}
                className="w-full text-left p-2.5 rounded-xl bg-[#06241b] hover:bg-[#083b2c] border border-[#2DFF68]/20 transition space-y-0.5 group"
              >
                <div className="text-xs font-extrabold text-[#2DFF68] flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" />
                  {isHi ? "📲 स्वयं के मोबाइल पर भेजें" : "📲 Send to Myself (Direct)"}
                </div>
                <div className="text-[10px] text-[#B5C0BD]">
                  {isHi ? `स्वचालित संदेश: ${mobileLabel}` : `Auto-send to ${mobileLabel}`}
                </div>
              </button>

              {/* Option 2: Share with Village Group (WhatsApp Web/App in Vernacular) */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(getFormattedAdvisoryText())}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareMenu(false)}
                className="w-full text-left p-2.5 rounded-xl bg-[#06241b] hover:bg-[#083b2c] border border-emerald-500/20 transition block space-y-0.5"
              >
                <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-[#25D366]" />
                  {isHi ? "👥 किसान व्हाट्सएप ग्रुप पर भेजें" : "👥 Share with Village Group"}
                </div>
                <div className="text-[10px] text-[#B5C0BD]">
                  {isHi ? "व्हाट्सएप ऐप/वेब (हिंदी प्रारूप)" : "Opens WhatsApp Web / Mobile App"}
                </div>
              </a>

              {/* Option 3: Copy Text to Clipboard */}
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full text-left p-2.5 rounded-xl bg-[#06241b] hover:bg-[#083b2c] border border-slate-700 transition space-y-0.5"
              >
                <div className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  {isHi ? "📋 सलाह टेक्स्ट कॉपी करें" : "📋 Copy Advisory Text"}
                </div>
                <div className="text-[10px] text-[#B5C0BD]">
                  {isHi ? "क्लिपबोर्ड पर कॉपी करें" : "Copy text for SMS / Telegram"}
                </div>
              </button>
            </div>
          )}

          {/* Sell vs Store Calculator Info Badge */}
          <div className="bg-[#046c4e]/10 border border-[#046c4e]/20 rounded-xl p-2 text-[11px] text-[#046c4e] font-semibold text-center">
            {isHi ? "📊 अभी बेचे vs 5 दिन रोके तुलना:" : "📊 Sell Today vs Store 5 Days:"}
            <span className="block font-black text-slate-900 mt-0.5">
              {isHi ? `मुनाफा: +₹${expectedGain - 35}/क्विंटल (कोल्ड स्टोरेज शुल्क घटाकर)` : `Net Gain: +₹${expectedGain - 35}/qtl (after ₹35 storage)`}
            </span>
          </div>
        </div>

        {/* Mobile Setup Modal (Triggered when user clicks Send to Myself without a saved mobile) */}
        {showMobileModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#041514] border border-[#2DFF68]/40 rounded-3xl p-6 max-w-sm w-full text-white space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#2DFF68]/20 border border-[#2DFF68]/40 flex items-center justify-center text-[#2DFF68] font-black text-lg">
                  📱
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isHi ? "व्हाट्सएप सेवा सक्रिय करें" : "Mobile Number Required"}
                  </h3>
                  <p className="text-xs text-[#B5C0BD]">
                    {isHi ? "सीधे व्हाट्सएप सलाह प्राप्त करने के लिए 10-अंकों का नंबर दर्ज करें" : "Enter mobile number to receive automated WhatsApp market alerts"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveMobileAndDispatch} className="space-y-3">
                <div className="flex items-center rounded-xl bg-[#030B07] border border-slate-800 focus-within:border-[#2DFF68] overflow-hidden">
                  <span className="px-3 text-xs font-extrabold text-[#B5C0BD] bg-[#08180b] py-2.5 border-r border-slate-800">+91 🇮🇳</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={inputMobile}
                    onChange={(e) => setInputMobile(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-[#F6F4EC] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMobileModal(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                  >
                    {isHi ? "रद्द करें" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-[#2DFF68] to-[#159447] text-slate-950 font-black text-xs shadow-md transition"
                  >
                    {isHi ? "सहेजें और भेजें →" : "Save & Activate →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
