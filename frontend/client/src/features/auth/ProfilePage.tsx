import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Leaf, LogOut, Save, UserRound } from "lucide-react";
import { getCurrentUser, getResources, logout, updatePreferences } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";
import { appToast } from "@/lib/toast";
import type { ResourceEntry, ResourceOption } from "@/types/api";
import type { UserProfile } from "@/types/auth";

export default function ProfilePage() {
  const { language: appLanguage, setLanguage, t } = useLanguage();
  const { clearSession, isSessionReady, setUser: setSessionUser } = useSession();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [homeMandi, setHomeMandi] = useState("");
  const [preferredCommodity, setPreferredCommodity] = useState("");
  const [language, setLocalLanguage] = useState<Language>(appLanguage);
  const [commodities, setCommodities] = useState<ResourceOption[]>([]);
  const [markets, setMarkets] = useState<ResourceOption[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [profile, resources] = await Promise.all([
        getCurrentUser({ notifyUnauthorized: false }),
        getResources().catch(() => null),
      ]);
      setUser(profile);
      setSessionUser(profile);
      setFullName(profile.full_name ?? "");
      setHomeMandi(profile.home_mandi);
      setPreferredCommodity(profile.preferred_commodity);
      const nextLanguage: Language = profile.language === "hi" ? "hi" : "en";
      setLocalLanguage(nextLanguage);
      if (resources) {
        setCommodities(resources.commodities ?? []);
        setMarkets((resources.mandis ?? []).map((item: ResourceEntry) => typeof item === "string" ? { id: item, label: item } : item));
      }
    } catch {
      setError(t("signInProfile"));
    } finally {
      setBusy(false);
    }
  }, [setSessionUser, t]);

  useEffect(() => {
    if (isSessionReady) void loadProfile();
  }, [isSessionReady, loadProfile]);

  const cropOptions = useMemo(() => commodities, [commodities]);
  const mandiOptions = useMemo(() => markets, [markets]);

  const save = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError(t("enterName"));
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const updated = await updatePreferences({
        full_name: trimmedName,
        home_mandi: homeMandi,
        preferred_commodity: preferredCommodity,
        language,
      });
      setUser(updated);
      setSessionUser(updated);
      setLanguage(language);
      appToast.success(t("saveSuccess"));
      setMessage(t("saveSuccess"));
    } catch {
      setError(t("couldNotSavePreferences"));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try { await logout(); } finally { clearSession(); window.location.assign("/"); }
  };

  if ((!isSessionReady || busy) && !user) {
    return (
      <div className="auth-page">
        <section className="profile-card" aria-busy="true">
          <div className="auth-brand-full">
            <BrandLogo size={42} />
            <span className="auth-logo-text"><strong>CropLens AI</strong><small>{t("brandTagline")}</small></span>
          </div>
          <StatePanel kind="loading" title={t("loadingProfile")} message={t("profileLoadingMessage")} />
        </section>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="auth-page">
        <div className="profile-error">
          <StatePanel kind="error" title={t("signInProfile")} message={error} actionLabel={t("profileRetry")} onAction={() => void loadProfile()} />
          <Link className="primary-button alert-link" href="/auth">{t("loginOrCreate")}</Link>
          <Link className="back-link profile-back" href="/"><ArrowLeft size={16} /> {t("backToMarket")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Link className="back-link" href="/"><ArrowLeft size={16} /> {t("backToMarket")}</Link>
      <section className="profile-card" aria-labelledby="profile-title">
        <div className="auth-brand-full">
          <span className="auth-logo-badge"><BrandLogo size={38} /></span>
          <span className="auth-logo-text"><strong>CropLens AI</strong><small>{t("brandTagline")}</small></span>
        </div>
        <p className="eyebrow"><UserRound size={14} /> {t("farmerProfile")}</p>
        <h1 id="profile-title">{t("preferences")}</h1>
        <p className="auth-intro">{t("preferencesIntro")}</p>
        <div className="profile-identity">
          <span className="profile-avatar"><Leaf size={21} /></span>
          <span><strong>{user.full_name}</strong><small>{user.mobile_number}{user.email ? ` • ${user.email}` : ""}</small></span>
        </div>
        <div className="auth-form">
          <label className="field">
            <span>{t("fullName")}</span>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder={t("enterName")} required />
          </label>
          <label className="field">
            <span>{t("homeMandi")}</span>
            {mandiOptions.length ? (
              <select value={homeMandi} onChange={(event) => setHomeMandi(event.target.value)}>
                {!mandiOptions.some((item) => item.id === homeMandi) ? <option value={homeMandi}>{homeMandi || t("selectMandi")}</option> : null}
                {mandiOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            ) : (
              <input value={homeMandi} onChange={(event) => setHomeMandi(event.target.value)} />
            )}
          </label>
          <label className="field">
            <span>{t("preferredCrop")}</span>
            {cropOptions.length ? (
              <select value={preferredCommodity} onChange={(event) => setPreferredCommodity(event.target.value)}>
                {!cropOptions.some((item) => item.id === preferredCommodity) ? <option value={preferredCommodity}>{preferredCommodity || t("selectCrop")}</option> : null}
                {cropOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            ) : (
              <input value={preferredCommodity} onChange={(event) => setPreferredCommodity(event.target.value)} />
            )}
          </label>
          <label className="field">
            <span>{t("language")}</span>
            <select value={language} onChange={(event) => { const next = event.target.value as Language; setLocalLanguage(next); setLanguage(next); }}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
          <button className="primary-button auth-submit" type="button" onClick={() => void save()} disabled={busy}><Save size={16} /> {t("savePreferences")}</button>
        </div>
        {message ? <div className="success-panel"><Check size={16} /> {message}</div> : null}
        {error ? <StatePanel kind="error" title={t("couldNotSavePreferences")} message={error} /> : null}
        <button className="logout-button" type="button" onClick={() => void signOut()}><LogOut size={16} /> {t("signOut")}</button>
      </section>
    </div>
  );
}
