// Field Notes Intelligence reminder: one question at a time, large visual selection controls, clean progress indicator.
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { getTranslation } from "@/i18n/translations";

const languages = ["English", "हिन्दी", "मराठी", "ಕನ್ನಡ", "తెలుగు", "தமிழ்", "ગુજરાતી", "বাংলা", "ਪੰਜਾਬੀ"];
// Fallback resources if dynamic loading fails
const DEFAULT_MANDIS = ["Agra", "Mathura", "Azadpur", "Lasalgaon", "Indore", "Khanna"];
const DEFAULT_CROPS = [
  { label: "Potato", icon: "🥔", variety: "Table potato" },
  { label: "Onion", icon: "🧅", variety: "Red onion" },
  { label: "Tomato", icon: "🍅", variety: "Hybrid tomato" },
];
const quantities = ["10 qtl", "25 qtl", "50 qtl", "100 qtl"];
const storages = ["Yes", "No", "Sometimes"];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState(user.language);
  const [mandi, setMandi] = useState(user.homeMandi);
  const [crop, setCrop] = useState(user.primaryCrop);
  const [qty, setQty] = useState(user.quantity);
  const [storage, setStorage] = useState(user.storage);
  const [loading, setLoading] = useState(false);
  const copy = getTranslation(lang);

  const [dynamicMandis, setDynamicMandis] = useState<string[]>(DEFAULT_MANDIS);
  const [dynamicCrops, setDynamicCrops] = useState<any[]>(DEFAULT_CROPS);

  useEffect(() => {
    cropLensService.getResources().then((res) => {
      if (res) {
        if (res.mandis && res.mandis.length > 0) setDynamicMandis(res.mandis);
        if (res.commodities && res.commodities.length > 0) {
          setDynamicCrops(res.commodities.map(c => ({
            label: c.id,
            icon: c.label.split(' ')[0],
            variety: c.variety
          })));
        }
      }
    }).catch(err => console.error("Onboarding resource load failed:", err));
  }, []);

  const handleFinish = () => {
    updateProfile({ language: lang, homeMandi: mandi, primaryCrop: crop, quantity: qty, storage: storage });
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLocation("/app");
    }, 700);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8F7F2] px-4 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#E8F4ED] text-[#176B45] animate-bounce"><Sparkles className="size-8" /></span>
          <h2 className="mt-6 text-2xl font-extrabold text-[#0E4D35]">Preparing your CropLens advisory...</h2>
          <p className="mt-2 text-sm text-[#66716A]">Synthesizing market signals, mandi rates, and risk models for {mandi} ({crop}).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F2] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <BrandMark />
          <span className="text-xs font-extrabold uppercase tracking-[.15em] text-[#66716A]">{copy.stepOf(step)}</span>
        </div>

        <div className="mt-6 flex gap-1.5" aria-label="Onboarding progress">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-[#176B45]" : "bg-[#DDE4DE]"}`} />
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-[#DDE4DE] bg-white p-6 paper-shadow sm:p-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .2 }}>
                <p className="eyebrow">Language selection</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35] sm:text-3xl">What language do you prefer?</h1>
                <p className="mt-2 text-sm text-[#66716A]">Choose your primary reading language for advisories and voice playback.</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {languages.map((l) => (
                    <button key={l} type="button" onClick={() => setLang(l)} className={`flex items-center justify-between rounded-2xl border p-4 text-left font-bold transition-all ${lang === l ? "border-[#176B45] bg-[#E8F4ED] text-[#0E4D35]" : "border-[#DDE4DE] bg-white text-[#17201B] hover:border-[#9DBDA8]"}`}>
                      <span>{l}</span>{lang === l && <Check className="size-4 text-[#176B45]" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .2 }}>
                <p className="eyebrow">Location</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35] sm:text-3xl">Where is your home mandi?</h1>
                <p className="mt-2 text-sm text-[#66716A]">This is your primary baseline for price forecasts and transport comparison.</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {dynamicMandis.map((m) => (
                    <button key={m} type="button" onClick={() => setMandi(m)} className={`flex items-center justify-between rounded-2xl border p-4 text-left font-bold transition-all ${mandi === m ? "border-[#176B45] bg-[#E8F4ED] text-[#0E4D35]" : "border-[#DDE4DE] bg-white text-[#17201B] hover:border-[#9DBDA8]"}`}>
                      <span>{m}</span>{mandi === m && <Check className="size-4 text-[#176B45]" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .2 }}>
                <p className="eyebrow">Crop focus</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35] sm:text-3xl">What crop do you usually sell?</h1>
                <p className="mt-2 text-sm text-[#66716A]">Select your main harvest for signature decision tracking.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {dynamicCrops.map((c) => (
                    <button key={c.label} type="button" onClick={() => setCrop(c.label)} className={`flex flex-col items-center justify-between rounded-2xl border p-5 text-center transition-all ${crop === c.label ? "border-[#176B45] bg-[#E8F4ED] text-[#0E4D35]" : "border-[#DDE4DE] bg-white text-[#17201B] hover:border-[#9DBDA8]"}`}>
                      <span className="text-3xl">{c.icon}</span>
                      <span className="mt-3 font-extrabold">{c.label}</span>
                      <span className="text-xs text-[#66716A]">{c.variety}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .2 }}>
                <p className="eyebrow">Scale</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35] sm:text-3xl">How much do you usually sell?</h1>
                <p className="mt-2 text-sm text-[#66716A]">Used to calculate transport cost and net profit differences accurately.</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {quantities.map((q) => (
                    <button key={q} type="button" onClick={() => setQty(q)} className={`rounded-2xl border p-4 text-center font-extrabold transition-all ${qty === q ? "border-[#176B45] bg-[#E8F4ED] text-[#0E4D35]" : "border-[#DDE4DE] bg-white text-[#17201B] hover:border-[#9DBDA8]"}`}>
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .2 }}>
                <p className="eyebrow">Infrastructure</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35] sm:text-3xl">Can you store your crop?</h1>
                <p className="mt-2 text-sm text-[#66716A]">Helps determine whether multi-day waiting recommendations are practical.</p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {storages.map((s) => (
                    <button key={s} type="button" onClick={() => setStorage(s)} className={`rounded-2xl border p-4 text-center font-extrabold transition-all ${storage === s ? "border-[#176B45] bg-[#E8F4ED] text-[#0E4D35]" : "border-[#DDE4DE] bg-white text-[#17201B] hover:border-[#9DBDA8]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between border-t border-[#DDE4DE] pt-6">
            {step > 1 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-2 rounded-full border border-[#DDE4DE] px-5 py-2.5 text-sm font-extrabold text-[#0E4D35] hover:bg-[#F8F7F2]">
                <ArrowLeft className="size-4" /> {copy.back}
              </button>
            ) : <div />}

            {step < 5 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-2 rounded-full bg-[#176B45] px-6 py-3 text-sm font-extrabold text-white shadow-md hover:bg-[#0E4D35]">
                {copy.continue} <ArrowRight className="size-4" />
              </button>
            ) : (
              <button type="button" onClick={handleFinish} className="inline-flex items-center gap-2 rounded-full bg-[#176B45] px-7 py-3.5 text-sm font-extrabold text-white shadow-lg hover:bg-[#0E4D35]">
                {copy.createAdvisory} <Sparkles className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
