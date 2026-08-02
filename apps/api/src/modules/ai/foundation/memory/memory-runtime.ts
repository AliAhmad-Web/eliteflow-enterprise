/**
 * Format Enterprise AI Memory Context as safe Runtime Instructions metadata.
 * Never exposes raw memory objects, internal runtime state, tokens, or secrets.
 */

import type { AiMemoryContext } from "./memory-context.js";
import { formatMemoryAccessLevel } from "./memory-permissions.js";
import { formatMemoryPrivacyPolicy } from "./memory-policies.js";
import { formatMemoryPriority } from "./memory-priority.js";
import { formatMemoryType } from "./memory-types.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only memory context metadata for the Runtime section.
 */
export function formatMemoryContextForRuntime(
  memoryContext: AiMemoryContext | null | undefined,
): string {
  if (!memoryContext) return "";
  if (memoryContext.permissions.accessLevel === "none") {
    return ["Memory Context:", "Withheld in privacy mode."].join("\n");
  }

  const lines: string[] = [
    "Memory Context:",
    `Summary: ${sanitizeLine(memoryContext.summary, 200)}`,
    `Confidence: ${memoryContext.confidence.toFixed(2)}`,
    `Access: ${formatMemoryAccessLevel(memoryContext.permissions.accessLevel)}`,
    `Privacy: ${formatMemoryPrivacyPolicy(memoryContext.policies.privacy)}`,
  ];

  if (memoryContext.entries.length > 0) {
    lines.push("Relevant Memory:");
    for (const entry of memoryContext.entries.slice(0, 6)) {
      lines.push(
        `- [${formatMemoryType(entry.type)}|${formatMemoryPriority(entry.priority)}] ${sanitizeLine(entry.summary, 100)}`,
      );
    }
  }

  const activeTypes = (
    Object.entries(memoryContext.typeCounts) as [string, number][]
  )
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${t}:${n}`)
    .slice(0, 7);
  if (activeTypes.length > 0) {
    lines.push(`Types: ${activeTypes.join(", ")}`);
  }

  return lines.join("\n").trim();
}
