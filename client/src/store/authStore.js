import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (data) => {
        const response = await api.post('/auth/login', data);
        const token = response?.data?.token;
        const refreshToken = response?.data?.refreshToken || null;
        const user = response?.data?.user;

        if (token && token !== 'undefined') {
          set({ token, refreshToken, user, isAuthenticated: true });
        } else {
          console.error("Token extraction failed. Response:", response.data);
          throw new Error("Failed to save authentication token.");
        }
      },

      register: async (data) => {
        const response = await api.post('/auth/register', data);
        const token = response?.data?.token;
        const refreshToken = response?.data?.refreshToken || null;
        const user = response?.data?.user;

        if (token && token !== 'undefined') {
          set({ token, refreshToken, user, isAuthenticated: true });
        } else {
          console.error("Token extraction failed. Response:", response.data);
          throw new Error("Failed to save authentication token.");
        }
      },

      logout: async () => {
        const refreshToken = get().refreshToken;
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
        try { await api.post('/auth/logout', { refreshToken }); } catch { /* ignore */ }
      },

      fetchUser: async () => {
        try {
          const response = await api.get('/auth/me');
          const user = response?.data?.user;
          set({ user, isAuthenticated: true });
        } catch (error) {
          set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken, user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);

export default useAuthStore;
