/**
 * Aggregate working memory model.
 */

import type { AiWorkingMemoryCapacity } from "./working-memory-capacity.js";
import type { AiWorkingMemoryContext } from "./working-memory-context.js";
import type { AiWorkingMemoryEntry } from "./working-memory-entry.js";
import type { AiWorkingMemorySession } from "./working-memory-session.js";
import type { AiWorkingMemoryWindow } from "./working-memory-window.js";

export interface AiWorkingMemory {
  readonly entries: readonly AiWorkingMemoryEntry[];
  readonly context: AiWorkingMemoryContext;
  readonly session: AiWorkingMemorySession;
  readonly window: AiWorkingMemoryWindow;
  readonly capacity: AiWorkingMemoryCapacity;
  readonly confidence: number;
  readonly notes: readonly string[];
}
