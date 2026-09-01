// Earthline Intelligence: account access with unified same-page Login and Signup.
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, LockKeyhole, Mail, Phone, Sparkles, User, UserPlus } from "lucide-react";
import { login, register, sendOtp, verifyOtp } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { AuthSessionResponse } from "@/types/auth";
import { StatePanel } from "@/components/feedback/StatePanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "@/contexts/SessionContext";

type AuthTab = "login" | "signup";
type LoginMode = "otp" | "password";
type Step = "input" | "verify";

function persistSession(response: AuthSessionResponse, setSession: (csrfToken: string) => void) {
  setSession(response.csrf_token);
}

export default function AuthPage() {
  const { language, t } = useLanguage();
  const { setSession } = useSession();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [loginMode, setLoginMode] = useState<LoginMode>("otp");
  const [step, setStep] = useState<Step>("input");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
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

  const switchTab = (tab: AuthTab) => {
    resetFeedback();
    setActiveTab(tab);
    setStep("input");
    setOtp("");
  };

  const cleanDigits = (val: string) => val.replace(/\D/g, "").slice(0, 10);

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanMobile = cleanDigits(mobile);
    if (cleanMobile.length !== 10) {
      setError(language === "hi" ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।" : "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (activeTab === "signup" && !fullName.trim()) {
      setError(language === "hi" ? "कृपया अपना पूरा नाम दर्ज करें।" : "Please enter your full name.");
      return;
    }

    setBusy(true);
    resetFeedback();
    try {
      const response = await sendOtp({ mobile_number: cleanMobile });
      setMessage(response.message ?? t("otpRequested"));
      setStep("verify");
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
      persistSession(response, setSession);
      setMessage(activeTab === "signup" ? t("registerSuccess") : t("otpSignedIn"));
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
      const response = await login({ mobile_number: cleanMobile, password });
      persistSession(response, setSession);
      setMessage(t("signedInMessage"));
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? t("authenticationFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <a className="back-link" href="/"><ArrowLeft size={16} /> {t("backToMarket")}</a>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand-full">
          <BrandLogo size={42} />
          <span className="auth-logo-text"><strong>CropLens AI</strong><small>Your market. Your decision.</small></span>
        </div>
        
        <p className="eyebrow"><LockKeyhole size={14} /> {t("farmerAccount")}</p>
        <h1 id="auth-title">{activeTab === "login" ? t("keepDecisionsClose") : (language === "hi" ? "अपना किसान खाता बनाएँ" : "Create Your Farmer Account")}</h1>
        <p className="auth-intro">{activeTab === "login" ? t("signInToSave") : (language === "hi" ? "लाइव मंडी भाव, मूल्य पूर्वानुमान और व्यक्तिगत अलर्ट पाने के लिए पंजीकरण करें।" : "Sign up to unlock real-time mandi intelligence, price trajectory forecasts, and personalized profit alerts.")}</p>

        {/* Unified Tab Switcher */}
        <div className="auth-tab-switch" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "login"}
            className={`auth-tab-button ${activeTab === "login" ? "active" : ""}`}
            onClick={() => switchTab("login")}
          >
            <LockKeyhole size={15} />
            <span>{t("loginTab")}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "signup"}
            className={`auth-tab-button ${activeTab === "signup" ? "active" : ""}`}
            onClick={() => switchTab("signup")}
          >
            <UserPlus size={15} />
            <span>{t("signupTab")}</span>
          </button>
        </div>

        {/* ================= LOGIN TAB ================= */}
        {activeTab === "login" && (
          <div className="auth-tab-panel">
            {loginMode === "otp" && step === "input" && (
              <form className="auth-form" onSubmit={handleSendOtp}>
                <label className="field">
                  <span>{t("mobileNumber")}</span>
                  <span className="input-wrap">
                    <Phone size={17} />
                    <input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t("enterMobile")}
                    />
                  </span>
                </label>
                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : t("sendOtp")}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

            {loginMode === "otp" && step === "verify" && (
              <form className="auth-form" onSubmit={handleVerifyOtp}>
                <div className="auth-step-notice">
                  <span className="notice-phone">+91 {cleanDigits(mobile)}</span>
                  <button type="button" className="edit-link" onClick={() => setStep("input")}>
                    {language === "hi" ? "नंबर बदलें" : "Edit"}
                  </button>
                </div>
                <label className="field">
                  <span>{t("otpCode")}</span>
                  <span className="input-wrap">
                    <KeyRound size={17} />
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      placeholder={t("enterOtp")}
                      autoFocus
                    />
                  </span>
                </label>
                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : t("verifyOtp")}</span>
                  <CheckCircle2 size={18} />
                </button>
              </form>
            )}

            {loginMode === "password" && (
              <form className="auth-form" onSubmit={handlePasswordLogin}>
                <label className="field">
                  <span>{t("mobileNumber")}</span>
                  <span className="input-wrap">
                    <Phone size={17} />
                    <input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t("enterMobile")}
                    />
                  </span>
                </label>
                <label className="field">
                  <span>{t("password")}</span>
                  <span className="input-wrap">
                    <KeyRound size={17} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      placeholder={t("enterPassword")}
                    />
                  </span>
                </label>
                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : t("login")}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

            <div className="auth-secondary-actions">
              {loginMode === "otp" ? (
                <button className="text-button" type="button" onClick={() => { resetFeedback(); setLoginMode("password"); }}>
                  {t("loginWithPassword")}
                </button>
              ) : (
                <button className="text-button" type="button" onClick={() => { resetFeedback(); setLoginMode("otp"); setStep("input"); }}>
                  {t("loginWithOtp")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= SIGNUP TAB ================= */}
        {activeTab === "signup" && (
          <div className="auth-tab-panel">
            {step === "input" && (
              <form className="auth-form" onSubmit={handleSendOtp}>
                <label className="field">
                  <span>{t("fullName")}</span>
                  <span className="input-wrap">
                    <User size={17} />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      placeholder={t("enterName")}
                    />
                  </span>
                </label>

                <label className="field">
                  <span>{t("mobileNumber")}</span>
                  <span className="input-wrap">
                    <Phone size={17} />
                    <input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t("enterMobile")}
                    />
                  </span>
                </label>

                <label className="field">
                  <span>{t("emailAddress")}</span>
                  <span className="input-wrap">
                    <Mail size={17} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder={t("enterEmail")}
                    />
                  </span>
                </label>

                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : (language === "hi" ? "OTP भेजें और खाता बनाएँ" : "Send OTP & Register")}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

            {step === "verify" && (
              <form className="auth-form" onSubmit={handleVerifyOtp}>
                <div className="auth-step-notice">
                  <div>
                    <span className="notice-name">{fullName}</span>
                    <span className="notice-phone">+91 {cleanDigits(mobile)}</span>
                  </div>
                  <button type="button" className="edit-link" onClick={() => setStep("input")}>
                    {language === "hi" ? "बदलें" : "Edit"}
                  </button>
                </div>

                <label className="field">
                  <span>{t("otpCode")}</span>
                  <span className="input-wrap">
                    <KeyRound size={17} />
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      placeholder={t("enterOtp")}
                      autoFocus
                    />
                  </span>
                </label>

                <button className="primary-button auth-submit" type="submit" disabled={busy}>
                  <span>{busy ? t("pleaseWait") : (language === "hi" ? "सत्यापित करें और खाता बनाएँ" : "Verify & Complete Signup")}</span>
                  <Sparkles size={18} />
                </button>
              </form>
            )}

            <div className="auth-secondary-actions">
              <button className="text-button" type="button" onClick={() => switchTab("login")}>
                {t("alreadyHaveAccount")}
              </button>
            </div>
          </div>
        )}

        {error ? <StatePanel kind="error" title={t("authenticationFailed")} message={error} /> : null}
        {message ? <div className="success-panel" role="status"><LockKeyhole size={17} /><span>{message}</span></div> : null}
      </section>
    </div>
  );
}
