import { AUTH_API_PREFIX, AUTH_ERROR_CODES, AUTH_HEADERS } from "@enterprise/shared";

import { useAuthStore } from "@/features/auth/stores/auth.store";
import {
  applyAuthoritativeAuthUser,
  forceClientAuthReset,
  isClientRole,
  isPrivilegedRole,
} from "@/features/auth/utils/apply-authoritative-auth-user";
import { clearSessionHintCookie } from "@/features/auth/utils/session-hint";
import { ROUTES } from "@/constants/routes";

import { ApiClientError, getApiBaseUrl, parseApiResponse } from "./api-error";
import {
  applyCsrfHeader,
  captureCsrfFromResponse,
  clearCachedCsrfToken,
  ensureCsrfToken,
} from "./csrf";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  skipRefresh?: boolean;
  /** Abort after this many ms (default 45s — remote DB round-trips are often slow). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 45_000;
/** Wall-clock cap for authenticatedFetch header/connection phase (SSE body may continue). */
const AUTHENTICATED_FETCH_TIMEOUT_MS = 45_000;

/**
 * Cross-chunk mutex: Next.js can evaluate this module twice (different bundles),
 * which used to allow parallel refresh rotations and kill the session.
 */
const REFRESH_MUTEX_KEY = "__eliteflow_refresh_promise__" as const;

type GlobalWithRefreshMutex = typeof globalThis & {
  [REFRESH_MUTEX_KEY]?: Promise<string | null> | null;
};

function getRefreshPromise(): Promise<string | null> | null {
  return (globalThis as GlobalWithRefreshMutex)[REFRESH_MUTEX_KEY] ?? null;
}

function setRefreshPromise(promise: Promise<string | null> | null): void {
  (globalThis as GlobalWithRefreshMutex)[REFRESH_MUTEX_KEY] = promise;
}

/**
 * Clear client auth. Do NOT reset the bootstrap mutex here — that caused a
 * second in-flight bootstrap/refresh while the first was still finishing,
 * which rotated the cookie twice and revoked the session on F5.
 * Logout calls resetSessionBootstrap() explicitly.
 */
function clearAuthState(): void {
  useAuthStore.getState().clearSession();
  clearSessionHintCookie();
  clearCachedCsrfToken();
}

function isTimeoutAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError" || error.name === "TimeoutError";
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(
      new DOMException(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
        "TimeoutError",
      ),
    );
  }, timeoutMs);

  const userSignal = init.signal;
  let signal: AbortSignal = timeoutController.signal;

  if (userSignal) {
    if (typeof AbortSignal.any === "function") {
      // Keeps caller abort linked for SSE bodies after headers arrive.
      signal = AbortSignal.any([timeoutController.signal, userSignal]);
    } else if (userSignal.aborted) {
      signal = userSignal;
    } else {
      const merged = new AbortController();
      const forward = () => merged.abort(userSignal.reason);
      const forwardTimeout = () => merged.abort(timeoutController.signal.reason);
      userSignal.addEventListener("abort", forward, { once: true });
      timeoutController.signal.addEventListener("abort", forwardTimeout, {
        once: true,
      });
      signal = merged.signal;
    }
  }

  try {
    return await fetch(input, { ...init, signal });
  } catch (error) {
    if (isTimeoutAbortError(error)) {
      // Caller-initiated abort (e.g. stop streaming) — rethrow as-is.
      if (userSignal?.aborted) {
        throw error;
      }
      throw new ApiClientError(
        error instanceof Error &&
          error.message &&
          error.message !== "signal is aborted without reason"
          ? error.message
          : `Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
        "REQUEST_TIMEOUT",
        408,
      );
    }

    throw error;
  } finally {
    // Clear wall-clock timeout once headers arrive so SSE/download bodies may continue.
    clearTimeout(timeoutId);
  }
}

async function postRefresh(): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Refresh is CSRF-exempt; still send header when available for double-submit BC.
  applyCsrfHeader(headers, "POST");

  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}${AUTH_API_PREFIX}/refresh`,
    {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({}),
    },
    60_000,
  );
  captureCsrfFromResponse(response);
  return response;
}

/** Refresh the access token using the httpOnly refresh cookie. */
export async function refreshAccessToken(): Promise<string | null> {
  const existing = getRefreshPromise();
  if (existing) {
    return existing;
  }

  // Assign the promise synchronously before any await so parallel callers join.
  const promise = (async () => {
    try {
      let response = await postRefresh();

      // Parallel tab may have rotated the cookie mid-flight — retry once.
      if (response.status === 401 || response.status === 403) {
        await new Promise((r) => setTimeout(r, 150));
        response = await postRefresh();
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearAuthState();
        }
        return null;
      }

      const result = await parseApiResponse<{
        accessToken: string;
        expiresIn: number;
        user?: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          avatarUrl: string | null;
          role: { id: string; code: string; name: string };
          status: string;
          emailVerified: boolean;
          permissions: string[];
          mustChangePassword?: boolean;
          twoFactorEnabled?: boolean;
          mfaEnrollmentRequired?: boolean;
          companyId?: string | null;
          companyName?: string | null;
          createdAt: string;
        };
      }>(response);

      const accessToken = result.data.accessToken;
      if (result.data.user) {
        applyAuthoritativeAuthUser(
          result.data.user as Parameters<typeof applyAuthoritativeAuthUser>[0],
          accessToken,
        );
      } else {
        useAuthStore.getState().setAccessToken(accessToken);
      }
      return accessToken;
    } catch {
      // Transient failures must not log the user out on refresh / F5.
      return null;
    } finally {
      setRefreshPromise(null);
    }
  })();

  setRefreshPromise(promise);
  return promise;
}

