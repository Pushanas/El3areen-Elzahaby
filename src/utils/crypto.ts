// Unified Master Cryptographic Engine & Server Sync for Al-Areen Al-Dahabi

const DEFAULT_VAULT = {
  saltB64: 'eIsF9C6s9IW/lJTGF9UH3w==',
  hashB64: 'vO7O5Nbr+1jl0qUTHVDbKeiesJenK2IPXoRCagujCjs=',
  iterations: 210000,
};

function b64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return buf;
}

function bufferToB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Client-side local PBKDF2 verification fallback
async function localPbkdf2Verify(password: string): Promise<boolean> {
  try {
    const customSaltB64 = localStorage.getItem('areen_auth_salt');
    const customHashB64 = localStorage.getItem('areen_auth_hash');

    const saltB64 = customSaltB64 || DEFAULT_VAULT.saltB64;
    const expectedHashB64 = customHashB64 || DEFAULT_VAULT.hashB64;

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const saltBuffer = b64ToBuffer(saltB64);
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: DEFAULT_VAULT.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const derived = new Uint8Array(bits);
    const expected = new Uint8Array(b64ToBuffer(expectedHashB64));

    if (derived.length !== expected.length) return false;

    let diff = 0;
    for (let i = 0; i < derived.length; i++) {
      diff |= derived[i] ^ expected[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Verifies password via server API or local PBKDF2.
 * Returns session version if successful.
 */
export async function verifyMasterPassword(password: string): Promise<{ success: boolean; sessionVersion?: string; error?: string }> {
  const cleanPass = password.trim();
  if (!cleanPass) {
    return { success: false, error: 'يرجى إدخال كلمة المرور' };
  }

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cleanPass }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.sessionVersion) {
        sessionStorage.setItem('areen_session_version', data.sessionVersion);
      }
      return { success: true, sessionVersion: data.sessionVersion };
    } else {
      return { success: false, error: data.error || 'كلمة المرور غير صحيحة' };
    }
  } catch {
    // 2. Offline fallback
    const ok = await localPbkdf2Verify(cleanPass);
    if (ok) {
      const fallbackVer = localStorage.getItem('areen_auth_epoch') || 'v1';
      sessionStorage.setItem('areen_session_version', fallbackVer);
      return { success: true, sessionVersion: fallbackVer };
    }
    return { success: false, error: 'كلمة المرور غير صحيحة' };
  }
}

/**
 * Updates the unified password on the server and creates a new session epoch.
 * This triggers a kick-out signal on all other active devices.
 */
export async function updateMasterPassword(
  currentPass: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCurrent = currentPass.trim();
  const cleanNew = newPass.trim();

  // Guard against weak / predictable passwords
  const weakPatterns = ['12345', '123456', '000000', '111111', 'password', 'qwerty'];
  if (weakPatterns.includes(cleanNew.toLowerCase()) || cleanNew.length < 6) {
    return {
      success: false,
      error: 'كلمة المرور سهلة الاختراق أو أقل من 6 خانات! اختر كلمة مرور قوية لحماية العرين.',
    };
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cleanCurrent, newPassword: cleanNew }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.newSessionVersion) {
        sessionStorage.setItem('areen_session_version', data.newSessionVersion);
        localStorage.setItem('areen_auth_epoch', data.newSessionVersion);
      }
      return { success: true };
    } else {
      return { success: false, error: data.error || 'فشل تحديث كلمة المرور' };
    }
  } catch {
    // Local fallback: verify current pass
    const isCurrentOk = await localPbkdf2Verify(cleanCurrent);
    if (!isCurrentOk) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
    }

    try {
      const randomSalt = new Uint8Array(16);
      crypto.getRandomValues(randomSalt);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(cleanNew),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: randomSalt.buffer as ArrayBuffer,
          iterations: DEFAULT_VAULT.iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );

      const saltB64 = bufferToB64(randomSalt.buffer as ArrayBuffer);
      const hashB64 = bufferToB64(bits);
      const newEpoch = `epoch_${Date.now()}`;

      localStorage.setItem('areen_auth_salt', saltB64);
      localStorage.setItem('areen_auth_hash', hashB64);
      localStorage.setItem('areen_auth_epoch', newEpoch);
      sessionStorage.setItem('areen_session_version', newEpoch);

      return { success: true };
    } catch {
      return { success: false, error: 'تعذر معالجة التشفير في هذا المتصفح' };
    }
  }
}

/**
 * Checks if the current session is still valid or if the password was changed elsewhere.
 */
export async function checkSessionValidity(currentVersion: string | null): Promise<boolean> {
  if (!currentVersion) return false;

  try {
    const res = await fetch(`/api/auth/session-check?version=${encodeURIComponent(currentVersion)}`, {
      method: 'GET',
    });
    if (res.ok) {
      const data = await res.json();
      return data.valid === true;
    }
    return true;
  } catch {
    // Check against local storage epoch if offline
    const localEpoch = localStorage.getItem('areen_auth_epoch');
    if (localEpoch && localEpoch !== currentVersion) {
      return false;
    }
    return true;
  }
}
