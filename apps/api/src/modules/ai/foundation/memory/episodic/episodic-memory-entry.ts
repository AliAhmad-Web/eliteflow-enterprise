/**
 * Episodic memory entry wrapping an event with retrieval metadata.
 */

import type { AiEpisodicMemoryEvent } from "./episodic-memory-event.js";

export interface AiEpisodicMemoryEntry {
  readonly event: AiEpisodicMemoryEvent;
  readonly episodeId: string | null;
  readonly linkedIds: readonly string[];
  readonly score: number;
}

export function freezeEpisodicMemoryEntry(
  entry: AiEpisodicMemoryEntry,
): AiEpisodicMemoryEntry {
  return Object.freeze({
    ...entry,
    linkedIds: Object.freeze([...entry.linkedIds]),
  });
}
