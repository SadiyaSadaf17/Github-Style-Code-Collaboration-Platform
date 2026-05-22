import axios from 'axios';
import { isAuthBootstrapping } from '../utils/authSession.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

function migrateLegacyToken(key) {
  const legacy = sessionStorage.getItem(key);
  if (legacy) {
    localStorage.setItem(key, legacy);
    sessionStorage.removeItem(key);
    return legacy;
  }
  return null;
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || migrateLegacyToken(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || migrateLegacyToken(REFRESH_KEY);
}

export function setOAuthTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearOAuthTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function notifySessionExpired() {
  if (isAuthBootstrapping()) return;
  localStorage.removeItem('user');
  clearOAuthTokens();
  window.dispatchEvent(new Event('app-session-expired'));
}

/** Token for Socket.io handshake */
export function getSocketAuthToken() {
  return getAccessToken();
}

export async function attemptTokenRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${API_BASE}/auth/refresh`,
      { refreshToken },
      { withCredentials: true }
    );
    const payload = res.data.payload || res.data;
    const access = payload.accessToken;
    const refresh = payload.refreshToken;
    if (access) {
      setOAuthTokens(access, refresh);
      window.dispatchEvent(new Event('app-auth-changed'));
      return access;
    }
  } catch {
    return null;
  }
  return null;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      notifySessionExpired();
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = attemptTokenRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const accessToken = await refreshPromise;
      if (!accessToken) {
        notifySessionExpired();
        return Promise.reject(error);
      }
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshErr) {
      notifySessionExpired();
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
