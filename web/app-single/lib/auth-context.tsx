'use client';

// ============================================================
// MASTERLY AIR ACADEMY — Auth Context (JWT + Django)
// Token stored in sessionStorage (cleared on browser close)
// ============================================================

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

// ── Types ───────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
  last_login_at: string | null;
  permissions: string[];
  roles?: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user: AuthUser; token: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

// ── Session persistence ─────────────────────────────────────

const SESSION_KEY = 'maa_session';

function loadSession(): { token: string | null; refresh: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, refresh: null, user: null };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed.token || null,
        refresh: parsed.refresh || null,
        user: parsed.user || null,
      };
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
  return { token: null, refresh: null, user: null };
}

function saveSession(token: string, refresh: string | null, user: AuthUser): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, refresh, user }));
}

function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Context ─────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const session = loadSession();
    if (session.token && session.user) {
      setToken(session.token);
      setUser(session.user);
      api.setTokens(session.token, session.refresh);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // POST /api/login/ — Custom JWT serializer returns { access, refresh, user }
    const response = await api.post<{
      access: string;
      refresh: string;
      user: AuthUser;
    }>('/login/', { email, password });

    // DRF returns the data directly — no .data wrapper on success
    const { access, refresh, user: userData } = response as unknown as {
      access: string;
      refresh: string;
      user: AuthUser;
    };

    if (!access || !userData) {
      throw new Error('Invalid response from server.');
    }

    setToken(access);
    setUser(userData);
    api.setTokens(access, refresh);
    saveSession(access, refresh, userData);

    return { user: userData, token: access };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout/');
    } catch {
      // Token may already be invalid — cleanup anyway
    }
    setToken(null);
    setUser(null);
    api.clearAuth();
    clearSession();
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return user?.permissions?.includes(permission) ?? false;
    },
    [user]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      return user?.role === role || (user?.roles?.includes(role) ?? false);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: token !== null && user !== null,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
