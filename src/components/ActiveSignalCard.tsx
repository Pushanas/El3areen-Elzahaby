import React from 'react';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle, Zap, Shield, Sparkles } from 'lucide-react';
import { SignalItem, SignalResult } from '../types';
import emblemImage from '../assets/images/areen_brand_logo_1792001509199.jpg';

interface ActiveSignalCardProps {
  currentSignal: SignalItem | null;
  countdownText: string;
  isTradeActive: boolean;
  onMarkResult: (signalId: string, result: SignalResult) => void;
  totalSignals: number;
  remainingSignals: number;
}

export const ActiveSignalCard: React.FC<ActiveSignalCardProps> = ({
  currentSignal,
  countdownText,
  isTradeActive,
  onMarkResult,
}) => {
  if (!currentSignal) {
    return (
      <div className="bg-gradient-to-b from-[#18130b] via-[#120e08] to-[#0a0805] border border-[#d4af37]/35 rounded-3xl p-6 text-center shadow-[0_15px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-36 h-1 bg-gradient-to-r from-transparent via-[#ffd700] to-transparent opacity-80" />
        
        <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-[#d4af37] bg-[#1d160c] p-0.5 mb-3 shadow-[0_0_25px_rgba(212,175,55,0.35)]">
          <img
            src={emblemImage}
            alt="العرين الذهبي"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
        
        <h3 className="text-base font-black text-[#ffd700] mb-1 tracking-tight">
          عرين الصفقات الذهبية جاهز للعمل
        </h3>
        <p className="text-xs text-[#baa274] leading-relaxed max-w-xs mx-auto">
          اختر تبويب "المولّد" أو "استراتيجية العرين الذهبي" لتوليد جدول الصفقات وبدء المراقبة اللحظية بدقة متناهية.
        </p>
      </div>
    );
  }

  const isCall = currentSignal.direction === 'CALL';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all shadow-[0_12px_35px_rgba(0,0,0,0.6)] ${
        isCall
          ? 'bg-gradient-to-b from-[#0a1a12] via-[#09140f] to-[#060b08] border-[#22c55e]/40 shadow-[0_0_25px_rgba(34,197,94,0.12)]'
          : 'bg-gradient-to-b from-[#200d0e] via-[#16090a] to-[#0c0506] border-[#ef4444]/40 shadow-[0_0_25px_rgba(239,68,68,0.12)]'
      }`}
    >
      {/* Top Banner Ribbon */}
      <div
        className={`py-1.5 px-3 flex items-center justify-between text-[11px] font-bold ${
          isCall
            ? 'bg-[#22c55e]/15 text-[#4ade80] border-b border-[#22c55e]/25'
            : 'bg-[#ef4444]/15 text-[#f87171] border-b border-[#ef4444]/25'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-ping bg-current" />
          {isTradeActive ? 'الصفقة جارية الآن بالعرين!' : 'الصفقة القادمة المجدولة'}
        </span>
        <span className="font-mono tabular-nums">{currentSignal.timeframe} • {currentSignal.martingale}</span>
      </div>

      <div className="p-4 text-center space-y-3">
        {/* Direction Icon & Direction Text */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black mb-1.5 transition-transform ${
              isCall
                ? 'bg-[#22c55e]/20 text-[#22c55e] border-2 border-[#22c55e]/60 shadow-[0_0_25px_rgba(34,197,94,0.3)] animate-pulse'
                : 'bg-[#ef4444]/20 text-[#ef4444] border-2 border-[#ef4444]/60 shadow-[0_0_25px_rgba(239,68,68,0.3)] animate-pulse'
            }`}
          >
            {isCall ? (
              <ArrowUpRight className="w-10 h-10 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="w-10 h-10 stroke-[2.5]" />
            )}
          </div>

          <div
            className={`text-xl font-black tracking-tight ${
              isCall ? 'text-[#22c55e]' : 'text-[#ef4444]'
            }`}
          >
            {isCall ? 'صعود — CALL' : 'هبوط — PUT'}
          </div>

          <div className="text-lg font-mono font-extrabold text-[#fbf7ee] mt-0.5 tracking-wide">
            {currentSignal.pair}
          </div>
        </div>

        {/* Time and Countdown */}
        <div className="bg-[#050403]/80 border border-[#d4af37]/20 rounded-xl py-2 px-3 max-w-[240px] mx-auto">
          <div className="text-[11px] text-[#baa375] font-semibold flex items-center justify-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-[#ffd700]" />
            <span>وقت الدخول: {currentSignal.timeStr}</span>
          </div>

          <div className="text-3xl font-mono font-black text-white tracking-widest tabular-nums">
            {countdownText}
          </div>

          <div className="text-[9px] text-[#8e7e60] mt-0.5">
            {isTradeActive
              ? 'متبقي على إغلاق شمعة الصفقة'
              : 'العد التنازلي حتى فتح الشمعة'}
          </div>
        </div>

        {/* Tactical Rules & Note */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-[#d6c49e]">
          <span className="px-2 py-0.5 rounded-full bg-[#1b140a] border border-[#d4af37]/30">
            الدخول مع أول ثانية (00)
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#1b140a] border border-[#d4af37]/30">
            {currentSignal.martingale}
          </span>
        </div>

        {/* Fast Result Logger directly on current trade */}
        <div className="pt-2 border-t border-[#d4af37]/15">
          <div className="text-[11px] font-bold text-[#e0c98f] mb-1.5">
            تسجيل نتيجة الصفقة:
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => onMarkResult(currentSignal.id, 'win_direct')}
              className={`py-2 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                currentSignal.result === 'win_direct'
                  ? 'bg-[#15803d] text-white ring-2 ring-[#4ade80]'
                  : 'bg-[#15803d]/30 text-[#4ade80] border border-[#22c55e]/40'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>مباشر</span>
            </button>

            <button
              onClick={() => onMarkResult(currentSignal.id, 'win_mtg1')}
              className={`py-2 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                currentSignal.result === 'win_mtg1'
                  ? 'bg-[#a16207] text-white ring-2 ring-[#facc15]'
                  : 'bg-[#a16207]/30 text-[#facc15] border border-[#eab308]/40'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>MTG1</span>
            </button>

            <button
              onClick={() => onMarkResult(currentSignal.id, 'win_mtg2')}
              className={`py-2 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                currentSignal.result === 'win_mtg2'
                  ? 'bg-[#c2410c] text-white ring-2 ring-[#fb923c]'
                  : 'bg-[#c2410c]/30 text-[#fb923c] border border-[#f97316]/40'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>MTG2</span>
            </button>

            <button
              onClick={() => onMarkResult(currentSignal.id, 'loss')}
              className={`py-2 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                currentSignal.result === 'loss'
                  ? 'bg-[#b91c1c] text-white ring-2 ring-[#f87171]'
                  : 'bg-[#b91c1c]/30 text-[#f87171] border border-[#ef4444]/40'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>خسارة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
