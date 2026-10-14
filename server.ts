import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dbEngine, type DurationType, type StartsOnType } from './src/server/db.ts';
import { adminService } from './src/server/adminService.ts';
import { envInfo, getStorageDiagnostics, ensureStorageInitialized } from './database.ts';

// Ensure storage directory and files are seeded immediately upon cold start
ensureStorageInitialized();

const app = express();
app.use(express.json());

// 1. Universal CORS & Preflight handler
app.use((req: Request, res: Response, next: () => void) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-visitor-id');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// 2. URL normalizer to support Vercel rewrites where /api prefix may be stripped
app.use((req: Request, res: Response, next: () => void) => {
  if (req.url && !req.url.startsWith('/api') && (
    req.url.startsWith('/admin') ||
    req.url.startsWith('/auth') ||
    req.url.startsWith('/license') ||
    req.url.startsWith('/visitor') ||
    req.url.startsWith('/public') ||
    req.url.startsWith('/health')
  )) {
    req.url = '/api' + req.url;
  }
  next();
});

const AUTH_FILE = envInfo.authVaultFilePath;

interface VaultData {
  saltB64: string;
  hashB64: string;
  iterations: number;
  sessionVersion: string;
  updatedAt: string;
}

// Initial Default Vault configuration (Supports both Areen#VIP_8M3Z!2026 and Areen#Royal2026!Vip)
const INITIAL_VAULT: VaultData = {
  saltB64: '+P/O1JDCoP1imn/eBDm64w==',
  hashB64: '0CBZibSOb6jgovFTEs5wFi+rrBQnkx/PhJm5VLGVKyM=',
  iterations: 210000,
  sessionVersion: 'epoch_1791733858138_f3e300d37a80',
  updatedAt: new Date().toISOString(),
};

function getVault(): VaultData {
  const baseDir = typeof import.meta !== 'undefined' && import.meta.dirname ? import.meta.dirname : process.cwd();
  const candidateVaultPaths = [
    AUTH_FILE,
    path.resolve(process.cwd(), 'data', 'auth_vault.json'),
    path.resolve('/var/task', 'data', 'auth_vault.json'),
    path.resolve('/tmp', 'areen_data', 'auth_vault.json'),
    path.resolve(baseDir, '../../data', 'auth_vault.json'),
    path.resolve(baseDir, '../data', 'auth_vault.json'),
    path.resolve(baseDir, 'data', 'auth_vault.json'),
  ];

  for (const p of candidateVaultPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed?.hashB64) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
  }

  return INITIAL_VAULT;
}

function saveVault(data: VaultData) {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
    const backupVaultPath = path.resolve(process.cwd(), 'data', 'auth_vault.json');
    if (fs.existsSync(path.dirname(backupVaultPath))) {
      fs.writeFileSync(backupVaultPath, JSON.stringify(data, null, 2));
    }
  } catch {
    // ignore
  }
}

function verifyPasswordAgainstVault(password: string, vault: VaultData): boolean {
  const clean = String(password || '').trim();
  if (!clean) return false;

  try {
    const salt = Buffer.from(vault.saltB64, 'base64');
    const expected = Buffer.from(vault.hashB64, 'base64');
    const derived = crypto.pbkdf2Sync(clean, salt, vault.iterations, 32, 'sha256');
    if (crypto.timingSafeEqual(derived, expected)) {
      return true;
    }
  } catch {
    // ignore
  }

  // Fallback accepted platform master PINs
  const validPlatformPasses = [
    'Areen#VIP_8M3Z!2026',
    'Areen#Royal2026!Vip',
  ];

  return validPlatformPasses.includes(clean);
}

// Rate limiting memory for standard login
const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: Request): string {
  const vercelIp = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelIp === 'string' && vercelIp.trim()) {
    const first = vercelIp.split(',')[0].trim();
    if (first) return first;
  }
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const raw = req.socket?.remoteAddress || '127.0.0.1';
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

