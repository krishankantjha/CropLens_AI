import React, { useState } from 'react';
import { Lock, UserPlus, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { loginUserApi, registerUserApi, sendOtpApi, verifyOtpApi } from '../../services/api';

export default function AuthPanel() {
  const { t } = useLanguage();
  const { loginUser, loginWithDemo } = useAuth();

  const [tab, setTab] = useState('login');
  const [method, setMethod] = useState('password');
  
  // Login fields
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP fields
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('farmer');
  const [preferredCrop] = useState('Potato');
  const [homeMandi] = useState('Agra');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Google Profile Completion state
  const [googleProfilePending, setGoogleProfilePending] = useState(false);
  const [googleTempUser, setGoogleTempUser] = useState(null);
  const [googleMobile, setGoogleMobile] = useState('');
  const [googleMandi, setGoogleMandi] = useState('Agra APMC');
  const [googleCrop, setGoogleCrop] = useState('Potato');
  const [googleRole, setGoogleRole] = useState('farmer');

  // Google OAuth Success Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setErrorMsg('');
      const decoded = jwtDecode(credentialResponse.credential);
      const googleToken = `google_oauth_${credentialResponse.credential}`;

      // Check if user profile is already saved in localStorage with mobile number
      const existingUserStr = localStorage.getItem('croplens_user');
      if (existingUserStr) {
        try {
          const existingUser = JSON.parse(existingUserStr);
          if (existingUser.email === decoded.email && existingUser.mobile_number && existingUser.home_mandi) {
            setSuccessMsg("Welcome back! Logging in...");
            loginUser(googleToken, existingUser);
            return;
          }
        } catch (e) {
          console.warn("Error parsing existing user", e);
        }
      }

      // First-time Google login: trigger profile completion modal step
      setGoogleTempUser({
        id: decoded.sub,
        full_name: decoded.name || decoded.given_name || "Google User",
        email: decoded.email,
        picture: decoded.picture,
        token: googleToken
      });
      setGoogleMobile('');
      setGoogleMandi('Agra APMC');
      setGoogleCrop('Potato');
      setGoogleRole('farmer');
      setGoogleProfilePending(true);
      setSuccessMsg("Google Auth Successful! Complete your Kisan Profile.");
    } catch (err) {
      console.error("Google login error:", err);
      setErrorMsg("Google Sign-In failed to process user token.");
    }
  };

  const handleSaveGoogleProfile = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!googleMobile || googleMobile.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number for WhatsApp alerts.");
      return;
    }

    const completeUser = {
      ...googleTempUser,
      mobile_number: googleMobile,
      home_mandi: googleMandi,
      preferred_commodity: googleCrop,
      role: googleRole
    };

    const userToken = completeUser.token;
    delete completeUser.token;

    loginUser(userToken, completeUser);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (method === 'password') {
        const data = await loginUserApi(mobileNumber, password);
        loginUser(data.access_token, data.user);
        setSuccessMsg("Logged in successfully!");
      } else {
        if (!otpSent) {
          const data = await sendOtpApi(mobileNumber);
          setOtpSent(true);
          setSuccessMsg(`Demo OTP sent: ${data.demo_otp}`);
        } else {
          const data = await verifyOtpApi(mobileNumber, otpCode);
          loginUser(data.access_token, data.user);
          setSuccessMsg("OTP Verified! Logging in...");
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'An error occurred';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const data = await registerUserApi({
        mobile_number: mobileNumber,
        password,
        full_name: fullName,
        role,
        home_mandi: homeMandi,
        preferred_commodity: preferredCrop,
        language: 'hi'
      });

      loginUser(data.access_token, data.user);
      setSuccessMsg("Account created successfully!");
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto font-['Inter']">
      {/* Floating Dark Glass Container */}
      <div 
        className="backdrop-blur-2xl border border-[#2DFF68]/20 rounded-[28px] overflow-hidden shadow-2xl text-white"
        style={{
          background: 'rgba(7, 22, 20, 0.82)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45)'
        }}
      >
        {/* Top Tab Bar Switcher */}
        <div className="grid grid-cols-2 border-b border-emerald-950/80 bg-[#041514]/90">
          <button
            onClick={() => setTab('login')}
            className={`py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 border-b-2 transition ${
              tab === 'login'
                ? 'border-[#2DFF68] text-[#2DFF68] bg-[#063B2B]/40 shadow-sm'
                : 'border-transparent text-[#B5C0BD] hover:text-[#F6F4EC]'
            }`}
          >
            <Lock className="h-4 w-4 text-[#2DFF68]" /> {t("auth.login")}
          </button>

          <button
            onClick={() => setTab('signup')}
            className={`py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 border-b-2 transition ${
              tab === 'signup'
                ? 'border-[#2DFF68] text-[#2DFF68] bg-[#063B2B]/40 shadow-sm'
                : 'border-transparent text-[#B5C0BD] hover:text-[#F6F4EC]'
            }`}
          >
            <UserPlus className="h-4 w-4 text-[#B5C0BD]" /> {t("auth.signup")}
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {googleProfilePending ? (
            /* Google Profile Completion Modal Step */
            <form onSubmit={handleSaveGoogleProfile} className="space-y-4 font-['Inter']">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-extrabold text-[#F6F4EC]">
                  Complete Your Kisan Profile 👨‍🌾
                </h3>
                <p className="text-xs text-[#2DFF68] font-medium">
                  Welcome {googleTempUser?.full_name}! Enter mobile number for WhatsApp alerts & select home mandi.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-200 text-xs font-semibold">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Mobile Number Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">10-Digit Mobile Number (For WhatsApp Alerts)</label>
                <div className="flex items-center rounded-xl bg-[#030B07] border border-slate-800 focus-within:border-[#2DFF68] overflow-hidden">
                  <span className="px-3 text-xs font-extrabold text-[#B5C0BD] bg-[#08180b] py-2.5 border-r border-slate-800">
                    +91 🇮🇳
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={googleMobile}
                    onChange={(e) => setGoogleMobile(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-[#F6F4EC] focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">Select Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGoogleRole('farmer')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      googleRole === 'farmer' ? 'bg-[#063B2B] text-[#2DFF68] border-[#2DFF68]' : 'bg-[#030B07] text-[#B5C0BD] border-slate-800'
                    }`}
                  >
                    🌾 Farmer Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoogleRole('trader')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      googleRole === 'trader' ? 'bg-[#063B2B] text-[#2DFF68] border-[#2DFF68]' : 'bg-[#030B07] text-[#B5C0BD] border-slate-800'
                    }`}
                  >
                    📊 Trader Mode
                  </button>
                </div>
              </div>

              {/* Home Mandi */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">Home Mandi</label>
                <select
                  value={googleMandi}
                  onChange={(e) => setGoogleMandi(e.target.value)}
                  className="w-full bg-[#030B07] border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-[#F6F4EC] focus:outline-none focus:border-[#2DFF68]"
                >
                  <option value="Agra APMC">Agra APMC (UP)</option>
                  <option value="Khanna APMC">Khanna APMC (Punjab)</option>
                  <option value="Azadpur APMC">Azadpur APMC (Delhi)</option>
                  <option value="Mathura APMC">Mathura APMC (UP)</option>
                  <option value="Lasalgaon APMC">Lasalgaon APMC (Maharashtra)</option>
                  <option value="Karnal APMC">Karnal APMC (Haryana)</option>
                  <option value="Indore APMC">Indore APMC (Madhya Pradesh)</option>
                  <option value="Farrukhabad APMC">Farrukhabad APMC (UP)</option>
                  <option value="Guntur APMC">Guntur APMC (Andhra Pradesh)</option>
                  <option value="Kolkata APMC">Kolkata APMC (West Bengal)</option>
                </select>
              </div>

              {/* Primary Commodity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">Primary Crop</label>
                <select
                  value={googleCrop}
                  onChange={(e) => setGoogleCrop(e.target.value)}
                  className="w-full bg-[#030B07] border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-[#F6F4EC] focus:outline-none focus:border-[#2DFF68]"
                >
                  <option value="Potato">Potato 🥔 (Vegetables)</option>
                  <option value="Onion">Onion 🧅 (Vegetables)</option>
                  <option value="Tomato">Tomato 🍅 (Vegetables)</option>
                  <option value="Wheat">Wheat 🌾 (Cereals)</option>
                  <option value="Paddy(Dhan)">Paddy / Rice 🌾 (Cereals)</option>
                  <option value="Maize">Maize 🌽 (Cereals)</option>
                  <option value="Soyabean">Soybean 🟡 (Oilseeds)</option>
                  <option value="Mustard">Mustard 🟡 (Oilseeds)</option>
                  <option value="Gram(Chana)">Gram (Chana) 🫘 (Pulses)</option>
                  <option value="Chilli Red">Dry Chilli 🌶️ (Spices)</option>
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2DFF68] to-[#087A45] text-slate-950 font-black text-xs uppercase tracking-wider hover:opacity-95 shadow-lg flex items-center justify-center gap-2"
              >
                Save Profile & Enter Kisan Hub →
              </button>
            </form>
          ) : (
            <>
              {/* Header Title in Inter 800 */}
              <div className="text-center space-y-0.5">
                <h3 className="text-2xl font-extrabold text-[#F6F4EC] flex items-center justify-center gap-2">
                  {tab === 'login' ? t("auth.welcome") : t("auth.createTitle")}
                </h3>
                <p className="text-xs text-[#B5C0BD] font-medium">
                  {tab === 'login' ? t("auth.welcomeSub") : t("auth.createSub")}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-200 text-xs font-semibold">
                  ⚠️ {errorMsg}
                </div>
              )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#0b1a0f] border border-[#2DFF68]/40 text-[#2DFF68] text-xs font-semibold">
              ✅ {successMsg}
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {/* Method Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#030B07] border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setMethod('password'); setOtpSent(false); }}
                  className={`py-1.5 rounded-lg transition ${
                    method === 'password' ? 'bg-[#063B2B] text-[#2DFF68] border border-[#2DFF68]/40 shadow-sm font-extrabold' : 'text-[#B5C0BD] hover:text-slate-200'
                  }`}
                >
                  📱 {t("auth.methodPassword")}
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('otp')}
                  className={`py-1.5 rounded-lg transition ${
                    method === 'otp' ? 'bg-[#063B2B] text-[#2DFF68] border border-[#2DFF68]/40 shadow-sm font-extrabold' : 'text-[#B5C0BD] hover:text-slate-200'
                  }`}
                >
                  💬 {t("auth.methodOtp")}
                </button>
              </div>

              {/* Mobile Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">{t("auth.mobile")}</label>
                <div className="flex items-center rounded-xl bg-[#030B07] border border-slate-800 focus-within:border-[#2DFF68] focus-within:ring-2 focus-within:ring-[#2DFF68]/20 overflow-hidden transition shadow-sm">
                  <span className="px-3 text-xs font-extrabold text-[#B5C0BD] bg-[#08180b] py-2.5 border-r border-slate-800">
                    +91 🇮🇳
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder={t("auth.mobilePlaceholder")}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-[#F6F4EC] placeholder-[#889693] focus:outline-none"
                  />
                </div>
              </div>

              {/* Password / OTP Field */}
              {method === 'password' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#B5C0BD]">{t("auth.password")}</label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={t("auth.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl bg-[#030B07] border border-slate-800 px-3 py-2 text-sm font-semibold text-[#F6F4EC] placeholder-[#889693] focus:outline-none focus:border-[#2DFF68] focus:ring-2 focus:ring-[#2DFF68]/20 pr-10 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#889693] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                otpSent && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#B5C0BD]">{t("auth.otpLabel")}</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter 6-digit OTP (123456)"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full rounded-xl bg-[#030B07] border border-slate-800 px-3 py-2 text-sm text-[#F6F4EC] placeholder-[#889693] focus:outline-none focus:border-[#2DFF68] tracking-widest text-center font-mono font-bold shadow-sm"
                    />
                  </div>
                )
              )}

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#B5C0BD]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-[#2DFF68] focus:ring-[#2DFF68] h-4 w-4"
                  />
                  {t("auth.remember")}
                </label>
                <button type="button" className="font-bold text-[#2DFF68] hover:underline">{t("auth.forgot")}</button>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-black text-white flex items-center justify-center gap-2 shadow-lg transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #39D96A, #159447)',
                  boxShadow: '0 10px 25px rgba(45, 255, 104, 0.25)'
                }}
              >
                {loading ? "Processing..." : method === 'password' ? t("auth.loginCta") : otpSent ? t("auth.otpVerify") : t("auth.otpSend")}
                <ArrowRight className="h-4 w-4" />
              </button>
              {/* Or continue with */}
              <div className="relative py-0.5 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <span className="relative bg-[#071614] px-3 text-[10px] font-medium text-[#889693] uppercase tracking-wider">
                  or continue with
                </span>
              </div>

              {/* Google OAuth Component & Guest Access */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                {/* Official Real Google Login Button */}
                <div className="flex justify-center w-full">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setErrorMsg("Google Sign-In popup was closed or cancelled.")}
                    shape="pill"
                    size="large"
                    theme="filled_black"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loginWithDemo('farmer')}
                  className="py-2 px-3 rounded-full border border-slate-800 bg-[#040f0a] hover:bg-[#063B2B]/40 text-xs font-bold text-[#F6F4EC] flex items-center justify-center gap-1.5 shadow-sm transition h-[40px]"
                >
                  ⚡ Guest Access
                </button>
              </div>
            </form>
          ) : (
            /* SIGNUP FORM */
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">{t("auth.fullName")}</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl bg-[#030B07] border border-slate-800 px-3 py-2 text-sm font-semibold text-[#F6F4EC] focus:outline-none focus:border-[#2DFF68] shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">{t("auth.mobile")}</label>
                <div className="flex items-center rounded-xl bg-[#030B07] border border-slate-800 focus-within:border-[#2DFF68] overflow-hidden shadow-sm">
                  <span className="px-3 text-xs font-extrabold text-[#B5C0BD] bg-[#08180b] py-2 border-r border-slate-800">+91 🇮🇳</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-[#F6F4EC] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">{t("auth.password")}</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-[#030B07] border border-slate-800 px-3 py-2 text-sm font-semibold text-[#F6F4EC] focus:outline-none focus:border-[#2DFF68] shadow-sm"
                />
              </div>

              {/* Role Radio */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#B5C0BD]">{t("auth.role")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('farmer')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      role === 'farmer' ? 'bg-[#063B2B] border-[#2DFF68]/40 text-[#2DFF68] shadow-sm' : 'bg-[#030B07] border-slate-800 text-[#B5C0BD]'
                    }`}
                  >
                    👨‍🌾 Farmer Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('trader')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      role === 'trader' ? 'bg-sky-950/80 border-sky-500/40 text-sky-400 shadow-sm' : 'bg-[#030B07] border-slate-800 text-[#B5C0BD]'
                    }`}
                  >
                    📊 Trader Mode
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-black text-white flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #39D96A, #159447)',
                  boxShadow: '0 10px 25px rgba(45, 255, 104, 0.25)'
                }}
              >
                {loading ? "Creating..." : "Create Account →"}
              </button>
            </form>
          )}

          {/* 1-Click Demo Presets */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#B5C0BD] font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-[#F2C94C]" />
              {t("auth.demoPresets")}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loginWithDemo('farmer')}
                className="p-2.5 rounded-xl border border-[#2DFF68]/20 bg-[#040f0a] hover:bg-[#063B2B]/40 text-left transition space-y-0.5 shadow-sm group"
              >
                <div className="text-xs font-extrabold text-[#2DFF68] flex items-center gap-1">
                  👨‍🌾 Demo Farmer
                </div>
                <div className="text-[10px] text-[#B5C0BD] truncate">Agra Potato Farmer</div>
              </button>

              <button
                type="button"
                onClick={() => loginWithDemo('trader')}
                className="p-2.5 rounded-xl border border-sky-500/20 bg-[#040f0a] hover:bg-[#063B2B]/40 text-left transition space-y-0.5 shadow-sm group"
              >
                <div className="text-xs font-extrabold text-sky-400 flex items-center gap-1">
                  📊 Demo Trader
                </div>
                <div className="text-[10px] text-[#B5C0BD] truncate">Azadpur Procurement</div>
              </button>
            </div>
          </div>

          {/* Security Banner */}
          <div className="rounded-xl border border-[#2DFF68]/20 bg-[#040e08]/90 p-2.5 flex items-center gap-2.5 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-[#2DFF68] shrink-0" />
            <div className="text-[11px]">
              <p className="font-extrabold text-[#F6F4EC]">{t("trust.secure")}</p>
              <p className="text-[#B5C0BD] text-[10px] leading-tight">Industry-standard encryption to protect your information</p>
            </div>
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
}
