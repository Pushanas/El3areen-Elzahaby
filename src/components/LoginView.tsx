import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, KeyRound, AlertCircle, Copy, Check, Send, Bot, ShieldCheck, Zap } from 'lucide-react';
import { verifyMasterPassword } from '../utils/crypto';
import emblemImage from '../assets/images/areen_brand_logo_1792001509199.jpg';
import { useSecretAdminTrigger } from '../hooks/useSecretAdminTrigger';

interface LoginViewProps {
  onSuccess: () => void;
  kickoutMessage?: string | null;
  onSecretAdminTrigger?: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCK_STEPS = [15, 30, 60, 120, 300];

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  kickoutMessage,
  onSecretAdminTrigger,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [copiedHandle, setCopiedHandle] = useState(false);

  const handleCopyHandle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText('@Qv_Dev');
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const { handleTap, pulseActive } = useSecretAdminTrigger({
    requiredTaps: 5,
    timeWindowMs: 2500,
    onTrigger: () => {
      onSecretAdminTrigger?.();
    },
  });

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
      <div className="w-full max-w-md bg-gradient-to-b from-[#18130b] via-[#120e09] to-[#090704] border border-[#d4af37]/35 rounded-3xl p-6 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(212,175,55,0.14)] relative overflow-hidden">
        {/* Ambient Top Golden Glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-transparent via-[#ffd700] to-transparent opacity-85 blur-xs" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Royal Crest (Secret 5-Tap Gateway for Admin Entrance - Clean without AI mark) */}
        <div className="flex flex-col items-center text-center mb-5 relative">
          <div
            className="relative mb-2 group cursor-pointer select-none"
            onClick={handleTap}
            onTouchEnd={handleTap}
            title="العرين الذهبي"
          >
            <div
              className={`w-28 h-28 rounded-2xl overflow-hidden border-2 bg-gradient-to-br from-[#2a2010] to-[#140e06] p-1 transition-all duration-300 ${
                pulseActive
                  ? 'scale-105 border-[#ffd700] shadow-[0_0_50px_rgba(255,215,0,0.95)] ring-2 ring-[#ffd700]'
                  : 'border-[#d4af37] shadow-[0_0_35px_rgba(212,175,55,0.4)]'
              }`}
            >
              <img
                src={emblemImage}
                alt="شعار العرين الذهبي"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-xl pointer-events-none"
              />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center justify-center gap-2">
            <span className="text-[#ffd700]">العرين</span>
            <span className="text-[#fbf7ee]">الذهبي</span>
          </h1>
          <p className="text-xs text-[#d4af37]/80 tracking-widest mt-1 font-semibold uppercase">
            Al-Areen Al-Dahabi • Temporal Signals
          </p>
        </div>

        {/* Upgraded Single Luxury Service & Custom Bot Creation Card */}
        <div className="mb-5 relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#191209] via-[#100d07] to-[#0a0805] border border-[#d4af37]/40 p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#241a0d] border border-[#d4af37]/40 text-[#ffd700] flex items-center justify-center shadow-xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[#ffd700]">
                خدمات برمجة البوتات والتطوير الخاص
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" title="متصل الآن" />
              <span className="text-[10px] text-[#4ade80] font-medium font-mono">متاح للطلب</span>
            </div>
          </div>

          {/* Value Highlights */}
          <div className="space-y-1.5 text-right text-[11px] text-[#d6c59f] mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-[#ffd700] shrink-0" />
              <span>تصميم وبرمجة بوتات تيليجرام وتداول وإشارات زمنية فوركس و OTC</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-[#229ED9] shrink-0" />
              <span>ربط قنوات VIP، خوارزميات ذكية، وخوادم سريعة بأقل تكلفة</span>
            </div>
          </div>

          {/* Interactive Action Row */}
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/Qv_Dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#1a7bb5] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md group cursor-pointer active:scale-98"
            >
              <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              <span>طلب بوت عبر تيليجرام</span>
            </a>

            <button
              type="button"
              onClick={handleCopyHandle}
              className="py-2 px-3 rounded-xl bg-[#1b140a] hover:bg-[#281c0c] border border-[#d4af37]/40 text-[#ffd700] font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="نسخ المعرف"
            >
              {copiedHandle ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span className="text-[#22c55e]">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>@Qv_Dev</span>
                </>
              )}
            </button>
          </div>
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
              كلمة المرور أو كود التفعيل
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
                placeholder="أدخل كلمة المرور أو كود الترخيص..."
                className="w-full py-3.5 px-4 pr-11 pl-11 rounded-xl bg-[#090704] border border-[#d4af37]/35 text-white placeholder-[#786b51] focus:outline-none focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] text-center font-mono tracking-widest transition-all"
                autoFocus
                required
              />
              <KeyRound className="w-4 h-4 text-[#d4af37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d4af37]/70 hover:text-[#ffd700] p-1 transition-colors cursor-pointer"
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

          {/* Main Action Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={secondsRemaining > 0 || loading || !password.trim()}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#b38914] text-[#080705] hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_25px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'جارٍ فك التشفير والتحقق...' : 'دخول عرين الصفقات الذهبية'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
