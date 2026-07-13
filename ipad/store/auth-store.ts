import { create } from 'zustand';
import type { User } from '@/types/api';
import {
  storeUser,
  getUser,
  removeUser,
  clearTokens,
  clearAll,
} from '@/lib/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  hydrate: () => void;
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

  hydrate: () => {
    const user = getUser();
    if (user) {
      set({ user, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
