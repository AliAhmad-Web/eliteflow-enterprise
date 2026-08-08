/**
 * Confirmation store — Redis when available, process memory otherwise.
 * No Prisma / schema changes.
 */

import { logger } from "../../../../shared/security/logger.js";
import { getRateLimitRedisClient } from "../../../../shared/security/rate-limit/redis-client.js";
import type { HumanConfirmationRecord } from "./confirmation.types.js";

export const CONFIRMATION_STORE_PREFIX = "ai:confirmation";

const memoryStore = new Map<string, HumanConfirmationRecord>();

function storeKey(confirmationId: string): string {
  return `${CONFIRMATION_STORE_PREFIX}:${confirmationId}`;
}

async function redisGet(
  confirmationId: string,
): Promise<HumanConfirmationRecord | null> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return null;
    const raw = await redis.get(storeKey(confirmationId));
    if (!raw) return null;
    return JSON.parse(raw) as HumanConfirmationRecord;
  } catch (err) {
    logger.warn(
      `[ai-confirmation] redis get failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function redisSet(
  record: HumanConfirmationRecord,
  ttlMs: number,
): Promise<boolean> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return false;
    await redis.set(
      storeKey(record.confirmationId),
      JSON.stringify(record),
      "PX",
      Math.max(1, ttlMs),
    );
    return true;
  } catch (err) {
    logger.warn(
      `[ai-confirmation] redis set failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

function pruneMemory(): void {
  const now = Date.now();
  for (const [id, record] of memoryStore) {
    if (record.expiresAt < now && record.status !== "pending") {
      memoryStore.delete(id);
    } else if (record.expiresAt + 60 * 60 * 1000 < now) {
      memoryStore.delete(id);
    }
  }
}

export async function getConfirmationRecord(
  confirmationId: string,
): Promise<HumanConfirmationRecord | null> {
  const fromRedis = await redisGet(confirmationId);
  if (fromRedis) return fromRedis;
  return memoryStore.get(confirmationId) ?? null;
}

export async function saveConfirmationRecord(
  record: HumanConfirmationRecord,
  ttlMs: number,
): Promise<void> {
  pruneMemory();
  memoryStore.set(record.confirmationId, record);
  await redisSet(record, ttlMs);
}

export async function updateConfirmationRecord(
  record: HumanConfirmationRecord,
  ttlMs: number,
): Promise<void> {
  memoryStore.set(record.confirmationId, record);
  await redisSet(record, Math.max(1, ttlMs));
}
