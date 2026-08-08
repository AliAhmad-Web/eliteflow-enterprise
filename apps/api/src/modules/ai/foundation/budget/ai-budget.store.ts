/**
 * AI budget ledger store — Redis when available, process memory otherwise.
 * No Prisma schema changes.
 */

import { logger } from "../../../../shared/security/logger.js";
import { getRateLimitRedisClient } from "../../../../shared/security/rate-limit/redis-client.js";
import type { AiBudgetLedger } from "./ai-budget.types.js";

export const AI_BUDGET_STORE_PREFIX = "ai:budget";

const memoryStore = new Map<string, AiBudgetLedger>();

function storeKey(budgetId: string): string {
  return `${AI_BUDGET_STORE_PREFIX}:${budgetId}`;
}

async function redisGet(budgetId: string): Promise<AiBudgetLedger | null> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return null;
    const raw = await redis.get(storeKey(budgetId));
    if (!raw) return null;
    return JSON.parse(raw) as AiBudgetLedger;
  } catch (err) {
    logger.warn(
      `[ai-budget] redis get failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function redisSet(ledger: AiBudgetLedger, ttlMs: number): Promise<boolean> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return false;
    await redis.set(
      storeKey(ledger.id),
      JSON.stringify(ledger),
      "PX",
      Math.max(1, ttlMs),
    );
    return true;
  } catch (err) {
    logger.warn(
      `[ai-budget] redis set failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

function pruneMemory(): void {
  // Soft prune: keep under 5k entries
  if (memoryStore.size <= 5000) return;
  const entries = [...memoryStore.entries()];
  entries.sort(
    (a, b) => Date.parse(a[1].updatedAt) - Date.parse(b[1].updatedAt),
  );
  for (let i = 0; i < entries.length - 4000; i += 1) {
    const id = entries[i]?.[0];
    if (id) memoryStore.delete(id);
  }
}

export async function getBudgetLedger(
  budgetId: string,
): Promise<AiBudgetLedger | null> {
  const fromRedis = await redisGet(budgetId);
  if (fromRedis) {
    memoryStore.set(budgetId, fromRedis);
    return fromRedis;
  }
  return memoryStore.get(budgetId) ?? null;
}

export async function saveBudgetLedger(
  ledger: AiBudgetLedger,
  ttlMs: number,
): Promise<void> {
  pruneMemory();
  memoryStore.set(ledger.id, ledger);
  await redisSet(ledger, ttlMs);
}

export function listMemoryBudgetLedgers(): AiBudgetLedger[] {
  pruneMemory();
  return [...memoryStore.values()];
}

export function buildBudgetId(parts: {
  level: string;
  type: string;
  scopeKey: string;
  periodKey: string;
  providerId?: string | null;
  modelId?: string | null;
}): string {
  const provider = parts.providerId ? `:p:${parts.providerId}` : "";
  const model = parts.modelId ? `:m:${parts.modelId}` : "";
  return `${parts.level}:${parts.type}:${parts.scopeKey}:${parts.periodKey}${provider}${model}`;
}
