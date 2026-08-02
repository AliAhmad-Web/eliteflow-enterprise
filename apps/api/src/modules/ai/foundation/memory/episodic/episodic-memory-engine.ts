/**
 * Episodic Memory Engine — events, episodes, timeline, linking.
 */

import type { AiMemoryMessage } from "../../contracts/ai-memory-message.js";
import type { AiMemoryEntry } from "../memory-entry.js";
import { sanitizeMemoryText } from "../memory-entry.js";
import type { AiWorkingMemory } from "../working/working-memory.js";
import {
  freezeEpisodicMemoryEntry,
  type AiEpisodicMemoryEntry,
} from "./episodic-memory-entry.js";
import {
  freezeEpisodicMemoryEpisode,
  type AiEpisodicMemoryEpisode,
} from "./episodic-memory-episode.js";
import {
  freezeEpisodicMemoryEvent,
  type AiEpisodicEventKind,
  type AiEpisodicMemoryEvent,
} from "./episodic-memory-event.js";
import { scoreEpisodicImportance } from "./episodic-memory-importance.js";
import {
  linkedIdsFor,
  linkEpisodicEvents,
} from "./episodic-memory-linking.js";
import { buildEpisodicTimeline } from "./episodic-memory-timeline.js";
import type { AiEpisodicMemory } from "./episodic-memory.js";

export interface ResolveEpisodicMemoryInput {
  readonly conversationHistory?: readonly AiMemoryMessage[];
  readonly memoryEntries?: readonly AiMemoryEntry[];
  readonly workingMemory?: AiWorkingMemory | null;
  readonly userPrompt?: string | null;
  readonly moduleHint?: string | null;
  readonly episodesEnabled: boolean;
}

function eventKindFromMemory(entry: AiMemoryEntry): AiEpisodicEventKind {
  if (entry.tags.includes("milestone") || entry.summary.toLowerCase().includes("milestone")) {
    return "project-milestone";
  }
  if (entry.tags.includes("task") || entry.summary.toLowerCase().includes("task")) {
    return "task-completion";
  }
  if (entry.type === "business") return "business-event";
  if (entry.type === "conversation") return "conversation-turn";
  if (entry.type === "user") return "user-interaction";
  return "system";
}

function buildEvents(input: ResolveEpisodicMemoryInput): readonly AiEpisodicMemoryEvent[] {
  const events: AiEpisodicMemoryEvent[] = [];
  const now = Date.now();

  const history = input.conversationHistory ?? [];
  history.slice(-6).forEach((msg, index) => {
    const kind: AiEpisodicEventKind = "conversation-turn";
    const importance = scoreEpisodicImportance({
      kind,
      recency: (index + 1) / Math.max(1, Math.min(6, history.length)),
    });
    events.push(
      freezeEpisodicMemoryEvent({
        id: `ep.conv.${index}`,
        kind,
        summary: sanitizeMemoryText(
          `${msg.role}: ${msg.content}`,
          120,
        ),
        occurredAt: new Date(now - (history.length - index) * 60_000).toISOString(),
        importance,
        source: "conversation-history",
      }),
    );
  });

  for (const entry of (input.memoryEntries ?? []).slice(0, 10)) {
    const kind = eventKindFromMemory(entry);
    events.push(
      freezeEpisodicMemoryEvent({
        id: `ep.mem.${entry.id}`,
        kind,
        summary: entry.summary,
        occurredAt: entry.createdAt,
        importance: scoreEpisodicImportance({
          kind,
          recency: entry.recency,
        }),
        source: entry.source,
      }),
    );
  }

  if (input.workingMemory?.context.activeTask) {
    events.push(
      freezeEpisodicMemoryEvent({
        id: "ep.task.active",
        kind: "task-completion",
        summary: sanitizeMemoryText(
          `Active task: ${input.workingMemory.context.activeTask}`,
          120,
        ),
        occurredAt: new Date().toISOString(),
        importance: scoreEpisodicImportance({
          kind: "task-completion",
          recency: 1,
        }),
        source: "working-memory",
      }),
    );
  }

  if (input.userPrompt?.trim()) {
    events.push(
      freezeEpisodicMemoryEvent({
        id: "ep.user.prompt",
        kind: "user-interaction",
        summary: sanitizeMemoryText(
          `User interaction: ${input.userPrompt.trim()}`,
          120,
        ),
        occurredAt: new Date().toISOString(),
        importance: scoreEpisodicImportance({
          kind: "user-interaction",
          recency: 1,
        }),
        source: "user-prompt",
      }),
    );
  }

  return Object.freeze(events.slice(0, 24));
}

