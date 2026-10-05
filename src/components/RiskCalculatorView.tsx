import React, { useState } from 'react';
import { Calculator, ShieldCheck, DollarSign, Percent, TrendingUp } from 'lucide-react';

export const RiskCalculatorView: React.FC = () => {
  const [balance, setBalance] = useState<number>(500);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [multiplier, setMultiplier] = useState<number>(2.2);
  const [payoutPercent, setPayoutPercent] = useState<number>(85);

  const baseStake = Math.max(1, Math.round(balance * (riskPercent / 100) * 10) / 10);
  const mtg1Stake = Math.round(baseStake * multiplier * 10) / 10;
  const mtg2Stake = Math.round(mtg1Stake * multiplier * 10) / 10;

  const totalRiskMtg1 = Math.round((baseStake + mtg1Stake) * 10) / 10;
  const totalRiskMtg2 = Math.round((baseStake + mtg1Stake + mtg2Stake) * 10) / 10;

  const profitBase = Math.round(baseStake * (payoutPercent / 100) * 10) / 10;
  const netProfitMtg1 = Math.round((mtg1Stake * (payoutPercent / 100) - baseStake) * 10) / 10;

  return (
    <div className="bg-gradient-to-b from-[#151009] to-[#0e0b07] border border-[#d4af37]/25 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4">
      <div className="flex items-center gap-2 border-b border-[#d4af37]/15 pb-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#271e10] border border-[#d4af37]/40 flex items-center justify-center text-[#ffd700]">
          <Calculator className="w-3.5 h-3.5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#fbf7ee]">
            حاسبة إدارة رأس المال (Money Management)
          </h2>
          <p className="text-[10px] text-[#9c8963]">
            حساب دقيق لمبالغ الدخول والمضاعفات لحماية حسابك من التصفير
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-2 text-right">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#baa274]">
            رأس المال ($)
          </label>
          <input
            type="number"
            min={10}
            max={100000}
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value) || 0)}
            className="w-full py-1.5 px-2.5 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-sm focus:outline-none focus:border-[#ffd700]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#baa274]">
            المخاطرة لكل صفقة (%)
          </label>
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={riskPercent}
            onChange={(e) => setRiskPercent(Number(e.target.value) || 0)}
            className="w-full py-1.5 px-2.5 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-sm focus:outline-none focus:border-[#ffd700]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#baa274]">
            معامل المضاعفة (MTG)
          </label>
          <select
            value={multiplier}
            onChange={(e) => setMultiplier(Number(e.target.value))}
            className="w-full py-1.5 px-2 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-[11px] font-semibold focus:outline-none focus:border-[#ffd700]"
          >
            <option value="2.0">x2.0 (قياسي)</option>
            <option value="2.2">x2.2 (تعويض + ربح)</option>
            <option value="2.5">x2.5 (هجومي)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#baa274]">
            عائد البروكر (%)
          </label>
          <input
            type="number"
            min={50}
            max={98}
            value={payoutPercent}
            onChange={(e) => setPayoutPercent(Number(e.target.value) || 85)}
            className="w-full py-1.5 px-2.5 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-sm focus:outline-none focus:border-[#ffd700]"
          />
        </div>
      </div>

      {/* Calculations */}
      <div className="p-3 rounded-xl bg-[#080603] border border-[#d4af37]/25 space-y-2.5">
        <div className="text-[11px] font-bold text-[#ffd700] border-b border-[#d4af37]/15 pb-1.5 flex items-center justify-between">
          <span>مبالغ الدخول المحسوبة:</span>
          <span className="font-mono text-white">${balance}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="p-2 rounded-lg bg-[#140f07] border border-[#d4af37]/20">
            <div className="text-[9px] text-[#9c8963] font-semibold">الصفقة 1</div>
            <div className="text-sm font-black font-mono text-[#ffd700] mt-0.5">
              ${baseStake}
            </div>
            <div className="text-[8px] text-[#68d391]">
              ربح: +${profitBase}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#140f07] border border-[#d4af37]/20">
            <div className="text-[9px] text-[#9c8963] font-semibold">MTG 1</div>
            <div className="text-sm font-black font-mono text-[#f6ad55] mt-0.5">
              ${mtg1Stake}
            </div>
            <div className="text-[8px] text-[#68d391]">
              صافي: +${netProfitMtg1}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#140f07] border border-[#d4af37]/20">
            <div className="text-[9px] text-[#9c8963] font-semibold">MTG 2</div>
            <div className="text-sm font-black font-mono text-[#fc8181] mt-0.5">
              ${mtg2Stake}
            </div>
            <div className="text-[8px] text-[#baa274]">
              أقصى حد
            </div>
          </div>
        </div>

        <div className="text-[10px] text-[#a99773] space-y-0.5 pt-1">
          <div className="flex justify-between">
            <span>إجمالي المخاطرة مع MTG 1:</span>
            <span className="font-mono font-bold text-white">${totalRiskMtg1} ({(totalRiskMtg1 / balance * 100).toFixed(1)}%)</span>
          </div>
          <div className="flex justify-between">
            <span>إجمالي المخاطرة مع MTG 2:</span>
            <span className="font-mono font-bold text-white">${totalRiskMtg2} ({(totalRiskMtg2 / balance * 100).toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-[#1c1409] border border-[#d4af37]/20 flex items-start gap-2 text-[11px] text-[#cfb780]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#ffd700] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          نصيحة العرين: حدد هدفك اليومي بربح 5% إلى 10% كحد أقصى، وتوقف فوراً إذا حققت هدفك لتأمين أرباحك في منصات التداول.
        </p>
      </div>
    </div>
  );
};
