const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const API_BASE_URL = BASE;
export const API_STREAM_URL = `${BASE}/api/v1/stream`;
export const API_CUSTOMER_URL = `${BASE}/api/v1/customer`;
export const API_RADAR_URL = `${BASE}/api/v1/radar`;
export const API_TEST_URL = `${BASE}/api/v1/test`;
export const API_ANALYTICS_URL = `${BASE}/api/v1/admin/analytics`;

/**
 * Optional operator key (X-Admin-Key) for the management API. Set
 * VITE_ADMIN_API_KEY to match ADMIN_API_KEY on the backend when the auth gate
 * is enabled; leave blank when the gate is open in local dev.
 */
export const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? '';

export const adminHeaders: Record<string, string> = ADMIN_API_KEY
  ? { 'X-Admin-Key': ADMIN_API_KEY }
  : {};