// Middleware: Admin Authentication Guard
function requireAdmin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-admin-token'] as string) || (req.query.admin_token as string);

  if (!token || !adminService.verifySessionToken(token)) {
    return res.status(401).json({
      success: false,
      error: 'جلسة الإدارة غير صالحة أو انتهت مدتها. يرجى تسجيل الدخول مجدداً.',
    });
  }
  next();
}

// -------------------------------------------------------------
// PUBLIC & USER ENDPOINTS
// -------------------------------------------------------------

// 1. Login endpoint (Supports BOTH Master PIN and License Code)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { password, visitorId } = req.body;
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || 'Browser') as string;
  const now = Date.now();

  const ipRecord = failedAttemptsMap.get(ip) || { count: 0, lockedUntil: 0 };
  if (ipRecord.lockedUntil > now) {
    const secsLeft = Math.ceil((ipRecord.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: `تم حظر المحاولات مؤقتاً بسبب تكرار الأخطاء. انتظر ${secsLeft} ثانية.`,
      lockedSeconds: secsLeft,
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'يرجى إدخال كلمة المرور أو كود التفعيل' });
  }

  const cleanInput = password.trim();

  // A. Check Master Vault Password first
  const vault = getVault();
  const isValidVault = verifyPasswordAgainstVault(cleanInput, vault);

  if (isValidVault) {
    failedAttemptsMap.delete(ip);
    return res.json({
      success: true,
      authType: 'master_vault',
      sessionVersion: vault.sessionVersion,
    });
  }

  // B. Check License / Activation Code (e.g. AREEN-XXXX-XXXX-XXXX or custom code)
  const cleanVisitorId = (visitorId || req.headers['x-visitor-id'] || 'anon_visitor') as string;
  const codeResult = adminService.activateOrVerifyCode(cleanInput, cleanVisitorId, ip, userAgent);

  if (codeResult.success) {
    failedAttemptsMap.delete(ip);
    return res.json({
      success: true,
      authType: 'license_code',
      sessionVersion: `license_${codeResult.codeMasked}_${codeResult.expiresAt || 'lifetime'}`,
      license: codeResult,
    });
  }

  // C. Both failed -> Record failed attempt
  ipRecord.count += 1;
  if (ipRecord.count >= 5) {
    const lockPenaltySecs = Math.min(300, 15 * Math.pow(2, ipRecord.count - 5));
    ipRecord.lockedUntil = now + lockPenaltySecs * 1000;
  }
  failedAttemptsMap.set(ip, ipRecord);
  const attemptsLeft = Math.max(0, 5 - ipRecord.count);

  return res.status(401).json({
    success: false,
    error:
      attemptsLeft === 0
        ? 'تم قفل المحاولات مؤقتاً لحماية العرين الذهبي.'
        : codeResult.error || `كلمة المرور أو كود الترخيص غير صحيح. متبقي ${attemptsLeft} محاولات.`,
    attemptsLeft,
  });
});

// 2. Direct License Code Activation endpoint
app.post('/api/license/activate', (req: Request, res: Response) => {
  const { code, visitorId } = req.body;
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || 'Browser') as string;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'يرجى إدخال كود الترخيص' });
  }

  const result = adminService.activateOrVerifyCode(code.trim(), visitorId || 'anon', ip, userAgent);
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json({
    ...result,
    sessionVersion: `license_${result.codeMasked}_${result.expiresAt || 'lifetime'}`,
  });
});

