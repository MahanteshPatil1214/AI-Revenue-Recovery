const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const API_BASE_URL = BASE;
export const API_STREAM_URL = `${BASE}/api/v1/stream`;
export const API_CUSTOMER_URL = `${BASE}/api/v1/customer`;
export const API_RADAR_URL = `${BASE}/api/v1/radar`;
export const API_TEST_URL = `${BASE}/api/v1/test`;
export const API_ANALYTICS_URL = `${BASE}/api/v1/admin/analytics`;
export const API_AUTH_URL = `${BASE}/api/v1/auth`;

/**
 * Operator key (X-Admin-Key) for the management API. In dev the build-time
 * VITE_ADMIN_API_KEY pre-fills it; after a successful sign-in the frontend
 * stores the entered key and mutates `adminHeaders` so every management call
 * (analytics, radar, test) carries it without changing any call site.
 */
const ADMIN_KEY_STORAGE = 'recovery_admin_key';
const DEFAULT_ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? '';

let currentKey: string = localStorage.getItem(ADMIN_KEY_STORAGE) || DEFAULT_ADMIN_KEY;

export const adminHeaders: Record<string, string> = currentKey ? { 'X-Admin-Key': currentKey } : {};

export function setAdminKey(key: string): void {
  currentKey = key || '';
  if (key) {
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
  }
  if (key) {
    adminHeaders['X-Admin-Key'] = key;
  } else {
    delete adminHeaders['X-Admin-Key'];
  }
}

export function getAdminKey(): string {
  return currentKey;
}

export function hasAdminKey(): boolean {
  return currentKey !== '';
}
