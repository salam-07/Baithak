// Use the same host as Vite so a phone on the local network reaches the API too.
// Deployed builds default to a same-origin API; VITE_API_URL can override either.
const defaultUrl = import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:5000/api/v1` : '/api/v1';
const baseUrl = (import.meta.env.VITE_API_URL || defaultUrl).replace(/\/$/, '');
export class ApiError extends Error {
  constructor(status, code, details) { super(code); this.status = status; this.code = code; this.details = details; }
}
export async function request(path, { method = 'GET', body, token, withMeta = false } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, payload?.error?.code || 'FAILED', payload?.error?.details);
    if (!payload?.success || !Object.hasOwn(payload, 'data')) throw new ApiError(502, 'INVALID_RESPONSE');
    return withMeta ? { items: payload.data, meta: payload.meta } : payload.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, controller.signal.aborted ? 'TIMEOUT' : 'NETWORK');
  } finally { clearTimeout(timeout); }
}
export function errorMessage(error) {
  if (error.code === 'TIMEOUT') return 'timeout';
  return ({ 0: 'offline', 401: 'credentials', 403: 'forbidden', 409: 'taken', 422: 'checkFields', 429: 'rateLimit' })[error.status] || 'failed';
}
