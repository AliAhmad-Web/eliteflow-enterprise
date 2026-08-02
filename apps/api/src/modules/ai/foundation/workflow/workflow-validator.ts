/**
 * Workflow validator — structural checks only.
 * Never executes.
 */

import type { AiWorkflowStep } from "./workflow-step.js";
import type { AiWorkflowTransition } from "./workflow-transition.js";
import type { AiWorkflowCondition } from "./workflow-condition.js";

export interface AiWorkflowValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: "info" | "warning" | "error";
}

export interface AiWorkflowValidation {
  readonly valid: boolean;
  readonly issues: readonly AiWorkflowValidationIssue[];
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function validateWorkflowPlan(input: {
  readonly steps: readonly AiWorkflowStep[];
  readonly transitions: readonly AiWorkflowTransition[];
  readonly conditions: readonly AiWorkflowCondition[];
}): AiWorkflowValidation {
  const issues: AiWorkflowValidationIssue[] = [];

  if (input.steps.length === 0) {
    issues.push({
      code: "missing-steps",
      message: sanitize("Workflow plan has no steps"),
      severity: "error",
    });
  }

  const stepIds = new Set(input.steps.map((s) => s.id));
  for (const tr of input.transitions) {
    if (!stepIds.has(tr.fromStepId) || !stepIds.has(tr.toStepId)) {
      issues.push({
        code: "orphan-transition",
        message: sanitize(`Transition ${tr.id} references unknown steps`),
        severity: "error",
      });
    }
  }

  const requiredFailed = input.conditions.filter(
    (c) => c.required && !c.satisfied,
  );
  for (const cond of requiredFailed) {
    issues.push({
      code: "condition-unmet",
      message: sanitize(`Required condition unmet: ${cond.label}`),
      severity: "error",
    });
  }

  if (issues.length === 0) {
    issues.push({
      code: "ok",
      message: sanitize("Workflow plan structure is valid for planning"),
      severity: "info",
    });
  }

  const hasError = issues.some((i) => i.severity === "error");
  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(
      issues.slice(0, 8).map((item) => Object.freeze(item)),
    ),
  });
}
