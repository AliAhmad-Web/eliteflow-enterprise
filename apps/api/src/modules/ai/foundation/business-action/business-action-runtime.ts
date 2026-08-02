/**
 * Format Business Action as safe Runtime Instructions metadata.
 * Never exposes internal objects, records, or secrets.
 */

import type { AiBusinessAction } from "./business-action.js";
import { formatBusinessActionPriority } from "./business-action-priority.js";
import { formatBusinessActionRiskLevel } from "./business-action-risk.js";
import { formatBusinessActionPermissionRequirement } from "./business-action-permissions.js";
import { formatBusinessActionStepKind } from "./business-action-plan.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only business action metadata for the Runtime section.
 */
export function formatBusinessActionForRuntime(
  action: AiBusinessAction | null | undefined,
): string {
  if (!action) return "";

  const lines: string[] = [
    "Business Action:",
    `Summary: ${sanitizeLine(action.summary, 200)}`,
    `Priority: ${formatBusinessActionPriority(action.priority)}`,
    `Execution Risk: ${formatBusinessActionRiskLevel(action.risk.level)}`,
    `Permission: ${formatBusinessActionPermissionRequirement(action.permissions.requirement)}`,
    `Confidence: ${action.confidence.toFixed(2)}`,
    `Executable: ${action.plan.executable ? "yes" : "no"}`,
  ];

  if (action.plan.steps.length > 0) {
    lines.push("Action Plan:");
    for (const step of action.plan.steps.slice(0, 5)) {
      lines.push(
        `- [${formatBusinessActionStepKind(step.kind)}] ${sanitizeLine(step.label, 80)}`,
      );
    }
  }

  return lines.join("\n").trim();
}
