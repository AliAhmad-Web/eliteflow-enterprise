/**
 * Leave workflow stage store — PostgreSQL is the source of truth.
 * Redis + process memory are optional caches only.
 */

import { prisma, type LeaveWorkflowStageState } from "@enterprise/database";
import { logger } from "../../../shared/security/logger.js";
import { getRateLimitRedisClient } from "../../../shared/security/rate-limit/redis-client.js";
import type {
  LeaveWorkflowStageRecord,
  LeaveWorkflowState,
} from "./leave-approval.types.js";

export const LEAVE_WORKFLOW_STORE_PREFIX = "team:leave-workflow";

const memoryStore = new Map<string, LeaveWorkflowStageRecord>();

const ACTIVE_IN_PROGRESS: LeaveWorkflowStageState[] = [
  "SUBMITTED",
  "MANAGER_APPROVED",
  "HR_APPROVED",
];

function storeKey(leaveId: string): string {
  return `${LEAVE_WORKFLOW_STORE_PREFIX}:${leaveId}`;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function rowToRecord(row: {
  leaveRequestId: string;
  employeeId: string;
  subjectUserId: string;
  state: LeaveWorkflowStageState;
  managerApproverId: string | null;
  managerApprovedAt: Date | null;
  hrApproverId: string | null;
  hrApprovedAt: Date | null;
  finalApproverId: string | null;
  finalApprovedAt: Date | null;
  overrideById: string | null;
  overrideAt: Date | null;
  overrideAction: string | null;
  submittedAt: Date;
  expiresAt: Date;
  updatedAt: Date;
}): LeaveWorkflowStageRecord {
  return {
    leaveId: row.leaveRequestId,
    employeeId: row.employeeId,
    subjectUserId: row.subjectUserId,
    state: row.state as LeaveWorkflowState,
    managerApproverId: row.managerApproverId,
    managerApprovedAt: toIso(row.managerApprovedAt),
    hrApproverId: row.hrApproverId,
    hrApprovedAt: toIso(row.hrApprovedAt),
    finalApproverId: row.finalApproverId,
    finalApprovedAt: toIso(row.finalApprovedAt),
    overrideById: row.overrideById,
    overrideAt: toIso(row.overrideAt),
    overrideAction:
      row.overrideAction === "APPROVE" || row.overrideAction === "REJECT"
        ? row.overrideAction
        : null,
    submittedAt: toIso(row.submittedAt)!,
    expiresAt: toIso(row.expiresAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

function stageStatusFor(state: LeaveWorkflowState): string {
  if (
    state === "FINAL_APPROVED" ||
    state === "FINAL_REJECTED" ||
    state === "MANAGER_REJECTED" ||
    state === "HR_REJECTED" ||
    state === "CANCELLED" ||
    state === "EXPIRED"
  ) {
    return "TERMINAL";
  }
  return "ACTIVE";
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
    const terminal = stageStatusFor(record.state) === "TERMINAL";
    const expiresMs = Date.parse(record.expiresAt);
    if (terminal && Number.isFinite(expiresMs) && expiresMs + 7 * 86_400_000 < now) {
      memoryStore.delete(id);
    } else if (Number.isFinite(expiresMs) && expiresMs + 90 * 86_400_000 < now) {
      memoryStore.delete(id);
    }
  }
}

async function loadFromPostgres(
  leaveId: string,
): Promise<LeaveWorkflowStageRecord | null> {
  const row = await prisma.leaveWorkflowState.findUnique({
    where: { leaveRequestId: leaveId },
  });
  if (!row) return null;
  return rowToRecord(row);
}

async function upsertPostgres(record: LeaveWorkflowStageRecord): Promise<void> {
  const data = {
    employeeId: record.employeeId,
    subjectUserId: record.subjectUserId,
    state: record.state as LeaveWorkflowStageState,
    stageStatus: stageStatusFor(record.state),
    managerApproverId: record.managerApproverId ?? null,
    managerApprovedAt: parseDate(record.managerApprovedAt),
    hrApproverId: record.hrApproverId ?? null,
    hrApprovedAt: parseDate(record.hrApprovedAt),
    finalApproverId: record.finalApproverId ?? null,
    finalApprovedAt: parseDate(record.finalApprovedAt),
    overrideById: record.overrideById ?? null,
    overrideAt: parseDate(record.overrideAt),
    overrideAction: record.overrideAction ?? null,
    submittedAt: parseDate(record.submittedAt) ?? new Date(),
    expiresAt: parseDate(record.expiresAt) ?? new Date(),
  };

  await prisma.leaveWorkflowState.upsert({
    where: { leaveRequestId: record.leaveId },
    create: {
      leaveRequestId: record.leaveId,
      ...data,
      revision: 1,
    },
    update: {
      ...data,
      revision: { increment: 1 },
    },
  });
}

export async function getLeaveWorkflowStage(
  leaveId: string,
): Promise<LeaveWorkflowStageRecord | null> {
  const fromRedis = await redisGet(leaveId);
  if (fromRedis) return fromRedis;

  const fromMemory = memoryStore.get(leaveId);
  if (fromMemory) return fromMemory;

  const fromDb = await loadFromPostgres(leaveId);
  if (fromDb) {
    memoryStore.set(leaveId, fromDb);
    // Best-effort cache warm (1 day default if expiresAt malformed)
    const expiresMs = Date.parse(fromDb.expiresAt);
    const ttl = Number.isFinite(expiresMs)
      ? Math.max(60_000, expiresMs - Date.now() + 7 * 86_400_000)
      : 86_400_000;
    void redisSet(fromDb, ttl);
  }
  return fromDb;
}

export async function saveLeaveWorkflowStage(
  record: LeaveWorkflowStageRecord,
  ttlMs: number,
): Promise<void> {
  await upsertPostgres(record);
  pruneMemory();
  memoryStore.set(record.leaveId, record);
  await redisSet(record, ttlMs);
}

export async function deleteLeaveWorkflowStage(leaveId: string): Promise<void> {
  memoryStore.delete(leaveId);
  await redisDel(leaveId);
  try {
    await prisma.leaveWorkflowState.deleteMany({
      where: { leaveRequestId: leaveId },
    });
  } catch (err) {
    logger.warn(
      `[leave-workflow] postgres delete failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Durable scan for expiration: active in-progress stages past expiresAt.
 * Prefer this over process-local memory enumeration.
 */
export async function listExpiredInProgressLeaveWorkflowStages(
  now: Date = new Date(),
): Promise<LeaveWorkflowStageRecord[]> {
  const rows = await prisma.leaveWorkflowState.findMany({
    where: {
      state: { in: ACTIVE_IN_PROGRESS },
      expiresAt: { lt: now },
    },
    take: 500,
    orderBy: { expiresAt: "asc" },
  });
  return rows.map(rowToRecord);
}

/** @deprecated Prefer listExpiredInProgressLeaveWorkflowStages — memory is not durable. */
export function listMemoryLeaveWorkflowStages(): LeaveWorkflowStageRecord[] {
  pruneMemory();
  return [...memoryStore.values()];
}
