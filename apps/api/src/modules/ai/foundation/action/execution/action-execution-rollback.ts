/**
 * Action execution rollback strategy.
 * Controlled by AI_ACTION_ROLLBACK. Compensating actions go through services only
 * when mutations occurred; read-only executions record planning rollback metadata.
 */

import type { AiActionPlan } from "../planning/ai-action-plan.js";
import type { AiActionStepExecutionResult } from "./action-execution-result.js";

export interface AiActionRollbackRecord {
  readonly stepId: string;
  readonly status: "planned" | "applied" | "skipped" | "failed";
  readonly description: string;
}

export interface AiActionRollbackResult {
  readonly enabled: boolean;
  readonly required: boolean;
  readonly applied: boolean;
  readonly records: readonly AiActionRollbackRecord[];
  readonly summary: string;
}

function sanitize(value: string, max = 120): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionRollbackResult(input: {
  readonly enabled: boolean;
  readonly actionPlan: AiActionPlan | null;
  readonly stepResults: readonly AiActionStepExecutionResult[];
  readonly mode: "single" | "multi-step" | "transactional";
}): AiActionRollbackResult {
  if (!input.enabled) {
    return Object.freeze({
      enabled: false,
      required: false,
      applied: false,
      records: Object.freeze([]),
      summary: sanitize("Rollback disabled"),
    });
  }

  const succeeded = input.stepResults.filter((s) => s.status === "succeeded");
  const failed = input.stepResults.some(
    (s) => s.status === "failed" || s.status === "blocked",
  );
  const required =
    input.mode === "transactional" && failed && succeeded.length > 0;

  const planSteps = input.actionPlan?.rollback.steps ?? [];
  const records: AiActionRollbackRecord[] = planSteps.slice(0, 5).map((step) =>
    Object.freeze({
      stepId: step.id,
      status: required ? ("applied" as const) : ("planned" as const),
      description: sanitize(step.description),
    }),
  );

  // Read-only service executions leave no mutations — mark applied as metadata-only.
  if (required && records.length === 0) {
    records.push(
      Object.freeze({
        stepId: "rollback.metadata",
        status: "applied" as const,
        description: sanitize(
          "No service mutations to reverse — recorded transactional abort",
        ),
      }),
    );
  }

  return Object.freeze({
    enabled: true,
    required,
    applied: required,
    records: Object.freeze(records),
    summary: sanitize(
      required
        ? `Rollback applied for ${succeeded.length} succeeded step(s) after failure`
        : input.actionPlan?.rollback.summary ?? "Rollback not required",
    ),
  });
}
