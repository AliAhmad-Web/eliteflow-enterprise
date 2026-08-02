/**
 * Immutable Enterprise AI Memory Context model.
 * Built for Prompt Engineering — safe summaries only.
 */

import type { AiMemoryEntry } from "./memory-entry.js";
import type { AiMemoryPermissions } from "./memory-permissions.js";
import type { AiMemoryPolicies } from "./memory-policies.js";
import type { AiMemoryType } from "./memory-types.js";

/**
 * Frozen memory context attached to pipeline state.
 */
export interface AiMemoryContext {
  readonly entries: readonly AiMemoryEntry[];
  readonly summary: string;
  readonly typeCounts: Readonly<Record<AiMemoryType, number>>;
  readonly policies: AiMemoryPolicies;
  readonly permissions: AiMemoryPermissions;
  readonly confidence: number;
  readonly notes: readonly string[];
}

export function emptyTypeCounts(): Record<AiMemoryType, number> {
  return {
    conversation: 0,
    user: 0,
    business: 0,
    session: 0,
    context: 0,
    preference: 0,
    working: 0,
    longterm: 0,
  };
}

export function countMemoryTypes(
  entries: readonly AiMemoryEntry[],
): Readonly<Record<AiMemoryType, number>> {
  const counts = emptyTypeCounts();
  for (const entry of entries) {
    counts[entry.type] += 1;
  }
  return Object.freeze({ ...counts });
}
