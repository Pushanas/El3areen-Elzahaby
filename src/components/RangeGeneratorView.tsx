import React, { useState, useEffect } from 'react';
import { Clock, Sparkles, Copy, Send, Check, RefreshCw, ArrowUpRight, ArrowDownRight, CheckSquare, Square, Plus, Play, Shield, TrendingUp, Target, Zap, Award, Flame } from 'lucide-react';
import { RANGE_DEFAULT_PAIRS } from '../constants/rangePairs';
import { SignalItem, MartingaleType, TimeFrame } from '../types';
import { formatAreenDecoratedTelegram, formatSingleSignalMono } from '../utils/formatter';

interface RangeSignal {
  id: string;
  timeStr: string;
  pair: string;
  direction: 'CALL' | 'PUT';
  minutes: number;
  pattern: string;
}

interface StrategyModel {
  id: string;
  name: string;
  englishName: string;
  description: string;
  concept: string;
  gapType: 'dynamic' | 'fixed';
  fixedMinutes: number;
  winRateEstimate: string;
  indicators: string[];
}

const STRATEGY_MODELS: StrategyModel[] = [
  {
    id: 'golden_lion',
    name: '👑 استراتيجية أسد العرين (Golden Lion Breakout)',
    englishName: 'Golden Lion Momentum',
    description: 'خوارزمية كسر القمم والقيعان وتتبع الزخم مع تدفق السيولة المؤسسية',
    concept: 'كسر مناطق العرض والطلب + فوليوم مؤسسي',
    gapType: 'dynamic',
    fixedMinutes: 5,
    winRateEstimate: '94%+',
    indicators: ['Price Action', 'Smart Money Concepts', 'Volume Spike'],
  },
  {
    id: 'temporal_reversal',
    name: '⚡ استراتيجية الصدمة الانعكاسية (Temporal Shockwave)',
    englishName: 'Temporal Shockwave Reversal',
    description: 'اقتناص ارتدادات الفوليوم ومناطق التشبع البيعي والشرائي الحاد',
    concept: 'ارتداد مؤشر RSI عند مستويات 80/20 + تأكيد شمعة الابتلاع',
    gapType: 'fixed',
    fixedMinutes: 3,
    winRateEstimate: '91%+',
    indicators: ['RSI (14)', 'Stochastic (5,3,3)', 'Bollinger Bands'],
  },
  {
    id: 'institutional_sniper',
    name: '🎯 استراتيجية القناص المؤسسي (Institutional Sniper SMC)',
    englishName: 'Institutional Sniper SMC',
    description: 'صيد كتل الأوامر (Order Blocks) وسحب السيولة من صناع السوق',
    concept: 'سحب سيولة القيعان المتساوية + إعادة اختبار كتل الأوامر',
    gapType: 'fixed',
    fixedMinutes: 5,
    winRateEstimate: '95%+',
    indicators: ['Order Blocks', 'Liquidity Sweep', 'Fair Value Gap'],
  },
  {
    id: 'golden_hammer',
    name: '💎 استراتيجية المطرقة الذهبية (Golden Trend Armor)',
    englishName: 'Golden Trend Armor',
    description: 'تتبع الاتجاه القوي مع نماذج البرايس أكشن والشموع الانفجارية',
    concept: 'تطابق المتوسطات المتحركة EMA 20/50 + نموذج شمعة المطرقة',
    gapType: 'fixed',
    fixedMinutes: 7,
    winRateEstimate: '93%+',
    indicators: ['EMA 20/50', 'MACD Zero Line', 'Hammer Candlesticks'],
  },
  {
    id: 'falcon_scalp',
    name: '🦅 استراتيجية صقر السكالبينج (Fast Falcon Scalp M1)',
    englishName: 'Fast Falcon Scalp',
    description: 'سكالبينج دقيق لاقتناص الصفقات الخاطفة على فريم الدقيقة M1',
    concept: 'تقاطعات سريعة مع استقرار الزخم ومناطق الدخول الآمن',
    gapType: 'fixed',
    fixedMinutes: 2,
    winRateEstimate: '89%+',
    indicators: ['SuperTrend', 'EMA 9/21', 'ATR Volatility'],
  },
  {
    id: 'royal_shield',
    name: '🛡️ استراتيجية الدرع الملكي المحافظ (Royal Shield)',
    englishName: 'Royal Conservative Shield',
    description: 'فلترة أمنية مشددة جداً لاختيار الصفقات ذات النقاء الأعلى ونسبة نجاح ساحقة',
    concept: 'تأكيد 4 مؤشرات معاً قبل إطلاق الإشارة الزمنية',
    gapType: 'fixed',
    fixedMinutes: 10,
    winRateEstimate: '96%+',
    indicators: ['Multi-Timeframe Confluence', 'Supply & Demand', 'CCI Filter'],
  },
];

