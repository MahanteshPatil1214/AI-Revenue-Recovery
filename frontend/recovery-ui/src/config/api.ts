const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const API_BASE_URL = BASE;
export const API_STREAM_URL = `${BASE}/api/v1/stream`;
export const API_CUSTOMER_URL = `${BASE}/api/v1/customer`;
export const API_RADAR_URL = `${BASE}/api/v1/radar`;
export const API_TEST_URL = `${BASE}/api/v1/test`;
