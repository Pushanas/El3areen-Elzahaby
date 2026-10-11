import { useState, useRef, useCallback } from 'react';

interface SecretTriggerOptions {
  requiredTaps?: number;
  timeWindowMs?: number;
  onTrigger: () => void;
}

export function useSecretAdminTrigger({
  requiredTaps = 5,
  timeWindowMs = 2500,
  onTrigger,
}: SecretTriggerOptions) {
  const tapsRef = useRef<number[]>([]);
  const lastTouchTimeRef = useRef<number>(0);
  const [pulseActive, setPulseActive] = useState(false);

  const registerTap = useCallback(() => {
    const now = Date.now();
    // Prune taps outside time window
    tapsRef.current = tapsRef.current.filter((t) => now - t <= timeWindowMs);
    tapsRef.current.push(now);

    if (tapsRef.current.length >= requiredTaps) {
      tapsRef.current = [];
      // Trigger subtle haptic if supported
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([40, 40, 60]);
        }
      } catch {
        // ignore
      }

      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 900);
      onTrigger();
    }
  }, [requiredTaps, timeWindowMs, onTrigger]);

  const handlePointerOrClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent synthetic click event right after touch event
      const now = Date.now();
      if (e.type === 'touchend') {
        lastTouchTimeRef.current = now;
        registerTap();
      } else if (e.type === 'click') {
        if (now - lastTouchTimeRef.current < 450) {
          return; // Ignore duplicated click after touch
        }
        registerTap();
      }
    },
    [registerTap]
  );

  return {
    handleTap: handlePointerOrClick,
    pulseActive,
    tapCount: tapsRef.current.length,
  };
}