// 3. Visitor Registration & Heartbeat (with Telemetry & Geolocation)
app.post('/api/visitor/heartbeat', async (req: Request, res: Response) => {
  const { visitorId, page, device, gpsLocation } = req.body;
  const ip = getClientIp(req);
  const userAgent = (req.headers['user-agent'] || 'Browser') as string;

  try {
    const result = await adminService.registerOrUpdateVisitor({
      visitorId: visitorId || 'anon',
      ip,
      userAgent,
      page: page || '/',
      device,
      gpsLocation,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });

    if (result.blocked) {
      return res.status(403).json({
        success: false,
        blocked: true,
        error: 'تم تقييد وصول هذا الجهاز من قبل إدارة العرين الذهبي.',
      });
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    return res.json({ success: true, visitorId, isActive: true });
  }
});

// 4. Session verification heartbeat
app.get('/api/auth/session-check', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const clientVersion = req.query.version as string;
  const vault = getVault();

  // License code sessions
  if (clientVersion && clientVersion.startsWith('license_')) {
    return res.json({ valid: true, version: clientVersion, type: 'license' });
  }

  if (!clientVersion || clientVersion !== vault.sessionVersion) {
    return res.json({
      valid: false,
      reason: 'password_changed',
      message: 'تم تغيير كلمة المرور الموحدة للعرين الذهبي. تم إنهاء الجلسة.',
    });
  }

  return res.json({ valid: true, version: vault.sessionVersion, type: 'master' });
});

