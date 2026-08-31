// Earthline Intelligence: account access is simple, explicit, and connected to the real authentication API.
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Phone, UserRound } from "lucide-react";
import { login, register, sendOtp, verifyOtp } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { AuthSessionResponse } from "@/types/auth";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";

type Mode = "login" | "register" | "otp";

function persistSession(response: AuthSessionResponse, setSession: (csrfToken: string) => void) {
  setSession(response.csrf_token);
}

export default function AuthPage() {
  const { language, setLanguage, t } = useLanguage();
  const { setSession } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("session") === "expired") {
      setMessage(language === "hi" ? "आपका सत्र समाप्त हो गया है। कृपया फिर से लॉगिन करें।" : "Your session expired. Please log in again.");
      window.history.replaceState({}, document.title, "/auth");
    }
  }, [language]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        persistSession(await login({ mobile_number: mobile, password }), setSession);
        setMessage(t("signedInMessage"));
      } else if (mode === "register") {
        persistSession(await register({ mobile_number: mobile, password, full_name: fullName, role: "farmer", language }), setSession);
        setMessage(t("accountReadyMessage"));
      } else if (!otp) {
        const response = await sendOtp({ mobile_number: mobile });
        setMessage(response.message ?? t("otpRequested"));
      } else {
        persistSession(await verifyOtp({ mobile_number: mobile, otp_code: otp }), setSession);
        setMessage(t("otpSignedIn"));
      }
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? t("authenticationFailed"));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <a className="back-link" href="/"><ArrowLeft size={16} /> {t("backToMarket")}</a>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand-full">
          <span className="auth-logo-badge"><img src="/logo-icon.png" alt="CropLens AI" /></span>
          <span className="auth-logo-text"><strong>CropLens AI</strong><small>Your market. Your decision.</small></span>
        </div>
        <p className="eyebrow"><LockKeyhole size={14} /> {t("farmerAccount")}</p>
        <h1 id="auth-title">{t("keepDecisionsClose")}</h1>
        <p className="auth-intro">{t("signInToSave")}</p>
        <div className="auth-tabs" role="tablist" aria-label={t("accountAccess")}>
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => { setMode("login"); setMessage(""); setError(""); }}>{t("login")}</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => { setMode("register"); setMessage(""); setError(""); }}>{t("createAccount")}</button>
          <button className={mode === "otp" ? "active" : ""} type="button" onClick={() => { setMode("otp"); setMessage(""); setError(""); }}>{t("useOtp")}</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" ? <label className="field"><span>{t("fullName")}</span><span className="input-wrap"><UserRound size={17} /><input value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder={t("enterName")} /></span></label> : null}
          <label className="field"><span>{t("mobileNumber")}</span><span className="input-wrap"><Phone size={17} /><input value={mobile} onChange={(event) => setMobile(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder={t("enterMobile")} /></span></label>
          {mode !== "otp" ? <label className="field"><span>{t("password")}</span><span className="input-wrap"><KeyRound size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={t("enterPassword")} /></span></label> : null}
          {mode === "otp" && message ? <label className="field"><span>{t("otpCode")}</span><span className="input-wrap"><KeyRound size={17} /><input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder={t("enterOtp")} /></span></label> : null}
          {mode === "register" ? <label className="field"><span>{t("language")}</span><select value={language} onChange={(event) => setLanguage(event.target.value as "en" | "hi")}><option value="en">English</option><option value="hi">हिन्दी</option></select></label> : null}
          <button className="primary-button auth-submit" type="submit" disabled={busy}><span>{busy ? t("pleaseWait") : mode === "login" ? t("login") : mode === "register" ? t("createFarmerAccount") : otp ? t("verifyOtp") : t("sendOtp")}</span><ArrowRight size={18} /></button>
        </form>
        {error ? <StatePanel kind="error" title={t("authenticationFailed")} message={error} /> : null}
        {message ? <div className="success-panel" role="status"><LockKeyhole size={17} /><span>{message}</span></div> : null}
      </section>
    </div>
  );
}
