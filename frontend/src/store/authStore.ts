import { create } from 'zustand';
import { api, setTokens, clearTokens } from '@/lib/api';
import { MOCK_TOKEN } from '@/lib/mockApi';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  isDemoMode: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  email: null,
  isDemoMode: false,

  initialize: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    const demo = token === MOCK_TOKEN;
    try {
      const { data } = await api.get<{ id: string; email: string }>('/auth/me');
      set({ isAuthenticated: true, isLoading: false, userId: data.id, email: data.email, isDemoMode: demo });
    } catch {
      clearTokens();
      set({ isAuthenticated: false, isLoading: false, isDemoMode: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post<{ accessToken: string; refreshToken: string; userId: string }>(
      '/auth/login',
      { email, password },
    );
    setTokens(data.accessToken, data.refreshToken);
    const demo = data.accessToken === MOCK_TOKEN;
    set({ isAuthenticated: true, userId: data.userId, email, isDemoMode: demo });
  },

  signup: async (email, password, firstName, lastName) => {
    const { data } = await api.post<{ accessToken: string; refreshToken: string; userId: string }>(
      '/auth/register',
      { email, password, firstName, lastName },
    );
    setTokens(data.accessToken, data.refreshToken);
    const demo = data.accessToken === MOCK_TOKEN;
    set({ isAuthenticated: true, userId: data.userId, email, isDemoMode: demo });
  },

  logout: async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
    clearTokens();
    set({ isAuthenticated: false, userId: null, email: null, isDemoMode: false });
  },
}));
