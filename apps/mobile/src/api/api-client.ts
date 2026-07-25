import { AUTH_API_PREFIX, AUTH_HEADERS } from "@enterprise/shared";

import { useAuthStore } from "@/auth/auth.store";
import {
  buildRefreshCookieHeader,
  extractRefreshTokenFromSetCookie,
  secureTokenStorage,
} from "@/auth/secure-token-storage";

import { ApiClientError, getApiBaseUrl, parseApiResponse } from "./api-error";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  skipRefresh?: boolean;
  timeoutMs?: number;
  /** Capture Set-Cookie refresh token after auth responses. */
  captureRefreshCookie?: boolean;
}

const DEFAULT_TIMEOUT_MS = 45_000;
const REFRESH_MUTEX_KEY = "__eliteflow_mobile_refresh_promise__" as const;

type GlobalWithRefreshMutex = typeof globalThis & {
  [REFRESH_MUTEX_KEY]?: Promise<string | null> | null;
};

function getRefreshPromise(): Promise<string | null> | null {
  return (globalThis as GlobalWithRefreshMutex)[REFRESH_MUTEX_KEY] ?? null;
}

function setRefreshPromise(promise: Promise<string | null> | null): void {
  (globalThis as GlobalWithRefreshMutex)[REFRESH_MUTEX_KEY] = promise;
}

async function captureRefreshFromResponse(response: Response): Promise<void> {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const candidates: string[] = [];

  if (typeof headers.getSetCookie === "function") {
    candidates.push(...headers.getSetCookie());
  }

  const single =
    response.headers.get("set-cookie") ?? response.headers.get("Set-Cookie");
  if (single) {
    candidates.push(single);
  }

  for (const header of candidates) {
    const token = extractRefreshTokenFromSetCookie(header);
    if (token) {
      await secureTokenStorage.saveRefreshToken(token);
      return;
    }
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
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
  const refreshToken = await secureTokenStorage.getRefreshToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (refreshToken) {
    headers.Cookie = buildRefreshCookieHeader(refreshToken);
  }

  return fetchWithTimeout(
    `${getApiBaseUrl()}${AUTH_API_PREFIX}/refresh`,
    {
      method: "POST",
      headers,
      // Body refresh works in non-production; Cookie header covers production.
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    },
    60_000,
  );
}

/** Refresh access token via stored refresh token (cookie header + body). */
export async function refreshAccessToken(): Promise<string | null> {
  const existing = getRefreshPromise();
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      let response = await postRefresh();

      if (response.status === 401 || response.status === 403) {
        await new Promise((r) => setTimeout(r, 150));
        response = await postRefresh();
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await useAuthStore.getState().clearSession();
        }
        return null;
      }

      await captureRefreshFromResponse(response);

      const result = await parseApiResponse<{
        accessToken: string;
        expiresIn: number;
      }>(response);

      await useAuthStore.getState().setAccessToken(result.data.accessToken);
      return result.data.accessToken;
    } catch {
      return null;
    } finally {
      setRefreshPromise(null);
    }
  })();

  setRefreshPromise(promise);
  return promise;
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
    captureRefreshCookie = false,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    let token = useAuthStore.getState().accessToken;
    if (!token && !skipRefresh && !path.endsWith("/refresh")) {
      token = await refreshAccessToken();
    }
    if (token) {
      headers[AUTH_HEADERS.AUTHORIZATION] =
        `${AUTH_HEADERS.BEARER_PREFIX}${token}`;
    }
  }

  // Attach refresh cookie on auth-namespace requests so logout/refresh work.
  if (path.startsWith(AUTH_API_PREFIX)) {
    const refreshToken = await secureTokenStorage.getRefreshToken();
    if (refreshToken) {
      headers.Cookie = buildRefreshCookieHeader(refreshToken);
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

  if (captureRefreshCookie) {
    await captureRefreshFromResponse(response);
  }

  const result = await parseApiResponse<T>(response);
  return result.data;
}

/**
 * Authenticated fetch for non-JSON flows (SSE streams, binary downloads, multipart).
 */
export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const buildHeaders = async (accessToken: string | null): Promise<Headers> => {
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

  const execute = async (accessToken: string | null) =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: await buildHeaders(accessToken),
    });

  let token = useAuthStore.getState().accessToken;
  if (!token) {
    token = await refreshAccessToken();
  }

  let response = await execute(token);

  if (response.status === 401 && !path.endsWith("/refresh")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await execute(newToken);
    }
  }

  return response;
}
