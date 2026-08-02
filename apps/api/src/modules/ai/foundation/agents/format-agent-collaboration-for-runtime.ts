/**
 * Format Agent Collaboration as safe Runtime Instructions metadata.
 * Never includes internal ids, database ids, tokens, or private metadata.
 */

import type {
  AiAgentCollaboration,
  AiAgentCollaborationMode,
} from "./ai-agent-collaboration.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function formatWorkflow(mode: AiAgentCollaborationMode): string {
  switch (mode) {
    case "solo":
      return "Solo";
    case "sequential":
      return "Sequential";
    case "advisory":
      return "Advisory";
    case "parallel-advisory":
      return "Parallel Advisory";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/**
 * Append-only collaboration metadata for the Runtime section.
 */
export function formatAgentCollaborationForRuntime(
  collaboration: AiAgentCollaboration | null | undefined,
): string {
  if (!collaboration) return "";

  const lines: string[] = [
    "Primary Agent:",
    sanitizeLine(collaboration.primaryAgent.name) || "Agent",
    "",
  ];

  if (collaboration.supportingAgents.length > 0) {
    lines.push("Supporting Agents:");
    for (const agent of collaboration.supportingAgents) {
      lines.push(sanitizeLine(agent.name) || "Agent");
    }
    lines.push("");
  } else {
    lines.push("Supporting Agents:");
    lines.push("None");
    lines.push("");
  }

  lines.push(`Workflow: ${formatWorkflow(collaboration.collaborationMode)}`);

  if (collaboration.sharedCapabilities.length > 0) {
    lines.push("");
    lines.push("Shared Capabilities:");
    for (const capability of collaboration.sharedCapabilities.slice(0, 8)) {
      lines.push(`- ${sanitizeLine(capability, 64)}`);
    }
  }

  return lines.join("\n").trim();
}
