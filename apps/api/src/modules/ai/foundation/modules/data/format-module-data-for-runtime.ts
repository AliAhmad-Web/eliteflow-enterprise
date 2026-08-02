/**
 * Format module data as safe Runtime Instructions metadata.
 * Never exposes sensitive records or raw database rows.
 */

import type { AiModuleDataBundle } from "./module-data-response.js";

function sanitizeLine(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only module data summaries for the Runtime section.
 */
export function formatModuleDataForRuntime(
  bundle: AiModuleDataBundle | null | undefined,
): string {
  if (!bundle || bundle.responses.length === 0) return "";

  const lines: string[] = [];

  for (const response of bundle.responses) {
    if (response.status !== "ok" && response.status !== "empty") continue;
    for (const summary of response.summaries.slice(0, 4)) {
      const label = sanitizeLine(String(summary.label), 40);
      const value = sanitizeLine(String(summary.value), 24);
      if (!label) continue;
      lines.push(`${label}: ${value}`);
    }
  }

  return lines.join("\n").trim();
}
