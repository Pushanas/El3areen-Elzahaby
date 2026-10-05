import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Copy, Check, Trash2, Award } from 'lucide-react';
import { SignalItem, SignalResult } from '../types';

interface SignalsTableProps {
  signals: SignalItem[];
  onMarkResult: (id: string, result: SignalResult) => void;
  onResetSignals: () => void;
  onCopySingleSignal: (signal: SignalItem) => void;
  copiedId: string | null;
}

export const SignalsTable: React.FC<SignalsTableProps> = ({
  signals,
  onMarkResult,
  onResetSignals,
  onCopySingleSignal,
  copiedId,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'wins' | 'losses'>('all');

  const winsCount = signals.filter(
    (s) => s.result === 'win_direct' || s.result === 'win_mtg1' || s.result === 'win_mtg2'
  ).length;
  const lossCount = signals.filter((s) => s.result === 'loss').length;
  const gradedCount = winsCount + lossCount;
  const winRate = gradedCount > 0 ? Math.round((winsCount / gradedCount) * 100) : 0;

  const filteredSignals = signals.filter((s) => {
    if (filter === 'pending') return s.result === 'pending';
    if (filter === 'wins') {
      return s.result === 'win_direct' || s.result === 'win_mtg1' || s.result === 'win_mtg2';
    }
    if (filter === 'losses') return s.result === 'loss';
    return true;
  });

  return (
    <div className="bg-gradient-to-b from-[#151009] to-[#0e0b07] border border-[#d4af37]/25 rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-3">
      {/* Session Quick Metrics Bar - 4 in a row */}
      <div className="grid grid-cols-4 gap-1.5 pb-1">
        <div className="bg-[#090704] border border-[#d4af37]/20 rounded-xl p-2 text-center">
          <div className="text-[9px] text-[#9c8963] font-medium">الإجمالي</div>
          <div className="text-base font-black font-mono text-[#ffd700] tabular-nums">
            {signals.length}
          </div>
        </div>

        <div className="bg-[#090704] border border-[#22c55e]/30 rounded-xl p-2 text-center">
          <div className="text-[9px] text-[#4ade80] font-medium">الرابحة</div>
          <div className="text-base font-black font-mono text-[#22c55e] tabular-nums">
            {winsCount}
          </div>
        </div>

        <div className="bg-[#090704] border border-[#ef4444]/30 rounded-xl p-2 text-center">
          <div className="text-[9px] text-[#f87171] font-medium">الخاسرة</div>
          <div className="text-base font-black font-mono text-[#ef4444] tabular-nums">
            {lossCount}
          </div>
        </div>

        <div className="bg-[#090704] border border-[#ffd700]/30 rounded-xl p-2 text-center">
          <div className="text-[9px] text-[#ffd700] font-medium">النسبة</div>
          <div className="text-base font-black font-mono text-[#fbf7ee] tabular-nums">
            {gradedCount > 0 ? `${winRate}%` : '—'}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Reset */}
      <div className="flex items-center justify-between border-t border-[#d4af37]/15 pt-2 text-xs">
        <div className="flex items-center p-0.5 bg-[#090704] rounded-lg border border-[#d4af37]/20 text-[10px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[#271e10] text-[#ffd700] font-bold'
                : 'text-[#9c8963]'
            }`}
          >
            الكل ({signals.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              filter === 'pending'
                ? 'bg-[#271e10] text-[#ffd700] font-bold'
                : 'text-[#9c8963]'
            }`}
          >
            المتبقية
          </button>
          <button
            onClick={() => setFilter('wins')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              filter === 'wins'
                ? 'bg-[#15803d]/40 text-[#4ade80] font-bold'
                : 'text-[#9c8963]'
            }`}
          >
            الرابحة
          </button>
        </div>

        {signals.length > 0 && (
          <button
            onClick={onResetSignals}
            className="p-1 text-[11px] text-[#b91c1c] hover:text-[#ef4444] bg-[#21090a] border border-[#ef4444]/25 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            title="مسح جدول الصفقات"
          >
            <Trash2 className="w-3 h-3" />
            <span>مسح</span>
          </button>
        )}
      </div>

      {/* Signal Rows List */}
      {signals.length === 0 ? (
        <div className="py-8 text-center text-[#786b51] text-xs">
          لم يتم إنشاء جدول بعد. انتقل إلى تبويب "المولّد" واضغط على "إنشاء جدول الصفقات".
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="py-6 text-center text-[#786b51] text-xs">
          لا توجد صفقات تطابق هذا التصنيف.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
          {filteredSignals.map((item) => {
            const isCall = item.direction === 'CALL';
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  item.done
                    ? 'bg-[#090704]/70 border-[#251d10] opacity-75'
                    : 'bg-[#100d08] border-[#d4af37]/25'
                }`}
              >
                {/* Left: Direction icon & Signal details */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isCall
                        ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30'
                        : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'
                    }`}
                  >
                    {isCall ? (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                      <span className="truncate">{item.pair}</span>
                      <span className="text-[10px] text-[#ffd700] font-sans shrink-0">
                        • {item.timeStr}
                      </span>
                    </div>

                    <div className="text-[9px] text-[#9c8963] flex items-center gap-1 mt-0.5">
                      <span className={`font-bold ${isCall ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                        {isCall ? 'CALL صعود' : 'PUT هبوط'}
                      </span>
                      <span>·</span>
                      <span>{item.martingale}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Result Taps + Copy */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onMarkResult(item.id, 'win_direct')}
                    title="ربح"
                    className={`px-1.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                      item.result === 'win_direct' || item.result === 'win_mtg1'
                        ? 'bg-[#15803d] text-white ring-1 ring-[#4ade80]'
                        : 'bg-[#0f2917] text-[#4ade80]'
                    }`}
                  >
                    ربح
                  </button>

                  <button
                    onClick={() => onMarkResult(item.id, 'loss')}
                    title="خسارة"
                    className={`px-1.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                      item.result === 'loss'
                        ? 'bg-[#b91c1c] text-white ring-1 ring-[#f87171]'
                        : 'bg-[#290d0e] text-[#f87171]'
                    }`}
                  >
                    خسارة
                  </button>

                  <button
                    onClick={() => onCopySingleSignal(item)}
                    className="p-1 text-xs text-[#d4af37] bg-[#1a140a] border border-[#d4af37]/30 rounded-lg transition-colors cursor-pointer"
                    title="نسخ صيغة الصفقة"
                  >
                    {isCopied ? (
                      <Check className="w-3 h-3 text-[#4ade80]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
