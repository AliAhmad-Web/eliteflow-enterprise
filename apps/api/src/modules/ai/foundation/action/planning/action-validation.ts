/**
 * Action plan validation — structural checks only.
 * Never executes.
 */

import type { AiActionStep } from "./action-step.js";
import type { AiActionDependency } from "./action-dependency.js";
import type { AiActionPrecondition } from "./action-preconditions.js";

export interface AiActionValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: "info" | "warning" | "error";
}

export interface AiActionValidation {
  readonly valid: boolean;
  readonly issues: readonly AiActionValidationIssue[];
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function validateActionPlan(input: {
  readonly steps: readonly AiActionStep[];
  readonly dependencies: readonly AiActionDependency[];
  readonly preconditions: readonly AiActionPrecondition[];
  readonly goals: readonly string[];
}): AiActionValidation {
  const issues: AiActionValidationIssue[] = [];

  if (input.goals.length === 0) {
    issues.push({
      code: "missing-goals",
      message: sanitize("No planning goals were generated"),
      severity: "warning",
    });
  }

  if (input.steps.length === 0) {
    issues.push({
      code: "missing-steps",
      message: sanitize("Action plan has no steps"),
      severity: "error",
    });
  }

  const stepIds = new Set(input.steps.map((s) => s.id));
  for (const dep of input.dependencies) {
    if (dep.toStepId && !stepIds.has(dep.toStepId)) {
      issues.push({
        code: "orphan-dependency",
        message: sanitize(`Dependency targets unknown step ${dep.toStepId}`),
        severity: "error",
      });
    }
  }

  const requiredFailed = input.preconditions.filter(
    (p) => p.required && !p.satisfied,
  );
  for (const pre of requiredFailed) {
    issues.push({
      code: "precondition-unmet",
      message: sanitize(`Required precondition unmet: ${pre.label}`),
      severity: "error",
    });
  }

  if (issues.length === 0) {
    issues.push({
      code: "ok",
      message: sanitize("Action plan structure is valid for planning"),
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
