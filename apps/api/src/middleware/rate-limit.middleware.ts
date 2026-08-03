import type { NextFunction, Request, Response } from "express";

import { AUTH_ERROR_CODES, AUTH_HEADERS } from "@enterprise/shared";

import { isApiSecurityRateLimitingEnabled } from "../config/security-flags.js";
import { AuthError } from "../modules/auth/auth.errors.js";
import { logSecurityRateLimited } from "../shared/services/security-monitoring.service.js";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Unique scope so routes do not share the same counter. */
  name: string;
  max: number;
  windowMs: number;
  keyGenerator: (req: Request) => string;
}

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 50_000;

function cleanupExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  // When hardening ON: evict oldest entries if map grows too large (multi-key abuse).
  if (isApiSecurityRateLimitingEnabled() && buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      removed += 1;
      if (removed >= overflow) break;
    }
  }
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const hardening = isApiSecurityRateLimitingEnabled();
    // Stricter budget when hardening is ON (≈70% of configured max, min 1).
    const max = hardening
      ? Math.max(1, Math.floor(options.max * 0.7))
      : options.max;
    const windowMs = options.windowMs;

    const now = Date.now();
    cleanupExpiredBuckets(now);

    const key = `${options.name}:${options.keyGenerator(req)}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      if (hardening) {
        res.setHeader("RateLimit-Limit", String(max));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, max - 1)));
        res.setHeader(
          "RateLimit-Reset",
          String(Math.ceil((now + windowMs) / 1000)),
        );
      }
      next();
      return;
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      );

      res.setHeader(AUTH_HEADERS.RETRY_AFTER, String(retryAfterSeconds));
      if (hardening) {
        res.setHeader("RateLimit-Limit", String(max));
        res.setHeader("RateLimit-Remaining", "0");
        res.setHeader(
          "RateLimit-Reset",
          String(Math.ceil(existing.resetAt / 1000)),
        );
        void logSecurityRateLimited({
          req,
          scope: options.name,
          max,
          windowMs,
        });
      }

      next(
        new AuthError(
          "Too many requests. Please try again later.",
          429,
          AUTH_ERROR_CODES.RATE_LIMITED,
        ),
      );
      return;
    }

    existing.count += 1;
    if (hardening) {
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader(
        "RateLimit-Remaining",
        String(Math.max(0, max - existing.count)),
      );
      res.setHeader(
        "RateLimit-Reset",
        String(Math.ceil(existing.resetAt / 1000)),
      );
    }
    next();
  };
}

export function rateLimitByEmail(field = "email") {
  return (req: Request): string => {
    const body = req.body as Record<string, unknown> | undefined;
    const email =
      typeof body?.[field] === "string" ? body[field].trim().toLowerCase() : "unknown";

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
