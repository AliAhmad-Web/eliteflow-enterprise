/**
 * Format selected modules as safe Runtime Instructions metadata.
 * Never injects database content, tokens, or private permissions.
 */

import type { AiSelectedModules } from "./module-resolver.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only relevant-module metadata for the Runtime section.
 */
export function formatSelectedModulesForRuntime(
  selection: AiSelectedModules | null | undefined,
): string {
  if (!selection || selection.modules.length === 0) return "";

  const lines: string[] = ["Relevant Modules"];
  for (const module of selection.modules.slice(0, 8)) {
    lines.push(sanitizeLine(module.name, 40) || "Module");
  }

  return lines.join("\n").trim();
}
