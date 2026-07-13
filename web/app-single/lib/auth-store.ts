// ============================================================
// MASTERLY AIR ACADEMY | Zustand Auth Store
// Synced with AuthContext — single source of truth for auth state
// ============================================================

import { create } from 'zustand';
import type { AuthUser } from './auth-context';

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
}));
