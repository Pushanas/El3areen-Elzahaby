import crypto from 'crypto';
import {
  dbEngine,
  hashCode,
  encryptString,
  decryptString,
  findMatchingCodeInList,
  ACTIVE_CIPHER_KEY,
  type LicenseCode,
  type CodeBatch,
  type DurationType,
  type StartsOnType,
  type VisitorRecord,
  type AuditLog,
  type DeviceTelemetry,
  type GpsLocation,
  type EmergencyBroadcast,
} from './db.ts';
import { resolveIpLocation } from './geoService.ts';

// Duration in minutes lookup
export function durationToMinutes(type: DurationType, customMinutes?: number): number {
  switch (type) {
    case '1h':
      return 60;
    case '3h':
      return 180;
    case '6h':
      return 360;
    case '12h':
      return 720;
    case '24h':
      return 1440;
    case '2d':
      return 2880;
    case '3d':
      return 4320;
    case '7d':
      return 10080;
    case '14d':
      return 20160;
    case '30d':
      return 43200;
    case '60d':
      return 86400;
    case '90d':
      return 129600;
    case 'custom':
      return Math.max(1, customMinutes || 60);
    default:
      return 1440;
  }
}

// Generate cryptographically random code in format: AREEN-XXXX-XXXX-XXXX
// Uses unambiguous uppercase alphanumeric chars (excluding 0, O, 1, I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateSecureCode(): string {
  const bytes = crypto.randomBytes(12);
  let segment1 = '';
  let segment2 = '';
  let segment3 = '';

  for (let i = 0; i < 4; i++) {
    segment1 += CHARSET[bytes[i] % CHARSET.length];
    segment2 += CHARSET[bytes[i + 4] % CHARSET.length];
    segment3 += CHARSET[bytes[i + 8] % CHARSET.length];
  }

  return `AREEN-${segment1}-${segment2}-${segment3}`;
}

export function maskCode(code: string): string {
  const parts = code.split('-');
  if (parts.length >= 4) {
    return `AREEN-****-****-${parts[3]}`;
  }
  return code.slice(0, 5) + '****' + code.slice(-4);
}

