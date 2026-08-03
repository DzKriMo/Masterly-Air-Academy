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

  setTokens(access: string, refresh: string | null): void {
    this.accessToken = access;
    this.refreshToken = refresh;
  }

  getAccessToken(): string | null {
    return this.accessToken;
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
        raw.message || raw.detail || `Request failed (${response.status})`,
        response.status,
        raw.errors
      );
    }

    // Unwrap standard API envelope {success, data, meta} if present
    if (raw && typeof raw === 'object' && raw.success === true && 'data' in raw) {
      return raw.data;
    }

    return raw;
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.access;
        // Update in sessionStorage
        try {
          const session = JSON.parse(sessionStorage.getItem('maa_session') || '{}');
          session.token = data.access;
          sessionStorage.setItem('maa_session', JSON.stringify(session));
        } catch {}
        return true;
      }
    } catch {}
    return false;
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
   * returns the response (caller can read blob). Throws on non-OK.
   */
  async download(endpoint: string): Promise<Response> {
    const headers: Record<string, string> = {};
    const token = this.accessToken || this.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api${endpoint}`, { headers });
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
