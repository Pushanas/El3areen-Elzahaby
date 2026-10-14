/**
 * Al-Areen Golden Den - IP Geolocation & Network Carrier Resolver
 * استخراج وتحديد موقع الـ IP والدولة والمدينة ومزود الخدمة والإحداثيات
 */

export interface ResolvedIpLocation {
  country: string;
  countryCode: string;
  flag: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  isp: string;
  org?: string;
  timezone?: string;
}

// أعلام وأسماء الدول العربية والعالمية
const COUNTRY_MAP: Record<string, { ar: string; flag: string; defaultLat: number; defaultLng: number }> = {
  EG: { ar: 'مصر', flag: '🇪🇬', defaultLat: 30.0444, defaultLng: 31.2357 },
  SA: { ar: 'المملكة العربية السعودية', flag: '🇸🇦', defaultLat: 24.7136, defaultLng: 46.6753 },
  AE: { ar: 'الإمارات العربية المتحدة', flag: '🇦🇪', defaultLat: 25.2048, defaultLng: 55.2708 },
  KW: { ar: 'الكويت', flag: '🇰🇼', defaultLat: 29.3759, defaultLng: 47.9774 },
  QA: { ar: 'قطر', flag: '🇶🇦', defaultLat: 25.2854, defaultLng: 51.5310 },
  OM: { ar: 'سلطنة عُمان', flag: '🇴🇲', defaultLat: 23.5880, defaultLng: 58.3829 },
  BH: { ar: 'البحرين', flag: '🇧🇭', defaultLat: 26.2285, defaultLng: 50.5860 },
  IQ: { ar: 'العراق', flag: '🇮🇶', defaultLat: 33.3152, defaultLng: 44.3661 },
  JO: { ar: 'الأردن', flag: '🇯🇴', defaultLat: 31.9454, defaultLng: 35.9284 },
  PS: { ar: 'فلسطين', flag: '🇵🇸', defaultLat: 31.9522, defaultLng: 35.2332 },
  LB: { ar: 'لبنان', flag: '🇱🇧', defaultLat: 33.8938, defaultLng: 35.5018 },
  SY: { ar: 'سوريا', flag: '🇸🇾', defaultLat: 33.5138, defaultLng: 36.2765 },
  YE: { ar: 'اليمن', flag: '🇾🇪', defaultLat: 15.3694, defaultLng: 44.1910 },
  LY: { ar: 'ليبيا', flag: '🇱🇾', defaultLat: 32.8872, defaultLng: 13.1913 },
  TN: { ar: 'تونس', flag: '🇹🇳', defaultLat: 36.8065, defaultLng: 10.1815 },
  DZ: { ar: 'الجزائر', flag: '🇩🇿', defaultLat: 36.7538, defaultLng: 3.0588 },
  MA: { ar: 'المغرب', flag: '🇲🇦', defaultLat: 33.5731, defaultLng: -7.5898 },
  SD: { ar: 'السودان', flag: '🇸🇩', defaultLat: 15.5007, defaultLng: 32.5599 },
  TR: { ar: 'تركيا', flag: '🇹🇷', defaultLat: 41.0082, defaultLng: 28.9784 },
  US: { ar: 'الولايات المتحدة', flag: '🇺🇸', defaultLat: 37.7749, defaultLng: -122.4194 },
  GB: { ar: 'المملكة المتحدة', flag: '🇬🇧', defaultLat: 51.5074, defaultLng: -0.1278 },
  DE: { ar: 'ألمانيا', flag: '🇩🇪', defaultLat: 52.5200, defaultLng: 13.4050 },
  FR: { ar: 'فرنسا', flag: '🇫🇷', defaultLat: 48.8566, defaultLng: 2.3522 },
};

// ذاكرة تخزين مؤقت للـ IP لتفادي التكرار
const geoCache = new Map<string, ResolvedIpLocation>();

/**
 * تحويل كود الدولة لحرف علم الإيموجي
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const code = countryCode.toUpperCase();
  if (COUNTRY_MAP[code]?.flag) return COUNTRY_MAP[code].flag;
  const offset = 127397;
  return String.fromCodePoint(...code.split('').map((c) => c.charCodeAt(0) + offset));
}

/**
 * اسم الدولة بالعربية
 */
