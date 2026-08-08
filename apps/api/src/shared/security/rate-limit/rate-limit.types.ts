/**
 * Enterprise Redis rate limiter — types (Phase 2 Step 1).
 * Storage backend only; policy values remain route-defined.
 */

export type RateLimitRedisMode = "standalone" | "cluster" | "sentinel";

export type RateLimitHealthStatus = "healthy" | "degraded" | "unavailable" | "disabled";

export interface RateLimitConsumeInput {
  /** Scope name (e.g. auth.login) — same as existing middleware `name`. */
  name: string;
  /** Caller-built strategy key (ip / user / ip+email / otp-session / …). */
  strategyKey: string;
  max: number;
  windowMs: number;
}

export interface RateLimitConsumeResult {
  allowed: boolean;
  /** True when the request was allowed because Redis was unavailable (fail-open). */
  bypassed: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds when the window resets. */
  resetAtUnix: number;
  /** Seconds until retry; set when not allowed (or fail-closed). */
  retryAfterSeconds: number | null;
}

export interface RateLimitRedisHealth {
  status: RateLimitHealthStatus;
  mode: RateLimitRedisMode | null;
  configured: boolean;
  ready: boolean;
  lastPingOk: boolean | null;
  lastError: string | null;
  detail: string | null;
}
