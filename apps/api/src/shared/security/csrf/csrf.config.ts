/**
 * Enterprise CSRF configuration (Phase 2 Step 2).
 *
 * Env:
 * - CSRF_ENABLED
 * - CSRF_EXPIRATION_MINUTES
 * - CSRF_ROTATE_ON_REFRESH
 * - CSRF_SINGLE_USE
 */

import { CSRF_DEFAULT_EXPIRATION_MINUTES } from "./csrf.constants.js";

function parseEnvFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Master switch. Defaults ON so CSRF protection is active in all envs
 * (validation still skips when no cookie — Bearer-only BC).
 */
export function isCsrfEnabled(): boolean {
  return parseEnvFlag(process.env.CSRF_ENABLED, true);
}

export function getCsrfExpirationMinutes(): number {
  const raw = process.env.CSRF_EXPIRATION_MINUTES?.trim();
  if (!raw) return CSRF_DEFAULT_EXPIRATION_MINUTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return CSRF_DEFAULT_EXPIRATION_MINUTES;
  return Math.floor(n);
}

export function getCsrfExpirationMs(): number {
  return getCsrfExpirationMinutes() * 60 * 1000;
}

/** Rotate CSRF token on successful refresh (default ON). */
export function isCsrfRotateOnRefresh(): boolean {
  return parseEnvFlag(process.env.CSRF_ROTATE_ON_REFRESH, true);
}

/** Single-use tokens (default OFF — would break SPA multi-tab without careful UX). */
export function isCsrfSingleUse(): boolean {
  return parseEnvFlag(process.env.CSRF_SINGLE_USE, false);
}

export function isCsrfProduction(): boolean {
  return isProduction();
}
