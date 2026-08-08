/**
 * Redis client for distributed rate limiting.
 * Supports standalone, cluster, and sentinel-shaped config (future-ready).
 */

import { Cluster, Redis, type RedisOptions } from "ioredis";

import { logger } from "../logger.js";
import {
  getRateLimitRedisMode,
  getRateLimitRedisNodes,
  getRateLimitRedisUrl,
  getRateLimitSentinelName,
  getRateLimitSentinelPassword,
  isRateLimitEnabled,
} from "./rate-limit.config.js";
import type {
  RateLimitHealthStatus,
  RateLimitRedisHealth,
  RateLimitRedisMode,
} from "./rate-limit.types.js";

export type RateLimitRedisClient = Redis | Cluster;

let client: RateLimitRedisClient | null = null;
let initAttempted = false;
let lastPingOk: boolean | null = null;
let lastError: string | null = null;
let ready = false;

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  lazyConnect: true,
  /** Fail fast on unreachable Redis — never hang request threads. */
  connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 2_000),
  commandTimeout: Number(process.env.REDIS_COMMAND_TIMEOUT_MS ?? 1_500),
  enableOfflineQueue: false,
  retryStrategy(times) {
    // Cap reconnect attempts so dead Redis does not thrash forever.
    if (times > 8) return null;
    return Math.min(times * 200, 2_000);
  },
  reconnectOnError(err) {
    const message = err.message.toLowerCase();
    return (
      message.includes("readonly") ||
      message.includes("econnreset") ||
      message.includes("etimedout")
    );
  },
};

function parseStandaloneUrl(url: string): RedisOptions {
  try {
    const parsed = new URL(url);
    const db =
      parsed.pathname && parsed.pathname.length > 1
        ? Number(parsed.pathname.slice(1))
        : undefined;
    return {
      ...baseOptions,
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? Number(parsed.port) : 6379,
      password: parsed.password
        ? decodeURIComponent(parsed.password)
        : undefined,
      username: parsed.username
        ? decodeURIComponent(parsed.username)
        : undefined,
      db: Number.isFinite(db) ? db : undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    };
  } catch {
    return {
      ...baseOptions,
      host: "127.0.0.1",
      port: 6379,
    };
  }
}

function parseHostPort(node: string): { host: string; port: number } {
  if (node.includes("://")) {
    try {
      const parsed = new URL(node);
      return {
        host: parsed.hostname || "127.0.0.1",
        port: parsed.port ? Number(parsed.port) : 6379,
      };
    } catch {
      // fall through
    }
  }
  const [host, portRaw] = node.split(":");
  return {
    host: host || "127.0.0.1",
    port: portRaw ? Number(portRaw) : 6379,
  };
}

function attachLifecycle(
  instance: RateLimitRedisClient,
  mode: RateLimitRedisMode,
): void {
  instance.on("ready", () => {
    ready = true;
    lastError = null;
    logger.info(`[rate-limit] Redis ready (${mode})`);
  });
  instance.on("connect", () => {
    logger.debug(`[rate-limit] Redis connecting (${mode})`);
  });
  instance.on("error", (err: Error) => {
    ready = false;
    lastError = err.message;
    logger.warn(`[rate-limit] Redis error: ${err.message}`);
  });
  instance.on("end", () => {
    ready = false;
    logger.warn("[rate-limit] Redis connection ended");
  });
  instance.on("reconnecting", () => {
    ready = false;
    logger.info("[rate-limit] Redis reconnecting…");
  });
}