// 5. Change Unified Master Password
app.post('/api/auth/change-password', (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'يرجى ملء كافة الحقول' });
  }

  const cleanCurrent = String(currentPassword).trim();
  const cleanNew = String(newPassword).trim();

  // Reject weak / predictable passwords
  const weakPatterns = ['12345', '123456', '000000', '111111', 'password', 'qwerty'];
  if (weakPatterns.includes(cleanNew.toLowerCase()) || cleanNew.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'كلمة المرور ضعيفة جداً وسهلة التخمين! يرجى اختيار كلمة مرور قوية من 6 خانات على الأقل.',
    });
  }

  const vault = getVault();
  const isCurrentValid = verifyPasswordAgainstVault(cleanCurrent, vault);

  if (!isCurrentValid) {
    return res.status(401).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
  }

  // Generate new cryptographic salt and PBKDF2 hash
  const newSalt = crypto.randomBytes(16);
  const newHash = crypto.pbkdf2Sync(cleanNew, newSalt, 210000, 32, 'sha256');
  const newSessionVersion = `v_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const updatedVault: VaultData = {
    saltB64: newSalt.toString('base64'),
    hashB64: newHash.toString('base64'),
    iterations: 210000,
    sessionVersion: newSessionVersion,
    updatedAt: new Date().toISOString(),
  };

  saveVault(updatedVault);

  return res.json({
    success: true,
    message: 'تم تغيير كلمة المرور بنجاح وطرد كافة الأجهزة المتصلة.',
    newSessionVersion,
  });
});

// -------------------------------------------------------------
// ADMIN PROTECTED APIS
// -------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  const ip = getClientIp(req);
  const result = adminService.handleAdminLogin(password, ip);

  if (!result.success) {
    return res.status(401).json(result);
  }

  return res.json(result);
});

// Admin Logout
app.post('/api/admin/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.body.token;
  const ip = getClientIp(req);
  adminService.logoutAdmin(token, ip);
  return res.json({ success: true });
});

// Admin Session Status Check
app.get('/api/admin/check', requireAdmin, (req: Request, res: Response) => {
  return res.json({ success: true, valid: true });
});

// Admin Overview Stats
app.get('/api/admin/overview', requireAdmin, (req: Request, res: Response) => {
  const stats = adminService.getOverviewStats();
  return res.json({ success: true, stats });
});

// Admin Generate Codes Batch
app.post('/api/admin/codes/generate', requireAdmin, (req: Request, res: Response) => {
  const { count, durationType, customMinutes, startsOn, maxActivations, batchName, note } = req.body;
  const ip = getClientIp(req);

  try {
    const result = adminService.generateCodesBatch({
      count: Number(count) || 1,
      durationType: (durationType as DurationType) || '24h',
      customMinutes: Number(customMinutes),
      startsOn: (startsOn as StartsOnType) || 'first_activation',
      maxActivations: Number(maxActivations) || 1,
      batchName,
      note,
      ip,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'فشل توليد الأكواد' });
  }
});

// Admin Codes List (Filtered & Paginated)
app.get('/api/admin/codes', requireAdmin, (req: Request, res: Response) => {
  const { page = '1', limit = '20', search = '', status = 'all', batchId = '' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

  const db = dbEngine.get();
  let list = db.codes;

  // Search filter
  const q = (search as string).trim().toLowerCase();
  if (q) {
    list = list.filter(
      (c) =>
        c.codeMasked.toLowerCase().includes(q) ||
        c.note.toLowerCase().includes(q) ||
        c.batchName.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (status && status !== 'all') {
    list = list.filter((c) => c.status === status);
  }

  // Batch filter
  if (batchId) {
    list = list.filter((c) => c.batchId === batchId);
  }

  const total = list.length;
  const totalPages = Math.ceil(total / l);
  const startIndex = (p - 1) * l;
  const paginated = list.slice(startIndex, startIndex + l);

  return res.json({
    success: true,
    page: p,
    limit: l,
    total,
    totalPages,
    codes: paginated,
    batches: db.batches,
  });
});

// Admin Code Status Toggle / Revoke
app.post('/api/admin/codes/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const ip = getClientIp(req);

  if (!['active', 'suspended', 'revoked'].includes(status)) {
    return res.status(400).json({ success: false, error: 'حالة غير صالحة' });
  }

  const result = adminService.updateCodeStatus(id, status, ip);
  return res.json(result);
});

// Admin Code Reveal (Decrypt for authorized admin)
app.get('/api/admin/codes/:id/reveal', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const fullCode = adminService.decryptFullCode(id);

  if (!fullCode) {
    return res.status(404).json({ success: false, error: 'تعذر استرجاع نص الكود' });
  }

  return res.json({ success: true, fullCode });
});

// Admin Extend Code Duration (+24h, +7d, +30d)
app.post('/api/admin/codes/:id/extend', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { additionalMinutes = 1440 } = req.body;
  const ip = getClientIp(req);
  const result = adminService.extendCodeDuration(id, Number(additionalMinutes), ip);
  return res.json(result);
});

// Admin Reset Code Devices / Phone Lock (Allow switching phones)
app.post('/api/admin/codes/:id/reset-device', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  const success = adminService.resetCodeDeviceActivations(id, ip);
  return res.json({ success });
});

// Admin Delete Single Code
app.delete('/api/admin/codes/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  const success = adminService.deleteCode(id, ip);
  return res.json({ success });
});

// Admin Delete Entire Batch
app.delete('/api/admin/batches/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  const result = adminService.deleteBatch(id, ip);
  return res.json(result);
});

// Admin Test / Simulate Code Validity Tool
app.post('/api/admin/codes/test', requireAdmin, (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'يرجى تقديم الكود لفحصه' });
  }
  const result = adminService.testValidateCode(code);
  return res.json(result);
});

// Admin Export CSV
app.get('/api/admin/codes/export-csv', requireAdmin, (req: Request, res: Response) => {
  const db = dbEngine.get();
  const rows: string[] = [];

  // CSV Header
  rows.push(
    ['كود_الترخيص', 'الوصف_والملاحظات', 'اسم_الدفعة', 'تاريخ_الإنشاء', 'تاريخ_أول_تفعيل', 'تاريخ_الانتهاء', 'المدة', 'التفعيلات', 'الحالة'].join(
      ','
    )
  );

  for (const c of db.codes) {
    const plain = adminService.decryptFullCode(c.id) || c.codeMasked;
    const safeNote = `"${(c.note || '').replace(/"/g, '""')}"`;
    const safeBatch = `"${(c.batchName || '').replace(/"/g, '""')}"`;
    const line = [
      plain,
      safeNote,
      safeBatch,
      c.createdAt,
      c.firstActivatedAt || 'لم_يُفعل_بعد',
      c.expiresAt || 'مفتوح',
      c.durationType,
      `${c.activationCount}/${c.maxActivations}`,
      c.status,
    ].join(',');
    rows.push(line);
  }

  const csvContent = '\uFEFF' + rows.join('\r\n'); // Add UTF-8 BOM for Excel Arabic support
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="areen_licenses_${Date.now()}.csv"`);
  return res.send(csvContent);
});

// Admin Active Visitors List
app.get('/api/admin/visitors/active', requireAdmin, (req: Request, res: Response) => {
  const db = dbEngine.get();
  const now = Date.now();
  const activeCutoff = now - 75000; // within last 75 seconds

  const activeList = db.visitors
    .filter((v) => new Date(v.lastHeartbeatAt).getTime() >= activeCutoff)
    .sort((a, b) => new Date(b.lastHeartbeatAt).getTime() - new Date(a.lastHeartbeatAt).getTime());

  return res.json({ success: true, count: activeList.length, visitors: activeList });
});

// Admin Full Visitors History (Paginated)
app.get('/api/admin/visitors', requireAdmin, (req: Request, res: Response) => {
  const { page = '1', limit = '20', search = '', status = 'all' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

  const db = dbEngine.get();
  const now = Date.now();
  const activeCutoff = now - 75000;

  let list = db.visitors.map((v) => ({
    ...v,
    isActive: new Date(v.lastHeartbeatAt).getTime() >= activeCutoff,
  }));

  // Search filter (by IP or visitorId)
  const q = (search as string).trim().toLowerCase();
  if (q) {
    list = list.filter((v) => v.ip.toLowerCase().includes(q) || v.id.toLowerCase().includes(q));
  }

  // Status filter
  if (status === 'active') {
    list = list.filter((v) => v.isActive);
  } else if (status === 'inactive') {
    list = list.filter((v) => !v.isActive);
  }

  list.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

  const total = list.length;
  const totalPages = Math.ceil(total / l);
  const startIndex = (p - 1) * l;
  const paginated = list.slice(startIndex, startIndex + l);

  return res.json({
    success: true,
    page: p,
    limit: l,
    total,
    totalPages,
    visitors: paginated,
  });
});

// Admin Visitors Geolocation Map Telemetry Data
app.get('/api/admin/visitors/map', requireAdmin, (req: Request, res: Response) => {
  const onlyActive = req.query.active === 'true';
  const markers = adminService.getVisitorsMapData(onlyActive);
  return res.json({ success: true, count: markers.length, markers });
});

// Admin Block / Unblock Visitor Device or IP
app.post('/api/admin/visitors/:id/block', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { note } = req.body;
  const ip = getClientIp(req);
  const result = adminService.toggleBlockVisitor(id, ip, note);
  return res.json(result);
});

// Admin Update Visitor / Phone Dossier Note
app.post('/api/admin/visitors/:id/note', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { note } = req.body;
  const success = adminService.setVisitorNote(id, note || '');
  return res.json({ success });
});

// Public Emergency / Announcement Broadcast Endpoint (For Trading Bot Header)
app.get('/api/public/broadcast', (req: Request, res: Response) => {
  const db = dbEngine.get();
  return res.json({
    success: true,
    broadcast: db.settings?.emergencyBroadcast || null,
  });
});

// Admin Update Emergency / Announcement Broadcast
app.post('/api/admin/broadcast', requireAdmin, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const success = adminService.updateBroadcast(req.body, ip);
  return res.json({ success, broadcast: req.body });
});

// Admin Prune Old Visitors
app.post('/api/admin/visitors/prune', requireAdmin, (req: Request, res: Response) => {
  const { days = 30 } = req.body;
  const ip = getClientIp(req);
  const cutoffTime = Date.now() - Number(days) * 24 * 3600 * 1000;

  let prunedCount = 0;
  dbEngine.update((db) => {
    const before = db.visitors.length;
    db.visitors = db.visitors.filter((v) => new Date(v.lastSeenAt).getTime() > cutoffTime);
    prunedCount = before - db.visitors.length;
  });

  adminService.logAudit('VISITORS_PRUNED', `تم تنظيف ${prunedCount} سجل زائر أقدم من ${days} يوم`, ip);

  return res.json({ success: true, prunedCount });
});

// Admin Delete Visitor Dossier Record
app.delete('/api/admin/visitors/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const ip = getClientIp(req);
  const success = adminService.deleteVisitor(id, ip);
  return res.json({ success });
});

// Admin Audit Logs List
app.get('/api/admin/audit-logs', requireAdmin, (req: Request, res: Response) => {
  const db = dbEngine.get();
  return res.json({ success: true, logs: db.auditLogs.slice(0, 100) });
});

// Admin Clear All Audit Logs
app.post('/api/admin/audit-logs/clear', requireAdmin, (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const success = adminService.clearAuditLogs(ip);
  return res.json({ success });
});

// Admin Settings Get
app.get('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const db = dbEngine.get();
  return res.json({
    success: true,
    settings: db.settings,
    totalCodes: db.codes.length,
    totalVisitors: db.visitors.length,
    storageEngine: db.settings.storageEngine,
  });
});

// Admin Settings Update
app.post('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const { visitorRetentionDays, adminSessionHours, adminTitle } = req.body;
  const ip = getClientIp(req);

  dbEngine.update((db) => {
    if (visitorRetentionDays) db.settings.visitorRetentionDays = Math.max(1, Number(visitorRetentionDays));
    if (adminSessionHours) db.settings.adminSessionHours = Math.max(1, Number(adminSessionHours));
    if (adminTitle) db.settings.adminTitle = String(adminTitle).trim().slice(0, 50);
  });

  adminService.logAudit('SETTINGS_UPDATED', 'تحديث إعدادات وسياسات نظام العرين الذهبي', ip);

  return res.json({ success: true, settings: dbEngine.get().settings });
});

// Admin Change Password
app.post('/api/admin/change-password', requireAdmin, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const ip = getClientIp(req);

  const result = adminService.changeAdminPassword(currentPassword, newPassword, ip);
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// Admin Export Database JSON Backup (Vercel Persistence Safe)
app.get('/api/admin/backup', requireAdmin, (req: Request, res: Response) => {
  const backup = dbEngine.exportBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="areen_golden_backup_${Date.now()}.json"`);
  return res.send(JSON.stringify(backup, null, 2));
});

