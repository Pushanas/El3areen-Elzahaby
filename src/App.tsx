import React, { useState, useEffect, useRef } from 'react';
import { Zap, SlidersHorizontal, ListFilter, Calculator, Copy, Send, Sparkles, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { GeneratorPanel } from './components/GeneratorPanel';
import { ActiveSignalCard } from './components/ActiveSignalCard';
import { SignalsTable } from './components/SignalsTable';
import { RiskCalculatorView } from './components/RiskCalculatorView';
import { TelegramExportModal } from './components/TelegramExportModal';
import { ChangePinModal } from './components/ChangePinModal';
import { DEFAULT_PAIRS } from './constants/pairs';
import { GeneratorConfig, SignalItem, SignalResult } from './types';
import { playCountdownBeep, playEntryFanfare } from './utils/audio';
import { checkSessionValidity } from './utils/crypto';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 mins

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('areen_session_auth') === 'true';
  });

  const [kickoutAlert, setKickoutAlert] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('areen_sound_enabled') !== 'false';
  });

  // Mobile Bottom Navigation Tabs: 'live' | 'generator' | 'table' | 'calculator'
  const [activeTab, setActiveTab] = useState<'live' | 'generator' | 'table' | 'calculator'>('live');

  const [availablePairs, setAvailablePairs] = useState<string[]>(() => {
    const saved = localStorage.getItem('areen_custom_pairs');
    return saved ? JSON.parse(saved) : DEFAULT_PAIRS;
  });

  const [config, setConfig] = useState<GeneratorConfig>({
    tradeCount: 9,
    gapMinutes: 5,
    martingale: 'NON MTG',
    timeframe: 'M1',
    formatStyle: 'vip',
    selectedPairs: DEFAULT_PAIRS.slice(0, 10),
  });

  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [countdownText, setCountdownText] = useState<string>('00:00');
  const [isTradeActive, setIsTradeActive] = useState<boolean>(false);
  const [currentSignalIndex, setCurrentSignalIndex] = useState<number>(-1);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lastBeepSecond = useRef<number>(-1);
  const lastActivityTime = useRef<number>(Date.now());

  // Handle Authentication
  useEffect(() => {
    localStorage.removeItem('areen_custom_pin');
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setKickoutAlert(null);
    sessionStorage.setItem('areen_session_auth', 'true');
    lastActivityTime.current = Date.now();
  };

  const handleLockSession = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('areen_session_auth');
  };

  // Cross-device session check: Immediately kicks out any device if the master password was changed
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkInterval = setInterval(async () => {
      const currentVersion = sessionStorage.getItem('areen_session_version');
      if (currentVersion) {
        const isValid = await checkSessionValidity(currentVersion);
        if (!isValid) {
          setIsAuthenticated(false);
          sessionStorage.removeItem('areen_session_auth');
          sessionStorage.removeItem('areen_session_version');
          setKickoutAlert(
            '⚠️ تم تغيير كلمة المرور الموحدة للعرين الذهبي. تم طرد جلستك من هذا الجهاز، يرجى إدخال كلمة المرور الجديدة للمتابعة.'
          );
        }
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [isAuthenticated]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('areen_sound_enabled', String(next));
  };

  // Inactivity guard
  useEffect(() => {
    if (!isAuthenticated) return;

    const onActivity = () => {
      lastActivityTime.current = Date.now();
    };

    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });

    const checker = setInterval(() => {
      if (Date.now() - lastActivityTime.current > INACTIVITY_TIMEOUT_MS) {
        handleLockSession();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      clearInterval(checker);
    };
  }, [isAuthenticated]);

  // Add custom pair
  const handleAddCustomPair = (pairName: string) => {
    if (availablePairs.includes(pairName)) return;
    const updated = [pairName, ...availablePairs];
    setAvailablePairs(updated);
    localStorage.setItem('areen_custom_pairs', JSON.stringify(updated));
    setConfig((prev) => ({
      ...prev,
      selectedPairs: [pairName, ...prev.selectedPairs],
    }));
  };

  // Seeded direction algorithm
  const generateDirection = (pair: string, time: Date, index: number): 'CALL' | 'PUT' => {
    const seed = `${pair}_${time.getHours()}_${time.getMinutes()}_${index}_AREEN`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 2 === 0 ? 'CALL' : 'PUT';
  };

  // Generate schedule
  const handleGenerate = () => {
    if (config.selectedPairs.length === 0) {
      alert('يرجى اختيار زوج واحد على الأقل من أزواج العرين الذهبي');
      return;
    }

    const now = new Date();
    const start = new Date(now);
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() + 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    const newSignals: SignalItem[] = [];

    for (let i = 0; i < config.tradeCount; i++) {
      const tradeTime = new Date(start.getTime() + i * config.gapMinutes * 60 * 1000);
      const pair = config.selectedPairs[i % config.selectedPairs.length];
      const dir = generateDirection(pair, tradeTime, i);

      newSignals.push({
        id: `areen_${tradeTime.getTime()}_${i}`,
        pair,
        time: tradeTime,
        timeStr: `${pad(tradeTime.getHours())}:${pad(tradeTime.getMinutes())}`,
        direction: dir,
        timeframe: config.timeframe,
        martingale: config.martingale,
        done: false,
        result: 'pending',
      });
    }

    setSignals(newSignals);
    setActiveTab('live'); // Automatically switch to the live active trade tab!
  };

  // Timer loop for active trade detection & countdown
  useEffect(() => {
    if (signals.length === 0) {
      setCountdownText('00:00');
      setIsTradeActive(false);
      setCurrentSignalIndex(-1);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const pad = (n: number) => String(n).padStart(2, '0');

      setSignals((prev) =>
        prev.map((s) => {
          const isDone = now >= s.time.getTime() + 60 * 1000;
          if (isDone !== s.done) {
            return { ...s, done: isDone };
          }
          return s;
        })
      );

      const idx = signals.findIndex((s) => !s.done && s.time.getTime() + 60 * 1000 > now);

      if (idx === -1) {
        setCountdownText('00:00');
        setIsTradeActive(false);
        setCurrentSignalIndex(-1);
        return;
      }

      setCurrentSignalIndex(idx);
      const activeSig = signals[idx];
      const timeDiffMs = activeSig.time.getTime() - now;

      if (timeDiffMs > 0) {
        setIsTradeActive(false);
        const totalSec = Math.ceil(timeDiffMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setCountdownText(`${pad(mins)}:${pad(secs)}`);

        if (soundEnabled && totalSec <= 3 && totalSec > 0 && lastBeepSecond.current !== totalSec) {
          lastBeepSecond.current = totalSec;
          playCountdownBeep(totalSec === 1);
        }
      } else {
        setIsTradeActive(true);
        const candleRemainingMs = activeSig.time.getTime() + 60 * 1000 - now;
        const totalSec = Math.max(0, Math.ceil(candleRemainingMs / 1000));
        setCountdownText(`00:${pad(totalSec)}`);

        if (soundEnabled && totalSec === 60 && lastBeepSecond.current !== 60) {
          lastBeepSecond.current = 60;
          playEntryFanfare();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [signals, soundEnabled]);

  // Mark result
  const handleMarkResult = (id: string, result: SignalResult) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, result } : s))
    );
  };

  // Copy single signal
  const handleCopySingle = async (item: SignalItem) => {
    const text = `⧉ ${item.timeframe};${item.pair.replace('/', '').replace(' OTC', '')}•${item.timeStr};${item.direction}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  // Reset signals
  const handleResetSignals = () => {
    if (window.confirm('هل تريد مسح جدول صفقات العرين الحالي؟')) {
      setSignals([]);
    }
  };

  // Render Login if not authenticated
  if (!isAuthenticated) {
    return <LoginView onSuccess={handleLoginSuccess} kickoutMessage={kickoutAlert} />;
  }

  const currentSignal = currentSignalIndex >= 0 ? signals[currentSignalIndex] : null;

  // Stats calculation
  const winsCount = signals.filter(
    (s) => s.result === 'win_direct' || s.result === 'win_mtg1' || s.result === 'win_mtg2'
  ).length;
  const lossCount = signals.filter((s) => s.result === 'loss').length;
  const gradedCount = winsCount + lossCount;
  const winRate = gradedCount > 0 ? Math.round((winsCount / gradedCount) * 100) : 0;
  const remainingCount = signals.filter((s) => !s.done).length;

  // Next 3 signals preview
  const upcomingSignals = signals
    .filter((s, idx) => idx > currentSignalIndex && !s.done)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#040302] text-[#fbf7ee] flex justify-center selection:bg-[#d4af37]/30 selection:text-[#ffd700]">
      {/* Mobile-Sized Phone Frame (max-w-[480px]) */}
      <div className="w-full max-w-[480px] min-h-screen bg-[#070604] border-x border-[#d4af37]/20 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col relative pb-24">
        {/* Compact Mobile Header */}
        <Header
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onLockSession={handleLockSession}
          onChangePin={() => setIsPinModalOpen(true)}
        />

        {/* Content Container - Tailored for Phone Screen */}
        <main className="flex-1 p-3 space-y-3.5 overflow-y-auto">
          {/* TAB 1: LIVE ACTIVE SIGNAL (الرئيسية / الإشارة الحية) */}
          {activeTab === 'live' && (
            <div className="space-y-3">
              {/* Focal Live Trade Card */}
              <ActiveSignalCard
                currentSignal={currentSignal}
                countdownText={countdownText}
                isTradeActive={isTradeActive}
                onMarkResult={handleMarkResult}
                totalSignals={signals.length}
                remainingSignals={remainingCount}
              />

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-[#100d08] border border-[#d4af37]/20 rounded-xl p-2 text-center">
                  <div className="text-[9px] text-[#9c8963]">إجمالي</div>
                  <div className="text-sm font-bold font-mono text-[#ffd700]">{signals.length}</div>
                </div>
                <div className="bg-[#100d08] border border-[#22c55e]/30 rounded-xl p-2 text-center">
                  <div className="text-[9px] text-[#4ade80]">رابحة</div>
                  <div className="text-sm font-bold font-mono text-[#22c55e]">{winsCount}</div>
                </div>
                <div className="bg-[#100d08] border border-[#ef4444]/30 rounded-xl p-2 text-center">
                  <div className="text-[9px] text-[#f87171]">خاسرة</div>
                  <div className="text-sm font-bold font-mono text-[#ef4444]">{lossCount}</div>
                </div>
                <div className="bg-[#100d08] border border-[#ffd700]/30 rounded-xl p-2 text-center">
                  <div className="text-[9px] text-[#ffd700]">النسبة</div>
                  <div className="text-sm font-bold font-mono text-white">
                    {gradedCount > 0 ? `${winRate}%` : '—'}
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={signals.length === 0}
                  className="py-2.5 px-3 rounded-xl font-bold text-xs bg-[#1f170c] hover:bg-[#2b2010] text-[#ffd700] border border-[#d4af37]/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5 text-[#229ED9]" />
                  <span>تصدير للتيليجرام</span>
                </button>

                <button
                  onClick={() => setActiveTab('generator')}
                  className="py-2.5 px-3 rounded-xl font-bold text-xs bg-[#ffd700] text-[#080705] hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{signals.length === 0 ? 'إنشاء جدول صفقات' : 'تعديل الصفقات'}</span>
                </button>
              </div>

              {/* Upcoming 3 Signals Sneak-Peek */}
              {upcomingSignals.length > 0 && (
                <div className="bg-[#0c0906] border border-[#d4af37]/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-[#d4af37]/15 pb-1.5">
                    <span className="font-bold text-[#e0c98f] text-[11px]">
                      الصفقات التالية في العرين:
                    </span>
                    <button
                      onClick={() => setActiveTab('table')}
                      className="text-[10px] text-[#ffd700] hover:underline cursor-pointer"
                    >
                      عرض الجدول الكامل ({signals.length}) ←
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {upcomingSignals.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#140f09] border border-[#261d10] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.direction === 'CALL' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
                            }`}
                          />
                          <span className="font-mono font-bold text-white text-[11px]">
                            {item.pair}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#d4af37] font-mono">
                            {item.timeStr}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              item.direction === 'CALL' ? 'text-[#4ade80]' : 'text-[#f87171]'
                            }`}
                          >
                            {item.direction === 'CALL' ? 'صعود CALL' : 'هبوط PUT'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GENERATOR (المولّد) */}
          {activeTab === 'generator' && (
            <GeneratorPanel
              config={config}
              onChangeConfig={setConfig}
              availablePairs={availablePairs}
              onAddCustomPair={handleAddCustomPair}
              onGenerate={handleGenerate}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              hasSchedule={signals.length > 0}
            />
          )}

          {/* TAB 3: SIGNALS TABLE (الجدول الكامل) */}
          {activeTab === 'table' && (
            <SignalsTable
              signals={signals}
              onMarkResult={handleMarkResult}
              onResetSignals={handleResetSignals}
              onCopySingleSignal={handleCopySingle}
              copiedId={copiedId}
            />
          )}

          {/* TAB 4: RISK CALCULATOR (إدارة رأس المال) */}
          {activeTab === 'calculator' && <RiskCalculatorView />}
        </main>

        {/* Fixed Mobile Bottom Tab Bar (Thumb Zone) */}
        <nav className="fixed bottom-0 max-w-[480px] w-full bg-[#0a0805]/95 backdrop-blur-md border-t border-[#d4af37]/25 z-40 px-2 py-1.5 shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
          <div className="grid grid-cols-4 items-center gap-1">
            {/* Tab 1: Live */}
            <button
              onClick={() => setActiveTab('live')}
              className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <Zap className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">الإشارة الحية</span>
            </button>

            {/* Tab 2: Generator */}
            <button
              onClick={() => setActiveTab('generator')}
              className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'generator'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">المولّد</span>
            </button>

            {/* Tab 3: Table */}
            <button
              onClick={() => setActiveTab('table')}
              className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <ListFilter className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">الجدول ({signals.length})</span>
            </button>

            {/* Tab 4: Calculator */}
            <button
              onClick={() => setActiveTab('calculator')}
              className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'calculator'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <Calculator className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">الحاسبة</span>
            </button>
          </div>
        </nav>

        {/* Modals (Compact & Phone-optimized) */}
        <TelegramExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          signals={signals}
          martingale={config.martingale}
        />

        <ChangePinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
        />
      </div>
    </div>
  );
}
