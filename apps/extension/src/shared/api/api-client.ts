import {
  AUTH_API_PREFIX,
  AUTH_HEADERS,
  type SafeUser,
} from "@enterprise/shared";

import {
  buildRefreshCookieHeader,
  extractRefreshTokenFromSetCookie,
  tokenStorage,
} from "../auth/storage";
import { ApiClientError, getApiBaseUrl, parseApiResponse } from "./api-error";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  skipRefresh?: boolean;
  timeoutMs?: number;
  captureRefreshCookie?: boolean;
}

const DEFAULT_TIMEOUT_MS = 45_000;

let refreshPromise: Promise<string | null> | null = null;
let memoryAccessToken: string | null = null;
let memoryUser: SafeUser | null = null;

export function getMemoryAccessToken(): string | null {
  return memoryAccessToken;
}

export function getMemoryUser(): SafeUser | null {
  return memoryUser;
}

export async function hydrateSessionFromStorage(): Promise<{
  accessToken: string | null;
  user: SafeUser | null;
}> {
  const [accessToken, user] = await Promise.all([
    tokenStorage.getAccessToken(),
    tokenStorage.getCachedUser(),
  ]);
  memoryAccessToken = accessToken;
  memoryUser = user;
  return { accessToken, user };
}

export async function setSession(
  user: SafeUser,
  accessToken: string,
): Promise<void> {
  memoryAccessToken = accessToken;
  memoryUser = user;
  await Promise.all([
    tokenStorage.saveAccessToken(accessToken),
    tokenStorage.saveCachedUser(user),
  ]);
}

export async function setAccessToken(accessToken: string): Promise<void> {
  memoryAccessToken = accessToken;
  await tokenStorage.saveAccessToken(accessToken);
}

export async function clearSession(): Promise<void> {
  memoryAccessToken = null;
  memoryUser = null;
  await tokenStorage.clearAll();
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
      await tokenStorage.saveRefreshToken(token);
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
  const refreshToken = await tokenStorage.getRefreshToken();
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
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    },
    60_000,
  );
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      let response = await postRefresh();

      if (response.status === 401 || response.status === 403) {
        await new Promise((r) => setTimeout(r, 150));
        response = await postRefresh();
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await clearSession();
        }
        return null;
      }

      await captureRefreshFromResponse(response);

      const result = await parseApiResponse<{
        accessToken: string;
        expiresIn: number;
      }>(response);

      await setAccessToken(result.data.accessToken);
      return result.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
    let token = memoryAccessToken ?? (await tokenStorage.getAccessToken());
    if (!token && !skipRefresh && !path.endsWith("/refresh")) {
      token = await refreshAccessToken();
    }
    if (token) {
      memoryAccessToken = token;
      headers[AUTH_HEADERS.AUTHORIZATION] =
        `${AUTH_HEADERS.BEARER_PREFIX}${token}`;
    }
  }

  if (path.startsWith(AUTH_API_PREFIX)) {
    const refreshToken = await tokenStorage.getRefreshToken();
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

  let response = await execute(memoryAccessToken);

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
