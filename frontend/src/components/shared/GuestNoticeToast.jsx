import React from 'react';
import { Lock, X, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function GuestNoticeToast({ message, onClose }) {
  const { logout } = useAuth();

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-short font-['Inter']">
      <div className="bg-slate-900/95 border border-slate-700/80 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
            <Lock className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-100 leading-snug">
              {message}
            </p>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#22c55e] hover:underline pt-0.5"
            >
              <LogIn className="h-3.5 w-3.5" /> Login / Sign Up →
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
