/**
 * Aggregate long-term memory state model.
 */

import type { AiLongTermMemoryEntry } from "./long-term-memory-entry.js";
import type { AiLongTermMemoryProfile } from "./long-term-memory-profile.js";

export interface AiLongTermMemory {
  readonly entries: readonly AiLongTermMemoryEntry[];
  readonly activeEntries: readonly AiLongTermMemoryEntry[];
  readonly profile: AiLongTermMemoryProfile;
  readonly retentionApplied: boolean;
  readonly agingApplied: boolean;
  readonly forgettingApplied: boolean;
  readonly confidence: number;
  readonly notes: readonly string[];
}
