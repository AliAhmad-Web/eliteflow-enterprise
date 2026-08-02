/**
 * Immutable Enterprise AI Memory entry.
 * Safe metadata / summaries only — never carries secrets, tokens, or raw records.
 */

import type { AiMemoryPriority } from "./memory-priority.js";
import type { AiMemoryScope } from "./memory-scope.js";
import type { AiMemoryType } from "./memory-types.js";

/**
 * Frozen memory entry attached to pipeline state collections.
 */
export interface AiMemoryEntry {
  readonly id: string;
  readonly type: AiMemoryType;
  readonly scope: AiMemoryScope;
  readonly priority: AiMemoryPriority;
  /** Safe human-readable summary (sanitized). */
  readonly summary: string;
  /** Logical source label (e.g. conversation-history, active-context). */
  readonly source: string;
  /** Permission keys required to surface this entry (metadata only). */
  readonly permissionKeys: readonly string[];
  readonly tags: readonly string[];
  /** Relative recency score 0–1 within the current request. */
  readonly recency: number;
  readonly createdAt: string;
}

export function freezeMemoryEntry(entry: AiMemoryEntry): AiMemoryEntry {
  return Object.freeze({
    ...entry,
    permissionKeys: Object.freeze([...entry.permissionKeys]),
    tags: Object.freeze([...entry.tags]),
  });
}

export function sanitizeMemoryText(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