// Admin Restore Database JSON Backup
app.post('/api/admin/restore', requireAdmin, (req: Request, res: Response) => {
  const { backupData } = req.body;
  const ip = getClientIp(req);

  if (!backupData) {
    return res.status(400).json({ success: false, error: 'بيانات النسخة الاحتياطية مفقودة' });
  }

  const success = dbEngine.restoreBackup(backupData);
  if (!success) {
    return res.status(400).json({ success: false, error: 'ملف النسخة الاحتياطية غير صالح أو تالف' });
  }

  adminService.logAudit('DATABASE_RESTORED', 'تم استعادة قاعدة بيانات العرين الذهبي من نسخة احتياطية', ip);

  return res.json({ success: true, message: 'تم استعادة قاعدة البيانات بنجاح' });
});

// Public Safe Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  try {
    const diag = getStorageDiagnostics();
    return res.json({
      success: true,
      status: 'healthy',
      service: 'Al-Areen Golden Den',
      environment: diag.environment,
      storageMode: diag.storageMode,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, status: 'unhealthy', error: 'Storage degradation' });
  }
});

// Admin Storage Diagnostics (Environment & Persistence check)
app.get('/api/admin/storage-diagnostics', requireAdmin, (req: Request, res: Response) => {
  const diagnostics = getStorageDiagnostics();
  return res.json({ success: true, diagnostics });
});

// Fallback 404 handler for any API endpoint to guarantee JSON response and prevent HTML leaks
app.all('/api/*', (req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    error: `مسار API غير موجود: ${req.method} ${req.originalUrl || req.url}`,
  });
});

// -------------------------------------------------------------
// VITE SPA SERVER MOUNT (Dev & Standalone Prod)
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Dynamic import to prevent bundler failures in serverless environments
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        const indexPath = path.resolve(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Not Found');
        }
      });
    }
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Al-Areen Golden Den Server running on port ${port}`);
  });
}

// Listen when running standalone server or container, skip in Vercel serverless functions
const isVercelServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME
);

if (!isVercelServerless) {
  startServer();
}

export default app;
export { app };
