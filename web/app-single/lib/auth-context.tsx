'use client';

// ============================================================
// MASTERLY AIR ACADEMY | Auth Context (JWT + Django)
// Token stored in localStorage — shared across tabs.
// Proactive token refresh before expiry + activity-based keepalive.
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
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user: AuthUser; token: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

// ── JWT helpers ──────────────────────────────────────────────

function parseJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getTokenExpiry(token: string): Date | null {
  const payload = parseJwtPayload(token);
  if (payload?.exp) return new Date(payload.exp * 1000);
  return null;
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry

// ── Session persistence (localStorage, shared across tabs) ───

const SESSION_KEY = 'maa_session';

function loadSession(): { token: string | null; refresh: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, refresh: null, user: null };
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed.token || null,
        refresh: parsed.refresh || null,
        user: parsed.user || null,
      };
    }
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
  return { token: null, refresh: null, user: null };
}

function saveSession(token: string, refresh: string | null, user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, refresh, user }));
}

function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

// ── Context ─────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);
  const tokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    userRef.current = user;
    tokenRef.current = token;
  }, [user, token]);

  const scheduleRefreshRef = useRef<(tok?: string | null) => void>(() => {});

  // ── Refresh token ──────────────────────────────────────────

  const refreshToken = useCallback(async () => {
    const session = loadSession();
    if (!session.refresh) return false;
    try {
      const ok = await api.refreshAccessToken(session.refresh);
      if (ok) {
        const fresh = loadSession();
        const access = fresh.token;
        if (access) {
          api.setTokens(access, session.refresh);
          saveSession(access, session.refresh, session.user!);
          setToken(access);
          tokenRef.current = access;
          useAuthStore.getState().setAuth(session.user!, access);
          scheduleRefreshRef.current(access);
          return true;
        }
      }
    } catch {}
    return false;
  }, []);

  // ── Schedule proactive refresh ─────────────────────────────

  const scheduleRefresh = useCallback((tok?: string | null) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const t = tok || tokenRef.current;
    if (!t) return;
    const expiry = getTokenExpiry(t);
    if (!expiry) return;
    const delay = Math.max(0, expiry.getTime() - Date.now() - REFRESH_MARGIN_MS);
    refreshTimerRef.current = setTimeout(() => {
      refreshToken();
    }, delay);
  }, [refreshToken]);

  scheduleRefreshRef.current = scheduleRefresh;

  // ── Activity tracking ──────────────────────────────────────

  const resetActivityTimer = useCallback(() => {
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    // Refresh token proactively if user is active and token is approaching expiry
    const t = tokenRef.current;
    if (!t) return;
    const expiry = getTokenExpiry(t);
    if (!expiry) return;
    const remaining = expiry.getTime() - Date.now();
    if (remaining < REFRESH_MARGIN_MS) {
      refreshToken();
    }
  }, [refreshToken]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => resetActivityTimer();
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    return () => events.forEach(e => document.removeEventListener(e, handler));
  }, [resetActivityTimer]);

  // ── Restore session on mount ───────────────────────────────

  useEffect(() => {
    const session = loadSession();
    if (session.token && session.user) {
      const expiry = getTokenExpiry(session.token);
      if (expiry && expiry.getTime() > Date.now()) {
        setToken(session.token);
        setUser(session.user);
        api.setTokens(session.token, session.refresh);
        useAuthStore.getState().setAuth(session.user, session.token);
        scheduleRefresh(session.token);
      } else if (session.refresh) {
        // Token expired but refresh is available — try refresh immediately
        refreshToken().catch(() => {});
      } else {
        clearSession();
      }
    }
    setIsLoading(false);
  }, []);

  // ── Cross-tab sync (localStorage "storage" event) ──────────

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== SESSION_KEY) return;
      if (!e.newValue) {
        // Session was cleared in another tab — log out here too
        setToken(null);
        setUser(null);
        api.clearAuth();
        useAuthStore.getState().clearAuth();
        return;
      }
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed.token && parsed.user) {
          setToken(parsed.token);
          setUser(parsed.user);
          api.setTokens(parsed.token, parsed.refresh);
          useAuthStore.getState().setAuth(parsed.user, parsed.token);
          scheduleRefresh(parsed.token);
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [scheduleRefresh]);

  // ── Forced-logout redirect handler ─────────────────────────

  const pathname = usePathname();
  const onExamPortal = isExamPortalPath(pathname);

  useEffect(() => {
    api.onLogout(() => {
      // Auto-logout is disabled entirely inside the exam portal
      if (onExamPortal) return;
      const storedRole = userRef.current?.role || loadSession().user?.role;
      setToken(null);
      setUser(null);
      clearSession();
      if (typeof window !== 'undefined') {
        const studentRoles = ['student', 'candidate', 'graduate'];
        window.location.href = storedRole && studentRoles.includes(storedRole) ? '/student/login' : '/login';
      }
    });
  }, [onExamPortal]);

  // ── Auth methods ───────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{
      access: string;
      refresh: string;
      user: AuthUser;
    }>('/login/', { email, password });

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
    useAuthStore.getState().setAuth(userData, access);
    scheduleRefresh(access);

    return { user: userData, token: access };
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout/');
    } catch {}
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    setToken(null);
    setUser(null);
    api.clearAuth();
    clearSession();
    useAuthStore.getState().clearAuth();
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

  // ── Cleanup timers on unmount ──────────────────────────────

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    };
  }, []);

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
