/**
 * Central RedisRateLimiterService — single store for all HTTP rate limiters.
 * Fixed-window counters via atomic Lua (INCR + PEXPIRE).
 */

import { securityMonitoringService } from "../monitoring/index.js";
import { logger } from "../logger.js";
import {
  getRateLimitPrefix,
  isRateLimitEnabled,
  isRateLimitFailOpen,
} from "./rate-limit.config.js";
import {
  getRateLimitRedisClient,
  getRateLimitRedisHealth,
  pingRateLimitRedis,
} from "./redis-client.js";
import type {
  RateLimitConsumeInput,
  RateLimitConsumeResult,
  RateLimitRedisHealth,
} from "./rate-limit.types.js";

/** Atomic fixed-window: INCR + PEXPIRE on first hit; returns {count, pttl}. */
const CONSUME_LUA = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {count, ttl}
`;

const MONITOR_DEBOUNCE_MS = 60_000;
let lastRedisUnavailableAt = 0;
let lastBypassAt = 0;

function buildRedisKey(name: string, strategyKey: string): string {
  const prefix = getRateLimitPrefix();
  return `${prefix}:${name}:${strategyKey}`;
}

function allowWithoutCount(limit: number, windowMs: number): RateLimitConsumeResult {
  const now = Date.now();
  return {
    allowed: true,
    bypassed: true,
    limit,
    remaining: limit,
    resetAtUnix: Math.ceil((now + windowMs) / 1000),
    retryAfterSeconds: null,
  };
}

function denyFailClosed(limit: number, windowMs: number): RateLimitConsumeResult {
  const now = Date.now();
  return {
    allowed: false,
    bypassed: false,
    limit,
    remaining: 0,
    resetAtUnix: Math.ceil((now + windowMs) / 1000),
    retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
  };
}

function emitRedisUnavailable(detail: string, metadata?: Record<string, unknown>): void {
  const now = Date.now();
  if (now - lastRedisUnavailableAt < MONITOR_DEBOUNCE_MS) return;
  lastRedisUnavailableAt = now;
  void securityMonitoringService.reportRedisUnavailable({
    resource: "rate_limit",
    resourceId: "redis",
    message: `Rate-limit Redis unavailable: ${detail}`,
    metadata: { detail, ...metadata },
  });
}

function emitBypassed(detail: string, input: RateLimitConsumeInput): void {
  const now = Date.now();
  if (now - lastBypassAt < MONITOR_DEBOUNCE_MS) return;
  lastBypassAt = now;
  void securityMonitoringService.reportRateLimitBypassed({
    resource: "rate_limit",
    resourceId: input.name,
    message: `Rate limit bypassed (Redis unavailable, fail-open): ${input.name}`,
    metadata: {
      detail,
      scope: input.name,
      max: input.max,
      windowMs: input.windowMs,
      failOpen: true,
    },
  });
}

class RedisRateLimiterService {
  /**
   * Consume one request against the named scope + strategy key.
   * Never throws into the request path — fail-open/closed instead.
   */
  async consume(input: RateLimitConsumeInput): Promise<RateLimitConsumeResult> {
    if (!isRateLimitEnabled()) {
      const now = Date.now();
      return {
        allowed: true,
        bypassed: false,
        limit: input.max,
        remaining: input.max,
        resetAtUnix: Math.ceil((now + input.windowMs) / 1000),
        retryAfterSeconds: null,
      };
    }

    const failOpen = isRateLimitFailOpen();

    try {
      const redis = await getRateLimitRedisClient();
      if (!redis || redis.status !== "ready") {
        const detail =
          getRateLimitRedisHealth().lastError ?? "redis_not_ready";
        emitRedisUnavailable(detail, { scope: input.name });
        if (failOpen) {
          emitBypassed(detail, input);
          return allowWithoutCount(input.max, input.windowMs);
        }
        return denyFailClosed(input.max, input.windowMs);
      }

      const key = buildRedisKey(input.name, input.strategyKey);
      const raw = (await redis.eval(
        CONSUME_LUA,
        1,
        key,
        String(input.windowMs),
      )) as [number | string, number | string];

      const count = Number(raw[0]);
      let pttl = Number(raw[1]);
      if (!Number.isFinite(pttl) || pttl < 0) {
        pttl = input.windowMs;
      }

      const resetAtUnix = Math.ceil((Date.now() + pttl) / 1000);
      const allowed = count <= input.max;
      const remaining = Math.max(0, input.max - count);

      if (!allowed) {
        return {
          allowed: false,
          bypassed: false,
          limit: input.max,
          remaining: 0,
          resetAtUnix,
          retryAfterSeconds: Math.max(1, Math.ceil(pttl / 1000)),
        };
      }

      return {
        allowed: true,
        bypassed: false,
        limit: input.max,
        remaining,
        resetAtUnix,
        retryAfterSeconds: null,
      };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.warn(`[rate-limit] consume failed: ${detail}`);
      emitRedisUnavailable(detail, { scope: input.name });
      if (failOpen) {
        emitBypassed(detail, input);
        return allowWithoutCount(input.max, input.windowMs);
      }
      return denyFailClosed(input.max, input.windowMs);
    }
  }

  async ping(): Promise<boolean> {
    return pingRateLimitRedis();
  }

  getHealth(): RateLimitRedisHealth {
    return getRateLimitRedisHealth();
  }

  /**
   * Best-effort clear of keys for a scope (tests / admin).
   * Uses SCAN — not used on the hot path.
   */
  async clearScope(name: string): Promise<void> {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;

    const match = `${getRateLimitPrefix()}:${name}:*`;
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        match,
        "COUNT",
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        for (const key of keys) {
          await redis.del(key);
        }
      }
    } while (cursor !== "0");
  }

  async clearAll(): Promise<void> {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;

    const match = `${getRateLimitPrefix()}:*`;
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        match,
        "COUNT",
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        for (const key of keys) {
          await redis.del(key);
        }
      }
    } while (cursor !== "0");
  }
}

export const redisRateLimiterService = new RedisRateLimiterService();
