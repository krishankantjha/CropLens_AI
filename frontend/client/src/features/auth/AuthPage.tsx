// Earthline Intelligence: account access is simple, explicit, and connected to the real authentication API.
import { useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Phone, UserRound } from "lucide-react";
import { login, register, sendOtp, verifyOtp } from "@/api/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { TokenResponse } from "@/types/auth";
import { StatePanel } from "@/components/feedback/StatePanel";

type Mode = "login" | "register" | "otp";

function persistSession(response: TokenResponse) {
  window.localStorage.setItem("croplens_access_token", response.access_token);
  if (response.refresh_token) window.localStorage.setItem("croplens_refresh_token", response.refresh_token);
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        persistSession(await login({ mobile_number: mobile, password }));
        setMessage("You are signed in. Return to the market view to continue.");
      } else if (mode === "register") {
        persistSession(await register({ mobile_number: mobile, password, full_name: fullName, role: "farmer", language: "en" }));
        setMessage("Your farmer account is ready. Return to the market view to continue.");
      } else if (!otp) {
        const response = await sendOtp({ mobile_number: mobile });
        setMessage(response.message ?? "OTP requested. Enter the code sent to your mobile.");
      } else {
        persistSession(await verifyOtp({ mobile_number: mobile, otp_code: otp }));
        setMessage("You are signed in with OTP. Return to the market view to continue.");
      }
    } catch (requestError) {
      setError((requestError as { message?: string }).message ?? "The live authentication service could not complete this request.");
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <a className="back-link" href="/"><ArrowLeft size={16} /> Back to market</a>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><span className="auth-mark"><BrandLogo size={28} /></span><span><strong>CropLens AI</strong><small>Your market. Your decision.</small></span></div>
        <p className="eyebrow"><LockKeyhole size={14} /> Farmer account</p>
        <h1 id="auth-title">Keep your market decisions close.</h1>
        <p className="auth-intro">Sign in to save your preferences and receive live market alerts.</p>
        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => { setMode("login"); setMessage(""); setError(""); }}>Login</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => { setMode("register"); setMessage(""); setError(""); }}>Create account</button>
          <button className={mode === "otp" ? "active" : ""} type="button" onClick={() => { setMode("otp"); setMessage(""); setError(""); }}>Use OTP</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" ? <label className="field"><span>Full name</span><span className="input-wrap"><UserRound size={17} /><input value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="Enter your name" /></span></label> : null}
          <label className="field"><span>Mobile number</span><span className="input-wrap"><Phone size={17} /><input value={mobile} onChange={(event) => setMobile(event.target.value)} required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" /></span></label>
          {mode !== "otp" ? <label className="field"><span>Password</span><span className="input-wrap"><KeyRound size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Enter your password" /></span></label> : null}
          {mode === "otp" && message ? <label className="field"><span>OTP code</span><span className="input-wrap"><KeyRound size={17} /><input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="Enter 6-digit OTP" /></span></label> : null}
          <button className="primary-button auth-submit" type="submit" disabled={busy}><span>{busy ? "Please wait…" : mode === "login" ? "Login" : mode === "register" ? "Create farmer account" : otp ? "Verify OTP" : "Send OTP"}</span><ArrowRight size={18} /></button>
        </form>
        {error ? <StatePanel kind="error" title="Authentication could not be completed" message={error} /> : null}
        {message ? <div className="success-panel" role="status"><LockKeyhole size={17} /><span>{message}</span></div> : null}
      </section>
    </div>
  );
}
