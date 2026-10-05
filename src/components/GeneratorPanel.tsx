import React, { useState } from 'react';
import { Sparkles, CheckSquare, Square, Plus, Copy, Search, Zap } from 'lucide-react';
import { GeneratorConfig, MartingaleType, TimeFrame } from '../types';

interface GeneratorPanelProps {
  config: GeneratorConfig;
  onChangeConfig: (newConfig: GeneratorConfig) => void;
  availablePairs: string[];
  onAddCustomPair: (pairName: string) => void;
  onGenerate: () => void;
  onOpenExportModal: () => void;
  hasSchedule: boolean;
}

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  config,
  onChangeConfig,
  availablePairs,
  onAddCustomPair,
  onGenerate,
  onOpenExportModal,
  hasSchedule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newPairInput, setNewPairInput] = useState('');
  const [showAddPair, setShowAddPair] = useState(false);

  const filteredPairs = availablePairs.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePair = (pair: string) => {
    const isSelected = config.selectedPairs.includes(pair);
    let updated: string[];
    if (isSelected) {
      updated = config.selectedPairs.filter((p) => p !== pair);
    } else {
      updated = [...config.selectedPairs, pair];
    }
    onChangeConfig({ ...config, selectedPairs: updated });
  };

  const selectAll = () => {
    onChangeConfig({ ...config, selectedPairs: [...availablePairs] });
  };

  const clearAll = () => {
    onChangeConfig({ ...config, selectedPairs: [] });
  };

  const handleAddPairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPairInput.trim().toUpperCase();
    if (!clean) return;
    const finalName = clean.includes('OTC') ? clean : `${clean} OTC`;
    onAddCustomPair(finalName);
    setNewPairInput('');
    setShowAddPair(false);
  };

  return (
    <div className="bg-gradient-to-b from-[#151009] to-[#0e0b07] border border-[#d4af37]/25 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4">
      {/* Title & Count Badge */}
      <div className="flex items-center justify-between border-b border-[#d4af37]/15 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#271e10] border border-[#d4af37]/40 flex items-center justify-center text-[#ffd700]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#fbf7ee]">
              إعداد وتوليد الصفقات
            </h2>
            <p className="text-[10px] text-[#9c8963]">
              توليد صفقات زمنية دقيقة لأسواق الـ OTC
            </p>
          </div>
        </div>

        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1e170c] border border-[#d4af37]/30 text-[#e6cb85] font-mono tabular-nums">
          {config.selectedPairs.length} زوج
        </span>
      </div>

      {/* Main Parameters Grid - 2x2 for mobile */}
      <div className="grid grid-cols-2 gap-2.5 text-right">
        {/* Trade Count */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-[#cfb780]">
            عدد الصفقات
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={config.tradeCount}
            onChange={(e) =>
              onChangeConfig({
                ...config,
                tradeCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)),
              })
            }
            className="w-full py-2 px-2.5 rounded-xl bg-[#090704] border border-[#d4af37]/25 text-white font-mono text-center text-sm focus:outline-none focus:border-[#ffd700]"
          />
        </div>

        {/* Gap interval */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-[#cfb780]">
            الفاصل الزمني
          </label>
          <select
            value={config.gapMinutes}
            onChange={(e) =>
              onChangeConfig({ ...config, gapMinutes: parseInt(e.target.value) || 5 })
            }
            className="w-full py-2 px-2 rounded-xl bg-[#090704] border border-[#d4af37]/25 text-white text-[11px] font-semibold focus:outline-none focus:border-[#ffd700]"
          >
            <option value="1">كل دقيقة (M1)</option>
            <option value="2">كل دقيقتين</option>
            <option value="3">كل 3 دقائق</option>
            <option value="5">كل 5 دقائق</option>
            <option value="10">كل 10 دقائق</option>
          </select>
        </div>

        {/* Martingale System */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-[#cfb780]">
            نظام المضاعفة
          </label>
          <select
            value={config.martingale}
            onChange={(e) =>
              onChangeConfig({ ...config, martingale: e.target.value as MartingaleType })
            }
            className="w-full py-2 px-2 rounded-xl bg-[#090704] border border-[#d4af37]/25 text-white text-[11px] font-semibold focus:outline-none focus:border-[#ffd700]"
          >
            <option value="NON MTG">بدون مضاعفة (NON MTG)</option>
            <option value="MTG 1">مضاعفة واحدة (MTG 1)</option>
            <option value="MTG 2">مضاعفتان (MTG 2)</option>
          </select>
        </div>

        {/* Timeframe */}
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-[#cfb780]">
            فريم الشمعة
          </label>
          <select
            value={config.timeframe}
            onChange={(e) =>
              onChangeConfig({ ...config, timeframe: e.target.value as TimeFrame })
            }
            className="w-full py-2 px-2 rounded-xl bg-[#090704] border border-[#d4af37]/25 text-white text-[11px] font-semibold focus:outline-none focus:border-[#ffd700]"
          >
            <option value="M1">دقيقة واحدة (M1)</option>
            <option value="M5">5 دقائق (M5)</option>
          </select>
        </div>
      </div>

      {/* Pairs Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-[#fbf7ee] text-[11px]">
            أزواج العملات (OTC)
          </label>

          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={selectAll}
              className="px-2 py-0.5 rounded bg-[#1a140a] hover:bg-[#271d0e] text-[#ffd700] border border-[#d4af37]/20 cursor-pointer"
            >
              الكل
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-2 py-0.5 rounded bg-[#1a140a] hover:bg-[#271d0e] text-[#a4916a] border border-[#d4af37]/20 cursor-pointer"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={() => setShowAddPair(!showAddPair)}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-[#271d0e] text-[#ffd700] border border-[#ffd700]/30 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة</span>
            </button>
          </div>
        </div>

        {/* Add Custom Pair */}
        {showAddPair && (
          <form
            onSubmit={handleAddPairSubmit}
            className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#090704] border border-[#d4af37]/30"
          >
            <input
              type="text"
              placeholder="مثال: GOLD OTC"
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

        {/* Search Input for Pairs */}
        <div className="relative">
          <input
            type="text"
            placeholder="بحث بين الأزواج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-1.5 px-2.5 pr-7 rounded-xl bg-[#090704] border border-[#d4af37]/20 text-xs text-[#fbf7ee] placeholder-[#736345] focus:outline-none focus:border-[#d4af37]"
          />
          <Search className="w-3 h-3 text-[#887755] absolute right-2 top-1/2 -translate-y-1/2" />
        </div>

        {/* Pairs Grid */}
        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl bg-[#0a0805] border border-[#d4af37]/15">
          {filteredPairs.map((pair) => {
            const isChecked = config.selectedPairs.includes(pair);
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

      {/* Primary Actions */}
      <div className="pt-1 space-y-2">
        <button
          type="button"
          onClick={onGenerate}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa8313] text-[#080705] hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_15px_rgba(212,175,55,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          <span>⚡ إنشاء وتحديث جدول صفقات العرين</span>
        </button>

        {hasSchedule && (
          <button
            type="button"
            onClick={onOpenExportModal}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#1f170c] hover:bg-[#2b2010] text-[#ffd700] border border-[#d4af37]/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>⧉ نسخ وإرسال القائمة (تيليجرام / VIP)</span>
          </button>
        )}
      </div>
    </div>
  );
};
