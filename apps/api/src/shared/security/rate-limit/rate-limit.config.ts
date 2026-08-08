/**
 * Centralized Redis rate-limit configuration (Phase 2 Step 1).
 *
 * Env:
 * - RATE_LIMIT_ENABLED
 * - RATE_LIMIT_REDIS_URL (preferred) / REDIS_URL
 * - RATE_LIMIT_PREFIX
 * - REDIS_RATE_LIMIT_FAIL_OPEN / RATE_LIMIT_FAIL_OPEN
 * - RATE_LIMIT_REDIS_CLUSTER
 * - RATE_LIMIT_REDIS_SENTINEL_NAME + RATE_LIMIT_REDIS_SENTINELS (future)
 */

import type { RateLimitRedisMode } from "./rate-limit.types.js";

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

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw !== undefined && raw.trim().length > 0) {
      return raw.trim();
    }
  }
  return undefined;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Master switch. Defaults ON so existing always-on rate limiting is preserved.
 */
export function isRateLimitEnabled(): boolean {
  return parseEnvFlag(process.env.RATE_LIMIT_ENABLED, true);
}

export function getRateLimitRedisUrl(): string | null {
  return firstEnv("RATE_LIMIT_REDIS_URL", "REDIS_URL") ?? null;
}

export function getRateLimitPrefix(): string {
  return firstEnv("RATE_LIMIT_PREFIX") ?? "ebm:rl";
}

/**
 * Fail-open when Redis is unavailable.
 * Development default: open. Production default: closed (opt-in via env).
 */
export function isRateLimitFailOpen(): boolean {
  const explicit = firstEnv(
    "REDIS_RATE_LIMIT_FAIL_OPEN",
    "RATE_LIMIT_FAIL_OPEN",
  );
  if (explicit !== undefined) {
    return parseEnvFlag(explicit, !isProduction());
  }
  return !isProduction();
}

export function getRateLimitRedisMode(): RateLimitRedisMode {
  if (firstEnv("RATE_LIMIT_REDIS_SENTINEL_NAME")) {
    return "sentinel";
  }
  if (parseEnvFlag(process.env.RATE_LIMIT_REDIS_CLUSTER, false)) {
    return "cluster";
  }
  return "standalone";
}

/** Comma-separated host:port list for cluster or sentinel. */
export function getRateLimitRedisNodes(): string[] {
  const url = getRateLimitRedisUrl();
  if (!url) return [];
  return url
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function getRateLimitSentinelName(): string | null {
  return firstEnv("RATE_LIMIT_REDIS_SENTINEL_NAME") ?? null;
}

export function getRateLimitSentinelPassword(): string | null {
  return firstEnv("RATE_LIMIT_REDIS_SENTINEL_PASSWORD") ?? null;
}
