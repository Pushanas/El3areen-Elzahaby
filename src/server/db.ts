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

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface DeviceTelemetry {
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  model?: string;
  os?: string;
  browser?: string;
  screenResolution?: string;
  platform?: string;
  language?: string;
  timezone?: string;
  connectionType?: string;
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface IpLocation {
  country?: string;
  countryCode?: string;
  flag?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  org?: string;
  timezone?: string;
}

export interface TargetedMessage {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'alert' | 'vip';
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
  countryCode?: string;
  flag?: string;
  city?: string;
  region?: string;
  isp?: string;
  ipLocation?: IpLocation;
  device?: DeviceTelemetry;
  gpsLocation?: GpsLocation;
  blocked?: boolean;
  note?: string;
  // --- High-Level License & Remote Presence Features ---
  authType?: 'license_code' | 'master_vault' | 'guest';
  activeCodeMasked?: string;
  activeCodeId?: string;
  licenseExpiresAt?: string | null;
  licenseDuration?: string;
  licenseStatus?: string;
  licenseMaxActivations?: number;
  licenseActivationCount?: number;
  forceKickout?: boolean;
  targetedMessage?: TargetedMessage | null;
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

export interface EmergencyBroadcast {
  enabled: boolean;
  message: string;
  level: 'info' | 'warning' | 'vip' | 'alert';
  updatedAt: string;
}

export interface SystemSettings {
  visitorRetentionDays: number;
  adminSessionHours: number;
  adminTitle: string;
  storageEngine: string;
  emergencyBroadcast?: EmergencyBroadcast;
}

export interface AppDatabase {
  admin: AdminAuth;
  codes: LicenseCode[];
  batches: CodeBatch[];
  visitors: VisitorRecord[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

import { FALLBACK_DATABASE } from './seedFallback.ts';

// Master encryption keys (supports both configured env and default fallback)
const DEFAULT_CIPHER_SECRET = 'AREEN_GOLDEN_DEN_MASTER_CIPHER_SECRET_2026_KEY';
const DEFAULT_CIPHER_KEY = crypto.createHash('sha256').update(DEFAULT_CIPHER_SECRET).digest();

const cipherSecretEnv = (process.env.CIPHER_SECRET || '').trim().replace(/^["']|["']$/g, '');
export const ACTIVE_CIPHER_KEY = cipherSecretEnv
  ? crypto.createHash('sha256').update(cipherSecretEnv).digest()
  : DEFAULT_CIPHER_KEY;

export function encryptString(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ACTIVE_CIPHER_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decryptWithKey(cipherText: string, key: Buffer): string | null {
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

export function decryptString(cipherText: string): string | null {
  // Try active key first, then fallback to default key
  return decryptWithKey(cipherText, ACTIVE_CIPHER_KEY) || decryptWithKey(cipherText, DEFAULT_CIPHER_KEY);
}

// Hash code for secure lookup (produces primary lookup hash)
export function hashCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  return crypto.createHmac('sha256', ACTIVE_CIPHER_KEY).update(normalized).digest('hex');
}

// Find matching license code regardless of key migration or hashing differences
export function findMatchingCodeInList(codes: LicenseCode[], rawInput: string): LicenseCode | undefined {
  if (!rawInput || typeof rawInput !== 'string') return undefined;
  const normalized = rawInput.trim().toUpperCase().replace(/\s+/g, '');

  // 1. Direct active hash check
  const activeHash = hashCode(normalized);
  let found = codes.find((c) => c.codeHash === activeHash);
  if (found) return found;

  // 2. Default key HMAC check
  const fallbackHash = crypto.createHmac('sha256', DEFAULT_CIPHER_KEY).update(normalized).digest('hex');
  found = codes.find((c) => c.codeHash === fallbackHash);
  if (found) return found;

  // 3. Plain SHA-256 check
  const plainHash = crypto.createHash('sha256').update(normalized).digest('hex');
  found = codes.find((c) => c.codeHash === plainHash);
  if (found) return found;

  // 4. Decrypt and compare plaintext code
  for (const c of codes) {
    if (c.codeCipher) {
      const dec = decryptString(c.codeCipher);
      if (dec && dec.trim().toUpperCase().replace(/\s+/g, '') === normalized) {
        return c;
      }
    }
  }

  // 5. Match by suffix if standard AREEN-XXXX-XXXX-XXXX format
  const parts = normalized.split('-');
  if (parts.length >= 4) {
    const suffix = parts[3];
    const candidate = codes.find((c) => c.codeMasked.endsWith(suffix));
    if (candidate && candidate.codeCipher) {
      const dec = decryptString(candidate.codeCipher);
      if (dec && dec.trim().toUpperCase().replace(/\s+/g, '') === normalized) {
        return candidate;
      }
    }
  }

  return undefined;
}

// Default initial admin password: Areen#Admin_9X7K!2026
function generateInitialAdminAuth(): AdminAuth {
  const salt = crypto.randomBytes(16);
  const iterations = 210000;
  const initialPassword = process.env.ADMIN_PASSWORD || 'Areen#Admin_9X7K!2026';
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
    const baseDir = typeof import.meta !== 'undefined' && import.meta.dirname ? import.meta.dirname : process.cwd();
    const candidatePaths = [
      DB_FILE,
      path.resolve(process.cwd(), 'data', 'db.json'),
      path.resolve('/var/task', 'data', 'db.json'),
      path.resolve('/tmp', 'areen_data', 'db.json'),
      path.resolve(baseDir, '../../data', 'db.json'),
      path.resolve(baseDir, '../data', 'db.json'),
      path.resolve(baseDir, 'data', 'db.json'),
    ];

    let candidateWithoutCodes: AppDatabase | null = null;

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed?.admin && Array.isArray(parsed?.codes)) {
            if (parsed.codes.length > 0) {
              this.memoryDb = parsed;
              // Ensure DB_FILE is populated if we loaded from bundled data
              if (filePath !== DB_FILE) {
                this.flushSync();
                console.log(`[DB] ✅ Initialized DB from ${filePath} with ${parsed.codes.length} codes.`);
              }
              return parsed;
            } else if (!candidateWithoutCodes) {
              candidateWithoutCodes = parsed;
            }
          }
        } catch (e) {
          console.warn('[DB] Failed reading candidate DB path:', filePath, e);
        }
      }
    }

    if (candidateWithoutCodes) {
      this.memoryDb = candidateWithoutCodes;
      return candidateWithoutCodes;
    }

    // Use bundled pre-seeded database (includes initial admin and pre-generated codes)
    if (FALLBACK_DATABASE && Array.isArray(FALLBACK_DATABASE.codes) && FALLBACK_DATABASE.codes.length > 0) {
      this.memoryDb = JSON.parse(JSON.stringify(FALLBACK_DATABASE));
      this.flushSync();
      console.log(`[DB] ✅ Initialized DB from bundled seed data with ${this.memoryDb?.codes.length} codes.`);
      return this.memoryDb!;
    }

    const initial = getInitialDatabase();
    this.memoryDb = initial;
    this.flushSync();
    return initial;
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
