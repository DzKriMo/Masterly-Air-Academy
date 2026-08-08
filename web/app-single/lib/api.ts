// ============================================================
// MASTERLY AIR ACADEMY | API Client (httpOnly-cookie JWT + CSRF)
// ============================================================

import { useAuthStore } from "./auth-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Methods that change server state and therefore need CSRF enforcement when
// the request is authenticated via cookies (mirrors the backend's
// CookieJWTAuthentication).
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Outcome of a refresh attempt. Only `no-session` is a definitive session
 * failure (forces logout); `rate-limited` and `network-error` are transient
 * conditions that must NOT kill a still-valid session.
 */
type RefreshOutcome = 'ok' | 'no-session' | 'rate-limited' | 'network-error';

class ApiClient {
  private onLogoutHandler: (() => void) | null = null;
  private refreshPromise: Promise<RefreshOutcome> | null = null;

  getBaseUrl(): string {
    return API_BASE;
  }

  /**
   * Whether a session exists. Tokens now live in httpOnly cookies (invisible
   * to JS), so we mirror the auth store's state — set once `/me/` succeeds.
   */
  isAuthenticated(): boolean {
    try {
      return useAuthStore.getState().isAuthenticated;
    } catch {
      return false;
    }
  }

  /** Read the Django CSRF cookie (it is NOT httpOnly). */
  getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  /** Register a callback invoked when the session is forcibly cleared (e.g. 401 after failed refresh). */
  onLogout(handler: () => void): void {
    this.onLogoutHandler = handler;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}/api${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const method = (options.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Accept': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Cookies authenticate the request; CSRF protects the state-changing ones.
    if (!SAFE_METHODS.includes(method)) {
      const csrf = this.getCsrfToken();
      if (csrf) headers['X-CSRFToken'] = csrf;
    }

    let sessionLost = false;
    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // On 401, rotate the refresh cookie once and retry (the refresh itself is
    // cookie-driven, so no token needs to be passed). A rate-limited or
    // network-failed refresh is transient — keep the session and surface the
    // original error to the caller instead of logging out.
    if (response.status === 401 && !url.endsWith('/token/refresh/') && !url.endsWith('/login/')) {
      const outcome = await this.tryRefreshToken();
      if (outcome === 'ok') {
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
        if (response.status === 401) sessionLost = true;
      } else if (outcome === 'no-session') {
        sessionLost = true;
      }
    }

    if (sessionLost) {
      this.onLogoutHandler?.();
    }

    // Handle empty responses (e.g. 204 No Content from DELETE)
    let raw: any = null;
    try {
      raw = await response.json();
    } catch {
      raw = {};
    }

    if (!response.ok) {
      throw new ApiError(
        raw.message || raw.error || raw.detail || `Request failed (${response.status})`,
        response.status,
        raw.errors
      );
    }

    // Unwrap standard API envelope {success, data, meta} if present
    if (raw && typeof raw === 'object' && raw.success === true && 'data' in raw) {
      return raw.data ?? raw;
    }

    return raw;
  }

  /**
   * Rotate the JWT pair using the httpOnly refresh cookie.
   * Shares a single in-flight promise with all callers (401-retry and the
   * auth context) so concurrent refreshes can never race — important when the
   * backend rotates refresh tokens.
   */
  async refreshAccessToken(): Promise<RefreshOutcome> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.performRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<RefreshOutcome> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const csrf = this.getCsrfToken();
      if (csrf) headers['X-CSRFToken'] = csrf;
      const res = await fetch(`${API_BASE}/api/token/refresh/`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      if (res.ok) return 'ok';
      if (res.status === 429) return 'rate-limited';
      return 'no-session';
    } catch {
      // Network error — the session might still be valid, report failure
      return 'network-error';
    }
  }

  private async tryRefreshToken(): Promise<RefreshOutcome> {
    return this.refreshAccessToken();
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /** Multipart upload request (no JSON Content-Type; body set as FormData). */
  async upload<T = any>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });
  }

  /**
   * Authenticated download. The session cookie authenticates the fetch (no
   * Bearer header). Returns the response so the caller can read the blob.
   * Retries once after a 401 refresh, mirroring `request()`. Throws on non-OK.
   */
  async download(endpoint: string): Promise<Response> {
    const url = `${API_BASE}/api${endpoint}`;

    let sessionLost = false;
    let res = await fetch(url, { credentials: 'include' });

    if (res.status === 401 && !url.endsWith('/token/refresh/')) {
      const outcome = await this.tryRefreshToken();
      if (outcome === 'ok') {
        res = await fetch(url, { credentials: 'include' });
        if (res.status === 401) sessionLost = true;
      } else if (outcome === 'no-session') {
        sessionLost = true;
      }
    }

    if (sessionLost) {
      this.onLogoutHandler?.();
    }

    if (!res.ok) {
      throw new ApiError(`Download failed (${res.status})`, res.status);
    }
    return res;
  }
}

export function unwrapResults<T>(response: any, fallback: T[] = []): T[] {
  if (response?.results && Array.isArray(response.results)) return response.results as T[];
  if (Array.isArray(response)) return response as T[];
  return fallback;
}

/**
 * Build a list endpoint URL that requests every record in a single page.
 * The backend's PageLimitPagination honours `?limit=` up to its max page size
 * (1000). Independent GETs without this would only return the first PAGE_SIZE
 * (20) records, silently caping list endpoints.
 */
export function withFullLimit(endpoint: string): string {
  const sep = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${sep}limit=1000`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
