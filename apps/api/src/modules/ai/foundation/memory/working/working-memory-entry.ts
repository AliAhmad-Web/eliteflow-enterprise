/**
 * Immutable working memory entry.
 */

import { sanitizeMemoryText } from "../memory-entry.js";
import type { AiWorkingMemoryPriority } from "./working-memory-priority.js";

export type AiWorkingMemoryKind =
  | "objective"
  | "focus"
  | "task"
  | "reasoning"
  | "temporary"
  | "session";

export interface AiWorkingMemoryEntry {
  readonly id: string;
  readonly kind: AiWorkingMemoryKind;
  readonly summary: string;
  readonly priority: AiWorkingMemoryPriority;
  readonly recency: number;
  readonly expiresAt: string | null;
  readonly refreshed: boolean;
  readonly source: string;
}

export function freezeWorkingMemoryEntry(
  entry: AiWorkingMemoryEntry,
): AiWorkingMemoryEntry {
  return Object.freeze({
    ...entry,
    summary: sanitizeMemoryText(entry.summary, 160),
  });
}
