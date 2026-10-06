import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Sparkles, KeyRound, AlertCircle } from 'lucide-react';
import { verifyMasterPassword } from '../utils/crypto';
import emblemImage from '../assets/images/areen_golden_emblem_1791233936752.jpg';

interface LoginViewProps {
  onSuccess: () => void;
  kickoutMessage?: string | null;
}

const MAX_ATTEMPTS = 5;
const LOCK_STEPS = [15, 30, 60, 120, 300];

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, kickoutMessage }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (lockedUntil > 0) {
        const diff = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
        setSecondsRemaining(diff);
        if (diff === 0) {
          setLockedUntil(0);
        }
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const handleLogin = async () => {
    if (secondsRemaining > 0) return;
    const cleanPass = password.trim();
    if (!cleanPass) {
      setError('يرجى إدخال كلمة المرور للوصول إلى العرين الذهبي');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyMasterPassword(cleanPass);
      if (result.success) {
        setFailedAttempts(0);
        setLockedUntil(0);
        onSuccess();
      } else {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        setPassword('');
        if (nextFailed >= MAX_ATTEMPTS) {
          const step = Math.min(nextFailed - MAX_ATTEMPTS, LOCK_STEPS.length - 1);
          const penalty = LOCK_STEPS[step];
          setLockedUntil(Date.now() + penalty * 1000);
          setError(`تم تفعيل القفل الأمني المشدد للعرين لمدة ${penalty} ثانية بسبب تكرار المحاولات الخاطئة.`);
        } else {
          setError(result.error || `كلمة المرور غير صحيحة. متبقي لديك ${MAX_ATTEMPTS - nextFailed} محاولات.`);
        }
      }
    } catch {
      setError('حدث خطأ أمني أثناء التحقق المشفر، يرجى إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-radial from-[#1e160a] via-[#0b0906] to-[#040302] text-[#fbf7ee]">
      <div className="w-full max-w-md bg-gradient-to-b from-[#18130b] to-[#0e0b07] border border-[#d4af37]/30 rounded-3xl p-6 md:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.12)] relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-2 bg-gradient-to-r from-transparent via-[#ffd700] to-transparent opacity-75 blur-xs" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Crest */}
        <div className="flex flex-col items-center text-center mb-6 relative">
          <div className="relative mb-3 group">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.3)] bg-gradient-to-br from-[#2a2010] to-[#140e06] p-1">
              <img
                src={emblemImage}
                alt="شعار العرين الذهبي"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="absolute -bottom-2 -left-2 bg-[#d4af37] text-[#080705] p-1.5 rounded-full shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            <span className="text-[#ffd700]">العرين</span>{' '}
            <span className="text-[#fbf7ee]">الذهبي</span>
          </h1>
          <p className="text-xs text-[#d4af37]/80 tracking-widest mt-1 font-semibold uppercase">
            Al-Areen Al-Dahabi • Temporal Signals
          </p>
        </div>

        {kickoutMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#351515] border border-[#ef4444]/50 text-xs text-[#fca5a5] flex items-start gap-2.5 text-right leading-relaxed shadow-lg">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#ef4444] mt-0.5" />
            <span>{kickoutMessage}</span>
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-[#cfb780] mb-2 text-right">
              كلمة المرور المشفرة
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={secondsRemaining > 0 || loading}
                placeholder="أدخل كلمة المرور السرية..."
                className="w-full py-3.5 px-4 pr-11 pl-11 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white placeholder-[#786b51] focus:outline-none focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] text-center font-mono tracking-widest transition-all"
                autoFocus
                required
              />
              <KeyRound className="w-4 h-4 text-[#d4af37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d4af37]/70 hover:text-[#ffd700] p-1 transition-colors"
                title={showPassword ? 'إخفاء' : 'إظهار'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Info & Attempt counter */}
          <div className="flex items-center justify-between text-[11px] text-[#9a865a]">
            <span>
              محاولات متبقية:{' '}
              <b className="text-[#ffd700] font-mono">
                {secondsRemaining > 0 ? 0 : Math.max(0, MAX_ATTEMPTS - failedAttempts)}
              </b>
            </span>
            <span>
              {secondsRemaining > 0 ? (
                <span className="text-[#ff6b6b] font-bold">حظر مؤقت ({secondsRemaining}ث)</span>
              ) : (
                <span className="text-[#68d391]">حماية مشددة نشطة</span>
              )}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-[#ff7979] bg-[#2d1111]/60 p-2.5 rounded-lg border border-[#ff4d4d]/30 text-right">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ff4d4d]" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Action Button Only - Zero Bypass */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={secondsRemaining > 0 || loading || !password.trim()}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#b38914] text-[#080705] hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'جارٍ فك التشفير والتحقق...' : 'دخول عرين الصفقات الذهبية'}</span>
            </button>
          </div>
        </form>

        {/* Creator Telegram Badge */}
        <div className="mt-4 pt-2.5 border-t border-[#d4af37]/15 flex items-center justify-center">
          <a
            href="https://t.me/Qv_Dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0d0a06] hover:bg-[#18120a] border border-[#d4af37]/20 hover:border-[#229ED9]/50 text-[#8e7e60] hover:text-[#229ED9] transition-all cursor-pointer shadow-sm group"
          >
            <div className="w-3.5 h-3.5 rounded bg-[#229ED9]/20 group-hover:bg-[#229ED9] text-[#229ED9] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 7.99-3.44 3.82-1.6 4.61-1.88 5.13-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.04.22z" />
              </svg>
            </div>
            <span className="text-[9px] font-medium tracking-tight">المنشئ والمطور</span>
          </a>
        </div>
      </div>
    </div>
  );
};