function createClient(): RateLimitRedisClient | null {
  if (!isRateLimitEnabled()) {
    return null;
  }

  const mode = getRateLimitRedisMode();
  const url = getRateLimitRedisUrl();
  const nodes = getRateLimitRedisNodes();

  if (!url && nodes.length === 0) {
    lastError = "redis_url_not_configured";
    logger.warn(
      "[rate-limit] RATE_LIMIT_REDIS_URL / REDIS_URL not set — Redis limiter unavailable",
    );
    return null;
  }

  let instance: RateLimitRedisClient;

  switch (mode) {
    case "cluster": {
      const clusterNodes = (nodes.length > 0 ? nodes : url ? [url] : []).map(
        parseHostPort,
      );
      instance = new Cluster(clusterNodes, {
        redisOptions: baseOptions,
        clusterRetryStrategy(times) {
          return Math.min(times * 200, 5_000);
        },
      });
      break;
    }
    case "sentinel": {
      const sentinelName = getRateLimitSentinelName();
      if (!sentinelName) {
        lastError = "sentinel_name_missing";
        logger.warn(
          "[rate-limit] RATE_LIMIT_REDIS_SENTINEL_NAME required for sentinel mode",
        );
        return null;
      }
      const sentinels = (nodes.length > 0 ? nodes : []).map(parseHostPort);
      if (sentinels.length === 0) {
        lastError = "sentinel_nodes_missing";
        logger.warn(
          "[rate-limit] Sentinel nodes missing (RATE_LIMIT_REDIS_URL / REDIS_URL)",
        );
        return null;
      }
      instance = new Redis({
        ...baseOptions,
        sentinels,
        name: sentinelName,
        sentinelPassword: getRateLimitSentinelPassword() ?? undefined,
      });
      break;
    }
    case "standalone": {
      instance = new Redis(parseStandaloneUrl(url ?? "redis://127.0.0.1:6379"));
      break;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unsupported Redis mode: ${String(_exhaustive)}`);
    }
  }

  attachLifecycle(instance, mode);
  return instance;
}

/**
 * Lazily create and connect the shared Redis client.
 */
export async function getRateLimitRedisClient(): Promise<RateLimitRedisClient | null> {
  if (!isRateLimitEnabled()) {
    return null;
  }

  if (!initAttempted) {
    initAttempted = true;
    client = createClient();
  }

  if (!client) {
    return null;
  }

  try {
    // ioredis status: wait / connecting / connect / ready / close / end
    const status = client.status;
    if (status === "wait") {
      const connectTimeoutMs = Number(
        process.env.REDIS_CONNECT_TIMEOUT_MS ?? 2_000,
      );
      await Promise.race([
        client.connect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              Object.assign(
                new Error(`Redis connect timeout after ${connectTimeoutMs}ms`),
                { code: "ETIMEDOUT" },
              ),
            );
          }, connectTimeoutMs);
        }),
      ]);
    }
    ready = client.status === "ready";
    return client;
  } catch (err) {
    ready = false;
    lastError = err instanceof Error ? err.message : String(err);
    logger.warn(`[rate-limit] Redis connect failed: ${lastError}`);
    return null;
  }
}

export async function pingRateLimitRedis(): Promise<boolean> {
  const redis = await getRateLimitRedisClient();
  if (!redis) {
    lastPingOk = false;
    return false;
  }
  try {
    const result = await redis.ping();
    lastPingOk = result === "PONG";
    if (lastPingOk) {
      ready = true;
      lastError = null;
    }
    return lastPingOk;
  } catch (err) {
    lastPingOk = false;
    ready = false;
    lastError = err instanceof Error ? err.message : String(err);
    return false;
  }
}

export function getRateLimitRedisHealth(): RateLimitRedisHealth {
  const configured = Boolean(getRateLimitRedisUrl());
  const mode = configured ? getRateLimitRedisMode() : null;

  if (!isRateLimitEnabled()) {
    return {
      status: "disabled",
      mode,
      configured,
      ready: false,
      lastPingOk,
      lastError: null,
      detail: "rate_limit_disabled",
    };
  }

  if (!configured) {
    return {
      status: "unavailable",
      mode: null,
      configured: false,
      ready: false,
      lastPingOk,
      lastError: lastError ?? "redis_url_not_configured",
      detail: "redis_not_configured",
    };
  }

  let status: RateLimitHealthStatus;
  if (ready && lastPingOk !== false) {
    status = "healthy";
  } else if (client && (ready || lastPingOk === null)) {
    status = "degraded";
  } else {
    status = "unavailable";
  }

  return {
    status,
    mode,
    configured,
    ready,
    lastPingOk,
    lastError,
    detail: lastError,
  };
}

export async function disconnectRateLimitRedis(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  } finally {
    client = null;
    initAttempted = false;
    ready = false;
  }
}

/** Test helper — reset module state. */
export function resetRateLimitRedisClientForTests(): void {
  client = null;
  initAttempted = false;
  ready = false;
  lastPingOk = null;
  lastError = null;
}
