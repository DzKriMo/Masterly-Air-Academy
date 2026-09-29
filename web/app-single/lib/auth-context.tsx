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
  /** Signs out, then resolves to the login path that matches the role. */
  logout: () => Promise<string>;
  logoutAndRedirect: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const STUDENT_ROLES = ['student', 'candidate', 'graduate'];

/**
 * The login page a given role belongs on. Students have their own portal, so
 * sending them to the staff login is what made a student logout look like it
 * dropped them into the admin panel.
 */
export function loginPathForRole(role?: string | null): string {
  return role && STUDENT_ROLES.includes(role) ? '/student/login' : '/login';
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
  // Set on logout so an in-flight /me/ cannot restore the session afterwards.
  const signedOutRef = useRef(false);

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
      const target = loginPathForRole(role);
      // Setting location.href to the page we're already on forces a full reload,
      // which can loop (boot → /me/ 401 → refresh → onLogout → reload). Stay put
      // when already on the login page.
      if (window.location.pathname === target) return;
      window.location.href = target;
    }
  }, []);

  // ── Forced-logout redirect handler ─────────────────────────
  // Fired by the API client when a 401 survives a cookie refresh attempt.
  useEffect(() => {
    api.onLogout(() => {
      clearSession();
      // Only bounce to the login page when we actually had a session to lose.
      // A fully anonymous visitor (no cache, never authenticated) shouldn't be
      // redirected off a public page (landing, /student/login) by the boot
      // /me/ 401 — the protected layouts guard themselves.
      if (userRef.current || loadCachedUser()) {
        redirectToLogin();
      }
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
        // A logout that happened while this request was in flight wins: without
        // this guard the late response re-populated `user`, so the login page saw
        // an authenticated session and bounced the user straight back into the
        // portal they had just left.
        if (cancelled || signedOutRef.current) return;
        setUser(me);
        useAuthStore.getState().setAuth(me);
        saveCachedUser(me);
      } catch {
        if (cancelled || signedOutRef.current) return;
        // Only tear down a cached session we can't re-verify. An anonymous
        // visitor (no cache) on the login page just stays anonymous — no
        // redirect, no reload loop.
        if (cached) clearSession();
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
      // Same guard as the local sign-out: a /me/ still in flight in THIS tab
      // would otherwise restore the session the other tab just ended.
      signedOutRef.current = true;
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

    signedOutRef.current = false;
    setUser(userData);
    saveCachedUser(userData);
    useAuthStore.getState().setAuth(userData);
    return { user: userData };
  }, []);

  const logout = useCallback(async () => {
    // Capture the role BEFORE clearing state: it is the only thing that knows
    // which login page this user belongs on afterwards.
    const role = userRef.current?.role || loadCachedUser()?.role;
    let serverConfirmed = false;
    try {
      // One retry. The endpoint no longer requires a CSRF token, so a failure
      // here means a transport problem, and a transient blip should not leave
      // the user unable to sign out.
      try {
        await api.post('/logout/');
        serverConfirmed = true;
      } catch {
        await api.post('/logout/');
        serverConfirmed = true;
      }
    } catch (e) {
      // The auth cookies are httpOnly, so if the server call failed the session
      // is still live and the user would be silently signed back in on the next
      // navigation. Say so instead of pretending the sign-out worked.
      console.error('[auth] logout request failed', e);
    }
    clearSession();
    signedOutRef.current = true;
    signalLogout();
    if (!serverConfirmed) {
      throw new Error('Logout could not be confirmed by the server.');
    }
    return loginPathForRole(role);
  }, [clearSession]);

  /**
   * Perform the logout and land on the login page that matches the account.
   * Exposed so every caller's button behaves identically - they previously each
   * hardcoded their own target, which is how a student ended up on the staff
   * login after signing out.
   *
   * Never rejects: an onClick handler has nowhere to send the error, and an
   * unhandled rejection is what used to blow up the whole page.
   */
  const logoutAndRedirect = useCallback(async () => {
    const target = loginPathForRole(
      userRef.current?.role || loadCachedUser()?.role
    );
    try {
      await logout();
    } catch (e) {
      // Local state is already cleared and the role-correct login page is one
      // navigation away, so the user is never stranded. The session may still
      // be live server-side if this was a transport failure, so say so loudly
      // rather than let the next reload silently sign them back in.
      console.error('[auth] logout could not be confirmed by the server', e);
    }
    // Full navigation, not router.push: an in-flight /me/ response must not be
    // able to restore the in-memory session after we have signed out.
    if (typeof window !== 'undefined') window.location.assign(target);
  }, [logout]);

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
        logoutAndRedirect,
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
