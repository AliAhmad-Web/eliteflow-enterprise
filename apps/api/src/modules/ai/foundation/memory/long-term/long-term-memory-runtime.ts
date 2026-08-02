/**
 * SAFE runtime formatter for long-term / consolidation metadata.
 * Never exposes raw memories, IDs, or internal scoring details.
 * Not wired into Prompt Engineering in Task 7.4 (PE behavior unchanged).
 */

import type { AiMemoryConsolidation } from "./long-term-memory-consolidation.js";
import type { AiLongTermMemory } from "./long-term-memory.js";
import { formatLongTermMemoryCategory } from "./long-term-memory-category.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Build SAFE long-term memory metadata block.
 */
export function formatLongTermMemoryForRuntime(
  longTermMemory: AiLongTermMemory | null | undefined,
  consolidation?: AiMemoryConsolidation | null,
): string {
  if (!longTermMemory) return "";

  const lines: string[] = [
    "Long-Term Memory:",
    `Summary: ${sanitizeLine(longTermMemory.profile.summary, 180)}`,
    `Confidence: ${longTermMemory.confidence.toFixed(2)}`,
  ];

  const top = longTermMemory.activeEntries.slice(0, 4);
  if (top.length > 0) {
    lines.push("Durable Context:");
    for (const item of top) {
      lines.push(
        `- [${formatLongTermMemoryCategory(item.category)}] ${sanitizeLine(item.entry.summary, 100)}`,
      );
    }
  }

  if (consolidation) {
    lines.push(
      `Consolidation: ${sanitizeLine(consolidation.summary, 160)}`,
    );
  }

  return lines.join("\n").trim();
}
