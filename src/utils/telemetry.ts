/**
 * Al-Areen Golden Den - Client Device Telemetry & Phone Detector
 * استخراج بيانات الهاتف والأجهزة بدقة عالية ورصد موقع GPS
 */

export interface ClientDeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  model: string;
  os: string;
  browser: string;
  screenResolution: string;
  platform: string;
  language: string;
  timezone: string;
  connectionType?: string;
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface ClientGpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

/**
 * التعرف الدقيق على موديل الهاتف من خلال دقة الشاشة ونسبة البكسل ومعلومات المتصفح
 */
function detectPhoneModel(ua: string, width: number, height: number, dpr: number): string {
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // 1. هواتف iPhone (تحديد الموديل بدقة عبر Screen Resolution و Device Pixel Ratio)
  if (isIOS) {
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);

    if (minDim === 430 && maxDim === 932 && dpr >= 3) {
      return 'Apple iPhone 15 Pro Max / 16 Pro Max / 15 Plus';
    }
    if (minDim === 393 && maxDim === 852 && dpr >= 3) {
      return 'Apple iPhone 15 Pro / 15 / 16 Pro';
    }
    if (minDim === 428 && maxDim === 926 && dpr >= 3) {
      return 'Apple iPhone 14 Pro Max / 13 Pro Max / 12 Pro Max';
    }
    if (minDim === 390 && maxDim === 844 && dpr >= 3) {
      return 'Apple iPhone 14 / 13 / 13 Pro / 12 / 12 Pro';
    }
    if (minDim === 375 && maxDim === 812 && dpr >= 3) {
      return 'Apple iPhone 13 mini / 12 mini / 11 Pro / X / XS';
    }
    if (minDim === 414 && maxDim === 896 && dpr >= 2) {
      return dpr >= 3 ? 'Apple iPhone 11 Pro Max / XS Max' : 'Apple iPhone 11 / XR';
    }
    if (minDim === 375 && maxDim === 667) {
      return 'Apple iPhone SE (2nd/3rd Gen) / iPhone 8/7';
    }
    if (/iPad/i.test(ua) || (minDim >= 768 && maxDim >= 1024)) {
      return 'Apple iPad Pro / Air';
    }
    return 'Apple iPhone (iOS Device)';
  }

  // 2. هواتف Android (استخراج الاسم التجاري والموديل من User-Agent)
  if (isAndroid) {
    const androidMatch = ua.match(/Android[^;]+;\s*([^;)]+)\)/i);
    let rawModel = androidMatch ? androidMatch[1].trim() : '';

    rawModel = rawModel.replace(/Build\/.*$/i, '').trim();

    if (/SM-S928/i.test(rawModel)) return 'Samsung Galaxy S24 Ultra';
    if (/SM-S921/i.test(rawModel)) return 'Samsung Galaxy S24';
    if (/SM-S918/i.test(rawModel)) return 'Samsung Galaxy S23 Ultra';
    if (/SM-S908/i.test(rawModel)) return 'Samsung Galaxy S22 Ultra';
    if (/SM-A\d{3}/i.test(rawModel)) return `Samsung Galaxy A-Series (${rawModel})`;
    if (/SM-G\d{3}/i.test(rawModel)) return `Samsung Galaxy (${rawModel})`;
    if (/Pixel 8/i.test(rawModel)) return 'Google Pixel 8';
    if (/Pixel 7/i.test(rawModel)) return 'Google Pixel 7';
    if (/Redmi/i.test(rawModel)) return `Xiaomi Redmi (${rawModel})`;
    if (/POCO/i.test(rawModel)) return `Xiaomi Poco (${rawModel})`;
    if (/CPH\d{4}/i.test(rawModel)) return `Oppo Smartphone (${rawModel})`;
    if (/RMX\d{4}/i.test(rawModel)) return `Realme Smartphone (${rawModel})`;
    if (/V\d{4}/i.test(rawModel)) return `Vivo Smartphone (${rawModel})`;

    if (rawModel && rawModel.length > 2 && rawModel.length < 35) {
      return `Android Device (${rawModel})`;
    }
    return 'Android Smartphone';
  }

  // 3. أجهزة سطح المكتب واللابتوب
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Apple Mac / MacBook';
  if (/Windows NT 10.0/i.test(ua)) return 'Windows 10 / 11 PC';
  if (/Windows NT/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux Workstation';

  return 'Desktop / Laptop Browser';
}