function buildEpisodes(
  events: readonly AiEpisodicMemoryEvent[],
): readonly AiEpisodicMemoryEpisode[] {
  if (events.length === 0) return Object.freeze([]);

  const byKind = new Map<AiEpisodicEventKind, AiEpisodicMemoryEvent[]>();
  for (const event of events) {
    const bucket = byKind.get(event.kind) ?? [];
    bucket.push(event);
    byKind.set(event.kind, bucket);
  }

  const episodes: AiEpisodicMemoryEpisode[] = [];
  let index = 0;
  for (const [kind, bucket] of byKind) {
    const sorted = [...bucket].sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt),
    );
    const importance =
      sorted.reduce((s, e) => s + e.importance, 0) / sorted.length;
    episodes.push(
      freezeEpisodicMemoryEpisode({
        id: `episode.${index}`,
        title: sanitizeMemoryText(`${kind} episode`, 60),
        startedAt: sorted[0]?.occurredAt ?? new Date().toISOString(),
        endedAt:
          sorted[sorted.length - 1]?.occurredAt ?? new Date().toISOString(),
        eventIds: Object.freeze(sorted.map((e) => e.id)),
        events: Object.freeze(sorted),
        importance: Math.round(importance * 1000) / 1000,
        topic: kind,
      }),
    );
    index += 1;
  }

  return Object.freeze(episodes.slice(0, 8));
}

/**
 * Resolve immutable episodic memory for the current request.
 */
export function resolveEpisodicMemory(
  input: ResolveEpisodicMemoryInput,
): AiEpisodicMemory {
  const events = buildEvents(input);
  const links = linkEpisodicEvents(events);
  const timeline = buildEpisodicTimeline(events);
  const episodes = input.episodesEnabled
    ? buildEpisodes(events)
    : Object.freeze([]);

  const episodeByEvent = new Map<string, string>();
  for (const episode of episodes) {
    for (const id of episode.eventIds) {
      episodeByEvent.set(id, episode.id);
    }
  }

  const entries: AiEpisodicMemoryEntry[] = events.map((event) =>
    freezeEpisodicMemoryEntry({
      event,
      episodeId: episodeByEvent.get(event.id) ?? null,
      linkedIds: linkedIdsFor(event.id, links),
      score: event.importance,
    }),
  );

  entries.sort((a, b) => b.score - a.score);

  const confidence =
    entries.length === 0
      ? 0
      : Math.round(
          (entries.reduce((s, e) => s + e.score, 0) / entries.length) * 1000,
        ) / 1000;

  return Object.freeze({
    entries: Object.freeze(entries.slice(0, 16)),
    episodes,
    timeline,
    links,
    episodesEnabled: input.episodesEnabled,
    confidence,
    summary: sanitizeMemoryText(
      `${entries.length} episodic events; episodes=${episodes.length}; ${timeline.summary}`,
      200,
    ),
    notes: Object.freeze([
      `events:${events.length}`,
      `episodes:${episodes.length}`,
      `links:${links.length}`,
      input.episodesEnabled ? "episodes:on" : "episodes:off",
    ]),
  });
}

export const episodicMemoryEngine = Object.freeze({
  resolve: resolveEpisodicMemory,
});
