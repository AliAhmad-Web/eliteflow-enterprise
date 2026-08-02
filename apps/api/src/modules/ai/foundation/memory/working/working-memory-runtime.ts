/**
 * SAFE working memory runtime formatter (available; PE wiring unchanged).
 */

import type { AiWorkingMemory } from "./working-memory.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function formatWorkingMemoryForRuntime(
  workingMemory: AiWorkingMemory | null | undefined,
): string {
  if (!workingMemory) return "";
  const lines: string[] = [
    "Working Memory:",
    `Confidence: ${workingMemory.confidence.toFixed(2)}`,
  ];
  if (workingMemory.context.objective) {
    lines.push(`Objective: ${sanitizeLine(workingMemory.context.objective, 120)}`);
  }
  if (workingMemory.context.activeTask) {
    lines.push(`Active Task: ${sanitizeLine(workingMemory.context.activeTask, 100)}`);
  }
  if (workingMemory.entries.length > 0) {
    lines.push("Active Context:");
    for (const entry of workingMemory.entries.slice(0, 4)) {
      lines.push(`- ${sanitizeLine(entry.summary, 100)}`);
    }
  }
  return lines.join("\n").trim();
}
