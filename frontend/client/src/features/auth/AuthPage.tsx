import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, Phone, Sparkles, User, UserPlus } from "lucide-react";
import { login, register, sendOtp, verifyOtp } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { AuthSessionResponse } from "@/types/auth";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";

type AuthTab = "login" | "signup";
type LoginMode = "otp" | "password";
type Step = "input" | "verify";

export default function AuthPage() {
  const { language, setLanguage, t } = useLanguage();
  const { setSession, isAuthenticated, isSessionReady } = useSession();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [loginMode, setLoginMode] = useState<LoginMode>("otp");
  const [step, setStep] = useState<Step>("input");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("session") === "expired") {
      setMessage(language === "hi" ? "आपका सत्र समाप्त हो गया है। कृपया फिर से लॉगिन करें।" : "Your session expired. Please log in again.");
      window.history.replaceState({}, document.title, "/auth");
    }
  }, [language]);

  useEffect(() => {
    if (isSessionReady && isAuthenticated && !busy) setLocation("/");
  }, [isAuthenticated, isSessionReady, busy, setLocation]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const resetFeedback = () => { setMessage(""); setError(""); };
  const switchTab = (tab: AuthTab) => { resetFeedback(); setActiveTab(tab); setStep("input"); setOtp(""); };
  const cleanDigits = (val: string) => val.replace(/\D/g, "").slice(0, 10);

  const completeSession = (response: AuthSessionResponse) => {
    setSession(response.csrf_token, response.user);
    const nextLanguage = response.user.language === "hi" ? "hi" : "en";
    setLanguage(nextLanguage);
    setMessage(t("redirectingHome"));
    window.setTimeout(() => setLocation("/"), 400);
  };

  const handleSendOtp = async (event?: { preventDefault(): void }) => {
    event?.preventDefault();
    const cleanMobile = cleanDigits(mobile);
    if (cleanMobile.length !== 10) {
      setError(language === "hi" ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      const response = await sendOtp({ mobile_number: cleanMobile });
      setMessage(response.message ?? t("otpRequested"));
      setStep("verify");
      setResendIn(response.expires_in_seconds ? Math.min(response.expires_in_seconds, 30) : 30);
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? t("authenticationFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setError(language === "hi" ? "कृपया 6 अंकों का OTP दर्ज करें।" : "Please enter the 6-digit OTP code.");
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      const response = await verifyOtp({
        mobile_number: cleanDigits(mobile),
        otp_code: otp.trim(),
        ...(activeTab === "signup" ? { full_name: fullName.trim(), email: email.trim() || undefined } : {}),
      });
      completeSession(response);
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? t("authenticationFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanMobile = cleanDigits(mobile);
    if (cleanMobile.length !== 10) {
      setError(language === "hi" ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      completeSession(await login({ mobile_number: cleanMobile, password }));
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? t("authenticationFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanMobile = cleanDigits(mobile);
    if (cleanMobile.length !== 10) {
      setError(language === "hi" ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!fullName.trim()) {
      setError(language === "hi" ? "कृपया अपना पूरा नाम दर्ज करें।" : "Please enter your full name.");
      return;
    }
    if (password.trim().length < 6) {
      setError(t("passwordRequired"));
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      completeSession(await register({
        mobile_number: cleanMobile,
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        password,
        language,
      }));
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? t("authenticationFailed"));
    } finally {
      setBusy(false);
    }
  };

  const passwordField = (
    <label className="field">
      <span>{t("password")}</span>
      <span className="input-wrap">
        <KeyRound size={17} />
        <input
          className="has-trailing-action"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          autoComplete={activeTab === "signup" ? "new-password" : "current-password"}
          placeholder={t("enterPassword")}
        />
        <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("hidePassword") : t("showPassword")}>
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );

  return (
    <div className="auth-page">
      <Link className="back-link" href="/"><ArrowLeft size={16} /> {t("backToMarket")}</Link>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand-full">
          <BrandLogo size={42} />
          <span className="auth-logo-text"><strong>CropLens AI</strong><small>Your market. Your decision.</small></span>
        </div>
        <p className="eyebrow"><LockKeyhole size={14} /> {t("farmerAccount")}</p>
        <h1 id="auth-title">{activeTab === "login" ? t("keepDecisionsClose") : t("createFarmerAccount")}</h1>
        <p className="auth-intro">{activeTab === "login" ? t("signInToSave") : t("signupIntro")}</p>

        <div className="auth-tab-switch" role="tablist" aria-label={t("accountAccess")}>
          <button type="button" role="tab" id="login-tab" aria-controls="login-panel" aria-selected={activeTab === "login"} className={`auth-tab-button ${activeTab === "login" ? "active" : ""}`} onClick={() => switchTab("login")}>
            <LockKeyhole size={15} /><span>{t("loginTab")}</span>
          </button>
          <button type="button" role="tab" id="signup-tab" aria-controls="signup-panel" aria-selected={activeTab === "signup"} className={`auth-tab-button ${activeTab === "signup" ? "active" : ""}`} onClick={() => switchTab("signup")}>
            <UserPlus size={15} /><span>{t("signupTab")}</span>
          </button>
        </div>

        {activeTab === "login" && (
          <div className="auth-tab-panel" role="tabpanel" id="login-panel" aria-labelledby="login-tab">
            {loginMode === "otp" && step === "input" && (
              <form className="auth-form" onSubmit={(event) => void handleSendOtp(event)}>
                <label className="field">
                  <span>{t("mobileNumber")}</span>
                  <span className="input-wrap">
                    <Phone size={17} />
                    <input value={mobile} onChange={(event) => setMobile(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder={t("enterMobile")} />
                  </span>
                </label>
                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : t("sendOtp")}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

            {loginMode === "otp" && step === "verify" && (
              <form className="auth-form" onSubmit={(event) => void handleVerifyOtp(event)}>
                <div className="auth-step-notice">
                  <span className="notice-phone">+91 {cleanDigits(mobile)}</span>
                  <button type="button" className="edit-link" onClick={() => setStep("input")}>{t("editNumber")}</button>
                </div>
                <label className="field">
                  <span>{t("otpCode")}</span>
                  <span className="input-wrap">
                    <KeyRound size={17} />
                    <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" placeholder={t("enterOtp")} autoFocus />
                  </span>
                </label>
                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : t("verifyOtp")}</span>
                  <CheckCircle2 size={18} />
                </button>
                <div className="otp-actions">
                  <button className="text-button" type="button" disabled={busy || resendIn > 0} onClick={() => void handleSendOtp()}>
                    {resendIn > 0 ? `${t("resendOtpIn")} ${resendIn} ${t("otpWait")}` : t("resendOtp")}
                  </button>
                </div>
              </form>
            )}

            {loginMode === "password" && (
              <form className="auth-form" onSubmit={(event) => void handlePasswordLogin(event)}>
                <label className="field">
                  <span>{t("mobileNumber")}</span>
                  <span className="input-wrap">
                    <Phone size={17} />
                    <input value={mobile} onChange={(event) => setMobile(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder={t("enterMobile")} />
                  </span>
                </label>
                {passwordField}
                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : t("login")}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

            <div className="auth-secondary-actions">
              {loginMode === "otp" ? (
                <button className="text-button" type="button" onClick={() => { resetFeedback(); setLoginMode("password"); }}>{t("loginWithPassword")}</button>
              ) : (
                <button className="text-button" type="button" onClick={() => { resetFeedback(); setLoginMode("otp"); setStep("input"); }}>{t("loginWithOtp")}</button>
              )}
            </div>
          </div>
        )}

        {activeTab === "signup" && (
          <div className="auth-tab-panel" role="tabpanel" id="signup-panel" aria-labelledby="signup-tab">
            {step === "input" && (
              <form className="auth-form" onSubmit={(event) => void handleRegister(event)}>
                <label className="field">
                  <span>{t("fullName")}</span>
                  <span className="input-wrap">
                    <User size={17} />
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} required autoComplete="name" placeholder={t("enterName")} />
                  </span>
                </label>
                <label className="field">
                  <span>{t("mobileNumber")}</span>
                  <span className="input-wrap">
                    <Phone size={17} />
                    <input value={mobile} onChange={(event) => setMobile(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder={t("enterMobile")} />
                  </span>
                </label>
                <label className="field">
                  <span>{t("emailAddress")}</span>
                  <span className="input-wrap">
                    <Mail size={17} />
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder={t("enterEmail")} />
                  </span>
                </label>
                {passwordField}
                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : t("createFarmerAccount")}</span>
                  <Sparkles size={18} />
                </button>
              </form>
            )}
            <div className="auth-secondary-actions">
              <button className="text-button" type="button" onClick={() => switchTab("login")}>{t("alreadyHaveAccount")}</button>
            </div>
          </div>
        )}

        {error ? <StatePanel kind="error" title={t("authenticationFailed")} message={error} /> : null}
        {message ? <div className="success-panel" role="status"><LockKeyhole size={17} /><span>{message}</span></div> : null}
      </section>
    </div>
  );
}
