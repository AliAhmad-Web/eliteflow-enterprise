/**
 * Trusted-device store — Redis when available, process memory otherwise.
 * No Prisma / schema changes.
 */

import { createHash } from "node:crypto";

import { logger } from "../logger.js";
import { getRateLimitRedisClient } from "../rate-limit/redis-client.js";
import {
  SESSION_HARDENING_STORE_PREFIX,
  TRUSTED_DEVICE_TTL_DAYS,
} from "./session-hardening.constants.js";
import type { TrustedDeviceRecord } from "./session-hardening.types.js";

const memoryStore = new Map<string, TrustedDeviceRecord>();

export function hashDeviceFingerprint(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return createHash("sha256").update(trimmed).digest("hex");
}

function storeKey(userId: string, fingerprintHash: string): string {
  return `${SESSION_HARDENING_STORE_PREFIX}:${userId}:${fingerprintHash}`;
}

async function redisGet(key: string): Promise<TrustedDeviceRecord | null> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as TrustedDeviceRecord;
  } catch (err) {
    logger.warn(
      `[session-hardening] trusted-device redis get failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

async function redisSet(
  key: string,
  record: TrustedDeviceRecord,
  ttlMs: number,
): Promise<void> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;
    await redis.set(key, JSON.stringify(record), "PX", Math.max(1, ttlMs));
  } catch (err) {
    logger.warn(
      `[session-hardening] trusted-device redis set failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

async function redisDel(key: string): Promise<void> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;
    await redis.del(key);
  } catch {
    // best-effort
  }
}

export async function saveTrustedDevice(input: {
  userId: string;
  fingerprintHash: string;
  label?: string | null;
  ttlDays?: number;
}): Promise<TrustedDeviceRecord> {
  const ttlDays = input.ttlDays ?? TRUSTED_DEVICE_TTL_DAYS;
  const now = Date.now();
  const record: TrustedDeviceRecord = {
    userId: input.userId,
    fingerprintHash: input.fingerprintHash,
    label: input.label ?? null,
    rememberedAt: now,
    expiresAt: now + ttlDays * 24 * 60 * 60 * 1000,
  };
  const key = storeKey(input.userId, input.fingerprintHash);
  memoryStore.set(key, record);
  await redisSet(key, record, record.expiresAt - now);
  return record;
}

export async function getTrustedDevice(
  userId: string,
  fingerprintHash: string,
): Promise<TrustedDeviceRecord | null> {
  const key = storeKey(userId, fingerprintHash);
  const fromRedis = await redisGet(key);
  const record = fromRedis ?? memoryStore.get(key) ?? null;
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    await redisDel(key);
    return null;
  }
  return record;
}

export async function removeTrustedDevice(
  userId: string,
  fingerprintHash: string,
): Promise<void> {
  const key = storeKey(userId, fingerprintHash);
  memoryStore.delete(key);
  await redisDel(key);
}
