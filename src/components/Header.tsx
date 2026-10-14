import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Lock, Clock, KeyRound } from 'lucide-react';
import emblemImage from '../assets/images/areen_brand_logo_1792001509199.jpg';
import { useSecretAdminTrigger } from '../hooks/useSecretAdminTrigger';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLockSession: () => void;
  onChangePin: () => void;
  onSecretAdminTrigger?: () => void;
  broadcast?: {
    enabled: boolean;
    message: string;
    level: 'info' | 'warning' | 'vip' | 'alert';
  } | null;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  onLockSession,
  onChangePin,
  onSecretAdminTrigger,
  broadcast,
}) => {
  const [currentTime, setCurrentTime] = useState('');

  const { handleTap, pulseActive } = useSecretAdminTrigger({
    requiredTaps: 5,
    timeWindowMs: 2500,
    onTrigger: () => {
      onSecretAdminTrigger?.();
    },
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setCurrentTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0c0905]/95 backdrop-blur-md border-b border-[#d4af37]/25 px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        {/* Brand Lockup (Secret 5-Tap Gateway for Admin Entrance) */}
        <div
          onClick={handleTap}
          onTouchEnd={handleTap}
          title="العرين الذهبي"
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div
            className={`w-9 h-9 rounded-xl overflow-hidden border bg-[#1a140a] p-0.5 shrink-0 transition-all duration-300 ${
              pulseActive
                ? 'scale-110 border-[#ffd700] shadow-[0_0_25px_rgba(255,215,0,0.95)] ring-2 ring-[#ffd700]'
                : 'border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
            }`}
          >
            <img
              src={emblemImage}
              alt="شعار العرين الذهبي"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-lg pointer-events-none"
            />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-[#ffd700] leading-none">
              العرين الذهبي
            </div>
            <div className="text-[9px] text-[#baa274] font-mono tracking-wider mt-0.5 font-bold">
              AL-AREEN VIP
            </div>
          </div>
        </div>

        {/* Live Clock + Actions */}
        <div className="flex items-center gap-1.5">
          {/* Live Clock */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#140f07] border border-[#d4af37]/20 text-[11px] font-mono text-[#ffd700] tabular-nums">
            <Clock className="w-3 h-3 text-[#d4af37]" />
            <span>{currentTime || '--:--:--'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل تنبيهات 3-2-1'}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[#20180a] text-[#ffd700] border-[#d4af37]/40 shadow-[0_0_8px_rgba(212,175,55,0.2)]'
                : 'bg-[#120e08] text-[#716143] border-[#312513]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Change PIN */}
          <button
            onClick={onChangePin}
            title="تغيير رمز الأمان"
            className="p-1.5 rounded-lg bg-[#151009] hover:bg-[#20180c] text-[#d4af37] border border-[#d4af37]/25 transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          {/* Lock App */}
          <button
            onClick={onLockSession}
            title="قفل جلسة العرين"
            className="p-1.5 rounded-lg bg-[#21110a] hover:bg-[#32170f] text-[#ff8c42] border border-[#ff8c42]/30 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Emergency / VIP Broadcast Ribbon */}
      {broadcast?.enabled && broadcast?.message && (
        <div
          className={`mt-2 py-1.5 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-2 animate-pulse ${
            broadcast.level === 'alert'
              ? 'bg-[#331111] text-[#fca5a5] border-[#ef4444]/50'
              : broadcast.level === 'warning'
              ? 'bg-[#33220a] text-[#fde047] border-[#eab308]/50'
              : 'bg-[#221808] text-[#ffd700] border-[#d4af37]/60 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs">📢</span>
            <span className="truncate">{broadcast.message}</span>
          </div>
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
            {broadcast.level === 'vip' ? 'VIP' : 'تنبيه'}
          </span>
        </div>
      )}
    </header>
  );
};
