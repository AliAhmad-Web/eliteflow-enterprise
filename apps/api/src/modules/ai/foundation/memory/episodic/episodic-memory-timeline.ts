/**
 * Episodic timeline builder.
 */

import { sanitizeMemoryText } from "../memory-entry.js";
import type { AiEpisodicMemoryEvent } from "./episodic-memory-event.js";

export interface AiEpisodicTimelineItem {
  readonly at: string;
  readonly label: string;
  readonly eventId: string;
  readonly importance: number;
}

export interface AiEpisodicMemoryTimeline {
  readonly items: readonly AiEpisodicTimelineItem[];
  readonly summary: string;
}

export function buildEpisodicTimeline(
  events: readonly AiEpisodicMemoryEvent[],
): AiEpisodicMemoryTimeline {
  const sorted = [...events].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt),
  );
  const items = Object.freeze(
    sorted.slice(0, 16).map((event) =>
      Object.freeze({
        at: event.occurredAt,
        label: sanitizeMemoryText(event.summary, 80),
        eventId: event.id,
        importance: event.importance,
      }),
    ),
  );

  return Object.freeze({
    items,
    summary: sanitizeMemoryText(
      `${items.length} timeline events; span=${items[0]?.at ?? "n/a"}→${items[items.length - 1]?.at ?? "n/a"}`,
      160,
    ),
  });
}
