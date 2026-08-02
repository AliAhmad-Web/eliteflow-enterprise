/**
 * Format Agent Context as safe Runtime Instructions metadata.
 * Never includes internal ids, database ids, tokens, secrets, or private metadata.
 */

import type { AiAgentContext } from "./ai-agent-context.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Build the Agent Context runtime block for Prompt Engineering.
 * Returns empty string when context is absent / unusable.
 */
export function formatAgentContextForRuntime(
  agentContext: AiAgentContext | null | undefined,
): string {
  if (!agentContext) return "";

  const lines: string[] = [
    "Active Agent:",
    sanitizeLine(agentContext.name) || "Agent",
    "",
  ];

  if (agentContext.allowedActions.length > 0) {
    lines.push("Capabilities:");
    for (const action of agentContext.allowedActions) {
      lines.push(`- ${sanitizeLine(action, 40)}`);
    }
    lines.push("");
  }

  if (agentContext.supportedTools.length > 0) {
    lines.push("Allowed Tools:");
    for (const toolId of agentContext.supportedTools) {
      // Tool catalog keys are public capability names, not DB/internal secrets.
      lines.push(`- ${sanitizeLine(toolId, 64)}`);
    }
    lines.push("");
  }

  lines.push("Reasoning:");
  lines.push(sanitizeLine(agentContext.reasoningMode, 40));

  if (agentContext.supportedEntityTypes.length > 0) {
    lines.push("");
    lines.push("Entity Focus:");
    for (const entity of agentContext.supportedEntityTypes) {
      lines.push(`- ${sanitizeLine(entity, 40)}`);
    }
  }

  lines.push("");
  lines.push(`Prompt behavior: ${sanitizeLine(agentContext.promptBehavior, 40)}`);
  lines.push(
    `Temperature preference: ${sanitizeLine(agentContext.temperaturePreference, 20)}`,
  );
  lines.push(
    `Execution policy: ${sanitizeLine(agentContext.executionPolicy, 20)}`,
  );

  return lines.join("\n").trim();
}
