/**
 * SAFE episodic memory runtime formatter (available; PE wiring unchanged).
 */

import type { AiEpisodicMemory } from "./episodic-memory.js";
import { formatEpisodicEventKind } from "./episodic-memory-event.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function formatEpisodicMemoryForRuntime(
  episodicMemory: AiEpisodicMemory | null | undefined,
): string {
  if (!episodicMemory) return "";
  const lines: string[] = [
    "Episodic Memory:",
    `Summary: ${sanitizeLine(episodicMemory.summary, 180)}`,
    `Confidence: ${episodicMemory.confidence.toFixed(2)}`,
  ];

  if (episodicMemory.episodes.length > 0) {
    lines.push("Episodes:");
    for (const episode of episodicMemory.episodes.slice(0, 3)) {
      lines.push(`- ${sanitizeLine(episode.title, 60)}`);
    }
  }

  if (episodicMemory.timeline.items.length > 0) {
    lines.push("Recent Events:");
    for (const item of episodicMemory.timeline.items.slice(-4)) {
      lines.push(`- ${sanitizeLine(item.label, 100)}`);
    }
  } else if (episodicMemory.entries.length > 0) {
    lines.push("Recent Events:");
    for (const entry of episodicMemory.entries.slice(0, 4)) {
      lines.push(
        `- [${formatEpisodicEventKind(entry.event.kind)}] ${sanitizeLine(entry.event.summary, 100)}`,
      );
    }
  }

  return lines.join("\n").trim();
}
