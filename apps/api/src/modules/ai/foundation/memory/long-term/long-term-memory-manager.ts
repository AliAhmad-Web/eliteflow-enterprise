/**
 * Long-Term Memory Manager — orchestrates evaluation and consolidation.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import {
  consolidateLongTermMemories,
  type AiMemoryConsolidation,
} from "./long-term-memory-consolidation.js";
import {
  resolveLongTermMemory,
  type ResolveLongTermMemoryInput,
} from "./long-term-memory-engine.js";
import type { AiLongTermMemory } from "./long-term-memory.js";

export interface LongTermMemoryManagerResolveInput
  extends ResolveLongTermMemoryInput {
  readonly consolidate: boolean;
}

export interface LongTermMemoryManagerResult {
  readonly longTermMemory: AiLongTermMemory;
  readonly memoryConsolidation?: AiMemoryConsolidation;
}

export class AiLongTermMemoryManager {
  resolve(input: LongTermMemoryManagerResolveInput): LongTermMemoryManagerResult {
    const longTermMemory = resolveLongTermMemory(input);
    if (!input.consolidate) {
      return Object.freeze({ longTermMemory });
    }
    const memoryConsolidation = consolidateLongTermMemories({
      longTermEntries: longTermMemory.entries,
    });
    return Object.freeze({
      longTermMemory,
      memoryConsolidation,
    });
  }

  consolidate(
    longTermMemory: AiLongTermMemory,
  ): AiMemoryConsolidation {
    return consolidateLongTermMemories({
      longTermEntries: longTermMemory.entries,
    });
  }

  activeBaseEntries(longTermMemory: AiLongTermMemory): readonly AiMemoryEntry[] {
    return Object.freeze(longTermMemory.activeEntries.map((e) => e.entry));
  }
}

export const longTermMemoryManager = new AiLongTermMemoryManager();
