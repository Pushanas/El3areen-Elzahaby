import React, { useState } from 'react';
import { X, Copy, Check, Send, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { SignalItem, MartingaleType, FormatStyle } from '../types';

interface TelegramExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  signals: SignalItem[];
  martingale: MartingaleType;
}

export const TelegramExportModal: React.FC<TelegramExportModalProps> = ({
  isOpen,
  onClose,
  signals,
  martingale,
}) => {
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<FormatStyle>('vip');

  if (!isOpen) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  const generateFormattedText = () => {
    if (signals.length === 0) return 'لا توجد صفقات حالياً';

    if (style === 'minimal') {
      return signals
        .map(
          (s) =>
            `${s.pair.replace('/', '').replace(' OTC', '')} | ${s.timeStr} | ${s.direction} | ${s.martingale}`
        )
        .join('\n');
    }

    if (style === 'standard') {
      const header = `⧉ AL-AREEN SIGNALS (${signals.length} TRADES)\n`;
      const body = signals
        .map((s) => {
          const pairClean = s.pair.replace('/', '').replace(' OTC', '');
          return `M1;${pairClean}•${s.timeStr};${s.direction}`;
        })
        .join('\n');
      const footer = `\n${martingale} • OTC OTC`;
      return header + body + footer;
    }

    // Royal VIP format for "العرين الذهبي"
    const header = `👑 منظومة العرين الذهبي — AL-AREEN AL-DAHABI 👑
⚜️ جدول الصفقات الزمنية الملكية ⚜️
━━━━━━━━━━━━━━━━━━━━
📊 التوقيت: بتوقيت الجهاز المحلي
⚡ عدد الصفقات: ${signals.length} صفقات
⏱️ مدة الشمعة: دقيقة واحدة (M1)
🛡️ نظام المضاعفة: ${martingale}
━━━━━━━━━━━━━━━━━━━━
`;

    const body = signals
      .map((s) => {
        const cleanPair = s.pair.replace('/', '').replace(' OTC', '');
        const arrow = s.direction === 'CALL' ? '🟢 صعود CALL' : '🔴 هبوط PUT';
        return `⧉ M1;${cleanPair}•${s.timeStr};${s.direction}  (${arrow})`;
      })
      .join('\n');

    const footer = `
━━━━━━━━━━━━━━━━━━━━
🦁 قواعد العرين الذهبي:
1️⃣ الدخول مع أول ثانية تفتح فيها الشمعة.
2️⃣ الالتزام بإدارة رأس المال (1% إلى 3% كحد أقصى).
3️⃣ تجنب الدخول في أوقات الأخبار الاقتصادية العنيفة.
✨ بالتوفيق للجميع في عرين الأرباح الذهبية ✨`;

    return header + body + footer;
  };

  const textToCopy = generateFormattedText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTelegramShare = () => {
    const encoded = encodeURIComponent(textToCopy);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-[#18130b] to-[#0c0905] border border-[#d4af37]/40 rounded-3xl p-4 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.15)] flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#281e0f] text-[#ffd700] border border-[#d4af37]/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#ffd700]">
                تصدير صفقات العرين الذهبي
              </h3>
              <p className="text-[10px] text-[#9c8963]">
                صيغ جاهزة للنشر في قنوات التيليجرام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9c8963] hover:text-white hover:bg-[#20180c] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Style Selector */}
        <div className="flex items-center gap-1.5 mt-3 text-[11px] overflow-x-auto pb-1">
          <span className="text-[#a49169] shrink-0 font-semibold">التنسيق:</span>
          <button
            onClick={() => setStyle('vip')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              style === 'vip'
                ? 'bg-[#ffd700] text-[#080705] shadow-sm'
                : 'bg-[#151009] text-[#baa274] border border-[#d4af37]/20 hover:text-white'
            }`}
          >
            👑 مزخرف VIP
          </button>
          <button
            onClick={() => setStyle('standard')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              style === 'standard'
                ? 'bg-[#ffd700] text-[#080705] shadow-sm'
                : 'bg-[#151009] text-[#baa274] border border-[#d4af37]/20 hover:text-white'
            }`}
          >
            📋 كوتيكس قياسي
          </button>
          <button
            onClick={() => setStyle('minimal')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              style === 'minimal'
                ? 'bg-[#ffd700] text-[#080705] shadow-sm'
                : 'bg-[#151009] text-[#baa274] border border-[#d4af37]/20 hover:text-white'
            }`}
          >
            ⚡ بسيط
          </button>
        </div>

        {/* Text Preview Area */}
        <div className="mt-3 flex-1 overflow-hidden flex flex-col">
          <textarea
            readOnly
            value={textToCopy}
            className="w-full flex-1 min-h-[240px] p-3.5 rounded-xl bg-[#070503] border border-[#d4af37]/25 text-[#fbf7ee] font-mono text-xs leading-relaxed resize-none focus:outline-none focus:border-[#ffd700]"
          />
        </div>

        {/* Modal Actions */}
        <div className="mt-4 pt-3 border-t border-[#d4af37]/20 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa8313] text-[#080705] hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#080705]" />
                <span>تم نسخ نص العرين بنجاح!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>⧉ نسخ نص صفقات العرين الآن</span>
              </>
            )}
          </button>

          <button
            onClick={handleTelegramShare}
            className="w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-xs bg-[#229ED9] hover:bg-[#1e8bc0] text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>مشاركة بالتيليجرام</span>
          </button>
        </div>
      </div>
    </div>
  );
};
