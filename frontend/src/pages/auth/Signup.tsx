// Field Notes Intelligence reminder: keep signup extremely short and direct.
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/contexts/AuthContext";

import { cropLensService } from "@/services/cropLensService";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { signup } = useAuth();
  const [mobile, setMobile] = useState("9876543210");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) return;
    setLoading(true);
    await cropLensService.sendOtp(mobile);
    signup(mobile);
    setLoading(false);
    setLocation(`/verify?mobile=${encodeURIComponent(mobile)}`);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#F8F7F2] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-[#DDE4DE] bg-white p-8 paper-shadow">
        <div className="text-center">
          <Link href="/" className="inline-block"><BrandMark /></Link>
          <h1 className="mt-6 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35]">Create your account</h1>
          <p className="mt-1 text-xs text-[#66716A]">Enter your mobile number to get started with CropLens AI.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="signup-mobile" className="block text-xs font-extrabold uppercase tracking-[.12em] text-[#66716A]">Mobile number</label>
            <div className="mt-2 flex items-center rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] px-4 py-3 focus-within:border-[#176B45] focus-within:bg-white">
              <span className="text-sm font-bold text-[#66716A]">+91</span>
              <input id="signup-mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={10} placeholder="98765 43210" className="w-full bg-transparent pl-3 text-sm font-extrabold text-[#17201B] focus:outline-none" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-full bg-[#176B45] py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(23,107,69,.16)] transition-all hover:bg-[#0E4D35] active:scale-[0.97] disabled:opacity-50">
            {loading ? "Creating account..." : "Continue"}
          </button>
        </form>

        <div className="mt-8 border-t border-[#DDE4DE] pt-6 text-center text-xs text-[#66716A]">
          Already have an account? <Link href="/login" className="font-extrabold text-[#176B45] hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
}
