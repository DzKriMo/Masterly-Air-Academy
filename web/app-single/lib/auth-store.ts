// ============================================================
// MASTERLY AIR ACADEMY | Zustand Auth Store
// Synced with AuthContext — single source of truth for auth state
// ============================================================

import { create } from 'zustand';
import type { AuthUser } from './auth-context';

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setAuth: (user) => set({ user, isAuthenticated: true }),
  clearAuth: () => set({ user: null, isAuthenticated: false }),
}));
