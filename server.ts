import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const DATA_DIR = path.resolve(process.cwd(), 'data');
const AUTH_FILE = path.resolve(DATA_DIR, 'auth_vault.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface VaultData {
  saltB64: string;
  hashB64: string;
  iterations: number;
  sessionVersion: string;
  updatedAt: string;
}

// Initial Default Vault configuration (Password: Areen#Royal2026!Vip)
const INITIAL_VAULT: VaultData = {
  saltB64: 'Bijn2gjyA5a1Qg42bffRhw==',
  hashB64: 'Jvo8tZxpSXEKTrTqI3nO5vSZov+dz4NRUFOBVYaPGxw=',
  iterations: 210000,
  sessionVersion: 'epoch_1791307003322_5474b3c2995e',
  updatedAt: new Date().toISOString(),
};

function getVault(): VaultData {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const content = fs.readFileSync(AUTH_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // ignore
  }
  fs.writeFileSync(AUTH_FILE, JSON.stringify(INITIAL_VAULT, null, 2));
  return INITIAL_VAULT;
}

function saveVault(data: VaultData) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
}

function verifyPasswordAgainstVault(password: string, vault: VaultData): boolean {
  try {
    const salt = Buffer.from(vault.saltB64, 'base64');
    const expected = Buffer.from(vault.hashB64, 'base64');
    const derived = crypto.pbkdf2Sync(password, salt, vault.iterations, 32, 'sha256');
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// Rate limiting memory
const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

// API Routes
// 1. Login endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { password } = req.body;
  const ip = getClientIp(req);
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
    return res.status(400).json({ success: false, error: 'يرجى إدخال كلمة المرور' });
  }

  const cleanPass = password.trim();
  const vault = getVault();
  const isValid = verifyPasswordAgainstVault(cleanPass, vault);

  if (isValid) {
    failedAttemptsMap.delete(ip);
    return res.json({
      success: true,
      sessionVersion: vault.sessionVersion,
    });
  } else {
    ipRecord.count += 1;
    if (ipRecord.count >= 5) {
      const lockPenaltySecs = Math.min(300, 15 * Math.pow(2, ipRecord.count - 5));
      ipRecord.lockedUntil = now + lockPenaltySecs * 1000;
    }
    failedAttemptsMap.set(ip, ipRecord);
    const attemptsLeft = Math.max(0, 5 - ipRecord.count);

    return res.status(401).json({
      success: false,
      error: attemptsLeft === 0
        ? 'تم قفل المحاولات مؤقتاً لحماية العرين الذهبي.'
        : `كلمة المرور غير صحيحة. متبقي ${attemptsLeft} محاولات.`,
      attemptsLeft,
    });
  }
});

// 2. Session verification heartbeat - checks if password was changed elsewhere
app.get('/api/auth/session-check', (req: Request, res: Response) => {
  const clientVersion = req.query.version;
  const vault = getVault();

  if (!clientVersion || clientVersion !== vault.sessionVersion) {
    return res.json({
      valid: false,
      reason: 'password_changed',
      message: 'تم تغيير كلمة المرور الموحدة للعرين الذهبي. تم إنهاء الجلسة.',
    });
  }

  return res.json({ valid: true, version: vault.sessionVersion });
});

// 3. Change Unified Master Password - Kicks out all other devices immediately!
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

  // Generate fresh session version to instantly invalidate all other sessions
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

// Mount Vite or static build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Al-Areen Golden Den Server running on port ${port}`);
  });
}

startServer();
