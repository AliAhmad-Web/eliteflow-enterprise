/**
 * Format Workflow Plan as safe Runtime Instructions metadata.
 * Never exposes internal runtime objects, secrets, or executable payloads.
 */

import type { AiWorkflowPlan } from "./workflow-instance.js";
import { formatWorkflowKind } from "./workflow-definition.js";
import { formatWorkflowLifecycleState } from "./workflow-state.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only workflow orchestration metadata for the Runtime section.
 */
export function formatWorkflowPlanForRuntime(
  plan: AiWorkflowPlan | null | undefined,
): string {
  if (!plan) return "";

  const lines: string[] = [
    "Workflow Plan:",
    `Summary: ${sanitizeLine(plan.summary, 200)}`,
    `Kind: ${formatWorkflowKind(plan.definition.kind)}`,
    `State: ${formatWorkflowLifecycleState(plan.state.lifecycle)}`,
    `Confidence: ${plan.confidence.toFixed(2)}`,
    `Steps: ${plan.steps.length}`,
    `Executable: no`,
  ];

  if (plan.waitingStates.length > 0) {
    lines.push(`Waiting: ${plan.waitingStates.length}`);
  }

  if (plan.retries.enabled) {
    lines.push(`Retries: max ${plan.retries.maxAttempts}`);
  }

  if (plan.metadata.humanInTheLoop) {
    lines.push("Human-in-the-loop: yes");
  }

  if (plan.metadata.supportsApproval) {
    lines.push("Approval: planned");
  }

  for (const step of plan.steps.slice(0, 4)) {
    if (
      step.kind === "action" ||
      step.kind === "approval" ||
      step.kind === "wait"
    ) {
      lines.push(`- ${sanitizeLine(step.name, 40)}`);
    }
  }

  return lines.join("\n").trim();
}
