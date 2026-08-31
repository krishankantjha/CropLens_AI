import { useEffect, useState } from "react";
import { ArrowLeft, Check, Leaf, LogOut, Save, UserRound } from "lucide-react";
import { getCurrentUser, logout, updatePreferences } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import type { UserProfile } from "@/types/auth";

export default function ProfilePage() {
  const { language: appLanguage, setLanguage, t } = useLanguage();
  const { clearSession, isSessionReady } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [homeMandi, setHomeMandi] = useState("");
  const [preferredCommodity, setPreferredCommodity] = useState("");
  const [language, setLocalLanguage] = useState<Language>(appLanguage);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser({ notifyUnauthorized: false }).then((profile) => {
      setUser(profile); setHomeMandi(profile.home_mandi); setPreferredCommodity(profile.preferred_commodity);
      const nextLanguage: Language = profile.language === "hi" ? "hi" : "en";
      setLocalLanguage(nextLanguage); setLanguage(nextLanguage);
    }).catch(() => setError(t("signInProfile"))).finally(() => setBusy(false));
  }, [setLanguage, t]);

  const save = async () => {
    setBusy(true); setError(""); setMessage("");
    try { const updated = await updatePreferences({ home_mandi: homeMandi, preferred_commodity: preferredCommodity, language }); setUser(updated); setLanguage(language); setMessage(t("saveSuccess")); }
    catch { setError(t("couldNotSavePreferences")); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    try { await logout(); } finally { clearSession(); window.location.assign("/"); }
  };
  if ((!isSessionReady || busy) && !user) return <div className="auth-page"><StatePanel kind="loading" title={t("loadingProfile")} message={t("profileLoadingMessage")} /></div>;
  if (!user) return <div className="auth-page"><div className="profile-error"><StatePanel kind="error" title={t("signInProfile")} message={error} /><a className="primary-button alert-link" href="/auth">{t("loginOrCreate")}</a><a className="back-link profile-back" href="/"><ArrowLeft size={16} /> {t("backToMarket")}</a></div></div>;

  return <div className="auth-page"><a className="back-link" href="/"><ArrowLeft size={16} /> {t("backToMarket")}</a><section className="profile-card" aria-labelledby="profile-title"><div className="auth-brand-full"><span className="auth-logo-badge"><img src="/logo-icon.png" alt="CropLens AI" /></span><span className="auth-logo-text"><strong>CropLens AI</strong><small>Your market. Your decision.</small></span></div><p className="eyebrow"><UserRound size={14} /> {t("farmerProfile")}</p><h1 id="profile-title">{t("preferences")}</h1><p className="auth-intro">{t("preferencesIntro")}</p><div className="profile-identity"><span className="profile-avatar"><Leaf size={21} /></span><span><strong>{user.full_name}</strong><small>{user.mobile_number}</small></span></div><div className="auth-form"><label className="field"><span>{t("homeMandi")}</span><input value={homeMandi} onChange={(event) => setHomeMandi(event.target.value)} /></label><label className="field"><span>{t("preferredCrop")}</span><input value={preferredCommodity} onChange={(event) => setPreferredCommodity(event.target.value)} /></label><label className="field"><span>{t("language")}</span><select value={language} onChange={(event) => { const next = event.target.value as Language; setLocalLanguage(next); setLanguage(next); }}><option value="en">English</option><option value="hi">हिन्दी</option></select></label><button className="primary-button auth-submit" type="button" onClick={() => void save()} disabled={busy}><Save size={16} /> {t("savePreferences")}</button></div>{message ? <div className="success-panel"><Check size={16} /> {message}</div> : null}{error ? <StatePanel kind="error" title={t("couldNotSavePreferences")} message={error} /> : null}<button className="logout-button" type="button" onClick={() => void signOut()}><LogOut size={16} /> {t("signOut")}</button></section></div>;
}
