import type { NextFunction, Request, Response } from "express";

import { AUTH_ERROR_CODES, AUTH_HEADERS } from "@enterprise/shared";

import { isApiSecurityRateLimitingEnabled } from "../config/security-flags.js";
import { AuthError } from "../modules/auth/auth.errors.js";
import { isRateLimitEnabled } from "../shared/security/rate-limit/rate-limit.config.js";
import { redisRateLimiterService } from "../shared/security/rate-limit/redis-rate-limiter.service.js";
import { logSecurityRateLimited } from "../shared/services/security-monitoring.service.js";

interface RateLimitOptions {
  /** Unique scope so routes do not share the same counter. */
  name: string;
  max: number;
  windowMs: number;
  keyGenerator: (req: Request) => string;
}

function setRateLimitHeaders(
  res: Response,
  input: {
    limit: number;
    remaining: number;
    resetAtUnix: number;
    retryAfterSeconds: number | null;
  },
): void {
  res.setHeader("RateLimit-Limit", String(input.limit));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, input.remaining)));
  res.setHeader("RateLimit-Reset", String(input.resetAtUnix));
  if (input.retryAfterSeconds != null) {
    res.setHeader(AUTH_HEADERS.RETRY_AFTER, String(input.retryAfterSeconds));
  }
}

/**
 * HTTP rate-limit middleware (existing public API).
 * Storage is Redis via RedisRateLimiterService — call sites unchanged.
 */
export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        if (!isRateLimitEnabled()) {
          next();
          return;
        }

        const hardening = isApiSecurityRateLimitingEnabled();
        // Stricter budget when hardening ON (≈70% of configured max, min 1).
        const max = hardening
          ? Math.max(1, Math.floor(options.max * 0.7))
          : options.max;

        const strategyKey = options.keyGenerator(req);
        const result = await redisRateLimiterService.consume({
          name: options.name,
          strategyKey,
          max,
          windowMs: options.windowMs,
        });

        setRateLimitHeaders(res, {
          limit: result.limit,
          remaining: result.remaining,
          resetAtUnix: result.resetAtUnix,
          retryAfterSeconds: result.allowed ? null : result.retryAfterSeconds,
        });

        if (!result.allowed) {
          // Emit monitoring + optional audit (abuse aggregation reused).
          void logSecurityRateLimited({
            req,
            scope: options.name,
            max,
            windowMs: options.windowMs,
          });

          next(
            new AuthError(
              "Too many requests. Please try again later.",
              429,
              AUTH_ERROR_CODES.RATE_LIMITED,
            ),
          );
          return;
        }

        next();
      } catch (err) {
        next(err);
      }
    })();
  };
}

/**
 * Clears Redis keys for the rate-limit prefix (tests).
 * Replaces the former in-memory Map clear.
 */
export function clearRateLimitBuckets(): void {
  void redisRateLimiterService.clearAll();
}

export function rateLimitByEmail(field = "email") {
  return (req: Request): string => {
    const body = req.body as Record<string, unknown> | undefined;
    const email =
      typeof body?.[field] === "string"
        ? body[field].trim().toLowerCase()
        : "unknown";

    return `email:${email}`;
  };
}

export function rateLimitByIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : req.ip;

  return `ip:${ip ?? "unknown"}`;
}

/** Composite key for credential stuffing resistance (IP + email). */
export function rateLimitByIpAndEmail(field = "email") {
  return (req: Request): string => {
    const ipKey = rateLimitByIp(req);
    const body = req.body as Record<string, unknown> | undefined;
    const email =
      typeof body?.[field] === "string"
        ? body[field].trim().toLowerCase()
        : "unknown";

    return `${ipKey}:email:${email}`;
  };
}

export function rateLimitByOtpSession(req: Request): string {
  const body = req.body as { otpSessionId?: string } | undefined;
  const sessionId =
    typeof body?.otpSessionId === "string" ? body.otpSessionId : "unknown";

  return `otp-session:${sessionId}`;
}

export function rateLimitByUser(req: Request): string {
  const userId = req.auth?.userId ?? "anonymous";
  return `user:${userId}`;
}
