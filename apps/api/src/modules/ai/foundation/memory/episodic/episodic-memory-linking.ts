/**
 * Episode linking — connect related episodic events.
 */

import type { AiEpisodicMemoryEvent } from "./episodic-memory-event.js";

export interface AiEpisodicLink {
  readonly fromId: string;
  readonly toId: string;
  readonly reason: string;
  readonly strength: number;
}

export function linkEpisodicEvents(
  events: readonly AiEpisodicMemoryEvent[],
): readonly AiEpisodicLink[] {
  const links: AiEpisodicLink[] = [];
  for (let i = 0; i < events.length; i += 1) {
    const a = events[i];
    if (!a) continue;
    for (let j = i + 1; j < events.length; j += 1) {
      const b = events[j];
      if (!b) continue;
      if (a.kind === b.kind) {
        links.push(
          Object.freeze({
            fromId: a.id,
            toId: b.id,
            reason: `same-kind:${a.kind}`,
            strength: 0.55,
          }),
        );
      }
      const sa = a.summary.toLowerCase();
      const sb = b.summary.toLowerCase();
      if (
        sa.length > 16 &&
        sb.length > 16 &&
        (sa.includes(sb.slice(0, 16)) || sb.includes(sa.slice(0, 16)))
      ) {
        links.push(
          Object.freeze({
            fromId: a.id,
            toId: b.id,
            reason: "summary-overlap",
            strength: 0.7,
          }),
        );
      }
    }
  }
  return Object.freeze(links.slice(0, 40));
}

export function linkedIdsFor(
  eventId: string,
  links: readonly AiEpisodicLink[],
): readonly string[] {
  const ids = new Set<string>();
  for (const link of links) {
    if (link.fromId === eventId) ids.add(link.toId);
    if (link.toId === eventId) ids.add(link.fromId);
  }
  return Object.freeze([...ids]);
}
