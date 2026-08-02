/**
 * Memory cleanup — soft-delete expired / excess records.
 */

import type { AiPersistentMemoryRepository } from "./memory-repository.js";
import { aiPersistentMemoryRepository } from "./memory-repository.js";

export interface MemoryCleanupResult {
  readonly expiredRemoved: number;
  readonly excessRemoved: number;
  readonly remaining: number;
}

export interface CleanupMemoryInput {
  readonly userId: string;
  readonly maxActiveRecords?: number;
  readonly repository?: AiPersistentMemoryRepository;
}

/**
 * Soft-delete expired records and trim oldest when over capacity.
 */
export async function cleanupPersistentMemory(
  input: CleanupMemoryInput,
): Promise<MemoryCleanupResult> {
  const repository = input.repository ?? aiPersistentMemoryRepository;
  const maxActive = input.maxActiveRecords ?? 80;

  const expiredRemoved = await repository.softDeleteExpired(input.userId);
  const active = await repository.listActive({
    userId: input.userId,
    limit: maxActive + 40,
    includeExpired: false,
  });

  let excessRemoved = 0;
  if (active.length > maxActive) {
    const excess = active.slice(maxActive);
    excessRemoved = await repository.softDeleteByKeys(
      input.userId,
      excess.map((row) => row.memoryKey),
    );
  }

  const remaining = await repository.countActive(input.userId);

  return Object.freeze({
    expiredRemoved,
    excessRemoved,
    remaining,
  });
}
