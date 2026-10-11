import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { envInfo, vercelKvAdapter, getStorageDiagnostics } from '../../database.ts';

const DB_FILE = envInfo.databaseFilePath;
const AUTH_VAULT_FILE = envInfo.authVaultFilePath;

export type CodeStatus = 'new' | 'active' | 'expired' | 'revoked' | 'suspended' | 'exhausted';
export type DurationType =
  | '1h'
  | '3h'
  | '6h'
  | '12h'
  | '24h'
  | '2d'
  | '3d'
  | '7d'
  | '14d'
  | '30d'
  | '60d'
  | '90d'
  | 'custom';

export type StartsOnType = 'first_activation' | 'creation';

export interface CodeActivationRecord {
  id: string;
  visitorId: string;
  ip: string;
  timestamp: string;
  userAgent: string;
}

export interface LicenseCode {
  id: string;
  codeHash: string; // SHA-256 HMAC for O(1) secure lookup without storing plaintext
  codeMasked: string; // e.g. AREEN-****-****-3F8A
  codeCipher?: string; // AES-256-GCM encrypted version with server key for secure retrieval
  batchId: string;
  batchName: string;
  note: string;
  durationType: DurationType;
  durationMinutes: number;
  startsOn: StartsOnType;
  maxActivations: number;
  activationCount: number;
  status: CodeStatus;
  createdAt: string;
  firstActivatedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  activations: CodeActivationRecord[];
}

export interface CodeBatch {
  id: string;
  name: string;
  count: number;
  durationType: DurationType;
  durationMinutes: number;
  startsOn: StartsOnType;
  maxActivations: number;
  createdAt: string;
}

export interface VisitorRecord {
  id: string; // visitor UUID
  ip: string;
  userAgent: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastHeartbeatAt: string;
  lastPage: string;
  visitCount: number;
  country?: string;
  city?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  ip: string;
  timestamp: string;
  adminId?: string;
}

export interface AdminAuth {
  saltB64: string;
  hashB64: string;
  iterations: number;
  updatedAt: string;
  sessionSecret: string;
}

export interface SystemSettings {
  visitorRetentionDays: number;
  adminSessionHours: number;
  adminTitle: string;
  storageEngine: string;
}

export interface AppDatabase {
  admin: AdminAuth;
  codes: LicenseCode[];
  batches: CodeBatch[];
  visitors: VisitorRecord[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

// Master encryption key for encrypted code storage (generated or from env)
const SERVER_CIPHER_KEY = crypto
  .createHash('sha256')
  .update(process.env.CIPHER_SECRET || 'AREEN_GOLDEN_DEN_MASTER_CIPHER_SECRET_2026_KEY')
  .digest();

export function encryptString(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SERVER_CIPHER_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptString(cipherText: string): string | null {
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', SERVER_CIPHER_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

// Hash code for secure non-reversible lookup
export function hashCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  return crypto.createHmac('sha256', SERVER_CIPHER_KEY).update(normalized).digest('hex');
}

// Default initial admin password: AreenAdmin#2026!Master
function generateInitialAdminAuth(): AdminAuth {
  const salt = crypto.randomBytes(16);
  const iterations = 210000;
  const initialPassword = process.env.ADMIN_PASSWORD || 'AreenAdmin#2026!Master';
  const hash = crypto.pbkdf2Sync(initialPassword, salt, iterations, 32, 'sha256');
  return {
    saltB64: salt.toString('base64'),
    hashB64: hash.toString('base64'),
    iterations,
    updatedAt: new Date().toISOString(),
    sessionSecret: crypto.randomBytes(32).toString('hex'),
  };
}

function getInitialDatabase(): AppDatabase {
  return {
    admin: generateInitialAdminAuth(),
    codes: [],
    batches: [],
    visitors: [],
    auditLogs: [
      {
        id: crypto.randomUUID(),
        action: 'SYSTEM_INIT',
        details: 'تم تهيئة وتأمين منظومة العرين الذهبي بنجاح.',
        ip: '127.0.0.1',
        timestamp: new Date().toISOString(),
      },
    ],
    settings: {
      visitorRetentionDays: 30,
      adminSessionHours: 24,
      adminTitle: 'لوحة قيادة العرين الذهبي',
      storageEngine: 'atomic_file_json',
    },
  };
}

// In-Memory Database Cache with Synchronized Atomic File Writing
class DatabaseEngine {
  private memoryDb: AppDatabase | null = null;
  private writeLock = false;
  private pendingWrite = false;

  constructor() {
    this.load();
  }

  private load(): AppDatabase {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.memoryDb = JSON.parse(raw);
        if (!this.memoryDb?.admin || !this.memoryDb?.codes) {
          throw new Error('Corrupt DB structure');
        }
        return this.memoryDb;
      }
    } catch (e) {
      console.warn('[DB] Failed reading db.json, generating initial database:', e);
    }

    this.memoryDb = getInitialDatabase();
    this.flushSync();
    return this.memoryDb;
  }

  public get(): AppDatabase {
    if (!this.memoryDb) {
      return this.load();
    }
    return this.memoryDb;
  }

  // Atomically flush database to disk with write-tmp-then-rename to prevent data corruption
  public flushSync() {
    if (!this.memoryDb) return;
    const jsonStr = JSON.stringify(this.memoryDb, null, 2);
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tmpFile, jsonStr, 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch {
      // Fallback in case rename fails across filesystems
      try {
        fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
      } catch (err) {
        console.error('[DB] Failed writing database:', err);
      }
    }

    // مزامنة سحابية إضافية عبر Vercel KV في حال توفرها
    if (vercelKvAdapter.isEnabled()) {
      vercelKvAdapter.set('areen_golden_db', this.memoryDb).catch((kvErr) => {
        console.warn('[DB] Vercel KV background sync warning:', kvErr);
      });
    }
  }

  public updateSync<T>(updater: (db: AppDatabase) => T): T {
    const db = this.get();
    const result = updater(db);
    this.flushSync();
    return result;
  }

  public async update<T>(updater: (db: AppDatabase) => T | Promise<T>): Promise<T> {
    const db = this.get();
    const result = await updater(db);
    this.flushSync();
    return result;
  }

  // Export full JSON database for backup
  public exportBackup(): AppDatabase {
    return JSON.parse(JSON.stringify(this.get()));
  }

  // Restore database from valid JSON backup
  public restoreBackup(newDb: Partial<AppDatabase>): boolean {
    if (!newDb.admin || !Array.isArray(newDb.codes)) {
      return false;
    }
    this.memoryDb = {
      admin: newDb.admin,
      codes: newDb.codes || [],
      batches: newDb.batches || [],
      visitors: newDb.visitors || [],
      auditLogs: newDb.auditLogs || [],
      settings: newDb.settings || getInitialDatabase().settings,
    };
    this.flushSync();
    return true;
  }
}

export const dbEngine = new DatabaseEngine();
