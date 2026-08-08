'use client';

// ============================================================
// MASTERLY AIR ACADEMY | Auth Context (httpOnly-cookie JWT)
// Tokens live in httpOnly cookies (`maa_access` + `maa_refresh`); JS never
// touches them. localStorage keeps only the user profile (`maa_session`) for a
// fast boot, verified against `/me/` on mount. Cross-tab logout is signalled
// via the `maa_logout` flag. No proactive refresh needed — the API client
// rotates the refresh cookie on any 401.
// ============================================================

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from './api';
import { useAuthStore } from './auth-store';
import { isExamPortalPath } from './exam-portal';

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
  instructor?: {
    id: string;
    authorized_aircraft_types: string[];
    license_number: string;
    total_flight_hours: number;
  };
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user: AuthUser }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

// ── Persistence (localStorage, shared across tabs) ──────────

const SESSION_KEY = 'maa_session';   // only the user profile, for a fast boot
const LOGOUT_KEY = 'maa_logout';     // cross-tab logout broadcast flag

function loadCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.user || null;
    }
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
  return null;
}

function saveCachedUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function signalLogout(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOGOUT_KEY, Date.now().toString());
  } catch {}
}

// ── Context ─────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const pathname = usePathname();
  const onExamPortal = isExamPortalPath(pathname);
  const onExamPortalRef = useRef(onExamPortal);
  onExamPortalRef.current = onExamPortal;

  const clearSession = useCallback(() => {
    setUser(null);
    saveCachedUser(null);
    useAuthStore.getState().clearAuth();
  }, []);

  const redirectToLogin = useCallback(() => {
    // Auto-logout is disabled entirely inside the exam portal
    if (onExamPortalRef.current) return;
    const role = userRef.current?.role || loadCachedUser()?.role;
    if (typeof window !== 'undefined') {
      const studentRoles = ['student', 'candidate', 'graduate'];
      window.location.href = role && studentRoles.includes(role) ? '/student/login' : '/login';
    }
  }, []);

  // ── Forced-logout redirect handler ─────────────────────────
  // Fired by the API client when a 401 survives a cookie refresh attempt.
  useEffect(() => {
    api.onLogout(() => {
      clearSession();
      redirectToLogin();
    });
  }, [clearSession, redirectToLogin]);

  // ── Restore session on mount ───────────────────────────────
  // Boot optimistically from the cached profile, then verify via /me/.
  // The API client refreshes the access cookie once on 401; if that fails the
  // session is gone and we clear the cached state (guards redirect).
  useEffect(() => {
    let cancelled = false;
    const cached = loadCachedUser();
    if (cached) {
      setUser(cached);
      useAuthStore.getState().setAuth(cached);
    }
    (async () => {
      try {
        const me = await api.get<AuthUser>('/me/');
        if (cancelled) return;
        setUser(me);
        useAuthStore.getState().setAuth(me);
        saveCachedUser(me);
      } catch {
        if (cancelled) return;
        clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // ── Cross-tab logout (storage event on the broadcast flag) ─

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== LOGOUT_KEY || !e.newValue) return;
      setUser(null);
      saveCachedUser(null);
      useAuthStore.getState().clearAuth();
      redirectToLogin();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [redirectToLogin]);

  // ── Auth methods ───────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{
      access: string;
      refresh: string;
      user: AuthUser;
    }>('/login/', { email, password });

    const userData = (response as unknown as { user: AuthUser }).user;
    if (!userData) {
      throw new Error('Invalid response from server.');
    }

    try {
      localStorage.removeItem(LOGOUT_KEY);
    } catch {}

    setUser(userData);
    saveCachedUser(userData);
    useAuthStore.getState().setAuth(userData);
    return { user: userData };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout/');
    } catch {}
    clearSession();
    signalLogout();
  }, [clearSession]);

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
        isLoading,
        isAuthenticated: user !== null,
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