export function getCountryArabicName(countryCode: string, englishFallback = ''): string {
  if (!countryCode) return englishFallback || 'غير محدد';
  const code = countryCode.toUpperCase();
  return COUNTRY_MAP[code]?.ar || englishFallback || code;
}

/**
 * فحص ما إذا كان الـ IP داخلي أو محلي
 */
function isPrivateIp(ip: string): boolean {
  return (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.3')
  );
}

/**
 * استخراج وتحديد الموقع الجغرافي للـ IP
 */
export async function resolveIpLocation(
  ip: string,
  headers?: Record<string, string | string[] | undefined>
): Promise<ResolvedIpLocation> {
  const cleanIp = (ip || '127.0.0.1').trim();

  // فحص الذاكرة المؤقتة أولاً
  if (geoCache.has(cleanIp)) {
    return geoCache.get(cleanIp)!;
  }

  // 1. فحص رؤوس Vercel / Cloudflare السحابية
  if (headers) {
    const vercelCountry = (headers['x-vercel-ip-country'] || headers['cf-ipcountry']) as string;
    const vercelCity = (headers['x-vercel-ip-city'] || headers['cf-ipcity']) as string;
    const vercelRegion = (headers['x-vercel-ip-country-region'] || headers['cf-region']) as string;
    const vercelLat = parseFloat((headers['x-vercel-ip-latitude'] as string) || '0');
    const vercelLng = parseFloat((headers['x-vercel-ip-longitude'] as string) || '0');

    if (vercelCountry && vercelCountry.length === 2) {
      const code = vercelCountry.toUpperCase();
      const meta = COUNTRY_MAP[code];
      const result: ResolvedIpLocation = {
        country: meta?.ar || code,
        countryCode: code,
        flag: getCountryFlag(code),
        city: vercelCity ? decodeURIComponent(vercelCity) : 'العاصمة',
        region: vercelRegion || '',
        latitude: vercelLat || meta?.defaultLat || 30.0444,
        longitude: vercelLng || meta?.defaultLng || 31.2357,
        isp: 'Vercel Edge Network',
      };
      geoCache.set(cleanIp, result);
      return result;
    }
  }

  // 2. إذا كان IP محلي (Localhost / Sandbox)، تزويد بيانات نموذجية لكي تظهر خريطة الرصد مباشرة
  if (isPrivateIp(cleanIp)) {
    const defaultLocal: ResolvedIpLocation = {
      country: 'مصر',
      countryCode: 'EG',
      flag: '🇪🇬',
      city: 'القاهرة',
      region: 'محافظة القاهرة',
      latitude: 30.0444,
      longitude: 31.2357,
      isp: 'Telecom Egypt (WE)',
      org: 'Local Development Host',
      timezone: 'Africa/Cairo',
    };
    geoCache.set(cleanIp, defaultLocal);
    return defaultLocal;
  }

  // 3. استعلام خدمة Geolocation سحابية مجانية وسريعة
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,lat,lon,isp,org,timezone`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        const code = (data.countryCode || '').toUpperCase();
        const meta = COUNTRY_MAP[code];

        const result: ResolvedIpLocation = {
          country: meta?.ar || data.country || 'غير معروف',
          countryCode: code,
          flag: getCountryFlag(code),
          city: data.city || 'غير محدد',
          region: data.regionName || '',
          latitude: typeof data.lat === 'number' ? data.lat : meta?.defaultLat || 30.0444,
          longitude: typeof data.lon === 'number' ? data.lon : meta?.defaultLng || 31.2357,
          isp: data.isp || data.org || 'Internet Provider',
          org: data.org,
          timezone: data.timezone,
        };

        geoCache.set(cleanIp, result);
        return result;
      }
    }
  } catch {
    // Silently fallback if external lookup is restricted
  }

  // 4. تراجع آمن في حال تعذر الاتصال الخارجي
  const fallback: ResolvedIpLocation = {
    country: 'الشرق الأوسط (عالمي)',
    countryCode: 'ME',
    flag: '🌍',
    city: 'متصل سحابياً',
    region: 'منطقة حرة',
    latitude: 25.2048,
    longitude: 55.2708,
    isp: 'Cloud Network Provider',
  };
  geoCache.set(cleanIp, fallback);
  return fallback;
}
