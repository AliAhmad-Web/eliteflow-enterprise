/**
 * Format Agent Permissions as safe Runtime Instructions metadata.
 * Never includes internal ids, database ids, tokens, or private permission keys.
 */

import type {
  AiAgentPermissions,
  AiAgentSecurityLevel,
} from "./ai-agent-permissions.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function formatSecurityLevel(level: AiAgentSecurityLevel): string {
  switch (level) {
    case "standard":
      return "Standard";
    case "elevated":
      return "Elevated";
    case "enterprise":
      return "Enterprise";
    case "restricted":
      return "Restricted";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

/**
 * Append-only permission metadata for the Runtime section.
 */
export function formatAgentPermissionsForRuntime(
  permissions: AiAgentPermissions | null | undefined,
): string {
  if (!permissions) return "";

  const lines: string[] = [
    "Security Level:",
    formatSecurityLevel(permissions.securityLevel),
    "",
  ];

  lines.push("Allowed Tools:");
  if (permissions.allowedTools.length === 0) {
    lines.push("None");
  } else {
    for (const tool of permissions.allowedTools.slice(0, 8)) {
      lines.push(sanitizeLine(tool, 40));
    }
  }

  const restricted = permissions.deniedTools.slice(0, 6);
  if (restricted.length > 0) {
    lines.push("");
    lines.push("Restricted:");
    for (const tool of restricted) {
      lines.push(sanitizeLine(tool, 40));
    }
  }

  if (permissions.allowedActions.length > 0) {
    lines.push("");
    lines.push("Allowed Actions:");
    for (const action of permissions.allowedActions.slice(0, 8)) {
      lines.push(`- ${sanitizeLine(action, 40)}`);
    }
  }

  return lines.join("\n").trim();
}
