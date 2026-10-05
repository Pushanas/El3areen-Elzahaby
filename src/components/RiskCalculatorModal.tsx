import React, { useState } from 'react';
import { X, Calculator, ShieldCheck, DollarSign, Percent, TrendingUp } from 'lucide-react';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [balance, setBalance] = useState<number>(500);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [multiplier, setMultiplier] = useState<number>(2.2);
  const [payoutPercent, setPayoutPercent] = useState<number>(85);

  if (!isOpen) return null;

  const baseStake = Math.max(1, Math.round((balance * (riskPercent / 100)) * 10) / 10);
  const mtg1Stake = Math.round(baseStake * multiplier * 10) / 10;
  const mtg2Stake = Math.round(mtg1Stake * multiplier * 10) / 10;

  const totalRiskNonMtg = baseStake;
  const totalRiskMtg1 = Math.round((baseStake + mtg1Stake) * 10) / 10;
  const totalRiskMtg2 = Math.round((baseStake + mtg1Stake + mtg2Stake) * 10) / 10;

  const profitBase = Math.round(baseStake * (payoutPercent / 100) * 10) / 10;
  const netProfitMtg1 = Math.round((mtg1Stake * (payoutPercent / 100) - baseStake) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#18130b] to-[#0c0905] border border-[#d4af37]/40 rounded-3xl p-5 md:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#281e0f] text-[#ffd700] border border-[#d4af37]/30">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#ffd700]">
                حاسبة إدارة رأس المال — العرين الذهبي
              </h3>
              <p className="text-[11px] text-[#9c8963]">
                حساب دقيق لمبالغ الدخول والمضاعفات لحماية حسابك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9c8963] hover:text-white hover:bg-[#20180c] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-right">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#baa274]">
              إجمالي رأس المال ($)
            </label>
            <input
              type="number"
              min={10}
              max={100000}
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
              className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-sm focus:outline-none focus:border-[#ffd700]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#baa274]">
              نسبة المخاطرة لكل صفقة (%)
            </label>
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.5}
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value) || 0)}
              className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-sm focus:outline-none focus:border-[#ffd700]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#baa274]">
              معامل المضاعفة (Multiplier)
            </label>
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs font-semibold focus:outline-none focus:border-[#ffd700] cursor-pointer"
            >
              <option value="2.0">x2.0 (مضاعفة قياسية)</option>
              <option value="2.2">x2.2 (موصى بها لتعويض العائد)</option>
              <option value="2.5">x2.5 (هجومي)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#baa274]">
              نسبة عائد البروكر (%)
            </label>
            <input
              type="number"
              min={50}
              max={98}
              value={payoutPercent}
              onChange={(e) => setPayoutPercent(Number(e.target.value) || 85)}
              className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-sm focus:outline-none focus:border-[#ffd700]"
            />
          </div>
        </div>

        {/* Calculation Results Card */}
        <div className="mt-5 p-4 rounded-2xl bg-[#080603] border border-[#d4af37]/30 space-y-3">
          <div className="text-xs font-bold text-[#ffd700] border-b border-[#d4af37]/15 pb-2 flex items-center justify-between">
            <span>مبالغ الدخول المحسوبة لصفقات العرين:</span>
            <span className="font-mono text-white">${balance}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Step 1 */}
            <div className="p-2.5 rounded-xl bg-[#140f07] border border-[#d4af37]/20">
              <div className="text-[10px] text-[#9c8963] font-semibold">الصفقة الأساسية</div>
              <div className="text-base font-black font-mono text-[#ffd700] mt-1">
                ${baseStake}
              </div>
              <div className="text-[9px] text-[#68d391] mt-0.5">
                ربح: +${profitBase}
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-2.5 rounded-xl bg-[#140f07] border border-[#d4af37]/20">
              <div className="text-[10px] text-[#9c8963] font-semibold">المضاعفة 1 (MTG1)</div>
              <div className="text-base font-black font-mono text-[#f6ad55] mt-1">
                ${mtg1Stake}
              </div>
              <div className="text-[9px] text-[#68d391] mt-0.5">
                صافي: +${netProfitMtg1}
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-2.5 rounded-xl bg-[#140f07] border border-[#d4af37]/20">
              <div className="text-[10px] text-[#9c8963] font-semibold">المضاعفة 2 (MTG2)</div>
              <div className="text-base font-black font-mono text-[#fc8181] mt-1">
                ${mtg2Stake}
              </div>
              <div className="text-[9px] text-[#baa274] mt-0.5">
                أقصى مخاطرة
              </div>
            </div>
          </div>

          {/* Safety Summary */}
          <div className="pt-2 text-[11px] text-[#a99773] space-y-1">
            <div className="flex justify-between">
              <span>إجمالي المخاطرة مع MTG 1:</span>
              <span className="font-mono font-bold text-white">${totalRiskMtg1} ({(totalRiskMtg1 / balance * 100).toFixed(1)}% من المحفظة)</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي المخاطرة مع MTG 2:</span>
              <span className="font-mono font-bold text-white">${totalRiskMtg2} ({(totalRiskMtg2 / balance * 100).toFixed(1)}% من المحفظة)</span>
            </div>
          </div>
        </div>

        {/* Advice */}
        <div className="mt-4 p-3 rounded-xl bg-[#1c1409] border border-[#d4af37]/20 flex items-start gap-2.5 text-xs text-[#cfb780]">
          <ShieldCheck className="w-4 h-4 text-[#ffd700] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            نصيحة العرين الذهبي: لا تتجاوز أبداً 3 صفقات خاسرة متتالية في جلسة واحدة. توقف فوراً إذا وصلت إلى حد الخسارة اليومي واستأنف في جلسة جديدة بهدوء.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#ffd700] text-[#080705] hover:brightness-110 cursor-pointer"
        >
          تم، تطبيق الخطة في الجلسة
        </button>
      </div>
    </div>
  );
};
