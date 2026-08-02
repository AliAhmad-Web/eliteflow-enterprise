/**
 * Episodic Memory Manager — orchestration wrapper.
 */

import {
  resolveEpisodicMemory,
  type ResolveEpisodicMemoryInput,
} from "./episodic-memory-engine.js";
import type { AiEpisodicMemory } from "./episodic-memory.js";

export class AiEpisodicMemoryManager {
  resolve(input: ResolveEpisodicMemoryInput): AiEpisodicMemory {
    return resolveEpisodicMemory(input);
  }
}

export const episodicMemoryManager = new AiEpisodicMemoryManager();