/**
 * Authenticated fetch that retries once after refreshing an expired access token.
 * Use for non-JSON flows (SSE streams, file downloads, etc.).
 *
 * Applies a connection/header timeout. For SSE, fetch resolves once headers arrive,
 * so the stream body can continue beyond the timeout window.
 */
export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    await ensureCsrfToken();
  }

  const buildHeaders = (accessToken: string | null): Headers => {
    const headers = new Headers(init.headers);
    if (accessToken) {
      headers.set(
        AUTH_HEADERS.AUTHORIZATION,
        `${AUTH_HEADERS.BEARER_PREFIX}${accessToken}`,
      );
    } else {
      headers.delete(AUTH_HEADERS.AUTHORIZATION);
    }
    if (typeof FormData !== "undefined" && init.body instanceof FormData) {
      headers.delete("Content-Type");
    }
    applyCsrfHeader(headers, method);
    return headers;
  };

  const execute = (accessToken: string | null) =>
    fetchWithTimeout(
      `${getApiBaseUrl()}${path}`,
      {
        ...init,
        credentials: init.credentials ?? "include",
        headers: buildHeaders(accessToken),
      },
      AUTHENTICATED_FETCH_TIMEOUT_MS,
    );

  let response = await execute(useAuthStore.getState().accessToken);
  captureCsrfFromResponse(response);

  if (response.status === 401 && !path.endsWith("/refresh")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await execute(newToken);
      captureCsrfFromResponse(response);
    }
  }

  return response;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = false,
    skipRefresh = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    let token = useAuthStore.getState().accessToken;
    // Soft-nav / optimistic shell: wait for refresh cookie before first authed call.
    if (!token && !skipRefresh && !path.endsWith("/refresh")) {
      token = await refreshAccessToken();
    }
    if (token) {
      headers[AUTH_HEADERS.AUTHORIZATION] =
        `${AUTH_HEADERS.BEARER_PREFIX}${token}`;
    }
  }

  if (method !== "GET") {
    await ensureCsrfToken();
    applyCsrfHeader(headers, method);
  }

  const execute = async (accessToken?: string | null) => {
    const requestHeaders = { ...headers };

    if (auth && accessToken) {
      requestHeaders[AUTH_HEADERS.AUTHORIZATION] =
        `${AUTH_HEADERS.BEARER_PREFIX}${accessToken}`;
    }

    applyCsrfHeader(requestHeaders, method);

    const response = await fetchWithTimeout(
      `${getApiBaseUrl()}${path}`,
      {
        method,
        credentials: "include",
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      timeoutMs,
    );
    captureCsrfFromResponse(response);
    return response;
  };

  let response = await execute(useAuthStore.getState().accessToken);

  if (
    response.status === 401 &&
    auth &&
    !skipRefresh &&
    !path.endsWith("/refresh")
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await execute(newToken);
    }
  }

  try {
    const result = await parseApiResponse<T>(response);
    return result.data;
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      error.code === AUTH_ERROR_CODES.MFA_ENROLLMENT_REQUIRED
    ) {
      const uiRole = useAuthStore.getState().user?.role.code;
      if (isClientRole(uiRole)) {
        forceClientAuthReset(
          "Your session no longer matches the Client Portal account. Please sign in again with your client credentials.",
        );
      } else if (isPrivilegedRole(uiRole) && typeof window !== "undefined") {
        const path = window.location.pathname;
        if (!path.startsWith(ROUTES.SECURITY) && !path.startsWith("/login")) {
          window.location.assign(ROUTES.SECURITY);
        }
      }
    }
    throw error;
  }
}
