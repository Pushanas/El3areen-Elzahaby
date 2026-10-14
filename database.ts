import fs from 'fs';
import path from 'path';
import {
  DATA_DIR,
  DB_FILE,
  ensureDataDirectory,
  isDirectoryWritable,
  initSqliteDatabase,
  getDatabase,
  getStorageInfo,
} from './src/utils/database.ts';

export * from './src/utils/database.ts';

/**
 * بيئة التشغيل ومعلومات استمرارية التخزين (Runtime Environment & Storage Persistence)
 */
export interface EnvironmentInfo {
  isVercel: boolean;
  isCloudRun: boolean;
  isRailway: boolean;
  isRender: boolean;
  isProduction: boolean;
  platformName: string;
  storageMode: 'vercel_kv' | 'persistent_volume' | 'ephemeral_tmp_seeded' | 'local_disk';
  dataDirectory: string;
  databaseFilePath: string;
  sqliteDatabaseFilePath: string;
  authVaultFilePath: string;
  seedSourceDirectory: string;
  hasVercelKv: boolean;
}

/**
 * دالة الاكتشاف التلقائي لبيئة التشغيل وتحديد المسار الدائم للبيانات
 */
export function detectEnvironment(): EnvironmentInfo {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV);
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
  const isProduction = process.env.NODE_ENV === 'production';
  const hasVercelKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  let platformName = 'Standard Node.js';
  if (isVercel) platformName = 'Vercel Serverless';
  else if (isCloudRun) platformName = 'Google Cloud Run';
  else if (isRailway) platformName = 'Railway Cloud';
  else if (isRender) platformName = 'Render Cloud';

  const rootCwd = process.cwd();
  const seedSourceDirectory = path.resolve(rootCwd, 'data');

  let storageMode: EnvironmentInfo['storageMode'];

  if (process.env.PERSISTENT_DATA_DIR) {
    storageMode = 'persistent_volume';
  } else if (process.env.DATA_DIR) {
    storageMode = 'persistent_volume';
  } else if (hasVercelKv) {
    storageMode = 'vercel_kv';
  } else if (isVercel) {
    storageMode = 'ephemeral_tmp_seeded';
  } else {
    storageMode = 'local_disk';
  }

  const databaseFilePath = path.resolve(DATA_DIR, 'db.json');
  const sqliteDatabaseFilePath = DB_FILE;
  const authVaultFilePath = path.resolve(DATA_DIR, 'auth_vault.json');

  return {
    isVercel,
    isCloudRun,
    isRailway,
    isRender,
    isProduction,
    platformName,
    storageMode,
    dataDirectory: DATA_DIR,
    databaseFilePath,
    sqliteDatabaseFilePath,
    authVaultFilePath,
    seedSourceDirectory,
    hasVercelKv,
  };
}

export const envInfo = detectEnvironment();

export function getCandidateSourceDataDirs(): string[] {
  const baseDir = typeof import.meta !== 'undefined' && import.meta.dirname ? import.meta.dirname : process.cwd();
  const dirs = [
    path.resolve(process.cwd(), 'data'),
    path.resolve('/var/task', 'data'),
    path.resolve(baseDir, 'data'),
    path.resolve(baseDir, '../data'),
    path.resolve(baseDir, '../../data'),
  ];
  return dirs.filter((d, i, arr) => arr.indexOf(d) === i);
}

export function findSourceDataFile(fileName: string): string | null {
  for (const dir of getCandidateSourceDataDirs()) {
    const full = path.resolve(dir, fileName);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

/**
 * تهيئة وتأمين مسار التخزين ومنع فقدان البيانات عند إعادة النشر
 */
export function ensureStorageInitialized(): void {
  ensureDataDirectory();

  const targetDbPath = path.resolve(DATA_DIR, 'db.json');
  const targetVaultPath = path.resolve(DATA_DIR, 'auth_vault.json');

  try {
    if (!fs.existsSync(targetDbPath)) {
      const srcDb = findSourceDataFile('db.json');
      if (srcDb && srcDb !== targetDbPath) {
        fs.copyFileSync(srcDb, targetDbPath);
        console.log(`[Database] ✅ Successfully seeded db.json into persistent storage from ${srcDb}`);
      }
    }
    if (!fs.existsSync(targetVaultPath)) {
      const srcVault = findSourceDataFile('auth_vault.json');
      if (srcVault && srcVault !== targetVaultPath) {
        fs.copyFileSync(srcVault, targetVaultPath);
        console.log(`[Database] ✅ Successfully seeded auth_vault.json into persistent storage from ${srcVault}`);
      }
    }
  } catch (err) {
    console.warn('[Database] Seed initialization notice:', err);
  }
}

/**
 * محول Vercel KV اختياري
 */
export const vercelKvAdapter = {
  isEnabled(): boolean {
    return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  },

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled()) return null;
    try {
      const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.result) return null;
      return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    } catch {
      return null;
    }
  },

  async set(key: string, value: any): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`;
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serialized),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

/**
 * فحص صحة وتشخيص التخزين وقاعدة البيانات
 */
export function getStorageDiagnostics() {
  const sqliteInfo = getStorageInfo();
  const currentEnv = detectEnvironment();

  return {
    environment: currentEnv.platformName,
    storageMode: currentEnv.storageMode,
    isVercel: currentEnv.isVercel,
    hasVercelKv: currentEnv.hasVercelKv,
    dataDirectory: DATA_DIR,
    databaseFile: currentEnv.databaseFilePath,
    sqliteFile: DB_FILE,
    sqliteSize: sqliteInfo.databaseSizeBytes,
    authVaultFile: currentEnv.authVaultFilePath,
    status: sqliteInfo.status,
  };
}

ensureStorageInitialized();

export default {
  DATA_DIR,
  DB_FILE,
  ensureDataDirectory,
  isDirectoryWritable,
  initSqliteDatabase,
  getDatabase,
  getStorageInfo,
  detectEnvironment,
  envInfo,
  ensureStorageInitialized,
  vercelKvAdapter,
  getStorageDiagnostics,
};
