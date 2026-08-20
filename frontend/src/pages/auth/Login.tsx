// Field Notes Intelligence reminder: keep auth screens clean, centered, warm, and focused on the product interface rather than stock photography.
import { ArrowRight, ShieldCheck, Sprout } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { cropLensService } from "@/services/cropLensService";
import { getLoginUrl } from "@/const";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, continueAsGuest } = useAuth();
  const [mobile, setMobile] = useState("9876543210");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) return;
    setLoading(true);
    await cropLensService.sendOtp(mobile);
    login(mobile);
    setLoading(false);
    setLocation(`/verify?mobile=${encodeURIComponent(mobile)}`);
  };

  const handleGoogleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleGuest = () => {
    continueAsGuest();
    setLocation("/app");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#F8F7F2] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-[#DDE4DE] bg-white p-8 paper-shadow">
        <div className="text-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105"><BrandMark /></Link>
          <h1 className="mt-6 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35]">Welcome back</h1>
          <p className="mt-1.5 text-sm text-[#66716A]">Sign in securely to access your APMC mandi crop advisory.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="mobile" className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Mobile number</label>
            <div className="mt-2 flex items-center rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-4 py-3 focus-within:border-[#176B45] focus-within:bg-white">
              <span className="text-sm font-bold text-[#66716A]">+91</span>
              <input id="mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} placeholder="98765 43210" className="w-full bg-transparent pl-3 text-sm font-extrabold text-[#17201B] focus:outline-none" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-full bg-[#176B45] py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(23,107,69,.16)] transition-all hover:bg-[#0E4D35] active:scale-[0.97] disabled:opacity-50 cursor-pointer">
            {loading ? "Sending verification code..." : "Continue with OTP"}
          </button>
        </form>

        <div className="relative my-6 text-center"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#DDE4DE]" /></div><span className="relative bg-white px-3 text-xs font-bold text-[#66716A]">OR</span></div>

        <div className="space-y-3">
          <button type="button" onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[#DDE4DE] bg-white py-3 text-xs font-extrabold text-[#17201B] transition-all hover:border-[#176B45] hover:shadow-sm cursor-pointer">
            <svg className="size-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.87z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.18 21.35 7.23 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.19C.43 8.15 0 9.89 0 12s.43 3.85 1.19 5.4l4.08-3.16z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.18 2.65 1.19 6.6l4.08 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/></svg> Continue with Google
          </button>
          <button type="button" onClick={handleGuest} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#E8F4ED] py-3 text-xs font-extrabold text-[#0E4D35] transition-colors hover:bg-[#D4E8DC] cursor-pointer">
            Explore Platform (Instant Access) <ArrowRight className="size-3.5" />
          </button>
        </div>

        <div className="mt-8 border-t border-[#DDE4DE] pt-6 text-center text-xs text-[#66716A]">
          New to CropLens AI? <Link href="/signup" className="font-extrabold text-[#176B45] hover:underline">Create account</Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#66716A]">
          <ShieldCheck className="size-4 text-[#176B45]" /> 256-bit Encrypted Session · Instant OTP Login
        </div>
      </div>
    </div>
  );
}
