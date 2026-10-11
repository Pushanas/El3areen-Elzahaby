import { useEffect, useRef } from 'react';

const VISITOR_ID_KEY = 'areen_visitor_uuid';

export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id || id.length < 10) {
      id = 'vis_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'vis_fallback_' + Date.now();
  }
}

export function useVisitorTracker(currentPage = '/') {
  const visitorIdRef = useRef<string>(getOrCreateVisitorId());

  useEffect(() => {
    const visitorId = visitorIdRef.current;

    const sendHeartbeat = async () => {
      // Avoid firing when document is hidden to conserve bandwidth and respect battery
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      try {
        await fetch('/api/visitor/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            page: currentPage,
          }),
        });
      } catch {
        // Silently fail on network disconnect
      }
    };

    // 1. Initial heartbeat
    sendHeartbeat();

    // 2. Periodic interval (every 25 seconds)
    const interval = setInterval(sendHeartbeat, 25000);

    // 3. Tab visibility listener
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', sendHeartbeat);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', sendHeartbeat);
    };
  }, [currentPage]);

  return visitorIdRef.current;
}
