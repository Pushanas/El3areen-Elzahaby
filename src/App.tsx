import React, { useState, useEffect, useRef } from 'react';
import { Zap, SlidersHorizontal, ListFilter, Calculator, Copy, Send, Sparkles, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight, Timer } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { GeneratorPanel } from './components/GeneratorPanel';
import { RangeGeneratorView } from './components/RangeGeneratorView';
import { ActiveSignalCard } from './components/ActiveSignalCard';
import { SignalsTable } from './components/SignalsTable';
import { RiskCalculatorView } from './components/RiskCalculatorView';
import { TelegramExportModal } from './components/TelegramExportModal';
import { ChangePinModal } from './components/ChangePinModal';
import { DEFAULT_PAIRS } from './constants/pairs';
import { GeneratorConfig, SignalItem, SignalResult } from './types';
import { playCountdownBeep, playEntryFanfare } from './utils/audio';
import { checkSessionValidity } from './utils/crypto';
import { formatSingleSignalMono } from './utils/formatter';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 mins

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('areen_session_auth') === 'true';
  });

  const [kickoutAlert, setKickoutAlert] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('areen_sound_enabled') !== 'false';
  });

  // Mobile Bottom Navigation Tabs: 'live' | 'generator' | 'range' | 'table' | 'calculator'
  const [activeTab, setActiveTab] = useState<'live' | 'generator' | 'range' | 'table' | 'calculator'>('live');

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

  const handleForcedKickout = (msg?: string) => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('areen_session_auth');
    sessionStorage.removeItem('areen_session_version');
    localStorage.removeItem('areen_session_auth');
    setSignals([]);
    setKickoutAlert(
      msg || '⚠️ تم تغيير كلمة المرور الموحدة للعرين الذهبي. تم طرد جلستك من هذا الجهاز/المتصفح فوراً، يرجى إدخال كلمة المرور الجديدة للمتابعة.'
    );
  };

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

  // Cross-device and background-tab session check:
  // Immediately kicks out any open Google Chrome tab, background worker, or bot when password changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const verifyActiveSession = async () => {
      const currentVersion = sessionStorage.getItem('areen_session_version');
      if (!currentVersion) {
        handleForcedKickout();
        return;
      }
      const isValid = await checkSessionValidity(currentVersion);
      if (!isValid) {
        handleForcedKickout();
      }
    };

    // 1. Initial check
    verifyActiveSession();

    // 2. High-frequency background interval (every 2 seconds)
    const checkInterval = setInterval(verifyActiveSession, 2000);

    // 3. Tab Visibility & Window Focus (detects when background/open tabs wake up or get interacted with)
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        verifyActiveSession();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);
    window.addEventListener('pageshow', onVisibilityOrFocus);

    // 4. Cross-tab storage synchronization
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'areen_auth_epoch' || e.key === 'areen_auth_hash') {
        verifyActiveSession();
      }
    };
    window.addEventListener('storage', onStorageChange);

    return () => {
      clearInterval(checkInterval);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
      window.removeEventListener('pageshow', onVisibilityOrFocus);
      window.removeEventListener('storage', onStorageChange);
    };
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

  // Import range signals to live tracker
  const handleImportRangeSignals = async (importedSignals: SignalItem[]) => {
    const currentVersion = sessionStorage.getItem('areen_session_version');
    const isValid = await checkSessionValidity(currentVersion);
    if (!isValid) {
      handleForcedKickout();
      return;
    }
    setSignals(importedSignals);
    setActiveTab('live');
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
  const handleGenerate = async () => {
    // Zero-trust verification: Check session with server before generating
    const currentVersion = sessionStorage.getItem('areen_session_version');
    const isValid = await checkSessionValidity(currentVersion);
    if (!isValid) {
      handleForcedKickout();
      return;
    }

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
    const text = formatSingleSignalMono(item);
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

          {/* TAB 2: GENERATOR (المولّد القياسي) */}
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

          {/* TAB 3: RANGE GENERATOR (مولّد النطاق الزمني) */}
          {activeTab === 'range' && (
            <RangeGeneratorView onImportToLiveTracker={handleImportRangeSignals} />
          )}

          {/* TAB 4: SIGNALS TABLE (الجدول الكامل) */}
          {activeTab === 'table' && (
            <SignalsTable
              signals={signals}
              onMarkResult={handleMarkResult}
              onResetSignals={handleResetSignals}
              onCopySingleSignal={handleCopySingle}
              copiedId={copiedId}
            />
          )}

          {/* TAB 5: RISK CALCULATOR (إدارة رأس المال) */}
          {activeTab === 'calculator' && <RiskCalculatorView />}

          {/* Subtle Bottom Platform End Creator Badge */}
          <div className="pt-3 pb-1 flex items-center justify-center">
            <a
              href="https://t.me/Qv_Dev"
              target="_blank"
              rel="noopener noreferrer"
              title="تواصل مع المنشئ والمطور @Qv_Dev"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0d0a06] hover:bg-[#18120a] border border-[#d4af37]/20 hover:border-[#229ED9]/50 text-[#8e7e60] hover:text-[#229ED9] transition-all cursor-pointer shadow-sm group"
            >
              <div className="w-3.5 h-3.5 rounded bg-[#229ED9]/20 group-hover:bg-[#229ED9] text-[#229ED9] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 fill-current">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 7.99-3.44 3.82-1.6 4.61-1.88 5.13-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.04.22z" />
                </svg>
              </div>
              <span className="text-[9px] font-medium tracking-tight">المنشئ والمطور</span>
            </a>
          </div>
        </main>

        {/* Fixed Mobile Bottom Tab Bar (Thumb Zone - 5 Tabs) */}
        <nav className="fixed bottom-0 max-w-[480px] w-full bg-[#0a0805]/95 backdrop-blur-md border-t border-[#d4af37]/25 z-40 px-1.5 py-1.5 shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
          <div className="grid grid-cols-5 items-center gap-1">
            {/* Tab 1: Live */}
            <button
              onClick={() => setActiveTab('live')}
              className={`py-1.5 px-0.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[9px] leading-tight">الحية</span>
            </button>

            {/* Tab 2: Generator */}
            <button
              onClick={() => setActiveTab('generator')}
              className={`py-1.5 px-0.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'generator'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[9px] leading-tight">المولّد</span>
            </button>

            {/* Tab 3: Strategy Range Generator */}
            <button
              onClick={() => setActiveTab('range')}
              className={`py-1.5 px-0.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'range'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <Timer className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[8px] leading-tight font-bold text-center">استراتيجية العرين الذهبي</span>
            </button>

            {/* Tab 4: Table */}
            <button
              onClick={() => setActiveTab('table')}
              className={`py-1.5 px-0.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[9px] leading-tight">الجدول</span>
            </button>

            {/* Tab 5: Calculator */}
            <button
              onClick={() => setActiveTab('calculator')}
              className={`py-1.5 px-0.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                activeTab === 'calculator'
                  ? 'text-[#ffd700] bg-[#22180a] border border-[#d4af37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)] font-bold'
                  : 'text-[#8e7e60] hover:text-[#d4af37]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[9px] leading-tight">الحاسبة</span>
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
