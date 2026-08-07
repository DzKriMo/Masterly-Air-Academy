import { create } from 'zustand';
import type { User } from '@/types/api';
import {
  storeUser,
  getUser,
  removeUser,
  clearTokens,
  clearAll,
  getAccessToken,
  getRefreshToken,
} from '@/lib/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    if (user) {
      storeUser(user);
      set({ user, isAuthenticated: true });
    } else {
      removeUser();
      set({ user: null, isAuthenticated: false });
    }
  },

  logout: async () => {
    await clearAll();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: async () => {
    const [user, accessToken, refreshToken] = await Promise.all([
      getUser(),
      getAccessToken(),
      getRefreshToken(),
    ]);
    if (user && accessToken && refreshToken) {
      set({ user, isAuthenticated: true, isLoading: false });
    } else {
      if (user) await removeUser();
      if (accessToken || refreshToken) await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
