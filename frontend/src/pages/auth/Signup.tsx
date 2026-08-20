// Field Notes Intelligence reminder: professional signup with full name, mobile number, and password requirements.
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { cropLensService } from "@/services/cropLensService";
import { Lock, Phone, User, ShieldCheck } from "lucide-react";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!mobile || mobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await cropLensService.sendOtp(mobile);
      signup(mobile);
      setLoading(false);
      setLocation(`/verify?mobile=${encodeURIComponent(mobile)}&name=${encodeURIComponent(fullName)}`);
    } catch {
      setLoading(false);
      setError("Failed to initiate registration. Please try again.");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#F8F7F2] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-[#DDE4DE] bg-white p-8 paper-shadow">
        <div className="text-center">
          <Link href="/" className="inline-block transition-transform hover:scale-105"><BrandMark /></Link>
          <h1 className="mt-6 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35]">Create your account</h1>
          <p className="mt-1.5 text-sm text-[#66716A]">Join CropLens AI for precise APMC mandi intelligence.</p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fullname" className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Full Name</label>
            <div className="mt-2 flex items-center rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-4 py-3 focus-within:border-[#176B45] focus-within:bg-white transition-colors">
              <User className="size-4 text-[#66716A]" />
              <input id="fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rajesh Kumar" className="w-full bg-transparent pl-3 text-sm font-extrabold text-[#17201B] focus:outline-none" required />
            </div>
          </div>

          <div>
            <label htmlFor="signup-mobile" className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Mobile Number</label>
            <div className="mt-2 flex items-center rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-4 py-3 focus-within:border-[#176B45] focus-within:bg-white transition-colors">
              <Phone className="size-4 text-[#66716A]" />
              <span className="pl-3 text-sm font-bold text-[#66716A]">+91</span>
              <input id="signup-mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} placeholder="98765 43210" className="w-full bg-transparent pl-2 text-sm font-extrabold text-[#17201B] focus:outline-none" required />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Secure Password</label>
            <div className="mt-2 flex items-center rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-4 py-3 focus-within:border-[#176B45] focus-within:bg-white transition-colors">
              <Lock className="size-4 text-[#66716A]" />
              <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent pl-3 text-sm font-extrabold text-[#17201B] focus:outline-none" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-full bg-[#176B45] py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(23,107,69,.16)] transition-all hover:bg-[#0E4D35] active:scale-[0.97] disabled:opacity-50 cursor-pointer">
            {loading ? "Setting up account..." : "Continue with OTP Verification"}
          </button>
        </form>

        <div className="mt-8 border-t border-[#DDE4DE] pt-6 text-center text-xs text-[#66716A]">
          Already have an account? <Link href="/login" className="font-extrabold text-[#176B45] hover:underline">Sign in</Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#66716A]">
          <ShieldCheck className="size-4 text-[#176B45]" /> 256-bit Encrypted Session · Secure APMC Gateway
        </div>
      </div>
    </div>
  );
}
