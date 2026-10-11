import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, Lock, X, AlertCircle } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockedSeconds, setLockedSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (lockedSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockedSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedSeconds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedSeconds > 0 || loading) return;

    const clean = password.trim();
    if (!clean) {
      setError('يرجى إدخال كلمة مرور الإدارة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem('areen_admin_token', data.token);
        onLoginSuccess(data.token);
        onClose();
      } else {
        if (data.lockedSeconds) {
          setLockedSeconds(data.lockedSeconds);
        }
        setError(data.error || 'فشل التحقق من هوية المدير');
      }
    } catch {
      setError('تعذر الاتصال بخادم الإدارة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      dir="rtl"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-[#19130a] via-[#100d07] to-[#080603] border-2 border-[#d4af37]/40 rounded-3xl p-6 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(212,175,55,0.2)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top ambient gold bar */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-36 h-1.5 bg-gradient-to-r from-transparent via-[#ffd700] to-transparent" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#20180c] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#261d0d] border border-[#d4af37]/50 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            <ShieldAlert className="w-7 h-7 text-[#ffd700]" />
          </div>
          <h2 className="text-xl font-black text-[#ffd700]">بوابة الإدارة المركزية</h2>
          <p className="text-[11px] text-[#9c8963] mt-0.5 font-medium">
            لوحة تحكم وتراخيص العرين الذهبي
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#cfb780] mb-2 text-right">
              كلمة مرور الإدارة المشفرة
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={lockedSeconds > 0 || loading}
                placeholder="أدخل كلمة مرور المسؤول..."
                className="w-full py-3 px-4 pr-10 pl-10 rounded-xl bg-[#080603] border border-[#d4af37]/35 text-white placeholder-[#685b42] focus:outline-none focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] text-center font-mono text-sm tracking-wider transition-all"
                autoFocus
                required
              />
              <KeyRound className="w-4 h-4 text-[#d4af37]/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d4af37]/70 hover:text-[#ffd700] p-1 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {lockedSeconds > 0 && (
            <div className="p-2.5 rounded-xl bg-[#321313] border border-[#ff4d4d]/40 text-xs text-[#ff9999] flex items-center gap-2 text-right">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ff4d4d]" />
              <span>
                محاولات محظورة مؤقتاً. يرجى الانتظار{' '}
                <b className="font-mono text-[#ffd700]">{lockedSeconds}</b> ثانية.
              </span>
            </div>
          )}

          {error && !lockedSeconds && (
            <div className="p-2.5 rounded-xl bg-[#2d1111] border border-[#ff4d4d]/30 text-xs text-[#ff7979] flex items-center gap-2 text-right">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ff4d4d]" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={lockedSeconds > 0 || loading || !password.trim()}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa820a] text-[#080705] hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'جارٍ التحقق الأمني...' : 'تسجيل دخول الإدارة'}</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-[#d4af37]/15 text-center text-[10px] text-[#716143]">
          منظومة محمية بالكامل بموجب بروتوكول العرين الذهبي المشفر
        </div>
      </div>
    </div>
  );
};
