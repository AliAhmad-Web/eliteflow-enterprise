/**
 * Conversation / business episode model.
 */

import type { AiEpisodicMemoryEvent } from "./episodic-memory-event.js";

export interface AiEpisodicMemoryEpisode {
  readonly id: string;
  readonly title: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly eventIds: readonly string[];
  readonly events: readonly AiEpisodicMemoryEvent[];
  readonly importance: number;
  readonly topic: string | null;
}

export function freezeEpisodicMemoryEpisode(
  episode: AiEpisodicMemoryEpisode,
): AiEpisodicMemoryEpisode {
  return Object.freeze({
    ...episode,
    eventIds: Object.freeze([...episode.eventIds]),
    events: Object.freeze([...episode.events]),
  });
}
