/**
 * Format Agent Decision as safe Runtime Instructions metadata.
 * Never includes internal ids, database ids, tokens, or private runtime metadata.
 */

import type {
  AiAgentDecision,
  AiAgentDecisionPreferenceLevel,
  AiAgentDecisionReasoningLevel,
  AiAgentDecisionStreamingPreference,
} from "./ai-agent-decision.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function formatReasoning(level: AiAgentDecisionReasoningLevel): string {
  switch (level) {
    case "lightweight":
      return "Lightweight";
    case "standard":
      return "Standard";
    case "deep":
      return "Deep";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

function formatStreaming(
  preference: AiAgentDecisionStreamingPreference,
): string {
  switch (preference) {
    case "preferred":
      return "Preferred";
    case "neutral":
      return "Neutral";
    case "avoid":
      return "Avoid";
    default: {
      const _exhaustive: never = preference;
      return _exhaustive;
    }
  }
}

function formatPreferenceEnabled(
  preference: AiAgentDecisionPreferenceLevel,
): string {
  switch (preference) {
    case "none":
    case "low":
      return "Disabled";
    case "medium":
    case "high":
      return "Enabled";
    default: {
      const _exhaustive: never = preference;
      return _exhaustive;
    }
  }
}

function formatPreferenceLevel(
  preference: AiAgentDecisionPreferenceLevel,
): string {
  switch (preference) {
    case "none":
      return "None";
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const _exhaustive: never = preference;
      return _exhaustive;
    }
  }
}

/**
 * Append-only decision metadata for the Runtime section.
 */
export function formatAgentDecisionForRuntime(
  decision: AiAgentDecision | null | undefined,
): string {
  if (!decision) return "";

  const lines: string[] = [
    "Decision:",
    `Reasoning: ${formatReasoning(decision.reasoningLevel)}`,
    `Streaming: ${formatStreaming(decision.streamingPreference)}`,
    `Business Context: ${formatPreferenceEnabled(decision.businessContextPreference)}`,
    `Tool Preference: ${formatPreferenceLevel(decision.toolPreference)}`,
    `Memory Preference: ${formatPreferenceLevel(decision.memoryPreference)}`,
    `Document Preference: ${formatPreferenceLevel(decision.documentPreference)}`,
    `Response Mode: ${sanitizeLine(decision.responseMode, 20)}`,
    `Execution Mode: ${sanitizeLine(decision.executionMode, 24)}`,
  ];

  const reason = decision.decisionReason?.trim();
  if (reason) {
    lines.push(`Reason: ${sanitizeLine(reason, 160)}`);
  }

  return lines.join("\n").trim();
}
