import crypto from 'crypto';
import {
  dbEngine,
  hashCode,
  encryptString,
  decryptString,
  LicenseCode,
  CodeBatch,
  DurationType,
  StartsOnType,
  VisitorRecord,
  AuditLog,
} from './db';

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
    const db = dbEngine.get();
    try {
      const salt = Buffer.from(db.admin.saltB64, 'base64');
      const expected = Buffer.from(db.admin.hashB64, 'base64');
      const derived = crypto.pbkdf2Sync(password, salt, db.admin.iterations, 32, 'sha256');
      return crypto.timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
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
    const token = crypto.randomBytes(32).toString('hex');
    const hours = dbEngine.get().settings.adminSessionHours || 24;
    const session: AdminSession = {
      token,
      adminId: 'master_admin',
      createdAt: now,
      expiresAt: now + hours * 3600 * 1000,
      ip,
    };
    activeAdminSessions.set(token, session);

    this.logAudit('ADMIN_LOGIN_SUCCESS', 'تسجيل دخول ناجح إلى لوحة قيادة العرين الذهبي', ip, 'master_admin');

    return { success: true, token };
  },

  // Verify Admin Session Token
  verifySessionToken(token: string | undefined): boolean {
    if (!token) return false;
    const session = activeAdminSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      activeAdminSessions.delete(token);
      return false;
    }
    return true;
  },

  logoutAdmin(token: string | undefined, ip: string) {
    if (token) {
      activeAdminSessions.delete(token);
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
      const code = db.codes.find((c) => c.codeHash === hashVal);
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

  // 6. Visitor Registration & Heartbeat
  registerOrUpdateVisitor(params: {
    visitorId: string;
    ip: string;
    userAgent: string;
    page: string;
  }): { visitorId: string; isActive: boolean } {
    const { visitorId, ip, userAgent, page } = params;
    const now = new Date();
    const cleanId = visitorId?.trim() || crypto.randomUUID();

    dbEngine.update((db) => {
      let visitor = db.visitors.find((v) => v.id === cleanId);
      if (!visitor) {
        visitor = {
          id: cleanId,
          ip: ip || '127.0.0.1',
          userAgent: (userAgent || 'Browser').slice(0, 250),
          firstSeenAt: now.toISOString(),
          lastSeenAt: now.toISOString(),
          lastHeartbeatAt: now.toISOString(),
          lastPage: (page || '/').slice(0, 100),
          visitCount: 1,
        };
        db.visitors.unshift(visitor);
      } else {
        const timeSinceLast = now.getTime() - new Date(visitor.lastSeenAt).getTime();
        if (timeSinceLast > 30 * 60 * 1000) {
          visitor.visitCount = (visitor.visitCount || 1) + 1;
        }
        visitor.ip = ip || visitor.ip;
        visitor.userAgent = (userAgent || visitor.userAgent).slice(0, 250);
        visitor.lastSeenAt = now.toISOString();
        visitor.lastHeartbeatAt = now.toISOString();
        visitor.lastPage = (page || visitor.lastPage).slice(0, 100);
      }

      // Auto-prune old visitors beyond retention days
      const retentionDays = db.settings.visitorRetentionDays || 30;
      const cutoffTime = now.getTime() - retentionDays * 24 * 3600 * 1000;
      if (db.visitors.length > 5000) {
        db.visitors = db.visitors.filter((v) => new Date(v.lastSeenAt).getTime() > cutoffTime);
      }
    });

    return { visitorId: cleanId, isActive: true };
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
    };
  },

  // 8. Decrypt Code (for admin export / reveal)
  decryptFullCode(codeId: string): string | null {
    const db = dbEngine.get();
    const code = db.codes.find((c) => c.id === codeId);
    if (!code || !code.codeCipher) return null;
    return decryptString(code.codeCipher);
  },
};
