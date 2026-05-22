import { create } from 'zustand';
import api, {
  clearOAuthTokens,
  setOAuthTokens,
  getAccessToken,
  getRefreshToken,
  attemptTokenRefresh,
} from '../services/api.js';
import { setAuthBootstrapping, hasPersistedSession } from '../utils/authSession.js';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchCurrentUser() {
  const res = await api.get('/user-api/users/me');
  return res.data.payload || res.data.user;
}

export const useAuth = create((set) => ({
  currentUser: readStoredUser(),
  loading: false,
  bootstrapping: true,
  isAuthenticated: hasPersistedSession(),
  error: null,

  bootstrap: async () => {
    setAuthBootstrapping(true);
    set({ bootstrapping: true, error: null });

    const stored = readStoredUser();
    if (!hasPersistedSession()) {
      set({ currentUser: null, isAuthenticated: false, bootstrapping: false });
      setAuthBootstrapping(false);
      return;
    }

    try {
      let user;
      try {
        user = await fetchCurrentUser();
      } catch (firstErr) {
        if (firstErr.response?.status === 401 && getRefreshToken()) {
          const refreshed = await attemptTokenRefresh();
          if (refreshed) {
            user = await fetchCurrentUser();
          } else {
            throw firstErr;
          }
        } else {
          throw firstErr;
        }
      }

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        set({ currentUser: user, isAuthenticated: true, bootstrapping: false });
        window.dispatchEvent(new Event('app-auth-changed'));
        setAuthBootstrapping(false);
        return;
      }
    } catch {
      /* session invalid */
    }

    localStorage.removeItem('user');
    clearOAuthTokens();
    set({ currentUser: null, isAuthenticated: false, bootstrapping: false });
    setAuthBootstrapping(false);
  },

  login: async (userCredObj) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post('/user-api/login', userCredObj);
      const user = res.data.user || res.data.payload;
      if (res.data.token) {
        setOAuthTokens(res.data.token, res.data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(user));
      window.dispatchEvent(new Event('app-auth-changed'));
      set({ loading: false, error: null, isAuthenticated: true, currentUser: user });
      return true;
    } catch (err) {
      set({
        loading: false,
        error: err.response?.data?.message || 'Login failed',
        isAuthenticated: false,
        currentUser: null,
      });
      return false;
    }
  },

  completeOAuth: async (accessToken, refreshToken) => {
    setOAuthTokens(accessToken, refreshToken);
    const res = await api.get('/auth/profile');
    const user = res.data.payload || res.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('app-auth-changed'));
    set({ currentUser: user, isAuthenticated: true, error: null, bootstrapping: false });
    return user;
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      const refreshToken = getRefreshToken();
      const body = refreshToken ? { refreshToken } : {};
      await api.post('/user-api/logout', body).catch(() => {});
      await api.post('/auth/logout', body).catch(() => {});
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      localStorage.removeItem('user');
      clearOAuthTokens();
      window.dispatchEvent(new Event('app-auth-changed'));
      set({ currentUser: null, loading: false, isAuthenticated: false, error: null });
    }
  },

  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    window.dispatchEvent(new Event('app-auth-changed'));
    set({ currentUser: user, isAuthenticated: !!user });
  },
}));
