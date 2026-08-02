/**
 * SAFE runtime formatter for Memory Platform metadata.
 * Never exposes raw memories, embeddings, IDs, or internal scores detail dumps.
 */

import type { AiMemoryPlatform } from "./memory-platform.js";

function sanitizeLine(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function formatMemoryPlatformForRuntime(
  platform: AiMemoryPlatform | null | undefined,
): string {
  if (!platform) return "";

  const lines: string[] = [
    "Memory Platform:",
    `Summary: ${sanitizeLine(platform.summary, 180)}`,
    `Confidence: ${platform.confidence.toFixed(2)}`,
  ];

  if (platform.health) {
    lines.push(`Health: ${platform.health.level}`);
  }
  if (platform.analytics) {
    lines.push(
      `Coverage: ${platform.analytics.entryCount} entries across active subsystems`,
    );
  }
  if (platform.optimization) {
    lines.push(`Optimization: ${sanitizeLine(platform.optimization.summary, 140)}`);
  }
  if (platform.monitoring) {
    lines.push(`Monitoring: ${platform.monitoring.status}`);
  }

  return lines.join("\n").trim();
}
