import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import { ApiError, request } from '../lib/api';

// Tokens stay in this tab's session storage, never in persistent local storage.
function savedSession() {
  try { return JSON.parse(sessionStorage.getItem('baithak.session')); } catch { return null; }
}
export default function AuthProvider({ children }) {
  const [welcome, setWelcome] = useState('');
  const welcomeTimer = useRef(null);
  useEffect(() => () => clearTimeout(welcomeTimer.current), []);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');
  const [restoreError, setRestoreError] = useState(null);
  const current = useRef(null);
  const pendingRefresh = useRef(null);
  const generation = useRef(0);
  const save = useCallback((value) => {
    if (value && (!value.user || !value.tokens?.accessToken || !value.tokens?.refreshToken)) throw new ApiError(502, 'INVALID_SESSION');
    current.current = value;
    setSession(value);
    try {
      if (value) sessionStorage.setItem('baithak.session', JSON.stringify(value));
      else sessionStorage.removeItem('baithak.session');
    } catch { /* In-memory sessions still work when storage is disabled. */ }
  }, []);
  const restore = useCallback(async () => {
    if (pendingRefresh.current) return pendingRefresh.current;
    const stored = current.current || savedSession();
    if (!stored?.tokens?.refreshToken) { setStatus('ready'); return null; }
    const version = generation.current;
    setRestoreError(null);
    setStatus('loading');
    pendingRefresh.current = request('/auth/refresh', { method: 'POST', body: { refreshToken: stored.tokens.refreshToken } })
      .then((value) => { if (version === generation.current) save(value); return value; })
      .catch((error) => {
        if (version === generation.current) {
          if ([401, 403].includes(error.status)) save(null);
          else setRestoreError(error);
        }
        return null;
      })
      .finally(() => { pendingRefresh.current = null; setStatus('ready'); });
    return pendingRefresh.current;
  }, [save]);
  useEffect(() => { void restore(); }, [restore]);
  async function authenticate(mode, body) {
    const value = await request(`/auth/${mode}`, { method: 'POST', body });
    generation.current += 1;
    save(value);
    setWelcome(mode === 'signup' ? 'accountCreated' : 'signedIn');
    clearTimeout(welcomeTimer.current);
    welcomeTimer.current = setTimeout(() => setWelcome(''), 4500);
    setRestoreError(null);
    return value;
  }
  async function updateProfile(body) {
    const userId = current.current?.user.id;
    const user = await authorizedRequest('/users/me', { method: 'PATCH', body });
    if (current.current?.user.id === userId) save({ ...current.current, user });
    return user;
  }
  async function logout() {
    const refreshToken = current.current?.tokens?.refreshToken;
    // Keep the session on a failed request so the reader can retry revocation.
    await request('/auth/logout', { method: 'POST', body: { refreshToken } });
    generation.current += 1;
    save(null);
    setWelcome('');
    clearTimeout(welcomeTimer.current);
  }
  async function authorizedRequest(path, options = {}) {
    try { return await request(path, { ...options, token: current.current?.tokens?.accessToken }); }
    catch (error) {
      if (error.status !== 401) throw error;
      const renewed = await restore();
      if (!renewed) throw error;
      return request(path, { ...options, token: renewed.tokens.accessToken });
    }
  }
  return <AuthContext.Provider value={{ user: session?.user, welcome, status, restoreError, restore, authenticate, updateProfile, logout, authorizedRequest }}>{children}</AuthContext.Provider>;
}