/**
 * تحديد نظام التشغيل
 */
function detectOperatingSystem(ua: string): string {
  if (/iPhone OS (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/iPhone OS (\d+[._]\d+)/i);
    return `iOS ${match ? match[1].replace('_', '.') : ''}`;
  }
  if (/iPad.*OS (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/OS (\d+[._]\d+)/i);
    return `iPadOS ${match ? match[1].replace('_', '.') : ''}`;
  }
  if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/i);
    return `Android ${match ? match[1] : ''}`;
  }
  if (/Windows NT 10.0/i.test(ua)) return 'Windows 11 / 10';
  if (/Windows NT 6.3/i.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6.1/i.test(ua)) return 'Windows 7';
  if (/Mac OS X (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/i);
    return `macOS ${match ? match[1].replace('_', '.') : ''}`;
  }
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
}

/**
 * تحديد المتصفح
 */
function detectBrowser(ua: string): string {
  if (/Edg\/(\d+)/i.test(ua)) {
    const m = ua.match(/Edg\/(\d+)/i);
    return `Microsoft Edge ${m ? m[1] : ''}`;
  }
  if (/Chrome\/(\d+)/i.test(ua) && !/Edg/i.test(ua)) {
    const m = ua.match(/Chrome\/(\d+)/i);
    return `Chrome ${m ? m[1] : ''}`;
  }
  if (/Safari\/(\d+)/i.test(ua) && !/Chrome/i.test(ua)) {
    const m = ua.match(/Version\/(\d+)/i);
    return `Safari ${m ? m[1] : ''}`;
  }
  if (/Firefox\/(\d+)/i.test(ua)) {
    const m = ua.match(/Firefox\/(\d+)/i);
    return `Firefox ${m ? m[1] : ''}`;
  }
  if (/SamsungBrowser\/(\d+)/i.test(ua)) {
    const m = ua.match(/SamsungBrowser\/(\d+)/i);
    return `Samsung Internet ${m ? m[1] : ''}`;
  }
  return 'Modern Web Browser';
}

/**
 * استخراج جميع بيانات الجهاز اللحظية
 */
export async function collectDeviceTelemetry(): Promise<ClientDeviceInfo> {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'unknown',
      model: 'Server Node',
      os: 'Server',
      browser: 'API Worker',
      screenResolution: '0x0',
      platform: 'Server',
      language: 'ar',
      timezone: 'UTC',
    };
  }

  const ua = navigator.userAgent || '';
  const screenW = window.screen.width || 0;
  const screenH = window.screen.height || 0;
  const dpr = window.devicePixelRatio || 1;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad/i.test(ua) || (isMobile && Math.min(screenW, screenH) >= 600);

  let deviceType: ClientDeviceInfo['deviceType'] = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  const model = detectPhoneModel(ua, screenW, screenH, dpr);
  const os = detectOperatingSystem(ua);
  const browser = detectBrowser(ua);
  const screenResolution = `${screenW}x${screenH} (@${dpr}x)`;
  const platform = navigator.platform || 'Unknown';
  const language = navigator.language || 'ar';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const nav = navigator as any;
  const connectionType = nav.connection?.effectiveType || undefined;

  let batteryLevel: number | undefined = undefined;
  let isCharging: boolean | undefined = undefined;

  try {
    if (typeof nav.getBattery === 'function') {
      const battery = await nav.getBattery();
      if (battery) {
        batteryLevel = Math.round(battery.level * 100);
        isCharging = battery.charging;
      }
    }
  } catch {
    // ignore
  }

  return {
    deviceType,
    model,
    os,
    browser,
    screenResolution,
    platform,
    language,
    timezone,
    connectionType,
    batteryLevel,
    isCharging,
  };
}

/**
 * استخراج موقع GPS الفعلي من الهاتف
 */
export function requestGpsLocation(): Promise<ClientGpsLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date().toISOString(),
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}
