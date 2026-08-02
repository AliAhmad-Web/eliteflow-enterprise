/**
 * Format Action Plan as safe Runtime Instructions metadata.
 * Never exposes internal runtime objects, secrets, or executable payloads.
 */

import type { AiActionPlan } from "./ai-action-plan.js";
import { formatActionPlanPriority } from "./action-priority.js";
import { formatActionPlanRiskLevel } from "./action-risk.js";
import {
  formatActionCostBand,
  formatActionDurationBand,
} from "./action-estimation.js";
import { formatActionApprovalLevel } from "./action-approval.js";

function sanitizeLine(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/**
 * Append-only action planning metadata for the Runtime section.
 */
export function formatActionPlanForRuntime(
  plan: AiActionPlan | null | undefined,
): string {
  if (!plan) return "";

  const lines: string[] = [
    "Action Plan:",
    `Summary: ${sanitizeLine(plan.summary, 200)}`,
    `Priority: ${formatActionPlanPriority(plan.priority)}`,
    `Risk: ${formatActionPlanRiskLevel(plan.riskLevel)}`,
    `Confidence: ${plan.confidence.toFixed(2)}`,
    `Cost: ${formatActionCostBand(plan.estimation.estimatedCost)}`,
    `Duration: ${formatActionDurationBand(plan.estimation.estimatedDuration)}`,
    `Approval: ${formatActionApprovalLevel(plan.approval.level)}`,
    `Executable: no`,
  ];

  if (plan.plan.goals.length > 0) {
    lines.push("Goals:");
    for (const goal of plan.plan.goals.slice(0, 4)) {
      lines.push(`- ${sanitizeLine(goal, 80)}`);
    }
  }

  if (plan.plan.steps.length > 0) {
    lines.push("Steps:");
    for (const step of plan.plan.steps.slice(0, 5)) {
      lines.push(`- ${sanitizeLine(step.name, 40)}`);
    }
  }

  if (plan.dryRun.summary) {
    lines.push(`Dry Run: ${sanitizeLine(plan.dryRun.summary, 120)}`);
  }

  if (plan.rollback.summary) {
    lines.push(`Rollback: ${sanitizeLine(plan.rollback.summary, 100)}`);
  }

  return lines.join("\n").trim();
}
