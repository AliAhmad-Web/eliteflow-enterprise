/**
 * Format Agent Prompt Strategy as safe Runtime Instructions metadata.
 * Never includes internal ids, tokens, secrets, or private configuration.
 */

import type { AiAgentPromptStrategy } from "./ai-agent-prompt-strategy.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only strategy metadata for the Runtime section.
 */
export function formatAgentPromptStrategyForRuntime(
  strategy: AiAgentPromptStrategy | null | undefined,
): string {
  if (!strategy) return "";

  const lines: string[] = [];

  const runtime = strategy.runtimeInstructions?.trim();
  if (runtime) {
    lines.push(sanitizeLine(runtime, 240));
    lines.push("");
  }

  lines.push(`Reasoning mode: ${sanitizeLine(strategy.reasoningStyle, 40)}`);
  lines.push(`Response style: ${sanitizeLine(strategy.responseStyle, 40)}`);
  lines.push(`Answer format: ${sanitizeLine(strategy.answerFormat, 40)}`);
  lines.push(
    `Detail level: ${sanitizeLine(strategy.preferredDetailLevel, 20)}`,
  );

  return lines.join("\n").trim();
}
