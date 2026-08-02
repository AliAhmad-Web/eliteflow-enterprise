/**
 * Working memory refresh — bump recency for active items matching prompt/focus.
 */

import type { AiWorkingMemoryEntry } from "./working-memory-entry.js";
import { freezeWorkingMemoryEntry } from "./working-memory-entry.js";

export function refreshWorkingMemoryEntries(input: {
  readonly entries: readonly AiWorkingMemoryEntry[];
  readonly userPrompt?: string | null;
  readonly focus?: string | null;
}): readonly AiWorkingMemoryEntry[] {
  const prompt = (input.userPrompt ?? "").toLowerCase();
  const focus = (input.focus ?? "").toLowerCase();

  return Object.freeze(
    input.entries.map((entry) => {
      const hay = `${entry.summary} ${entry.kind}`.toLowerCase();
      const matches =
        (prompt.length > 0 && hay.includes(prompt.slice(0, 24))) ||
        (focus.length > 0 && hay.includes(focus));
      if (!matches) return entry;
      return freezeWorkingMemoryEntry({
        ...entry,
        recency: Math.min(1, entry.recency + 0.15),
        refreshed: true,
      });
    }),
  );
}
