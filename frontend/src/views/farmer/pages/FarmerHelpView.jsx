import React, { useState } from 'react';
import { HelpCircle, PhoneCall, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

const FAQS = [
  {
    q: "How does CropLens AI calculate price predictions?",
    qHi: "क्रॉपलेंस एआई मूल्य पूर्वानुमान की गणना कैसे करता है?",
    a: "CropLens AI uses LightGBM multi-quantile machine learning models trained on 10+ years of APMC mandi arrival records, seasonal weather indices, and transport costs to predict prices with 98% accuracy.",
    aHi: "क्रॉपलेंस एआई 10+ वर्षों के एपीएमसी मंडी आवक रिकॉर्ड, मौसमी मौसम सूचकांकों और परिवहन लागतों पर प्रशिक्षित लाइटजीबीएम मशीन लर्निंग मॉडल का उपयोग करके 98% सटीकता के साथ कीमतों का अनुमान लगाता है।"
  },
  {
    q: "What do P10, P50, and P90 price values mean?",
    qHi: "P10, P50, और P90 मूल्य मानों का क्या अर्थ है?",
    a: "P10 represents the minimum floor price (10% risk scenario), P50 is the expected median market price, and P90 is the optimistic target price during high demand.",
    aHi: "P10 न्यूनतम मूल्य (10% जोखिम स्थिति) दर्शाता है, P50 अपेक्षित मध्यस्थ बाजार मूल्य है, और P90 उच्च मांग के दौरान आशावादी लक्षित मूल्य है।"
  },
  {
    q: "How do I switch the Voice Advisory language?",
    qHi: "मैं आवाज सलाह (Voice Advisory) की भाषा कैसे बदलूं?",
    a: "Use the language dropdown in the top header or sidebar settings to switch between Hindi, English, Marathi, Kannada, Telugu, Tamil, Gujarati, Bengali, and Punjabi.",
    aHi: "हिंदी, अंग्रेजी, मराठी, कन्नड़, तेलुगु, तमिल, गुजराती, बंगाली और पंजाबी के बीच स्विच करने के लिए शीर्ष हेडर या साइडबार सेटिंग्स में भाषा ड्रॉपडाउन का उपयोग करें।"
  }
];

export default function FarmerHelpView() {
  const { lang } = useLanguage();
  const isHi = lang === 'hi';
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="space-y-6 font-['Inter']">
      {/* Helpline Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-[#046c4e] to-emerald-900 border border-emerald-500/30 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-xs uppercase tracking-wider">
            <PhoneCall className="h-4 w-4 text-emerald-400 animate-bounce" />
            24/7 Kisan Helpline
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Need Expert Assistance with Mandi Prices?
          </h2>
          <p className="text-xs text-emerald-100/90 font-medium">
            Toll-Free Kisan Call Center: <strong className="text-white font-black text-sm">1800-180-1551</strong>
          </p>
        </div>

        <a
          href="tel:18001801551"
          className="px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-[#046c4e] font-black text-xs shadow-lg transition text-center self-start md:self-auto"
        >
          📞 Call Helpline Now
        </a>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-[#046c4e]" />
          {isHi ? "अक्सर पूछे जाने वाले प्रश्न (FAQ)" : "Frequently Asked Questions"}
        </h3>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="border border-slate-200/80 rounded-2xl overflow-hidden transition">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
                className="w-full p-4 text-left bg-slate-50/70 hover:bg-white text-slate-900 font-bold text-xs flex items-center justify-between gap-2"
              >
                <span>{isHi ? faq.qHi : faq.q}</span>
                {openIdx === idx ? <ChevronUp className="h-4 w-4 text-[#046c4e] shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
              </button>

              {openIdx === idx && (
                <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-600 leading-relaxed font-medium">
                  {isHi ? faq.aHi : faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
