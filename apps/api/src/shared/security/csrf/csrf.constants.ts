/**
 * Enterprise CSRF constants (Phase 2 Step 2).
 */

export const CSRF_COOKIE_NAME = "XSRF-TOKEN" as const;

export const CSRF_HEADER_NAME = "X-CSRF-Token" as const;

/** Default token lifetime. */
export const CSRF_DEFAULT_EXPIRATION_MINUTES = 120;

/** Minimum entropy for generated tokens (bytes). */
export const CSRF_TOKEN_BYTES = 32;

/** Redis / memory key prefix for CSRF records. */
export const CSRF_STORE_PREFIX = "ebm:csrf";

export const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Path suffixes (after API prefix) that skip CSRF validation.
 * Matched against `req.path` when mounted under the API router, or `originalUrl`.
 */
export const CSRF_EXEMPT_PATH_PATTERNS: readonly RegExp[] = [
  /\/auth\/login\/?$/i,
  /\/auth\/signup\/?$/i,
  /**
   * OAuth completion after provider redirect — same class as login.
   * Provider/Supabase tokens already bind the flow; a stale XSRF cookie
   * (e.g. after API restart) must not block the callback.
   */
  /\/auth\/oauth\/callback\/?$/i,
  /\/auth\/refresh\/?$/i,
  /\/auth\/password\/setup\/?$/i,
  /\/auth\/password\/reset\/?$/i,
  /** Current password-reset route (BC with existing API). */
  /\/auth\/reset-password\/?$/i,
  /\/auth\/mfa(?:\/|$)/i,
  /\/health\/?$/i,
  /** Stripe billing webhooks — verified via Stripe-Signature, not CSRF. */
  /\/billing\/webhooks\/stripe\/?$/i,
  /** AI SSE streaming — CSRF would break EventSource-style POST streams. */
  /\/ai\/chat\/stream\/?$/i,
];
