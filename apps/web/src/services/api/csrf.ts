import { AUTH_COOKIES, AUTH_HEADERS, SECURITY_API_PREFIX } from "@enterprise/shared";

import { getApiBaseUrl } from "./api-error";

/**
 * In-memory CSRF token for cross-origin SPAs where document.cookie
 * cannot read the API-domain XSRF-TOKEN (browser still sends the cookie).
 */
let cachedCsrfToken: string | null = null;
let ensurePromise: Promise<string | null> | null = null;

/** CSRF bootstrap must fail fast — never block mutating requests indefinitely. */
const CSRF_ENSURE_TIMEOUT_MS = 15_000;

const CSRF_COOKIE_NAMES = [
  AUTH_COOKIES.CSRF_TOKEN,
  AUTH_COOKIES.CSRF_TOKEN_DEV,
  "XSRF-TOKEN",
] as const;

export function cacheCsrfToken(token: string | null | undefined): void {
  if (typeof token === "string" && token.trim().length > 0) {
    cachedCsrfToken = token.trim();
  }
}

export function clearCachedCsrfToken(): void {
  cachedCsrfToken = null;
}

/** Read XSRF-TOKEN from document.cookie when same-origin / proxied. */
export function readCsrfCookieFromDocument(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie;
  if (!raw) return null;

  for (const name of CSRF_COOKIE_NAMES) {
    const match = raw.match(
      new RegExp(
        `(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`,
      ),
    );
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

/**
 * Resolve CSRF token for the X-CSRF-Token header.
 * Prefer readable cookie; fall back to memory cache (from response header / issue API).
 */
export function getCsrfTokenForRequest(): string | null {
  return readCsrfCookieFromDocument() ?? cachedCsrfToken;
}

/** Capture token from API response header (CORS-exposed X-CSRF-Token). */
export function captureCsrfFromResponse(response: Response): void {
  const header = response.headers.get(AUTH_HEADERS.CSRF_TOKEN);
  if (header) {
    cacheCsrfToken(header);
  }
}

/**
 * Ensure a CSRF token is available before unsafe requests.
 * Cross-origin SPAs cannot read the API cookie; bootstrap via GET /security/csrf-token.
 */
export async function ensureCsrfToken(): Promise<string | null> {
  const existing = getCsrfTokenForRequest();
  if (existing) return existing;

  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(
        new DOMException(
          `CSRF token request timed out after ${Math.round(CSRF_ENSURE_TIMEOUT_MS / 1000)}s.`,
          "TimeoutError",
        ),
      );
    }, CSRF_ENSURE_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}${SECURITY_API_PREFIX}/csrf-token`,
        {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        },
      );
      captureCsrfFromResponse(response);
      if (!response.ok) return getCsrfTokenForRequest();

      const json = (await response.json()) as {
        data?: { csrfToken?: string };
      };
      const token = json.data?.csrfToken;
      cacheCsrfToken(token);
      return getCsrfTokenForRequest();
    } catch {
      return getCsrfTokenForRequest();
    } finally {
      clearTimeout(timeoutId);
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

export function applyCsrfHeader(
  headers: Headers | Record<string, string>,
  method: string,
): void {
  const upper = method.toUpperCase();
  if (upper === "GET" || upper === "HEAD" || upper === "OPTIONS") {
    return;
  }

  const token = getCsrfTokenForRequest();
  if (!token) return;

  if (headers instanceof Headers) {
    headers.set(AUTH_HEADERS.CSRF_TOKEN, token);
  } else {
    headers[AUTH_HEADERS.CSRF_TOKEN] = token;
  }
}
