/**
 * Working Memory Manager — orchestration wrapper.
 */

import {
  resolveWorkingMemory,
  type ResolveWorkingMemoryInput,
} from "./working-memory-engine.js";
import type { AiWorkingMemory } from "./working-memory.js";

export class AiWorkingMemoryManager {
  resolve(input: ResolveWorkingMemoryInput): AiWorkingMemory {
    return resolveWorkingMemory(input);
  }
}

export const workingMemoryManager = new AiWorkingMemoryManager();