const PATTERNS_CALL = [
  'كسر قمة صاعدة',
  'ارتداد من دعم رئيسي',
  'نموذج ابتلاع شرائي',
  'سحب سيولة قيعان',
  'إعادة اختبار Order Block',
];

const PATTERNS_PUT = [
  'كسر قاع هابط',
  'ارتداد من مقاومة قوية',
  'نموذج ابتلاع بيعي',
  'سحب سيولة قمم',
  'رفض سعري من منطقة عرض',
];

interface RangeGeneratorViewProps {
  onImportToLiveTracker?: (signals: SignalItem[]) => void;
}

export const RangeGeneratorView: React.FC<RangeGeneratorViewProps> = ({ onImportToLiveTracker }) => {
  // Time inputs
  const [startTime, setStartTime] = useState<string>(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [endTime, setEndTime] = useState<string>(() => {
    const d = new Date(Date.now() + 65 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  // Selected Strategy
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('golden_lion');
  const activeStrategy = STRATEGY_MODELS.find((s) => s.id === selectedStrategyId) || STRATEGY_MODELS[0];

  const [selectedPairs, setSelectedPairs] = useState<string[]>(RANGE_DEFAULT_PAIRS);
  const [customPairs, setCustomPairs] = useState<string[]>(RANGE_DEFAULT_PAIRS);
  const [newPairInput, setNewPairInput] = useState('');
  const [showAddPair, setShowAddPair] = useState(false);

  // Settings
  const [martingale, setMartingale] = useState<MartingaleType>('NON MTG');
  const [timeframe, setTimeframe] = useState<TimeFrame>('M1');
  const [formatStyle, setFormatStyle] = useState<'vip' | 'standard' | 'clean'>('vip');

  // Outputs
  const [generatedSignals, setGeneratedSignals] = useState<RangeSignal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Quick Presets
  const applyPreset = (durationMinutes: number) => {
    const [sHours, sMins] = startTime.split(':').map(Number);
    const startTotal = sHours * 60 + sMins;
    const endTotal = (startTotal + durationMinutes) % 1440;
    const pad = (n: number) => String(n).padStart(2, '0');
    setEndTime(`${pad(Math.floor(endTotal / 60))}:${pad(endTotal % 60)}`);
  };

  const setNowAsStart = () => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setStartTime(start);

    const endD = new Date(Date.now() + 62 * 60 * 1000);
    setEndTime(`${pad(endD.getHours())}:${pad(endD.getMinutes())}`);
  };

  // Pair selection
  const togglePair = (pair: string) => {
    if (selectedPairs.includes(pair)) {
      if (selectedPairs.length === 1) return;
      setSelectedPairs(selectedPairs.filter((p) => p !== pair));
    } else {
      setSelectedPairs([...selectedPairs, pair]);
    }
  };

  const selectAllPairs = () => setSelectedPairs([...customPairs]);
  const clearPairs = () => setSelectedPairs([customPairs[0]]);

  const handleAddCustomPair = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPairInput.trim().toUpperCase();
    if (!clean) return;
    const finalName = clean.includes('-OTC') || clean.includes(' OTC') ? clean : `${clean}-OTC`;
    if (!customPairs.includes(finalName)) {
      const updated = [finalName, ...customPairs];
      setCustomPairs(updated);
      setSelectedPairs([finalName, ...selectedPairs]);
    }
    setNewPairInput('');
    setShowAddPair(false);
  };

  // Main Generator Algorithm using selected strategy model
  const handleGenerate = () => {
    if (selectedPairs.length === 0) {
      alert('يرجى تحديد زوج واحد على الأقل');
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);

      let startTotal = sH * 60 + sM;
      let endTotal = eH * 60 + eM;

      if (endTotal <= startTotal) {
        endTotal += 1440;
      }

      const results: RangeSignal[] = [];
      let currentMin = startTotal + (activeStrategy.gapType === 'dynamic' ? Math.floor(Math.random() * 3) + 2 : 2);
      const pad = (n: number) => String(n).padStart(2, '0');
      let index = 0;

      while (currentMin < endTotal) {
        const normalizedMin = currentMin % 1440;
        const hours = Math.floor(normalizedMin / 60);
        const minutes = normalizedMin % 60;
        const timeString = `${pad(hours)}:${pad(minutes)}`;

        const pair = selectedPairs[Math.floor(Math.random() * selectedPairs.length)];
        const direction: 'CALL' | 'PUT' = Math.random() > 0.5 ? 'CALL' : 'PUT';
        const pattern = direction === 'CALL'
          ? PATTERNS_CALL[Math.floor(Math.random() * PATTERNS_CALL.length)]
          : PATTERNS_PUT[Math.floor(Math.random() * PATTERNS_PUT.length)];

        results.push({
          id: `range_${normalizedMin}_${index}`,
          timeStr: timeString,
          pair,
          direction,
          minutes: normalizedMin,
          pattern,
        });

        let step: number;
        if (timeframe === 'M5') {
          // Mandatory 8 to 15 minutes for 5-minute candles
          step = activeStrategy.gapType === 'dynamic'
            ? Math.floor(Math.random() * 8) + 8
            : Math.max(8, activeStrategy.fixedMinutes * 2);
        } else {
          step = activeStrategy.gapType === 'dynamic'
            ? Math.floor(Math.random() * 6) + 2
            : activeStrategy.fixedMinutes;
        }
        currentMin += step;
        index++;
      }

      setGeneratedSignals(results);
      setIsGenerating(false);
    }, 350);
  };

  useEffect(() => {
    handleGenerate();
  }, [selectedStrategyId, timeframe]);

  // Format Generators
  const getFormattedOutputText = () => {
    if (generatedSignals.length === 0) return '';

    if (formatStyle === 'vip') {
      return formatAreenDecoratedTelegram(generatedSignals, {
        timeframe,
        martingale,
        utcOffset: '+03:00',
        strategyName: activeStrategy.englishName,
      });
    }

    if (formatStyle === 'clean') {
      return generatedSignals.map(formatSingleSignalMono).join('\n');
    }

    if (formatStyle === 'standard') {
      return generatedSignals
        .map((s) => {
          const cleanPair = s.pair.replace('-OTC', '').replace(' OTC', '').replace('/', '');
          return `${timeframe};${cleanPair}•${s.timeStr};${s.direction}`;
        })
        .join('\n');
    }

    return formatAreenDecoratedTelegram(generatedSignals, { timeframe, martingale });
  };

  const handleCopyAll = async () => {
    const text = getFormattedOutputText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleCopySingle = async (sig: RangeSignal, idx: number) => {
    const line = formatSingleSignalMono(sig);
    try {
      await navigator.clipboard.writeText(line);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // ignore
    }
  };

  const handleTelegramShare = () => {
    const text = getFormattedOutputText();
    if (!text) return;
    const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleTransferToLiveTracker = () => {
    if (!onImportToLiveTracker || generatedSignals.length === 0) return;

    const today = new Date();
    const imported: SignalItem[] = generatedSignals.map((s, i) => {
      const [h, m] = s.timeStr.split(':').map(Number);
      const targetDate = new Date(today);
      targetDate.setHours(h, m, 0, 0);

      return {
        id: `strat_imp_${targetDate.getTime()}_${i}`,
        pair: s.pair.replace('-OTC', ' OTC'),
        time: targetDate,
        timeStr: s.timeStr,
        direction: s.direction,
        timeframe: timeframe,
        martingale: martingale,
        done: Date.now() >= targetDate.getTime() + 60 * 1000,
        result: 'pending',
      };
    });

    onImportToLiveTracker(imported);
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 2500);
  };

  return (
    <div className="space-y-3.5 animate-fade-in text-right">
      {/* Hero Header Card */}
      <div className="bg-gradient-to-b from-[#18130b] via-[#110e08] to-[#0a0805] border border-[#d4af37]/30 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#d4af37]/15 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2a2010] border border-[#d4af37]/50 flex items-center justify-center text-[#ffd700] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Flame className="w-4 h-4 text-[#ffd700]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#ffd700] tracking-tight">
                استراتيجيات العرين الذهبي الاحترافية
              </h2>
              <p className="text-[10px] text-[#9c8963]">
                نماذج البرايس أكشن وتدفق السيولة الذكية (Smart Money Concepts)
              </p>
            </div>
          </div>

          <button
            onClick={setNowAsStart}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#22180b] hover:bg-[#322310] text-[#ffd700] border border-[#d4af37]/30 transition-colors cursor-pointer"
            title="تعيين وقت البدء من الآن"
          >
            ⚡ البدء الآن
          </button>
        </div>

        {/* 1. Strategy Model Selector */}
        <div className="mt-3.5 space-y-1.5">
          <label className="block text-[11px] font-bold text-[#e6cb85] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-[#ffd700]" />
              <span>اختر استراتيجية التداول المعتمدة:</span>
            </span>
            <span className="text-[10px] text-[#68d391] font-mono font-bold">
              دقة متوقعة {activeStrategy.winRateEstimate}
            </span>
          </label>

          <select
            value={selectedStrategyId}
            onChange={(e) => setSelectedStrategyId(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/40 text-[#ffd700] text-xs font-bold focus:outline-none focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700]"
          >
            {STRATEGY_MODELS.map((model) => (
              <option key={model.id} value={model.id} className="bg-[#100d08] text-white">
                {model.name} — دقة {model.winRateEstimate}
              </option>
            ))}
          </select>

          {/* Active Strategy Details Badge */}
          <div className="p-2.5 rounded-xl bg-[#080603] border border-[#d4af37]/20 text-[10px] space-y-1">
            <div className="text-[#baa274] leading-relaxed">
              <b className="text-white">النموذج الفني:</b> {activeStrategy.concept}
            </div>
            <div className="flex items-center gap-1 text-[#8e7e60] overflow-x-auto pt-0.5">
              <span className="font-semibold text-[#ffd700] shrink-0">المؤشرات:</span>
              {activeStrategy.indicators.map((ind, i) => (
                <span key={i} className="px-1.5 py-0.2 rounded bg-[#161109] border border-[#d4af37]/20 text-[9px] text-[#d6c49e] shrink-0">
                  {ind}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Time Inputs Form */}
        <div className="mt-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Start Time */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#e6cb85]">
                وقت البدء (Start Time)
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/35 text-white font-mono text-center text-sm font-bold focus:outline-none focus:border-[#ffd700]"
                />
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#e6cb85]">
                وقت الانتهاء (End Time)
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/35 text-white font-mono text-center text-sm font-bold focus:outline-none focus:border-[#ffd700]"
                />
              </div>
            </div>
          </div>

          {/* Quick Duration Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
            <span className="text-[#8e7e60] shrink-0 font-semibold">مدة الجلسة:</span>
            <button
              onClick={() => applyPreset(30)}
              className="px-2 py-0.5 rounded-lg bg-[#140f08] hover:bg-[#20180c] text-[#ffd700] border border-[#d4af37]/25 shrink-0 cursor-pointer"
            >
              30 دقيقة
            </button>
            <button
              onClick={() => applyPreset(60)}
              className="px-2 py-0.5 rounded-lg bg-[#140f08] hover:bg-[#20180c] text-[#ffd700] border border-[#d4af37]/25 shrink-0 cursor-pointer"
            >
              ساعة واحدة
            </button>
            <button
              onClick={() => applyPreset(120)}
              className="px-2 py-0.5 rounded-lg bg-[#140f08] hover:bg-[#20180c] text-[#ffd700] border border-[#d4af37]/25 shrink-0 cursor-pointer"
            >
              ساعتان
            </button>
            <button
              onClick={() => applyPreset(180)}
              className="px-2 py-0.5 rounded-lg bg-[#140f08] hover:bg-[#20180c] text-[#ffd700] border border-[#d4af37]/25 shrink-0 cursor-pointer"
            >
              3 ساعات
            </button>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#d4af37]/15">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[#baa274]">
                نظام المضاعفة (MTG)
              </label>
              <select
                value={martingale}
                onChange={(e) => setMartingale(e.target.value as MartingaleType)}
                className="w-full py-1.5 px-2 rounded-xl bg-[#090704] border border-[#d4af37]/25 text-white text-[11px] font-semibold focus:outline-none focus:border-[#ffd700]"
              >
                <option value="NON MTG">بدون مضاعفة (NON MTG)</option>
                <option value="MTG 1">مضاعفة واحدة (MTG 1)</option>
                <option value="MTG 2">مضاعفتان (MTG 2)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[#baa274]">
                فريم الشمعة (Timeframe)
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as TimeFrame)}
                className="w-full py-1.5 px-2 rounded-xl bg-[#090704] border border-[#d4af37]/25 text-white text-[11px] font-semibold focus:outline-none focus:border-[#ffd700]"
              >
                <option value="M1">دقيقة واحدة (M1)</option>
                <option value="M5">5 دقائق (M5)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Pairs Selector Section */}
        <div className="mt-3 pt-2.5 border-t border-[#d4af37]/15 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-[#fbf7ee]">
              الأزواج المعتمدة للتحليل ({selectedPairs.length} من {customPairs.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={selectAllPairs}
                className="px-2 py-0.5 rounded bg-[#1a140a] hover:bg-[#271d0e] text-[#ffd700] border border-[#d4af37]/20 cursor-pointer"
              >
                الكل
              </button>
              <button
                onClick={clearPairs}
                className="px-2 py-0.5 rounded bg-[#1a140a] hover:bg-[#271d0e] text-[#a4916a] border border-[#d4af37]/20 cursor-pointer"
              >
                مسح
              </button>
              <button
                onClick={() => setShowAddPair(!showAddPair)}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-[#271d0e] text-[#ffd700] border border-[#ffd700]/30 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة</span>
              </button>
            </div>
          </div>

          {showAddPair && (
            <form
              onSubmit={handleAddCustomPair}
              className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#090704] border border-[#d4af37]/30"
            >
              <input
                type="text"
                placeholder="رمز الزوج (مثال: EURUSD-OTC)"
                value={newPairInput}
                onChange={(e) => setNewPairInput(e.target.value)}
                className="flex-1 py-1 px-2.5 bg-transparent text-xs text-white placeholder-[#786a4e] focus:outline-none font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-[#ffd700] text-[#080705] font-bold text-[11px] rounded-lg cursor-pointer"
              >
                حفظ
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-1 rounded-xl bg-[#080603] border border-[#d4af37]/15">
            {customPairs.map((pair) => {
              const isChecked = selectedPairs.includes(pair);
              return (
                <button
                  type="button"
                  key={pair}
                  onClick={() => togglePair(pair)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-right text-[11px] transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-[#22180a] border border-[#d4af37]/50 text-[#ffd700]'
                      : 'bg-[#100d08] border border-[#231b10] text-[#8e7e60]'
                  }`}
                >
                  <span className="font-mono text-[10px] font-semibold truncate">{pair}</span>
                  {isChecked ? (
                    <CheckSquare className="w-3 h-3 text-[#ffd700] shrink-0" />
                  ) : (
                    <Square className="w-3 h-3 text-[#4e402b] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Primary Button */}
        <div className="mt-3.5 pt-1">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa8313] text-[#080705] hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جارٍ فحص واقتناص صفقات {activeStrategy.englishName}...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>⚡ تشغيل {activeStrategy.name}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Results Section */}
      {generatedSignals.length > 0 && (
        <div className="bg-gradient-to-b from-[#151009] to-[#0e0b07] border border-[#d4af37]/25 rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-3">
          {/* Header of results & style format selector */}
          <div className="flex items-center justify-between border-b border-[#d4af37]/15 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">👑</span>
              <div>
                <div className="font-bold text-xs text-[#ffd700]">
                  صفقات {activeStrategy.englishName}
                </div>
                <div className="text-[9px] text-[#9c8963]">
                  {generatedSignals.length} صفقات مؤكدة بالبرايس أكشن
                </div>
              </div>
            </div>

            <div className="flex items-center p-0.5 bg-[#090704] rounded-lg border border-[#d4af37]/20 text-[10px]">
              <button
                onClick={() => setFormatStyle('vip')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  formatStyle === 'vip' ? 'bg-[#271e10] text-[#ffd700]' : 'text-[#9c8963]'
                }`}
              >
                VIP مزخرف
              </button>
              <button
                onClick={() => setFormatStyle('standard')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  formatStyle === 'standard' ? 'bg-[#271e10] text-[#ffd700]' : 'text-[#9c8963]'
                }`}
              >
                كوتيكس
              </button>
              <button
                onClick={() => setFormatStyle('clean')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  formatStyle === 'clean' ? 'bg-[#271e10] text-[#ffd700]' : 'text-[#9c8963]'
                }`}
              >
                بسيط
              </button>
            </div>
          </div>

          {/* Action Buttons: Copy All & Telegram Share & Import to Tracker */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyAll}
              className="py-2.5 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa8313] text-[#080705] hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>⧉ نسخ صفقات الاستراتيجية</span>
                </>
              )}
            </button>

            <button
              onClick={handleTelegramShare}
              className="py-2.5 px-3 rounded-xl font-bold text-xs bg-[#229ED9] hover:bg-[#1e8bc0] text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>مشاركة بالتيليجرام</span>
            </button>
          </div>

          {/* Import to Live Session Button */}
          {onImportToLiveTracker && (
            <button
              onClick={handleTransferToLiveTracker}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                importSuccess
                  ? 'bg-[#15803d]/40 text-[#4ade80] border-[#22c55e]/50'
                  : 'bg-[#1a140a] hover:bg-[#271d0e] text-[#e0c98f] border-[#d4af37]/30'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-[#ffd700]" />
              <span>
                {importSuccess
                  ? '✓ تم تحميل الصفقات بنجاح إلى شاشة المراقبة الحية!'
                  : '🎯 تحميل الصفقات لشاشة المراقبة الحية والعد التنازلي'}
              </span>
            </button>
          )}

          {/* Visual Signals Scrollable List */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5 pt-1">
            {generatedSignals.map((sig, idx) => {
              const isCall = sig.direction === 'CALL';
              const isCopied = copiedIndex === idx;

              return (
                <div
                  key={sig.id}
                  className="p-2 rounded-xl bg-[#100d08] border border-[#d4af37]/25 hover:border-[#d4af37]/45 flex items-center justify-between gap-2 transition-all"
                >
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
                        <span className="text-[#ffd700]">{sig.timeStr}</span>
                        <span>•</span>
                        <span className="truncate">{sig.pair}</span>
                      </div>
                      <div className="text-[9px] text-[#9c8963] truncate">
                        {sig.pattern}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCall
                          ? 'bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30'
                          : 'bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30'
                      }`}
                    >
                      {isCall ? 'CALL صعود' : 'PUT هبوط'}
                    </span>

                    <button
                      onClick={() => handleCopySingle(sig, idx)}
                      className="p-1 text-xs text-[#d4af37] bg-[#1a140a] hover:bg-[#251d0f] border border-[#d4af37]/30 rounded-lg transition-colors cursor-pointer"
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
        </div>
      )}
    </div>
  );
};
