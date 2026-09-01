// Earthline Intelligence: account access is simple, explicit, and connected to the real authentication API.
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Phone } from "lucide-react";
import { login, sendOtp, verifyOtp } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { AuthSessionResponse } from "@/types/auth";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";

type Mode = "mobile" | "otp" | "password";

function persistSession(response: AuthSessionResponse, setSession: (csrfToken: string) => void) {
  setSession(response.csrf_token);
}

export default function AuthPage() {
  const { language, t } = useLanguage();
  const { setSession } = useSession();
  const [mode, setMode] = useState<Mode>("mobile");
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

  const resetFeedback = () => {
    setMessage("");
    setError("");
  };

  const startOtpFlow = () => {
    resetFeedback();
    setOtp("");
    setMode("mobile");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    resetFeedback();
    try {
      if (mode === "mobile") {
        const response = await sendOtp({ mobile_number: mobile });
        setMessage(response.message ?? t("otpRequested"));
        setMode("otp");
      } else if (mode === "otp") {
        persistSession(await verifyOtp({ mobile_number: mobile, otp_code: otp }), setSession);
        setMessage(t("otpSignedIn"));
      } else {
        persistSession(await login({ mobile_number: mobile, password }), setSession);
        setMessage(t("signedInMessage"));
      }
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? t("authenticationFailed"));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "password" ? t("login") : mode === "otp" ? t("otpCode") : t("loginOrCreate");

  return (
    <div className="auth-page">
      <a className="back-link" href="/"><ArrowLeft size={16} /> {t("backToMarket")}</a>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand-full">
          <BrandLogo size={42} />
          <span className="auth-logo-text"><strong>CropLens AI</strong><small>Your market. Your decision.</small></span>
        </div>
        <p className="eyebrow"><LockKeyhole size={14} /> {t("farmerAccount")}</p>
        <h1 id="auth-title">{t("keepDecisionsClose")}</h1>
        <p className="auth-intro">{t("signInToSave")}</p>

        <form id="auth-panel" role="tabpanel" aria-labelledby="auth-title" className="auth-form" onSubmit={submit}>
          <div className="auth-flow-heading">
            <strong>{title}</strong>
            {mode === "otp" ? <span>{t("otpRequested")}</span> : null}
          </div>
          <label className="field">
            <span>{t("mobileNumber")}</span>
            <span className="input-wrap"><Phone size={17} /><input value={mobile} onChange={(event) => setMobile(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder={t("enterMobile")} disabled={mode === "otp"} /></span>
          </label>
          {mode === "password" ? (
            <label className="field">
              <span>{t("password")}</span>
              <span className="input-wrap"><KeyRound size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete="current-password" placeholder={t("enterPassword")} /></span>
            </label>
          ) : null}
          {mode === "otp" ? (
            <label className="field">
              <span>{t("otpCode")}</span>
              <span className="input-wrap"><KeyRound size={17} /><input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" placeholder={t("enterOtp")} /></span>
            </label>
          ) : null}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            <span>{busy ? t("pleaseWait") : mode === "mobile" ? t("sendOtp") : mode === "otp" ? t("verifyOtp") : t("login")}</span><ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-secondary-actions">
          {mode === "mobile" ? <button className="text-button" type="button" onClick={() => { resetFeedback(); setMode("password"); }}>{t("login")} {t("password")}</button> : null}
          {mode === "password" ? <button className="text-button" type="button" onClick={startOtpFlow}>{t("useOtp")}</button> : null}
          {mode === "otp" ? <button className="text-button" type="button" onClick={startOtpFlow}>{t("mobileNumber")}</button> : null}
        </div>

        {error ? <StatePanel kind="error" title={t("authenticationFailed")} message={error} /> : null}
        {message ? <div className="success-panel" role="status"><LockKeyhole size={17} /><span>{message}</span></div> : null}
      </section>
    </div>
  );
}
