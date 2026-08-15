import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, Headphones, Lock } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import GuestNoticeToast from '../../../components/shared/GuestNoticeToast';

function toSpokenPrice(num, lang = 'en') {
  if (!num) return "";
  const n = parseInt(num, 10);

  if (lang === 'hi' || lang === 'mr') {
    if (n === 1650) return "सोलह सौ पचास रुपये";
    if (n === 1780) return "सत्रह सौ अस्सी रुपये";
    if (n === 130) return "एक सौ तीस रुपये";
    if (n === 2850) return "अट्ठाइस सौ पचास रुपये";
    if (n === 3050) return "तीन हजार पचास रुपये";
    if (n === 200) return "दो सौ रुपये";
    if (n === 2100) return "इक्कीस सौ रुपये";
    if (n === 2450) return "चौबीस सौ पचास रुपये";
    if (n === 350) return "साढ़े तीन सौ रुपये";
    return `${n} रुपये`;
  }
  
  return `${n} rupees`;
}

export default function VoiceAdvisoryCard({
  mandi = "Agra",
  crop = "Potato",
  currentPrice = 1650,
  targetPrice = 1780
}) {
  const { lang, t } = useLanguage();
  const { user, token } = useAuth();
  
  const isGuest = !token || token.startsWith('demo_jwt_token');

  const farmerName = user?.full_name || "Kisan";
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState('1.0x');
  const [progress, setProgress] = useState(0);
  const [toastMsg, setToastMsg] = useState(null);

  const localeMap = {
    en: 'en-US', hi: 'hi-IN', mr: 'mr-IN', kn: 'kn-IN',
    te: 'te-IN', ta: 'ta-IN', gu: 'gu-IN', bn: 'bn-IN', pa: 'pa-IN'
  };

  const cropTranslations = {
    hi: { Potato: "आलू", Onion: "प्याज", Tomato: "टमाटर", Wheat: "गेहूं", "Paddy(Dhan)": "धान / चावल", Maize: "मक्का", Soyabean: "सोयाबीन", Mustard: "सरसों", "Gram(Chana)": "चना", "Chilli Red": "लाल मिर्च" },
    mr: { Potato: "बटाटा", Onion: "कांदा", Tomato: "टोमॅटो", Wheat: "गहू", "Paddy(Dhan)": "भात / तांदूळ", Maize: "मका", Soyabean: "सोयाबीन", Mustard: "मोहरी", "Gram(Chana)": "हरभरा", "Chilli Red": "लाल मिरची" },
    kn: { Potato: "ಆಲೂಗಡ್ಡೆ", Onion: "ಈರುಳ್ಳಿ", Tomato: "ಟೊಮೆಟೊ", Wheat: "ಗೋಧಿ", "Paddy(Dhan)": "ಭತ್ತ", Maize: "ಮೆಕ್ಕೆಜೋಳ", Soyabean: "ಸೋಯಾಬೀನ್", Mustard: "ಸಾಸಿವೆ", "Gram(Chana)": "ಕಡಲೆ", "Chilli Red": "ಕೆಂಪು ಮೆಣಸಿನಕಾಯಿ" },
    te: { Potato: "బంగాళాదుంప", Onion: "ఉల్లిపాయ", Tomato: "టమోటా", Wheat: "గోధుమలు", "Paddy(Dhan)": "వరి / ధాన్యం", Maize: "మొక్కజొన్న", Soyabean: "సోయాబీన్", Mustard: "ఆవాలు", "Gram(Chana)": "శనగలు", "Chilli Red": "ఎర్ర మిరపకాయలు" },
    ta: { Potato: "உருளைக்கிழங்கு", Onion: "வெங்காயம்", Tomato: "தக்காளி", Wheat: "கோதுமை", "Paddy(Dhan)": "நெல் / அரிசி", Maize: "மக்காச்சோளம்", Soyabean: "சோயாபீன்", Mustard: "கடுகு", "Gram(Chana)": "கொண்டைக்கடலை", "Chilli Red": "சிவப்பு மிளகாய்" },
    gu: { Potato: "બટાકા", Onion: "ડુંગળી", Tomato: "ટામેટાં", Wheat: "ઘઉં", "Paddy(Dhan)": "ડાંગર / ચોખા", Maize: "મકાઈ", Soyabean: "સોયાબીન", Mustard: "રાઈ", "Gram(Chana)": "ચણા", "Chilli Red": "લાલ મરચું" },
    bn: { Potato: "আলু", Onion: "পেঁয়াজ", Tomato: "টমেটো", Wheat: "গম", "Paddy(Dhan)": "ধান / চাল", Maize: "ভুট্টা", Soyabean: "সয়াবিন", Mustard: "সরিষা", "Gram(Chana)": "ছোলা", "Chilli Red": "শুকনো লঙ্কা" },
    pa: { Potato: "ਆਲੂ", Onion: "ਪਿਆਜ਼", Tomato: "ਟਮਾਟਰ", Wheat: "ਕਣਕ", "Paddy(Dhan)": "ਝੋਨਾ / ਚਾਵਲ", Maize: "ਮੱਕੀ", Soyabean: "ਸੋਇਆਬੀਨ", Mustard: "ਸਰ੍ਹੋਂ", "Gram(Chana)": "ਛੋਲੇ", "Chilli Red": "ਲਾਲ ਮਿਰਚ" }
  };

  const mandiTranslations = {
    hi: { Agra: "आगरा मंडी", Khanna: "खन्ना मंडी", Azadpur: "आज़ादपुर मंडी", Mathura: "मथुरा मंडी", Lasalgaon: "लासलगांव मंडी", Karnal: "करनाल मंडी", Indore: "इंदौर मंडी", Farrukhabad: "फर्रुखाबाद मंडी", Guntur: "गुंटूर मंडी", Kolkata: "कोलकाता मंडी" },
    mr: { Agra: "आग्रा मार्केट", Khanna: "खन्ना मार्केट", Azadpur: "आझादपूर मार्केट", Mathura: "मथुरा मार्केट", Lasalgaon: "लासलगाव मार्केट", Karnal: "कर्नाल मार्केट", Indore: "इंदूर मार्केट", Farrukhabad: "फर्रुखाबाद मार्केट", Guntur: "गुंटूर मार्केट", Kolkata: "कोलकाता मार्केट" },
    kn: { Agra: "ಆಗ್ರಾ ಮಂಡಿ", Khanna: "ಖನ್ನಾ ಮಂಡಿ", Azadpur: "ಆಜಾದ್‌ಪುರ ಮಂಡಿ", Mathura: "ಮಥುರಾ ಮಂಡಿ", Lasalgaon: "ಲಾಸಲ್ಗಾಂವ್ ಮಂಡಿ", Karnal: "ಕರ್ನಾಲ್ ಮಂಡಿ", Indore: "ಇಂದೋರ್ ಮಂಡಿ", Farrukhabad: "ಫರೂಖಾಬಾದ್ ಮಂಡಿ", Guntur: "ಗುಂಟೂರು ಮಂಡಿ", Kolkata: "ಕೋಲ್ಕತಾ ಮಂಡಿ" },
    te: { Agra: "ఆగ్రా మండి", Khanna: "ఖన్నా మండి", Azadpur: "ఆజాద్‌పూర్ మండి", Mathura: "మథుర మండి", Lasalgaon: "లాసల్‌గావ్ మండి", Karnal: "కర్నాల్ మండి", Indore: "ఇండోర్ మండి", Farrukhabad: "ఫరూఖాబాద్ మండి", Guntur: "గుంటూరు మండి", Kolkata: "కోల్‌కతా మండి" },
    ta: { Agra: "ஆக்ரா மண்டி", Khanna: "கன்னா மண்டி", Azadpur: "ஆசாத்ரபூர் மண்டி", Mathura: "மதுரா மண்டி", Lasalgaon: "லாசல்கான் மண்டி", Karnal: "கர்னால் மண்டி", Indore: "இந்தோர் மண்டி", Farrukhabad: "பரூக்காபாத் மண்டி", Guntur: "குண்டூர் மண்டி", Kolkata: "கொல்கத்தா மண்டி" },
    gu: { Agra: "આગ્રા મંડી", Khanna: "ખન્ના મંડી", Azadpur: "આઝાદપુર મંડી", Mathura: "મથુરા મંડી", Lasalgaon: "લાસલગામ મંડી", Karnal: "કરનાલ મંડી", Indore: "ઇન્દોર મંડી", Farrukhabad: "ફારૂખાબાદ મંડી", Guntur: "ગુંટુર મંડી", Kolkata: "કોલકાતા મંડી" },
    bn: { Agra: "আগ্রা মান্ডি", Khanna: "খান্না মান্ডি", Azadpur: "আজাদপুর মান্ডি", Mathura: "মথুরা মান্ডি", Lasalgaon: "লাসালগাঁও মান্ডি", Karnal: "কার্নাল মান্ডি", Indore: "ইন্দোর মান্ডি", Farrukhabad: "ফারুখাবাদ মান্ডি", Guntur: "গুন্টুর মান্ডি", Kolkata: "কলকাতা মান্ডি" },
    pa: { Agra: "ਆਗਰਾ ਮੰਡੀ", Khanna: "ਖੰਨਾ ਮੰਡੀ", Azadpur: "ਆਜ਼ਾਦਪੁਰ ਮੰਡੀ", Mathura: "ਮਥੁਰਾ ਮੰਡੀ", Lasalgaon: "ਲਾਸਲਗਾਓਂ ਮੰਡੀ", Karnal: "ਕਰਨਾਲ ਮੰਡੀ", Indore: "ਇੰਦੌਰ ਮੰਡੀ", Farrukhabad: "ਫਰੂਖਾਬਾਦ ਮੰਡੀ", Guntur: "ਗੁੰਟੂਰ ਮੰਡੀ", Kolkata: "ਕੋਲਕਾਤਾ ਮੰਡੀ" }
  };

  const currentCropTrans = cropTranslations[lang] || {};
  const currentMandiTrans = mandiTranslations[lang] || {};

  const activeCropName = currentCropTrans[crop] || crop;
  const activeMandiName = currentMandiTrans[mandi] || `${mandi} Mandi`;

  const spokenCurrentPrice = toSpokenPrice(currentPrice, lang);
  const spokenTargetPrice = toSpokenPrice(targetPrice, lang);

  const buildText = (forSpeech = false) => {
    const cPrice = forSpeech ? spokenCurrentPrice : `₹${currentPrice.toLocaleString()}`;
    const tPrice = forSpeech ? spokenTargetPrice : `₹${targetPrice.toLocaleString()}`;

    if (lang === 'hi') {
      return `नमस्कार ${farmerName} जी, आज ${activeMandiName} में ${activeCropName} का भाव ${cPrice} प्रति क्विंटल है। मंडी विश्लेषण के अनुसार पांच दिनों में भाव ${tPrice} तक जा सकता है। यदि संभव हो तो अपनी फसल पांच दिन रोके रखें।`;
    }
    if (lang === 'mr') {
      return `नमस्कार ${farmerName} जी, आज ${activeMandiName} मध्ये ${activeCropName} चा भाव ${cPrice} प्रति क्विंटल आहे. बाजार अंदाजानुसार ५ दिवसांत भाव ${tPrice} पर्यंत जाऊ शकतो. शक्य असल्यास पीक ५ दिवस ठेवा.`;
    }

    return `Hello ${farmerName}, today the price of ${crop.toLowerCase()} in ${activeMandiName} is ${cPrice} per quintal. Market analysis indicates the price may rise up to ${tPrice} in the next 5 days. If possible, hold your produce for 5 days.`;
  };

  const activeDisplayText = buildText(false);
  const activeTtsText = buildText(true);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 5;
        });
      }, speed === '0.8x' ? 400 : 300);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const togglePlay = () => {
    // Restrict feature for guest users
    if (isGuest) {
      setToastMsg("Please login to listen to voice advisory.");
      return;
    }

    if (!isPlaying) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(activeTtsText);
        
        const targetLocale = localeMap[lang] || 'en-US';
        utterance.lang = targetLocale;
        utterance.rate = speed === '0.8x' ? 0.8 : 1.0;

        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang.includes(lang) || v.lang.includes(targetLocale.slice(0, 2)));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }

        utterance.onend = () => {
          setIsPlaying(false);
          setProgress(100);
        };
        window.speechSynthesis.speak(utterance);
      }
      setIsPlaying(true);
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition font-['Inter']">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Headphones className="h-4 w-4 text-[#046c4e]" />
            {t("farmer.audio.title")}
          </h4>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isGuest ? 'bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1' : 'bg-[#f0fdf4] text-[#046c4e] border-[#bbf7d0]'}`}>
            {isGuest && <Lock className="h-3 w-3 text-amber-600 inline" />}
            {t("farmer.audio.badge")}
          </span>
        </div>

        {/* Speech Transcript Box with Animated Audio Equalizer */}
        <div className="rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[#166534] shrink-0" />
              <span className="text-[11px] font-bold text-[#166534] uppercase tracking-wider">
                {isPlaying ? "PLAYING AUDIO ADVISORY" : "READY TO LISTEN"}
              </span>
            </div>

            {/* Dynamic Equalizer Visualizer */}
            <div className="flex items-center gap-1 h-3">
              <span className={`w-1 rounded-full bg-[#046c4e] transition-all duration-300 ${isPlaying ? 'h-3 animate-pulse' : 'h-1.5 opacity-40'}`}></span>
              <span className={`w-1 rounded-full bg-[#22c55e] transition-all duration-300 ${isPlaying ? 'h-4 animate-bounce' : 'h-2 opacity-40'}`}></span>
              <span className={`w-1 rounded-full bg-[#046c4e] transition-all duration-300 ${isPlaying ? 'h-2.5 animate-pulse' : 'h-1.5 opacity-40'}`}></span>
              <span className={`w-1 rounded-full bg-[#22c55e] transition-all duration-300 ${isPlaying ? 'h-3.5 animate-bounce' : 'h-2 opacity-40'}`}></span>
            </div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {activeDisplayText}
          </p>
        </div>

        {/* Audio Player Controls */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className={`h-11 w-11 rounded-full text-white flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 shrink-0 ${
                isGuest ? 'bg-slate-700 hover:bg-slate-800' : 'bg-[#046c4e] hover:bg-[#065f46]'
              }`}
            >
              {isGuest ? <Lock className="h-4 w-4" /> : isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#046c4e] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                <span>0:09</span>
                <span>0:30</span>
              </div>
            </div>
          </div>

          {/* Playback Speed Selectors */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">{t("farmer.audio.speed")}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSpeed('0.8x')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition border ${
                  speed === '0.8x'
                    ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                }`}
              >
                0.8x ({lang === 'hi' ? "धीमा" : "Slow"})
              </button>
              <button
                onClick={() => setSpeed('1.0x')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition border ${
                  speed === '1.0x'
                    ? 'bg-[#046c4e] border-[#046c4e] text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                }`}
              >
                1.0x ({lang === 'hi' ? "सामान्य" : "Normal"})
              </button>
            </div>
          </div>
        </div>
      </div>

      <GuestNoticeToast message={toastMsg} onClose={() => setToastMsg(null)} />
    </>
  );
}