// Admin Sessions in memory
export interface AdminSession {
  token: string;
  adminId: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

const activeAdminSessions = new Map<string, AdminSession>();
const adminFailedAttempts = new Map<string, { count: number; lockedUntil: number }>();

export const adminService = {
  // 1. Audit log
  logAudit(action: string, details: string, ip: string, adminId?: string) {
    const db = dbEngine.get();
    const entry: AuditLog = {
      id: crypto.randomUUID(),
      action,
      details,
      ip,
      timestamp: new Date().toISOString(),
      adminId,
    };
    db.auditLogs.unshift(entry);
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
    dbEngine.flushSync();
  },

  // 2. Admin Login Verification
  verifyAdminPassword(password: string): boolean {
    const clean = String(password || '').trim().replace(/^["']|["']$/g, '');
    if (!clean) return false;

    const db = dbEngine.get();

    // 1. Direct PBKDF2 check against db.admin
    try {
      const salt = Buffer.from(db.admin.saltB64, 'base64');
      const expected = Buffer.from(db.admin.hashB64, 'base64');
      const derived = crypto.pbkdf2Sync(clean, salt, db.admin.iterations, 32, 'sha256');
      if (crypto.timingSafeEqual(derived, expected)) {
        return true;
      }
    } catch {
      // ignore
    }

    // 2. Direct match with accepted master passwords (auto-heals db.admin)
    const envAdminPass = (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
    const envAdminSecret = (process.env.ADMIN_SECRET || '').trim().replace(/^["']|["']$/g, '');
    const envAdminKey = (process.env.ADMIN_KEY || '').trim().replace(/^["']|["']$/g, '');
    const envAdminPin = (process.env.ADMIN_PIN || '').trim().replace(/^["']|["']$/g, '');

    const acceptedMasterPasswords = [
      'Areen#Admin_9X7K!2026',
      'AreenAdmin#2026!Master',
      'Areen#VIP_8M3Z!2026',
      'Areen#Royal2026!Vip',
      envAdminPass,
      envAdminSecret,
      envAdminKey,
      envAdminPin,
    ].filter(Boolean) as string[];

    if (acceptedMasterPasswords.includes(clean)) {
      try {
        const newSalt = crypto.randomBytes(16);
        const newHash = crypto.pbkdf2Sync(clean, newSalt, 210000, 32, 'sha256');
        dbEngine.updateSync((database) => {
          database.admin.saltB64 = newSalt.toString('base64');
          database.admin.hashB64 = newHash.toString('base64');
          database.admin.updatedAt = new Date().toISOString();
        });
      } catch {
        // ignore
      }
      return true;
    }

    return false;
  },

  handleAdminLogin(
    password: string,
    ip: string
  ): { success: boolean; token?: string; error?: string; lockedSeconds?: number } {
    const now = Date.now();
    const attempt = adminFailedAttempts.get(ip) || { count: 0, lockedUntil: 0 };

    if (attempt.lockedUntil > now) {
      const lockedSecs = Math.ceil((attempt.lockedUntil - now) / 1000);
      return {
        success: false,
        error: `تم قفل محاولات الإدارة مؤقتاً لحماية النظام. يرجى الانتظار ${lockedSecs} ثانية.`,
        lockedSeconds: lockedSecs,
      };
    }

    if (!password || typeof password !== 'string') {
      return { success: false, error: 'يرجى إدخال كلمة مرور الإدارة' };
    }

    const isValid = this.verifyAdminPassword(password.trim());

    if (!isValid) {
      attempt.count += 1;
      if (attempt.count >= 5) {
        const penalty = Math.min(300, 15 * Math.pow(2, attempt.count - 5));
        attempt.lockedUntil = now + penalty * 1000;
      }
      adminFailedAttempts.set(ip, attempt);
      const remaining = Math.max(0, 5 - attempt.count);
      this.logAudit('ADMIN_LOGIN_FAILED', `محاولة تسجيل دخول فاشلة من IP: ${ip}`, ip);
      return {
        success: false,
        error:
          remaining === 0
            ? 'تم قفل محاولات تسجيل الدخول للإدارة مؤقتاً.'
            : `كلمة مرور الإدارة غير صحيحة. متبقي ${remaining} محاولات.`,
      };
    }

    // Login successful
    adminFailedAttempts.delete(ip);
    const hours = dbEngine.get().settings.adminSessionHours || 24;
    const expiresAt = now + hours * 3600 * 1000;
    
    // Generate stateless cryptographic HMAC token (ensures 100% reliability across Vercel serverless lambdas)
    const payload = `adm:master_admin:${now}:${expiresAt}`;
    const sig = crypto.createHmac('sha256', ACTIVE_CIPHER_KEY).update(payload).digest('hex');
    const token = `${Buffer.from(payload).toString('base64url')}.${sig}`;

    const session: AdminSession = {
      token,
      adminId: 'master_admin',
      createdAt: now,
      expiresAt,
      ip,
    };
    activeAdminSessions.set(token, session);

    this.logAudit('ADMIN_LOGIN_SUCCESS', 'تسجيل دخول ناجح إلى لوحة قيادة العرين الذهبي', ip, 'master_admin');

    return { success: true, token };
  },

  // Verify Admin Session Token (Memory + Stateless HMAC verification for Vercel Serverless)
  verifySessionToken(token: string | undefined): boolean {
    if (!token || typeof token !== 'string') return false;
    const cleanToken = token.trim();

    // 1. In-memory check (fast hit on warm instances)
    const session = activeAdminSessions.get(cleanToken);
    if (session && Date.now() <= session.expiresAt) {
      return true;
    }

    // 2. Stateless HMAC validation (works seamlessly across all Vercel serverless containers/lambdas)
    const dotIndex = cleanToken.indexOf('.');
    if (dotIndex > 0) {
      try {
        const payloadB64 = cleanToken.slice(0, dotIndex);
        const sig = cleanToken.slice(dotIndex + 1);
        const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
        const parts = payload.split(':');
        if (parts.length === 4 && parts[0] === 'adm') {
          const [_, adminId, createdStr, expiresStr] = parts;
          const expiresAt = parseInt(expiresStr, 10);
          const createdAt = parseInt(createdStr, 10);
          if (!isNaN(expiresAt) && Date.now() <= expiresAt) {
            const expectedSig = crypto.createHmac('sha256', ACTIVE_CIPHER_KEY).update(payload).digest('hex');
            if (crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
              // Cache in memory for subsequent quick lookups in this container
              activeAdminSessions.set(cleanToken, {
                token: cleanToken,
                adminId,
                createdAt: isNaN(createdAt) ? Date.now() : createdAt,
                expiresAt,
                ip: 'verified_hmac',
              });
              return true;
            }
          }
        }
      } catch {
        // Fallback
      }
    }

    if (session && Date.now() > session.expiresAt) {
      activeAdminSessions.delete(cleanToken);
    }
    return false;
  },

  logoutAdmin(token: string | undefined, ip: string) {
    if (token) {
      activeAdminSessions.delete(token.trim());
      this.logAudit('ADMIN_LOGOUT', 'تسجيل خروج من لوحة الإدارة', ip);
    }
  },

  // Change Admin Password
  changeAdminPassword(currentPass: string, newPass: string, ip: string): { success: boolean; error?: string } {
    if (!this.verifyAdminPassword(currentPass.trim())) {
      return { success: false, error: 'كلمة مرور الإدارة الحالية غير صحيحة' };
    }
    if (newPass.length < 8) {
      return { success: false, error: 'يجب أن تتكون كلمة المرور الجديدة من 8 خانات على الأقل' };
    }

    const salt = crypto.randomBytes(16);
    const iterations = 210000;
    const hash = crypto.pbkdf2Sync(newPass.trim(), salt, iterations, 32, 'sha256');

    dbEngine.update((db) => {
      db.admin = {
        saltB64: salt.toString('base64'),
        hashB64: hash.toString('base64'),
        iterations,
        updatedAt: new Date().toISOString(),
        sessionSecret: crypto.randomBytes(32).toString('hex'),
      };
    });

    // Invalidate all active sessions
    activeAdminSessions.clear();
    this.logAudit('ADMIN_PASSWORD_CHANGED', 'تم تغيير كلمة مرور الإدارة بنجاح وإنهاء كافة الجلسات النشطة', ip);

    return { success: true };
  },

  // 3. Batch Code Generator
  generateCodesBatch(params: {
    count: number;
    durationType: DurationType;
    customMinutes?: number;
    startsOn: StartsOnType;
    maxActivations: number;
    batchName?: string;
    note?: string;
    ip: string;
  }): { batch: CodeBatch; plainCodes: string[] } {
    const { count, durationType, customMinutes, startsOn, maxActivations, batchName, note, ip } = params;
    const safeCount = Math.min(200, Math.max(1, count || 1));
    const durationMins = durationToMinutes(durationType, customMinutes);
    const now = new Date();
    const batchId = crypto.randomUUID();
    const batchTitle = batchName?.trim() || `دفعة ${now.toLocaleDateString('ar-EG')} (${safeCount} أكواد)`;

    const newBatch: CodeBatch = {
      id: batchId,
      name: batchTitle,
      count: safeCount,
      durationType,
      durationMinutes: durationMins,
      startsOn,
      maxActivations: Math.max(1, maxActivations || 1),
      createdAt: now.toISOString(),
    };

    const plainCodes: string[] = [];
    const newLicenseCodes: LicenseCode[] = [];

    for (let i = 0; i < safeCount; i++) {
      let code = generateSecureCode();
      let codeHashVal = hashCode(code);

      // Check collision
      const db = dbEngine.get();
      while (db.codes.some((c) => c.codeHash === codeHashVal)) {
        code = generateSecureCode();
        codeHashVal = hashCode(code);
      }

      const expiresAt =
        startsOn === 'creation'
          ? new Date(now.getTime() + durationMins * 60 * 1000).toISOString()
          : null;

      const licenseItem: LicenseCode = {
        id: crypto.randomUUID(),
        codeHash: codeHashVal,
        codeMasked: maskCode(code),
        codeCipher: encryptString(code),
        batchId,
        batchName: batchTitle,
        note: note?.trim() || '',
        durationType,
        durationMinutes: durationMins,
        startsOn,
        maxActivations: Math.max(1, maxActivations || 1),
        activationCount: 0,
        status: 'new',
        createdAt: now.toISOString(),
        firstActivatedAt: null,
        expiresAt,
        lastUsedAt: null,
        activations: [],
      };

      plainCodes.push(code);
      newLicenseCodes.push(licenseItem);
    }

    dbEngine.update((db) => {
      db.batches.unshift(newBatch);
      db.codes.unshift(...newLicenseCodes);
    });

    this.logAudit(
      'CODES_BATCH_CREATED',
      `تم توليد دفعة أكواد [${batchTitle}] بعدد ${safeCount} كود (مدة: ${durationType}, تفعيلات: ${maxActivations})`,
      ip
    );

    return { batch: newBatch, plainCodes };
  },

  // 4. Code Management & Status Updates
  updateCodeStatus(
    codeId: string,
    newStatus: 'active' | 'suspended' | 'revoked',
    ip: string
  ): { success: boolean; error?: string } {
    return dbEngine.updateSync((db) => {
      const code = db.codes.find((c) => c.id === codeId);
      if (!code) {
        return { success: false, error: 'كود الترخيص غير موجود' };
      }
      code.status = newStatus;
      this.logAudit('CODE_STATUS_UPDATED', `تعديل حالة الكود ${code.codeMasked} إلى ${newStatus}`, ip);
      return { success: true };
    });
  },

  // 5. Code Activation & Client Access
  activateOrVerifyCode(
    rawCode: string,
    visitorId: string,
    ip: string,
    userAgent: string
  ): {
    success: boolean;
    error?: string;
    codeMasked?: string;
    expiresAt?: string | null;
    remainingMinutes?: number;
    status?: string;
  } {
    const cleanCode = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      return { success: false, error: 'يرجى إدخال كود الترخيص' };
    }

    const hashVal = hashCode(cleanCode);
    const now = new Date();

    return dbEngine.updateSync((db) => {
      const code = findMatchingCodeInList(db.codes, cleanCode);
      if (!code) {
        return { success: false, error: 'كود الترخيص غير موجود أو غير صالح' };
      }

      // Check revoked
      if (code.status === 'revoked') {
        return { success: false, error: 'تم إلغاء هذا الترخيص من قبل إدارة العرين الذهبي' };
      }

      // Check suspended
      if (code.status === 'suspended') {
        return { success: false, error: 'تم إيقاف هذا الترخيص مؤقتاً، تواصل مع الدعم' };
      }

      // Check already expired
      if (code.expiresAt && now.getTime() > new Date(code.expiresAt).getTime()) {
        code.status = 'expired';
        return { success: false, error: 'انتهت صلاحية هذا الترخيص' };
      }

      // Check max activations
      if (code.activationCount >= code.maxActivations) {
        // If this visitor was already activated on this code, allow reuse
        const alreadyActivated = code.activations.some((a) => a.visitorId === visitorId);
        if (!alreadyActivated) {
          code.status = 'exhausted';
          return {
            success: false,
            error: `تم استنفاد الحد الأقصى للتفعيلات المسموحة لهذا الكود (${code.maxActivations} تفعيل).`,
          };
        }
      }

      // If starts on first activation and never activated before
      if (code.startsOn === 'first_activation' && !code.firstActivatedAt) {
        code.firstActivatedAt = now.toISOString();
        code.expiresAt = new Date(now.getTime() + code.durationMinutes * 60 * 1000).toISOString();
      }

      // Register activation if new visitor for this code
      const isNewActivation = !code.activations.some((a) => a.visitorId === visitorId);
      if (isNewActivation) {
        code.activationCount += 1;
        code.activations.push({
          id: crypto.randomUUID(),
          visitorId,
          ip,
          timestamp: now.toISOString(),
          userAgent: userAgent.slice(0, 200),
        });
      }

      code.status = 'active';
      code.lastUsedAt = now.toISOString();

      let remainingMinutes = 0;
      if (code.expiresAt) {
        remainingMinutes = Math.max(0, Math.ceil((new Date(code.expiresAt).getTime() - now.getTime()) / 60000));
      }

      return {
        success: true,
        codeMasked: code.codeMasked,
        expiresAt: code.expiresAt,
        remainingMinutes,
        status: code.status,
      };
    });
  },

  // 6. Visitor Registration & Heartbeat (with Phone Telemetry & Geolocation)
  async registerOrUpdateVisitor(params: {
    visitorId: string;
    ip: string;
    userAgent: string;
    page: string;
    device?: DeviceTelemetry;
    gpsLocation?: GpsLocation;
    headers?: Record<string, string | string[] | undefined>;
  }): Promise<{ visitorId: string; isActive: boolean; blocked: boolean }> {
    const { visitorId, ip, userAgent, page, device, gpsLocation, headers } = params;
    const now = new Date();
    const cleanId = visitorId?.trim() || crypto.randomUUID();

    // Resolve IP geolocation
    const geo = await resolveIpLocation(ip, headers);

    let isBlocked = false;

    dbEngine.update((db) => {
      let visitor = db.visitors.find((v) => v.id === cleanId);
      if (!visitor) {
        visitor = {
          id: cleanId,
          ip: ip || '127.0.0.1',
          userAgent: (userAgent || 'Browser').slice(0, 300),
          firstSeenAt: now.toISOString(),
          lastSeenAt: now.toISOString(),
          lastHeartbeatAt: now.toISOString(),
          lastPage: (page || '/').slice(0, 100),
          visitCount: 1,
          country: geo.country,
          countryCode: geo.countryCode,
          flag: geo.flag,
          city: geo.city,
          region: geo.region,
          isp: geo.isp,
          ipLocation: geo,
          device: device || undefined,
          gpsLocation: gpsLocation || undefined,
          blocked: false,
        };
        db.visitors.unshift(visitor);
      } else {
        const timeSinceLast = now.getTime() - new Date(visitor.lastSeenAt).getTime();
        if (timeSinceLast > 30 * 60 * 1000) {
          visitor.visitCount = (visitor.visitCount || 1) + 1;
        }
        visitor.ip = ip || visitor.ip;
        visitor.userAgent = (userAgent || visitor.userAgent).slice(0, 300);
        visitor.lastSeenAt = now.toISOString();
        visitor.lastHeartbeatAt = now.toISOString();
        visitor.lastPage = (page || visitor.lastPage).slice(0, 100);

        // Update geo if not already set or changed
        if (!visitor.country || visitor.country === 'غير معروف' || visitor.ip !== ip) {
          visitor.country = geo.country;
          visitor.countryCode = geo.countryCode;
          visitor.flag = geo.flag;
          visitor.city = geo.city;
          visitor.region = geo.region;
          visitor.isp = geo.isp;
          visitor.ipLocation = geo;
        }

        // Update device telemetry if provided
        if (device) {
          visitor.device = {
            ...(visitor.device || {}),
            ...device,
          };
        }

        // Update GPS location if provided
        if (gpsLocation) {
          visitor.gpsLocation = gpsLocation;
        }

        isBlocked = !!visitor.blocked;
      }

      // Auto-prune old visitors beyond retention days
      const retentionDays = db.settings.visitorRetentionDays || 30;
      const cutoffTime = now.getTime() - retentionDays * 24 * 3600 * 1000;
      if (db.visitors.length > 5000) {
        db.visitors = db.visitors.filter((v) => new Date(v.lastSeenAt).getTime() > cutoffTime);
      }
    });

    return { visitorId: cleanId, isActive: true, blocked: isBlocked };
  },

  // 7. Get Overview Statistics
  getOverviewStats() {
    const db = dbEngine.get();
    const now = Date.now();
    const activeCutoff = now - 75000; // 75 seconds for active status

    let totalCodes = db.codes.length;
    let activeCodes = 0;
    let newCodes = 0;
    let expiredCodes = 0;
    let revokedCodes = 0;
    let suspendedCodes = 0;
    let exhaustedCodes = 0;

    for (const code of db.codes) {
      if (code.status === 'revoked') revokedCodes++;
      else if (code.status === 'suspended') suspendedCodes++;
      else if (code.expiresAt && now > new Date(code.expiresAt).getTime()) expiredCodes++;
      else if (code.activationCount >= code.maxActivations) exhaustedCodes++;
      else if (code.status === 'active') activeCodes++;
      else if (code.status === 'new') newCodes++;
    }

    const activeVisitors = db.visitors.filter(
      (v) => new Date(v.lastHeartbeatAt).getTime() >= activeCutoff
    ).length;

    // Top Countries breakdown
    const countryCounts: Record<string, { count: number; flag: string; name: string }> = {};
    const deviceModelCounts: Record<string, number> = {};

    for (const v of db.visitors) {
      const cName = v.country || 'غير محدد';
      const flag = v.flag || '🌐';
      if (!countryCounts[cName]) {
        countryCounts[cName] = { count: 0, flag, name: cName };
      }
      countryCounts[cName].count++;

      const model = v.device?.model || (v.userAgent.includes('iPhone') ? 'Apple iPhone' : 'Web Browser');
      deviceModelCounts[model] = (deviceModelCounts[model] || 0) + 1;
    }

    const topCountries = Object.values(countryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topDevices = Object.entries(deviceModelCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCodes,
      activeCodes,
      newCodes,
      expiredCodes,
      revokedCodes,
      suspendedCodes,
      exhaustedCodes,
      activeVisitors,
      totalVisitors: db.visitors.length,
      totalBatches: db.batches.length,
      topCountries,
      topDevices,
      emergencyBroadcast: db.settings.emergencyBroadcast,
    };
  },

  // 8. Visitors Map Telemetry (List for Interactive Map)
  getVisitorsMapData(onlyActive = false) {
    const db = dbEngine.get();
    const now = Date.now();
    const activeCutoff = now - 75000;

    let list = db.visitors;
    if (onlyActive) {
      list = list.filter((v) => new Date(v.lastHeartbeatAt).getTime() >= activeCutoff);
    }

    return list.map((v) => {
      const isActive = new Date(v.lastHeartbeatAt).getTime() >= activeCutoff;
      // GPS coords have higher priority than IP coords
      const hasGps = !!(v.gpsLocation && typeof v.gpsLocation.latitude === 'number');
      const lat = hasGps ? v.gpsLocation!.latitude : v.ipLocation?.latitude || 30.0444;
      const lng = hasGps ? v.gpsLocation!.longitude : v.ipLocation?.longitude || 31.2357;

      return {
        id: v.id,
        ip: v.ip,
        country: v.country || 'مصر',
        countryCode: v.countryCode || 'EG',
        flag: v.flag || '🇪🇬',
        city: v.city || 'القاهرة',
        region: v.region || '',
        isp: v.isp || 'Telecom Provider',
        latitude: lat,
        longitude: lng,
        isGps: hasGps,
        gpsAccuracy: v.gpsLocation?.accuracy,
        deviceModel: v.device?.model || 'هاتف ذكي',
        deviceOs: v.device?.os || 'iOS / Android',
        browser: v.device?.browser || 'Browser',
        screen: v.device?.screenResolution,
        battery: v.device?.batteryLevel,
        isCharging: v.device?.isCharging,
        lastSeenAt: v.lastSeenAt,
        lastHeartbeatAt: v.lastHeartbeatAt,
        lastPage: v.lastPage,
        isActive,
        blocked: !!v.blocked,
        note: v.note || '',
      };
    });
  },

  // 9. Block / Unblock Visitor
  toggleBlockVisitor(visitorId: string, ip: string, note?: string): { success: boolean; blocked: boolean } {
    let newBlockedState = false;

    dbEngine.update((db) => {
      const visitor = db.visitors.find((v) => v.id === visitorId);
      if (visitor) {
        visitor.blocked = !visitor.blocked;
        if (note !== undefined) visitor.note = note;
        newBlockedState = !!visitor.blocked;
      }
    });

    this.logAudit(
      newBlockedState ? 'VISITOR_BLOCKED' : 'VISITOR_UNBLOCKED',
      `${newBlockedState ? 'تم حظر' : 'تم فك حظر'} الزائر صاحب المعرف [${visitorId}]`,
      ip
    );

    return { success: true, blocked: newBlockedState };
  },

  // 10. Update Visitor Note
  setVisitorNote(visitorId: string, note: string): boolean {
    return dbEngine.updateSync((db) => {
      const visitor = db.visitors.find((v) => v.id === visitorId);
      if (visitor) {
        visitor.note = (note || '').trim().slice(0, 500);
        return true;
      }
      return false;
    });
  },

  // 11. Extend Code Expiration Time
  extendCodeDuration(codeId: string, additionalMinutes: number, ip: string): { success: boolean; newExpiresAt?: string } {
    const now = Date.now();

    return dbEngine.updateSync((db) => {
      const code = db.codes.find((c) => c.id === codeId);
      if (!code) return { success: false };

      const currentExpiry = code.expiresAt ? new Date(code.expiresAt).getTime() : now;
      const baseTime = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseTime + additionalMinutes * 60 * 1000).toISOString();

      code.expiresAt = newExpiry;
      code.durationMinutes = (code.durationMinutes || 0) + additionalMinutes;
      if (code.status === 'expired' || code.status === 'exhausted') {
        code.status = 'active';
      }

      this.logAudit(
        'CODE_EXTENDED',
        `تم تمديد كود الترخيص [${code.codeMasked}] بمقدار ${Math.round(additionalMinutes / 60)} ساعة`,
        ip
      );

      return { success: true, newExpiresAt: newExpiry };
    });
  },

  // 12. Reset Device Activations (Allow user to switch phone)
  resetCodeDeviceActivations(codeId: string, ip: string): boolean {
    return dbEngine.updateSync((db) => {
      const code = db.codes.find((c) => c.id === codeId);
      if (!code) return false;

      code.activations = [];
      code.activationCount = 0;
      if (code.status === 'exhausted') {
        code.status = 'active';
      }

      this.logAudit(
        'CODE_DEVICES_RESET',
        `تم إعادة تعيين قفل الأجهزة لكود الترخيص [${code.codeMasked}]`,
        ip
      );

      return true;
    });
  },

  // 13. Test / Simulate Code Validity
  testValidateCode(rawCode: string) {
    const db = dbEngine.get();
    const code = findMatchingCodeInList(db.codes, rawCode);
    if (!code) {
      return { success: false, found: false, error: 'الكود غير موجود في قاعدة البيانات' };
    }

    const decrypted = code.codeCipher ? decryptString(code.codeCipher) : null;
    const now = Date.now();
    let remainingMinutes = 0;
    if (code.expiresAt) {
      remainingMinutes = Math.max(0, Math.ceil((new Date(code.expiresAt).getTime() - now) / 60000));
    }

    return {
      success: true,
      found: true,
      code: {
        id: code.id,
        plainCode: decrypted,
        masked: code.codeMasked,
        status: code.status,
        batchName: code.batchName,
        durationType: code.durationType,
        durationMinutes: code.durationMinutes,
        startsOn: code.startsOn,
        activationCount: code.activationCount,
        maxActivations: code.maxActivations,
        firstActivatedAt: code.firstActivatedAt,
        expiresAt: code.expiresAt,
        remainingMinutes,
        activations: code.activations,
      },
    };
  },

  // 14. Emergency Broadcast Management
  updateBroadcast(broadcast: EmergencyBroadcast, ip: string): boolean {
    dbEngine.update((db) => {
      db.settings.emergencyBroadcast = {
        enabled: !!broadcast.enabled,
        message: (broadcast.message || '').trim().slice(0, 300),
        level: broadcast.level || 'vip',
        updatedAt: new Date().toISOString(),
      };
    });

    this.logAudit(
      'BROADCAST_UPDATED',
      `تم تحديث إعلان الطوارئ العام: [${broadcast.enabled ? 'مفعل' : 'معطل'}] "${broadcast.message}"`,
      ip
    );

    return true;
  },

  // 15. Decrypt Code (for admin export / reveal)
  decryptFullCode(codeId: string): string | null {
    const db = dbEngine.get();
    const code = db.codes.find((c) => c.id === codeId);
    if (!code || !code.codeCipher) return null;
    return decryptString(code.codeCipher);
  },

  // 16. Permanent Code Deletion
  deleteCode(codeId: string, ip: string): boolean {
    return dbEngine.updateSync((db) => {
      const idx = db.codes.findIndex((c) => c.id === codeId);
      if (idx === -1) return false;
      const [removed] = db.codes.splice(idx, 1);
      this.logAudit('CODE_DELETED', `حذف نهائي لكود الترخيص [${removed.codeMasked}]`, ip);
      return true;
    });
  },

  // 17. Batch Deletion
  deleteBatch(batchId: string, ip: string): { success: boolean; deletedCodes: number } {
    return dbEngine.updateSync((db) => {
      const batchIdx = db.batches.findIndex((b) => b.id === batchId);
      if (batchIdx === -1) return { success: false, deletedCodes: 0 };
      const [batch] = db.batches.splice(batchIdx, 1);
      const beforeCodes = db.codes.length;
      db.codes = db.codes.filter((c) => c.batchId !== batchId);
      const deletedCodes = beforeCodes - db.codes.length;
      this.logAudit('BATCH_DELETED', `حذف دفعة الأكواد [${batch.name}] وحذف ${deletedCodes} كود مرتبط`, ip);
      return { success: true, deletedCodes };
    });
  },

  // 18. Delete Visitor Record
  deleteVisitor(visitorId: string, ip: string): boolean {
    return dbEngine.updateSync((db) => {
      const idx = db.visitors.findIndex((v) => v.id === visitorId);
      if (idx === -1) return false;
      db.visitors.splice(idx, 1);
      this.logAudit('VISITOR_DELETED', `حذف سجل الزائر [${visitorId}] من قاعدة البيانات`, ip);
      return true;
    });
  },

  // 19. Clear Audit Logs
  clearAuditLogs(ip: string): boolean {
    return dbEngine.updateSync((db) => {
      db.auditLogs = [];
      this.logAudit('AUDIT_LOGS_CLEARED', 'تم تفريغ وتنظيف سجل النشاطات الأمني بالكامل', ip);
      return true;
    });
  },
};
