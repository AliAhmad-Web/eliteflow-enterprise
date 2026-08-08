/**
 * Webhook store — Redis when available, memory otherwise.
 * Stores deliveries, nonces, and rotated secret metadata (encrypted).
 * Never stores plaintext secrets in memory beyond process env.
 */

import { logger } from "../logger.js";
import { getRateLimitRedisClient } from "../rate-limit/redis-client.js";
import {
  WEBHOOK_NONCE_PREFIX,
  WEBHOOK_STORE_PREFIX,
} from "./webhook.constants.js";
import type { WebhookDeliveryRecord } from "./webhook.types.js";

const memoryDeliveries = new Map<string, WebhookDeliveryRecord>();
const memoryNonces = new Map<string, number>();
/** Ephemeral payload cache for in-flight retries only — cleared on terminal states. */
const payloadCache = new Map<string, string>();
const deliveryOrder: string[] = [];

export function cachePayload(deliveryId: string, body: string): void {
  payloadCache.set(deliveryId, body);
}

export function takePayload(deliveryId: string): string | null {
  return payloadCache.get(deliveryId) ?? null;
}

export function clearPayload(deliveryId: string): void {
  payloadCache.delete(deliveryId);
}

function deliveryKey(id: string): string {
  return `${WEBHOOK_STORE_PREFIX}:delivery:${id}`;
}

function nonceKey(nonce: string): string {
  return `${WEBHOOK_NONCE_PREFIX}:${nonce}`;
}

async function redisGet(key: string): Promise<string | null> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return null;
    return await redis.get(key);
  } catch (err) {
    logger.warn(
      `[webhooks] redis get failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

async function redisSet(key: string, value: string, ttlMs: number): Promise<void> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;
    await redis.set(key, value, "PX", Math.max(1, ttlMs));
  } catch (err) {
    logger.warn(
      `[webhooks] redis set failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

async function redisExists(key: string): Promise<boolean> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return false;
    return (await redis.exists(key)) === 1;
  } catch {
    return false;
  }
}

export async function saveDelivery(
  record: WebhookDeliveryRecord,
  ttlMs: number,
  historyLimit: number,
): Promise<void> {
  memoryDeliveries.set(record.deliveryId, record);
  if (!deliveryOrder.includes(record.deliveryId)) {
    deliveryOrder.unshift(record.deliveryId);
  }
  while (deliveryOrder.length > historyLimit) {
    const dropped = deliveryOrder.pop();
    if (dropped) memoryDeliveries.delete(dropped);
  }
  await redisSet(
    deliveryKey(record.deliveryId),
    JSON.stringify(record),
    ttlMs,
  );
}

export async function getDelivery(
  deliveryId: string,
): Promise<WebhookDeliveryRecord | null> {
  const fromRedis = await redisGet(deliveryKey(deliveryId));
  if (fromRedis) {
    try {
      const parsed = JSON.parse(fromRedis) as WebhookDeliveryRecord;
      memoryDeliveries.set(deliveryId, parsed);
      return parsed;
    } catch {
      return null;
    }
  }
  return memoryDeliveries.get(deliveryId) ?? null;
}

export function listDeliveries(limit = 50): WebhookDeliveryRecord[] {
  const ids = deliveryOrder.slice(0, limit);
  const out: WebhookDeliveryRecord[] = [];
  for (const id of ids) {
    const record = memoryDeliveries.get(id);
    if (record) out.push(record);
  }
  return out;
}

export function listRetrying(limit = 50): WebhookDeliveryRecord[] {
  return listDeliveries(200)
    .filter(
      (d) => d.status === "RETRYING" || d.status === "QUEUED",
    )
    .slice(0, limit);
}

export function listDeadLetters(limit = 50): WebhookDeliveryRecord[] {
  return listDeliveries(200)
    .filter((d) => d.status === "DEAD_LETTER")
    .slice(0, limit);
}

export async function isNonceUsed(nonce: string): Promise<boolean> {
  if (memoryNonces.has(nonce)) {
    const exp = memoryNonces.get(nonce)!;
    if (exp > Date.now()) return true;
    memoryNonces.delete(nonce);
  }
  return redisExists(nonceKey(nonce));
}

export async function consumeNonce(
  nonce: string,
  ttlMs: number,
): Promise<void> {
  memoryNonces.set(nonce, Date.now() + ttlMs);
  await redisSet(nonceKey(nonce), "1", ttlMs);
  // Opportunistic cleanup
  if (memoryNonces.size > 5000) {
    const now = Date.now();
    for (const [k, exp] of memoryNonces) {
      if (exp <= now) memoryNonces.delete(k);
    }
  }
}

/** In-memory counters for dashboard (process-local). */
export const webhookMetrics = {
  deliveries: 0,
  failures: 0,
  retries: 0,
  replayAttacks: 0,
  signatureFailures: 0,
  deadLetters: 0,
};
