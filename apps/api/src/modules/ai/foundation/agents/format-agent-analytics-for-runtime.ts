/**
 * Format Agent Analytics as safe Runtime Instructions metadata.
 * Never includes tokens, private logs, internal ids, database ids, or raw telemetry.
 */

import type { AiAgentAnalytics } from "./ai-agent-analytics.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only analytics metrics for the Runtime section.
 */
export function formatAgentAnalyticsForRuntime(
  analytics: AiAgentAnalytics | null | undefined,
): string {
  if (!analytics) return "";

  const confidence =
    analytics.decisionConfidence != null &&
    Number.isFinite(analytics.decisionConfidence)
      ? analytics.decisionConfidence.toFixed(2)
      : null;

  const lines: string[] = [
    "Agent Metrics",
    "",
    "Execution Time:",
    `${Math.max(0, Math.round(analytics.durationMs))} ms`,
    "",
    "Tools Executed:",
    String(analytics.metrics.executedCount),
  ];

  if (confidence != null) {
    lines.push("");
    lines.push("Decision Confidence:");
    lines.push(confidence);
  }

  if (analytics.activeAgent) {
    lines.push("");
    lines.push(`Primary: ${sanitizeLine(analytics.activeAgent.name, 40)}`);
  }

  if (analytics.collaborationMode) {
    lines.push(
      `Collaboration: ${sanitizeLine(analytics.collaborationMode, 24)}`,
    );
  }

  if (analytics.securityLevel) {
    lines.push(`Security: ${sanitizeLine(analytics.securityLevel, 20)}`);
  }

  return lines.join("\n").trim();
}
