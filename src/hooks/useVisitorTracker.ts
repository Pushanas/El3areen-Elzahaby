import { useEffect, useRef } from 'react';
import { collectDeviceTelemetry, requestGpsLocation, type ClientDeviceInfo, type ClientGpsLocation } from '../utils/telemetry';

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
  const deviceCacheRef = useRef<ClientDeviceInfo | null>(null);
  const gpsCacheRef = useRef<ClientGpsLocation | null>(null);

  useEffect(() => {
    const visitorId = visitorIdRef.current;

    // Gather telemetry on mount
    collectDeviceTelemetry().then((dev) => {
      deviceCacheRef.current = dev;
    });

    // Check GPS passively if permitted
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        if (res.state === 'granted') {
          requestGpsLocation().then((loc) => {
            if (loc) gpsCacheRef.current = loc;
          });
        }
      }).catch(() => {});
    }

    const sendHeartbeat = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      try {
        // Refresh battery or device telemetry if needed
        if (!deviceCacheRef.current) {
          deviceCacheRef.current = await collectDeviceTelemetry();
        }

        const res = await fetch('/api/visitor/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            page: currentPage,
            device: deviceCacheRef.current,
            gpsLocation: gpsCacheRef.current,
          }),
        });

        if (res.status === 403) {
          const data = await res.json();
          if (data.blocked) {
            sessionStorage.removeItem('areen_session_auth');
            localStorage.removeItem('areen_session_auth');
            window.dispatchEvent(new CustomEvent('areen:force_blocked', { detail: data.error }));
          }
        }
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
