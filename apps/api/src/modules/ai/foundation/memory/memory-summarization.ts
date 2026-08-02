/**
 * Enterprise AI Memory summarization — safe text digests only.
 * Deterministic, non-LLM. Never exposes raw memory objects.
 */

import { sanitizeMemoryText, type AiMemoryEntry } from "./memory-entry.js";
import { formatMemoryType } from "./memory-types.js";

export interface SummarizeMemoryInput {
  readonly entries: readonly AiMemoryEntry[];
  readonly maxLength?: number;
  readonly maxItems?: number;
}

/**
 * Build a safe multi-line summary from ranked/filtered entries.
 */
export function summarizeMemoryEntries(input: SummarizeMemoryInput): string {
  if (input.entries.length === 0) {
    return "No runtime memory available.";
  }

  const maxItems = input.maxItems ?? 6;
  const maxLength = input.maxLength ?? 400;
  const lines: string[] = [];

  for (const entry of input.entries.slice(0, maxItems)) {
    lines.push(
      `- [${formatMemoryType(entry.type)}] ${sanitizeMemoryText(entry.summary, 100)}`,
    );
  }

  if (input.entries.length > maxItems) {
    lines.push(
      `- …and ${input.entries.length - maxItems} more memory item${input.entries.length - maxItems === 1 ? "" : "s"}`,
    );
  }

  return sanitizeMemoryText(lines.join(" "), maxLength);
}

/**
 * Build a short headline summary for memory context.
 */
export function buildMemoryContextSummary(input: {
  readonly entryCount: number;
  readonly typeCounts: Readonly<Record<string, number>>;
  readonly topSummary?: string | null;
}): string {
  const types = Object.entries(input.typeCounts)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${t}`)
    .slice(0, 5)
    .join(", ");

  const base = `${input.entryCount} memory item${input.entryCount === 1 ? "" : "s"}`;
  const withTypes = types ? `${base} (${types})` : base;
  const focus = input.topSummary?.trim();
  return sanitizeMemoryText(
    focus ? `${withTypes}. Focus: ${focus}` : `${withTypes}.`,
    240,
  );
}
