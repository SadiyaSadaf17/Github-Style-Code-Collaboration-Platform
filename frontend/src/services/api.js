import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY);
}

export function setOAuthTokens(accessToken, refreshToken) {
  if (accessToken) sessionStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearOAuthTokens() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
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
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${API_BASE}/auth/refresh`, { refreshToken })
        .then((res) => {
          const payload = res.data.payload || res.data;
          const access = payload.accessToken;
          const refresh = payload.refreshToken;
          if (access) setOAuthTokens(access, refresh);
          return access;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const accessToken = await refreshPromise;
      if (!accessToken) return Promise.reject(error);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshErr) {
      clearOAuthTokens();
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
