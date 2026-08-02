/**
 * Format Business Workflow as safe Runtime Instructions metadata.
 * Never exposes internal state, records, or secrets.
 */

import type { AiBusinessWorkflow } from "./business-workflow.js";
import { formatBusinessWorkflowKind } from "./business-workflow-definition.js";
import { formatBusinessWorkflowStepStatus } from "./business-workflow-steps.js";
import { formatBusinessWorkflowTransitionKind } from "./business-workflow-transitions.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only business workflow metadata for the Runtime section.
 */
export function formatBusinessWorkflowForRuntime(
  workflow: AiBusinessWorkflow | null | undefined,
): string {
  if (!workflow) return "";

  const lines: string[] = [
    "Business Workflow:",
    `Workflow: ${sanitizeLine(workflow.definition.name, 60)}`,
    `Kind: ${formatBusinessWorkflowKind(workflow.definition.kind)}`,
    `Status: ${sanitizeLine(workflow.status, 24)}`,
    `Summary: ${sanitizeLine(workflow.summary, 200)}`,
    `Confidence: ${workflow.confidence.toFixed(2)}`,
  ];

  if (workflow.steps.length > 0) {
    lines.push("Workflow Steps:");
    for (const step of workflow.steps.slice(0, 5)) {
      lines.push(
        `- [${formatBusinessWorkflowStepStatus(step.status)}] ${sanitizeLine(step.label, 80)}`,
      );
    }
  }

  if (workflow.transitions.length > 0) {
    lines.push(
      `Transitions: ${workflow.transitions
        .slice(0, 4)
        .map((t) => formatBusinessWorkflowTransitionKind(t.kind))
        .join(", ")}`,
    );
  }

  return lines.join("\n").trim();
}
