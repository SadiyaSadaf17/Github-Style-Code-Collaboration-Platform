import { create } from 'zustand';
import api, { clearOAuthTokens, setOAuthTokens, getAccessToken } from '../services/api.js';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAuth = create((set, get) => ({
  currentUser: readStoredUser(),
  loading: false,
  bootstrapping: true,
  isAuthenticated: !!readStoredUser() || !!getAccessToken(),
  error: null,

  bootstrap: async () => {
    set({ bootstrapping: true, error: null });
    const stored = readStoredUser();
    const hasOAuth = !!getAccessToken();

    try {
      if (hasOAuth) {
        const res = await api.get('/auth/profile');
        const user = res.data.payload || res.data.user;
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          set({ currentUser: user, isAuthenticated: true, bootstrapping: false });
          window.dispatchEvent(new Event('app-auth-changed'));
          return;
        }
      }

      if (stored) {
        const res = await api.get('/user-api/users/me');
        const user = res.data.payload || res.data.user;
        localStorage.setItem('user', JSON.stringify(user));
        set({ currentUser: user, isAuthenticated: true, bootstrapping: false });
        window.dispatchEvent(new Event('app-auth-changed'));
        return;
      }

      set({ currentUser: null, isAuthenticated: false, bootstrapping: false });
    } catch {
      if (stored) {
        set({ currentUser: stored, isAuthenticated: true, bootstrapping: false });
      } else {
        localStorage.removeItem('user');
        clearOAuthTokens();
        set({ currentUser: null, isAuthenticated: false, bootstrapping: false });
      }
    }
  },

  login: async (userCredObj) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post('/user-api/login', userCredObj);
      const user = res.data.user || res.data.payload;
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
    set({ currentUser: user, isAuthenticated: true, error: null });
    return user;
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      await api.post('/user-api/logout').catch(() => {});
      await api.post('/auth/logout').catch(() => {});
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
