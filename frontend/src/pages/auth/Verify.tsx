// Field Notes Intelligence reminder: OTP should feel effortless, keyboard-friendly, explicit about demo status, and honest about simulated verification.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { cropLensService } from "@/services/cropLensService";

export default function Verify() {
  const [, setLocation] = useLocation();
  const { user, verifyOtp } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(27);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [timeLeft]);

  const fillDigits = (digits: string[]) => {
    setOtp((current) => current.map((_, index) => digits[index] ?? ""));
    const next = Math.min(digits.length, 5);
    inputRefs.current[next]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    setError("");
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      fillDigits(digits.slice(0, 6).split(""));
      return;
    }
    setOtp((current) => current.map((digit, i) => (i === index ? digits : digit)));
    if (digits && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    fillDigits(digits.split(""));
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits to continue.");
      inputRefs.current[otp.findIndex((digit) => !digit)]?.focus();
      return;
    }
    setLoading(true);
    setError("");
    const res = await cropLensService.verifyOtp(user.mobile, code);
    if (res.success) {
      verifyOtp(code);
      setLoading(false);
      setLocation("/onboarding");
    } else {
      setLoading(false);
      setError("That code could not be verified. Please check the digits and try again.");
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;
    setTimeLeft(30);
    setError("");
    await cropLensService.sendOtp(user.mobile);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#F8F7F2] px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-[#DDE4DE] bg-white p-8 text-center paper-shadow">
        <BrandMark />
        <h1 className="mt-6 text-2xl font-extrabold tracking-[-.04em] text-[#0E4D35]">Enter verification code</h1>
        <p className="mt-1 text-xs text-[#66716A]">Enter the 6-digit OTP code sent to your registered mobile number.</p>

        <form onSubmit={handleVerify} className="mt-8">
          <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="Six digit verification code">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { inputRefs.current[index] = element; }}
                id={`otp-${index}`}
                aria-label={`Verification digit ${index + 1}`}
                aria-invalid={Boolean(error)}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                className="size-12 rounded-xl border border-[#DDE4DE] bg-[#F8F7F2] text-center text-lg font-extrabold text-[#17201B] focus:border-[#176B45] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#176B45]/20 sm:size-14"
              />
            ))}
          </div>
          {error && <p role="alert" className="mt-4 text-xs font-bold text-[#C94A4A]">{error}</p>}
          <p className="mt-6 text-xs text-[#66716A]">Code expires in 00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</p>

          <button type="submit" disabled={loading} className="mt-8 w-full rounded-full bg-[#176B45] py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(23,107,69,.16)] transition-all hover:bg-[#0E4D35] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <div className="mt-8 border-t border-[#DDE4DE] pt-6 text-xs text-[#66716A]">
          Didn't receive it? <button type="button" onClick={handleResend} disabled={timeLeft > 0} className="font-extrabold text-[#176B45] hover:underline disabled:cursor-not-allowed disabled:text-[#9AA59E]">{timeLeft > 0 ? `Resend in ${timeLeft}s` : "Resend code"}</button>
        </div>
      </div>
    </div>
  );
}
