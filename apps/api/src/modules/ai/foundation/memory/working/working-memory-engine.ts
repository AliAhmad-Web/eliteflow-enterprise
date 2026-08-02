/**
 * Working Memory Engine — build active reasoning/session working set.
 */

import type { AiMemoryEntry } from "../memory-entry.js";
import { sanitizeMemoryText } from "../memory-entry.js";
import {
  applyWorkingMemoryCapacity,
  resolveWorkingMemoryCapacity,
} from "./working-memory-capacity.js";
import { buildWorkingMemoryContext } from "./working-memory-context.js";
import {
  freezeWorkingMemoryEntry,
  type AiWorkingMemoryEntry,
  type AiWorkingMemoryKind,
} from "./working-memory-entry.js";
import {
  filterExpiredWorkingEntries,
  resolveWorkingMemoryExpiresAt,
} from "./working-memory-expiration.js";
import { refreshWorkingMemoryEntries } from "./working-memory-refresh.js";
import { buildWorkingMemorySession } from "./working-memory-session.js";
import { buildWorkingMemoryWindow } from "./working-memory-window.js";
import {
  resolveWorkingMemoryPriority,
} from "./working-memory-priority.js";
import type { AiWorkingMemory } from "./working-memory.js";

export interface ResolveWorkingMemoryInput {
  readonly memoryEntries?: readonly AiMemoryEntry[];
  readonly consolidatedEntries?: readonly AiMemoryEntry[];
  readonly userPrompt?: string | null;
  readonly mode?: string | null;
  readonly module?: string | null;
  readonly userId?: string | null;
  readonly conversationId?: string | null;
  readonly businessTask?: string | null;
  readonly sessionContextEnabled: boolean;
}

function kindFromSource(entry: AiMemoryEntry): AiWorkingMemoryKind {
  if (entry.type === "working") return "temporary";
  if (entry.type === "session") return "session";
  if (entry.tags.includes("task") || entry.type === "business") return "task";
  if (entry.type === "context") return "focus";
  return "reasoning";
}

/**
 * Resolve immutable working memory for the current request/session.
 */
export function resolveWorkingMemory(
  input: ResolveWorkingMemoryInput,
): AiWorkingMemory {
  const context = buildWorkingMemoryContext({
    userPrompt: input.userPrompt,
    mode: input.mode,
    module: input.module,
    businessTask: input.businessTask,
  });

  const session = buildWorkingMemorySession({
    userId: input.userId,
    conversationId: input.conversationId,
    sessionContextEnabled: input.sessionContextEnabled,
  });

  const caps = resolveWorkingMemoryCapacity({ mode: input.mode });
  const source =
    input.consolidatedEntries && input.consolidatedEntries.length > 0
      ? input.consolidatedEntries
      : (input.memoryEntries ?? []);

  const built: AiWorkingMemoryEntry[] = [];

  if (context.objective) {
    built.push(
      freezeWorkingMemoryEntry({
        id: "wm.objective",
        kind: "objective",
        summary: context.objective,
        priority: resolveWorkingMemoryPriority({
          kind: "objective",
          recency: 1,
          objectiveMatch: true,
        }),
        recency: 1,
        expiresAt: resolveWorkingMemoryExpiresAt({ kind: "objective" }),
        refreshed: true,
        source: "working-objective",
      }),
    );
  }

  if (context.activeTask) {
    built.push(
      freezeWorkingMemoryEntry({
        id: "wm.task",
        kind: "task",
        summary: sanitizeMemoryText(context.activeTask, 120),
        priority: resolveWorkingMemoryPriority({
          kind: "task",
          recency: 0.95,
        }),
        recency: 0.95,
        expiresAt: resolveWorkingMemoryExpiresAt({ kind: "task" }),
        refreshed: true,
        source: "working-task",
      }),
    );
  }

  if (context.focus && context.focus !== context.objective) {
    built.push(
      freezeWorkingMemoryEntry({
        id: "wm.focus",
        kind: "focus",
        summary: context.focus,
        priority: resolveWorkingMemoryPriority({
          kind: "focus",
          recency: 0.9,
        }),
        recency: 0.9,
        expiresAt: resolveWorkingMemoryExpiresAt({ kind: "focus" }),
        refreshed: false,
        source: "working-focus",
      }),
    );
  }

  for (const entry of source.slice(0, 12)) {
    const kind = kindFromSource(entry);
    built.push(
      freezeWorkingMemoryEntry({
        id: `wm.${entry.id}`,
        kind,
        summary: entry.summary,
        priority: resolveWorkingMemoryPriority({
          kind,
          recency: entry.recency,
        }),
        recency: entry.recency,
        expiresAt: resolveWorkingMemoryExpiresAt({ kind }),
        refreshed: false,
        source: entry.source,
      }),
    );
  }

  const refreshed = refreshWorkingMemoryEntries({
    entries: built,
    userPrompt: input.userPrompt,
    focus: context.focus,
  });
  const active = filterExpiredWorkingEntries(refreshed);
  const capped = applyWorkingMemoryCapacity(active, caps.maxEntries);

  const window = buildWorkingMemoryWindow({
    entryCount: capped.kept.length,
    focus: context.focus,
    objective: context.objective,
    activeTask: context.activeTask,
  });

  const capacity = Object.freeze({
    maxEntries: caps.maxEntries,
    maxTokensEstimate: caps.maxTokensEstimate,
    usedEntries: capped.kept.length,
    evictedCount: capped.evictedCount,
  });

  const confidence =
    capped.kept.length === 0
      ? 0
      : Math.min(1, 0.35 + capped.kept.length * 0.08);

  return Object.freeze({
    entries: capped.kept,
    context,
    session,
    window,
    capacity,
    confidence: Math.round(confidence * 1000) / 1000,
    notes: Object.freeze([
      `entries:${capped.kept.length}`,
      `evicted:${capped.evictedCount}`,
      session.isolated ? "session:isolated" : "session:shared",
    ]),
  });
}

export const workingMemoryEngine = Object.freeze({
  resolve: resolveWorkingMemory,
});
