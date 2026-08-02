/**
 * Format Automation Execution as safe Runtime Instructions metadata.
 * Never exposes internal provider objects, secrets, or raw payloads.
 */

import type { AiAutomationExecution } from "./automation-engine.js";
import { formatAutomationStatus } from "./automation-status.js";
import { formatAutomationProviderKind } from "./automation-provider-definition.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only automation metadata for the Runtime section.
 */
export function formatAutomationExecutionForRuntime(
  execution: AiAutomationExecution | null | undefined,
): string {
  if (!execution) return "";

  const status = execution.response?.status ?? "skipped";
  const lines: string[] = [
    "Automation:",
    `Summary: ${sanitizeLine(execution.summary, 200)}`,
    `Status: ${formatAutomationStatus(status)}`,
  ];

  if (execution.provider) {
    lines.push(
      `Provider: ${formatAutomationProviderKind(execution.provider.kind)}`,
    );
  }

  if (execution.response?.mode) {
    lines.push(`Mode: ${sanitizeLine(execution.response.mode, 24)}`);
  }

  if (execution.response?.callbackExpected) {
    lines.push("Callback: pending");
  }

  if (execution.response?.timedOut) {
    lines.push("Timeout: yes");
  }

  if (execution.response?.cancelled) {
    lines.push("Cancelled: yes");
  }

  return lines.join("\n").trim();
}
