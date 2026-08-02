/**
 * Format Action Execution as safe Runtime Instructions metadata.
 * Never exposes internal runtime objects, secrets, or raw records.
 */

import type { AiActionExecution } from "./ai-action-execution.js";
import { formatActionExecutionStatus } from "./action-execution-status.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only action execution metadata for the Runtime section.
 */
export function formatActionExecutionForRuntime(
  execution: AiActionExecution | null | undefined,
): string {
  if (!execution) return "";

  const lines: string[] = [
    "Action Execution:",
    `Summary: ${sanitizeLine(execution.summary, 200)}`,
    `Status: ${formatActionExecutionStatus(execution.result.status)}`,
    `Mode: ${sanitizeLine(execution.result.mode, 24)}`,
    `Succeeded: ${execution.result.succeededCount}`,
    `Failed: ${execution.result.failedCount}`,
    `Blocked: ${execution.result.blockedCount}`,
  ];

  if (execution.approval.required) {
    lines.push(
      `Approval: ${execution.approval.cleared ? "cleared" : "required"}`,
    );
  }

  if (execution.rollback.applied) {
    lines.push(`Rollback: ${sanitizeLine(execution.rollback.summary, 100)}`);
  }

  if (execution.result.stepResults.length > 0) {
    lines.push("Steps:");
    for (const step of execution.result.stepResults.slice(0, 5)) {
      const service = step.service ? ` via ${step.service}` : "";
      lines.push(
        `- [${step.status}] ${sanitizeLine(step.stepName, 40)}${sanitizeLine(service, 40)}`,
      );
    }
  }

  return lines.join("\n").trim();
}
