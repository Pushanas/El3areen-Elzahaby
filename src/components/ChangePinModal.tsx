import React, { useState } from 'react';
import { X, KeyRound, Check, ShieldAlert, Lock } from 'lucide-react';
import { updateMasterPassword } from '../utils/crypto';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPin) {
      setMsg({ text: 'يرجى إدخال كلمة المرور الحالية لتأكيد الهوية', type: 'error' });
      return;
    }
    if (!newPin || newPin.trim().length < 4) {
      setMsg({ text: 'يجب أن تكون كلمة المرور الجديدة 4 خانات على الأقل', type: 'error' });
      return;
    }
    if (newPin !== confirmPin) {
      setMsg({ text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const result = await updateMasterPassword(currentPin, newPin);
    setLoading(false);

    if (!result.success) {
      setMsg({ text: result.error || 'فشل تحديث كلمة المرور', type: 'error' });
    } else {
      setMsg({ text: 'تم تشفير وتحديث كلمة مرور العرين بنجاح! تم تطبيق الحماية.', type: 'success' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#18130b] to-[#0c0905] border border-[#d4af37]/40 rounded-3xl p-5 md:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.15)]">
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#ffd700]" />
            <h3 className="text-base font-bold text-[#ffd700]">تغيير رمز أمان العرين</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9c8963] hover:text-white hover:bg-[#20180c] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 p-2.5 rounded-xl bg-[#2a1708] border border-[#d4af37]/25 text-[11px] text-[#e0c98f] leading-relaxed text-right">
          🔒 <b>خاصية الطرد الموحد:</b> فور تغيير كلمة المرور، سيتم إنهاء الجلسة فوراً من كافة الأجهزة والهواتف المتصلة ويُطلب منها تسجيل الدخول بكلمة المرور الجديدة.
        </div>

        <form onSubmit={handleSave} className="mt-3 space-y-3 text-right">
          <div>
            <label className="block text-xs font-semibold text-[#baa274] mb-1">
              كلمة المرور الحالية:
            </label>
            <input
              type="password"
              placeholder="أدخل كلمة المرور الحالية للعرين..."
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-center text-sm focus:outline-none focus:border-[#ffd700]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#baa274] mb-1">
              كلمة المرور الجديدة:
            </label>
            <input
              type="password"
              placeholder="أدخل كلمة المرور الجديدة (4 خانات فأكثر)..."
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-center text-sm focus:outline-none focus:border-[#ffd700]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#baa274] mb-1">
              تأكيد كلمة المرور الجديدة:
            </label>
            <input
              type="password"
              placeholder="أعد كتابة كلمة المرور الجديدة..."
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-center text-sm focus:outline-none focus:border-[#ffd700]"
            />
          </div>

          {msg && (
            <div
              className={`p-2.5 rounded-lg text-xs font-bold text-center ${
                msg.type === 'success'
                  ? 'bg-[#15803d]/30 text-[#4ade80] border border-[#22c55e]/30'
                  : 'bg-[#b91c1c]/30 text-[#f87171] border border-[#ef4444]/30'
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#ffd700] text-[#080705] hover:brightness-110 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? 'جارٍ التشفير وتأكيد الحماية...' : 'تأكيد وحفظ التشفير الجديد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
