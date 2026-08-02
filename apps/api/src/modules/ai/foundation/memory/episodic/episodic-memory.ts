/**
 * Aggregate episodic memory model.
 */

import type { AiEpisodicMemoryEntry } from "./episodic-memory-entry.js";
import type { AiEpisodicMemoryEpisode } from "./episodic-memory-episode.js";
import type { AiEpisodicLink } from "./episodic-memory-linking.js";
import type { AiEpisodicMemoryTimeline } from "./episodic-memory-timeline.js";

export interface AiEpisodicMemory {
  readonly entries: readonly AiEpisodicMemoryEntry[];
  readonly episodes: readonly AiEpisodicMemoryEpisode[];
  readonly timeline: AiEpisodicMemoryTimeline;
  readonly links: readonly AiEpisodicLink[];
  readonly episodesEnabled: boolean;
  readonly confidence: number;
  readonly summary: string;
  readonly notes: readonly string[];
}
