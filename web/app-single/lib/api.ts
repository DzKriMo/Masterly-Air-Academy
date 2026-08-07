// ============================================================
// MASTERLY AIR ACADEMY | API Client (JWT + Django DRF)
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onLogoutHandler: (() => void) | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  getBaseUrl(): string {
    return API_BASE;
  }

  setTokens(access: string, refresh: string | null): void {
    this.accessToken = access;
    this.refreshToken = refresh;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
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
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Accept': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // If 401, try refreshing the token once
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    }

    if (response.status === 401 && !url.endsWith('/login/')) {
      this.clearAuth();
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
   * Refresh the access token using the given refresh token.
   * Shares a single in-flight promise with all callers (401-retry and the
   * auth context) so concurrent refreshes can never race — important when the
   * backend rotates refresh tokens.
   * Returns the (possibly rotated) refresh token on success, or null on failure.
   */
  async refreshAccessToken(refresh: string): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.performRefresh(refresh);
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(refresh: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (res.ok) {
        const data = await res.json();
        // ROTATE_REFRESH_TOKENS=True → the server returns a NEW refresh token
        // and blacklists the old one. Persist it or the next refresh 401s.
        const nextRefresh = data.refresh || refresh;
        this.accessToken = data.access;
        this.refreshToken = nextRefresh;
        try {
          const session = JSON.parse(localStorage.getItem('maa_session') || '{}');
          session.token = data.access;
          session.refresh = nextRefresh;
          localStorage.setItem('maa_session', JSON.stringify(session));
        } catch {}
        return nextRefresh;
      }

      // Server rejected the refresh token — clear it so we don't retry forever
      if (res.status === 401 || res.status === 400) {
        this.refreshToken = null;
        this.clearAuth();
      }
    } catch {
      // Network error — token might still be valid, don't clear it
    }
    return null;
  }

  private async tryRefreshToken(): Promise<string | null> {
    if (!this.refreshToken) return null;
    return this.refreshAccessToken(this.refreshToken);
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
   * Authenticated download. Fetches the endpoint with the Bearer token and
   * returns the response (caller can read blob). Retries once after a 401
   * refresh, mirroring `request()`. Throws on non-OK.
   */
  async download(endpoint: string): Promise<Response> {
    const url = `${API_BASE}/api${endpoint}`;
    const buildHeaders = (): Record<string, string> => {
      const headers: Record<string, string> = {};
      const token = this.accessToken || this.getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return headers;
    };

    let res = await fetch(url, { headers: buildHeaders() });

    if (res.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        res = await fetch(url, { headers: buildHeaders() });
      }
    }

    if (res.status === 401 && !url.endsWith('/login/')) {
      this.clearAuth();
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
