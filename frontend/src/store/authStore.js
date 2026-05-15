import { create } from "zustand";
import axios from "axios";

const API_URL = "http://localhost:5001/user-api";

export const useAuth = create((set) => ({
  currentUser: JSON.parse(localStorage.getItem("user") || "null") || null,
  loading: false,
  isAuthenticated: !!localStorage.getItem("user"),
  error: null,

  login: async (userCredObj) => {
    try {
      set({ loading: true, error: null });

      const res = await axios.post(`${API_URL}/login`, userCredObj, {
        withCredentials: true,
      });

      const user = res.data.user || res.data.payload;

      localStorage.setItem("user", JSON.stringify(user));

      set({
        loading: false,
        error: null,
        isAuthenticated: true,
        currentUser: user,
      });

      return true;
    } catch (err) {
      set({
        loading: false,
        error: err.response?.data?.message || "Login failed",
        isAuthenticated: false,
        currentUser: null,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });

      await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });

      localStorage.removeItem("user");

      set({
        currentUser: null,
        loading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (err) {
      console.error("Logout failed", err);
      localStorage.clear();
      set({ currentUser: null, isAuthenticated: false, loading: false });
    }
  },

  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
    set({
      currentUser: user,
      isAuthenticated: !!user,
    });
  },
}));
