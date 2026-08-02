/**
 * Aggregate Enterprise AI Memory model (runtime snapshot).
 */

import type { AiMemoryContext } from "./memory-context.js";
import type { AiMemoryEntry } from "./memory-entry.js";
import type { AiMemoryRanking } from "./memory-ranking.js";

/**
 * Full runtime memory snapshot — never persisted.
 */
export interface AiMemory {
  readonly entries: readonly AiMemoryEntry[];
  readonly ranking?: AiMemoryRanking;
  readonly context?: AiMemoryContext;
  readonly retrievedAt: string;
}
