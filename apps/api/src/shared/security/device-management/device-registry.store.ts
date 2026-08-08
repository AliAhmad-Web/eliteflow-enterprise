/**
 * Device registry store — Redis when available, process memory otherwise.
 * No Prisma / schema changes. Never stores raw fingerprints.
 */

import { randomUUID } from "node:crypto";

import { logger } from "../logger.js";
import { getRateLimitRedisClient } from "../rate-limit/redis-client.js";
import { hashDeviceFingerprint } from "../session-hardening/trusted-device.store.js";
import {
  DEVICE_FP_INDEX_PREFIX,
  DEVICE_IP_HISTORY_MAX,
  DEVICE_RECORD_TTL_DAYS,
  DEVICE_STORE_PREFIX,
  DEVICE_USER_INDEX_PREFIX,
} from "./device-management.constants.js";
import type { DeviceRecord } from "./device-management.types.js";

const memoryDevices = new Map<string, DeviceRecord>();
/** userId → Set<deviceId> */
const memoryUserIndex = new Map<string, Set<string>>();
/** userId:fingerprintHash → deviceId */
const memoryFpIndex = new Map<string, string>();

function deviceKey(deviceId: string): string {
  return `${DEVICE_STORE_PREFIX}:${deviceId}`;
}

function userIndexKey(userId: string): string {
  return `${DEVICE_USER_INDEX_PREFIX}:${userId}`;
}

function fpIndexKey(userId: string, fingerprintHash: string): string {
  return `${DEVICE_FP_INDEX_PREFIX}:${userId}:${fingerprintHash}`;
}

function ttlMs(): number {
  return DEVICE_RECORD_TTL_DAYS * 24 * 60 * 60 * 1000;
}

async function redisGet(key: string): Promise<string | null> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return null;
    return await redis.get(key);
  } catch (err) {
    logger.warn(
      `[device-management] redis get failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

async function redisSet(key: string, value: string, ms: number): Promise<void> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;
    await redis.set(key, value, "PX", Math.max(1, ms));
  } catch (err) {
    logger.warn(
      `[device-management] redis set failed: ${
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

async function redisSAdd(key: string, member: string, ms: number): Promise<void> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;
    await redis.sadd(key, member);
    await redis.pexpire(key, Math.max(1, ms));
  } catch {
    // best-effort
  }
}

async function redisSRem(key: string, member: string): Promise<void> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;
    await redis.srem(key, member);
  } catch {
    // best-effort
  }
}

async function redisSMembers(key: string): Promise<string[]> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return [];
    return await redis.smembers(key);
  } catch {
    return [];
  }
}

function indexUser(userId: string, deviceId: string): void {
  let set = memoryUserIndex.get(userId);
  if (!set) {
    set = new Set();
    memoryUserIndex.set(userId, set);
  }
  set.add(deviceId);
}

function unindexUser(userId: string, deviceId: string): void {
  memoryUserIndex.get(userId)?.delete(deviceId);
}

export function hashFingerprint(raw: string | null | undefined): string | null {
  return hashDeviceFingerprint(raw);
}

export function appendIpHistory(
  record: DeviceRecord,
  ipAddress: string | null | undefined,
  country?: string | null,
  city?: string | null,
): void {
  if (!ipAddress?.trim()) return;
  const ip = ipAddress.trim();
  const last = record.ipHistory[record.ipHistory.length - 1];
  if (last && last.ipAddress === ip) {
    last.seenAt = Date.now();
    if (country != null) last.country = country;
    if (city != null) last.city = city;
    return;
  }
  record.ipHistory.push({
    ipAddress: ip,
    seenAt: Date.now(),
    country: country ?? null,
    city: city ?? null,
  });
  if (record.ipHistory.length > DEVICE_IP_HISTORY_MAX) {
    record.ipHistory = record.ipHistory.slice(-DEVICE_IP_HISTORY_MAX);
  }
}

export async function saveDevice(record: DeviceRecord): Promise<DeviceRecord> {
  const key = deviceKey(record.id);
  memoryDevices.set(key, record);
  indexUser(record.userId, record.id);
  if (record.fingerprintHash) {
    memoryFpIndex.set(fpIndexKey(record.userId, record.fingerprintHash), record.id);
  }

  const payload = JSON.stringify(record);
  const ms = ttlMs();
  await redisSet(key, payload, ms);
  await redisSAdd(userIndexKey(record.userId), record.id, ms);
  if (record.fingerprintHash) {
    await redisSet(
      fpIndexKey(record.userId, record.fingerprintHash),
      record.id,
      ms,
    );
  }
  return record;
}

export async function getDeviceById(
  deviceId: string,
): Promise<DeviceRecord | null> {
  const key = deviceKey(deviceId);
  const fromRedis = await redisGet(key);
  if (fromRedis) {
    try {
      const record = JSON.parse(fromRedis) as DeviceRecord;
      memoryDevices.set(key, record);
      return record;
    } catch {
      return null;
    }
  }
  return memoryDevices.get(key) ?? null;
}

export async function getDeviceByFingerprint(
  userId: string,
  fingerprintHash: string,
): Promise<DeviceRecord | null> {
  const idxKey = fpIndexKey(userId, fingerprintHash);
  const fromRedis = await redisGet(idxKey);
  const deviceId = fromRedis ?? memoryFpIndex.get(idxKey) ?? null;
  if (!deviceId) return null;
  return getDeviceById(deviceId);
}

export async function listDevicesByUser(
  userId: string,
): Promise<DeviceRecord[]> {
  const fromRedis = await redisSMembers(userIndexKey(userId));
  const ids = new Set<string>(fromRedis);
  const mem = memoryUserIndex.get(userId);
  if (mem) {
    for (const id of mem) ids.add(id);
  }

  const records: DeviceRecord[] = [];
  for (const id of ids) {
    const record = await getDeviceById(id);
    if (record && record.userId === userId) {
      records.push(record);
    }
  }
  records.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  return records;
}

/** Best-effort org-wide scan from memory + known user indexes (no Prisma). */
export async function listAllDevices(): Promise<DeviceRecord[]> {
  const seen = new Set<string>();
  const records: DeviceRecord[] = [];

  for (const record of memoryDevices.values()) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    records.push(record);
  }

  for (const [userId] of memoryUserIndex) {
    const userDevices = await listDevicesByUser(userId);
    for (const record of userDevices) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      records.push(record);
    }
  }

  records.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  return records;
}

export async function deleteDevice(deviceId: string): Promise<DeviceRecord | null> {
  const existing = await getDeviceById(deviceId);
  if (!existing) return null;

  const key = deviceKey(deviceId);
  memoryDevices.delete(key);
  unindexUser(existing.userId, deviceId);
  if (existing.fingerprintHash) {
    memoryFpIndex.delete(fpIndexKey(existing.userId, existing.fingerprintHash));
    await redisDel(fpIndexKey(existing.userId, existing.fingerprintHash));
  }
  await redisDel(key);
  await redisSRem(userIndexKey(existing.userId), deviceId);
  return existing;
}

export function createDeviceId(): string {
  return randomUUID();
}
