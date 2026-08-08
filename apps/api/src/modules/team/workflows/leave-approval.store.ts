/**
 * Durable-enough leave workflow stage store (Redis when available, memory fallback).
 * No Prisma schema changes — stages also mirrored to EmployeeTimelineEvent + audit.
 */

import { logger } from "../../../shared/security/logger.js";
import { getRateLimitRedisClient } from "../../../shared/security/rate-limit/redis-client.js";
import type { LeaveWorkflowStageRecord } from "./leave-approval.types.js";

export const LEAVE_WORKFLOW_STORE_PREFIX = "team:leave-workflow";

const memoryStore = new Map<string, LeaveWorkflowStageRecord>();

function storeKey(leaveId: string): string {
  return `${LEAVE_WORKFLOW_STORE_PREFIX}:${leaveId}`;
}

async function redisGet(
  leaveId: string,
): Promise<LeaveWorkflowStageRecord | null> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return null;
    const raw = await redis.get(storeKey(leaveId));
    if (!raw) return null;
    return JSON.parse(raw) as LeaveWorkflowStageRecord;
  } catch (err) {
    logger.warn(
      `[leave-workflow] redis get failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function redisSet(
  record: LeaveWorkflowStageRecord,
  ttlMs: number,
): Promise<boolean> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return false;
    await redis.set(
      storeKey(record.leaveId),
      JSON.stringify(record),
      "PX",
      Math.max(1, ttlMs),
    );
    return true;
  } catch (err) {
    logger.warn(
      `[leave-workflow] redis set failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

async function redisDel(leaveId: string): Promise<void> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;
    await redis.del(storeKey(leaveId));
  } catch (err) {
    logger.warn(
      `[leave-workflow] redis del failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function pruneMemory(): void {
  const now = Date.now();
  for (const [id, record] of memoryStore) {
    const terminal =
      record.state === "FINAL_APPROVED" ||
      record.state === "FINAL_REJECTED" ||
      record.state === "MANAGER_REJECTED" ||
      record.state === "HR_REJECTED" ||
      record.state === "CANCELLED" ||
      record.state === "EXPIRED";
    const expiresMs = Date.parse(record.expiresAt);
    if (terminal && Number.isFinite(expiresMs) && expiresMs + 7 * 86_400_000 < now) {
      memoryStore.delete(id);
    } else if (Number.isFinite(expiresMs) && expiresMs + 90 * 86_400_000 < now) {
      memoryStore.delete(id);
    }
  }
}

export async function getLeaveWorkflowStage(
  leaveId: string,
): Promise<LeaveWorkflowStageRecord | null> {
  const fromRedis = await redisGet(leaveId);
  if (fromRedis) return fromRedis;
  return memoryStore.get(leaveId) ?? null;
}

export async function saveLeaveWorkflowStage(
  record: LeaveWorkflowStageRecord,
  ttlMs: number,
): Promise<void> {
  pruneMemory();
  memoryStore.set(record.leaveId, record);
  await redisSet(record, ttlMs);
}

export async function deleteLeaveWorkflowStage(leaveId: string): Promise<void> {
  memoryStore.delete(leaveId);
  await redisDel(leaveId);
}

/** In-memory scan for expiration job when Redis keys are not enumerated. */
export function listMemoryLeaveWorkflowStages(): LeaveWorkflowStageRecord[] {
  pruneMemory();
  return [...memoryStore.values()];
}
