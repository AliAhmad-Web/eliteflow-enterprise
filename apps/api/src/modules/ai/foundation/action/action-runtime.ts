/**
 * Format Action Framework metadata as safe Runtime Instructions.
 * Never injects database content, tokens, secrets, or executable payloads.
 */

import type { AiActiveAction } from "./ai-action.js";
import type { AiActionContext } from "./action-context.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only active action metadata for the Runtime section.
 */
export function formatActiveActionForRuntime(
  action: AiActiveAction | null | undefined,
): string {
  if (!action) return "";

  const lines: string[] = [
    "Active Action",
    `Name: ${sanitizeLine(action.name, 40) || "Action"}`,
    `Category: ${sanitizeLine(action.category, 24)}`,
  ];

  if (action.capabilities.length > 0) {
    lines.push(
      `Capabilities: ${action.capabilities
        .slice(0, 6)
        .map((c) => sanitizeLine(c, 24))
        .filter(Boolean)
        .join(", ")}`,
    );
  }

  if (action.fallback) {
    lines.push("Fallback: yes");
  }

  lines.push(`Confidence: ${action.confidence.toFixed(2)}`);

  return lines.join("\n").trim();
}

/**
 * Append-only action context metadata for the Runtime section.
 */
export function formatActionContextForRuntime(
  context: AiActionContext | null | undefined,
): string {
  if (!context) return "";

  // Prefer richer context when both activeAction and actionContext exist;
  // PE may call either. Keep SAFE public labels only.
  const lines: string[] = [
    "Action Context",
    `Action: ${sanitizeLine(context.name, 40) || "Action"}`,
    `Category: ${sanitizeLine(context.category, 24)}`,
  ];

  if (context.capabilities.length > 0) {
    lines.push(
      `Capabilities: ${context.capabilities
        .slice(0, 6)
        .map((c) => sanitizeLine(c, 24))
        .filter(Boolean)
        .join(", ")}`,
    );
  }

  if (context.supportedEntities.length > 0) {
    lines.push(
      `Entities: ${context.supportedEntities
        .slice(0, 4)
        .map((e) => sanitizeLine(e, 24))
        .filter(Boolean)
        .join(", ")}`,
    );
  }

  if (context.fallback) {
    lines.push("Fallback: yes");
  }

  return lines.join("\n").trim();
}
