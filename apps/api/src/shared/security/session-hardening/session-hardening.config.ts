/**
 * Session hardening configuration (Phase 2 Step 3).
 *
 * Env:
 * - SESSION_IDLE_TIMEOUT_MINUTES
 * - SESSION_ABSOLUTE_TIMEOUT_DAYS
 * - SESSION_ABSOLUTE_TIMEOUT_REMEMBER_ME_DAYS (optional)
 * - SESSION_MAX_CONCURRENT
 * - SESSION_TRUSTED_DEVICE_ENABLED
 * - SESSION_RISK_ENABLED
 */

import { TOKEN_EXPIRATION } from "@enterprise/shared";

import type { SessionHardeningPolicy } from "./session-hardening.types.js";

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

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function getSessionHardeningPolicy(): SessionHardeningPolicy {
  return {
    idleTimeoutMinutes: parsePositiveInt(
      process.env.SESSION_IDLE_TIMEOUT_MINUTES,
      TOKEN_EXPIRATION.IDLE_SESSION_MINUTES,
    ),
    absoluteTimeoutDays: parsePositiveInt(
      process.env.SESSION_ABSOLUTE_TIMEOUT_DAYS,
      TOKEN_EXPIRATION.ABSOLUTE_SESSION_DAYS,
    ),
    absoluteTimeoutRememberMeDays: parsePositiveInt(
      process.env.SESSION_ABSOLUTE_TIMEOUT_REMEMBER_ME_DAYS,
      TOKEN_EXPIRATION.ABSOLUTE_SESSION_DAYS_REMEMBER_ME,
    ),
    maxConcurrentSessions: parsePositiveInt(
      process.env.SESSION_MAX_CONCURRENT,
      TOKEN_EXPIRATION.MAX_CONCURRENT_SESSIONS,
    ),
    trustedDeviceEnabled: parseEnvFlag(
      process.env.SESSION_TRUSTED_DEVICE_ENABLED,
      true,
    ),
    riskEnabled: parseEnvFlag(process.env.SESSION_RISK_ENABLED, true),
  };
}

export function isSessionTrustedDeviceEnabled(): boolean {
  return getSessionHardeningPolicy().trustedDeviceEnabled;
}

export function isSessionRiskEnabled(): boolean {
  return getSessionHardeningPolicy().riskEnabled;
}
