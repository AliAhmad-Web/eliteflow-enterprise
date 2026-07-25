import { AUTH_API_PREFIX, AUTH_HEADERS } from "@enterprise/shared";

import { useAuthStore } from "@/features/auth/stores/auth.store";
import { clearSessionHintCookie } from "@/features/auth/utils/session-hint";

import { ApiClientError, getApiBaseUrl, parseApiResponse } from "./api-error";

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
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(
      new DOMException(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
        "TimeoutError",
      ),
    );
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new ApiClientError(
        error.message && error.message !== "signal is aborted without reason"
          ? error.message
          : `Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
        "REQUEST_TIMEOUT",
        408,
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "AbortError"
    ) {
      throw new ApiClientError(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`,
        "REQUEST_TIMEOUT",
        408,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postRefresh(): Promise<Response> {
  return fetchWithTimeout(
    `${getApiBaseUrl()}${AUTH_API_PREFIX}/refresh`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
    60_000,
  );
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
      }>(response);

      useAuthStore.getState().setAccessToken(result.data.accessToken);
      return result.data.accessToken;
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
 */
export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
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
    return headers;
  };

  const execute = (accessToken: string | null) =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: init.credentials ?? "include",
      headers: buildHeaders(accessToken),
    });

  let response = await execute(useAuthStore.getState().accessToken);

  if (response.status === 401 && !path.endsWith("/refresh")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await execute(newToken);
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

  const execute = async (accessToken?: string | null) => {
    const requestHeaders = { ...headers };

    if (auth && accessToken) {
      requestHeaders[AUTH_HEADERS.AUTHORIZATION] =
        `${AUTH_HEADERS.BEARER_PREFIX}${accessToken}`;
    }

    return fetchWithTimeout(
      `${getApiBaseUrl()}${path}`,
      {
        method,
        credentials: "include",
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      timeoutMs,
    );
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

  const result = await parseApiResponse<T>(response);
  return result.data;
}
