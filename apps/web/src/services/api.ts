const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// In-memory access token store
// Intentionally NEVER written to localStorage / sessionStorage / cookies.
// ---------------------------------------------------------------------------
let inMemoryAccessToken: string | null = null;

// ---------------------------------------------------------------------------
// Single-flight refresh coordinator
//
// Exactly one token refresh can be in-flight at any time. Concurrent callers
// that discover a stale token all await the *same* Promise, so only a single
// /auth/refresh request is ever issued per expiry cycle. This prevents the
// refresh-token rotation race where two simultaneous 401s each try to consume
// the HttpOnly cookie and invalidate each other's new tokens.
//
// Cleanup happens via Promise.resolve().then() so that every caller that
// already has a reference to the promise receives the resolved value before
// the slot is opened for the next refresh cycle.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<string | null> | null = null;

// ---------------------------------------------------------------------------
// Proactive pre-expiry tracking
//
// On every setAccessToken() call we decode the JWT `exp` claim (no signature
// check needed — the server validates it) and schedule a silent refresh 60 s
// before expiry. This removes the 401 → refresh → retry round-trip for
// requests that arrive right when the token expires.
// ---------------------------------------------------------------------------
let tokenExpiresAt: number | null = null; // Unix epoch seconds
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;

  // Cancel any pending proactive refresh
  if (proactiveRefreshTimer !== null) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }

  if (!token) {
    tokenExpiresAt = null;
    return;
  }

  // Decode exp from the JWT payload
  try {
    const payloadB64 = token.split('.')[1];
    if (payloadB64) {
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.exp === 'number') {
        tokenExpiresAt = payload.exp;
        scheduleProactiveRefresh(payload.exp);
      }
    }
  } catch {
    // Malformed token — reactive 401-based refresh still works as fallback
    tokenExpiresAt = null;
  }
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

/**
 * Returns true when the current access token is absent, expired, or will
 * expire within the next 60 seconds, so callers can refresh proactively.
 */
function isTokenStale(): boolean {
  if (!inMemoryAccessToken) return true;
  if (tokenExpiresAt === null) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= tokenExpiresAt - 60; // 60 s pre-expiry buffer
}

/**
 * Schedule a silent refresh 60 s before the access token expires.
 * The timer fires while the user is likely idle (no concurrent API calls),
 * minimising contention between proactive and reactive refresh paths.
 */
function scheduleProactiveRefresh(expSeconds: number): void {
  const nowSeconds = Math.floor(Date.now() / 1000);
  // Refresh at (exp - 60 s), but never sooner than 5 s from now
  const delaySeconds = Math.max(5, expSeconds - nowSeconds - 60);

  proactiveRefreshTimer = setTimeout(() => {
    proactiveRefreshTimer = null;
    // Only refresh if we still hold the same token and no refresh is in-flight
    if (inMemoryAccessToken && !refreshPromise) {
      refreshPromise = performTokenRefresh();
    }
  }, delaySeconds * 1000);
}

// ---------------------------------------------------------------------------
// Core refresh implementation — always go through getOrStartRefresh()
// ---------------------------------------------------------------------------
async function performTokenRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Sends HttpOnly refreshToken cookie automatically
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('saas:auth-failure'));
      return null;
    }

    const data = await res.json();
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
      window.dispatchEvent(
        new CustomEvent('saas:token-refreshed', { detail: { token: data.accessToken } }),
      );
      return data.accessToken;
    }

    setAccessToken(null);
    window.dispatchEvent(new CustomEvent('saas:auth-failure'));
    return null;
  } catch {
    setAccessToken(null);
    window.dispatchEvent(new CustomEvent('saas:auth-failure'));
    return null;
  } finally {
    // Defer slot release by one microtask so any already-attached .then()
    // handlers receive the resolved value before a new refresh can start.
    Promise.resolve().then(() => {
      refreshPromise = null;
    });
  }
}

/**
 * Returns the in-flight refresh Promise if one exists; otherwise starts a new
 * one. This is the single entry point for all token refresh coordination.
 *
 * Exported so that callers outside api.ts (e.g. authService.refreshToken())
 * can participate in the same single-flight gate and prevent two concurrent
 * /auth/refresh requests from racing to consume the same HttpOnly cookie.
 */
export function getOrStartRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh();
  }
  return refreshPromise;
}

// ---------------------------------------------------------------------------
// HTTP request helper
// ---------------------------------------------------------------------------
async function request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  // Proactive pre-expiry refresh: if the token is stale and this is not a
  // retry, eagerly refresh before sending the request to avoid a 401 cycle.
  if (!isRetry && !endpoint.startsWith('/auth/') && isTokenStale()) {
    await getOrStartRefresh();
    // Proceed regardless — non-protected endpoints still work without a token
  }

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Transmit HttpOnly cookies on every request
  });

  // Reactive 401 interception: single-flight refresh then retry once.
  // This handles the edge case where proactive refresh wasn't triggered
  // (e.g. first request after a browser reload with no in-memory token).
  if (response.status === 401 && !isRetry && !endpoint.startsWith('/auth/')) {
    const newToken = await getOrStartRefresh();
    if (newToken) {
      return request<T>(endpoint, options, true);
    }
    // Refresh failed — fall through to error handling
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response body
    }

    const message =
      errorData.message ||
      (Array.isArray(errorData.messages) ? errorData.messages.join(', ') : 'Request failed');

    if (
      response.status === 403 &&
      (errorData.code === 'ACCOUNT_SUSPENDED' || message.includes('suspended'))
    ) {
      window.dispatchEvent(new CustomEvent('saas:account-suspended', { detail: { message } }));
    }

    throw new ApiError(message, response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, customHeaders?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', headers: customHeaders }),
  post: <T>(endpoint: string, body?: any, customHeaders?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'POST',
      headers: customHeaders,
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: any, customHeaders?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PATCH',
      headers: customHeaders,
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, customHeaders?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers: customHeaders }),
};
