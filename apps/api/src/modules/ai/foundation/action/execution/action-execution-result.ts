/**
 * Action execution result models.
 * Safe summaries only — never raw records, emails, tokens, or secrets.
 */

import type {
  AiActionExecutionStatus,
  AiActionStepExecutionStatus,
} from "./action-execution-status.js";
import type { AiActionExecutionError } from "./action-execution-errors.js";

export interface AiActionStepExecutionResult {
  readonly stepId: string;
  readonly stepName: string;
  readonly capability: string | null;
  readonly service: string | null;
  readonly status: AiActionStepExecutionStatus;
  readonly summary: string;
  readonly durationMs: number;
  readonly attempt: number;
  readonly error?: AiActionExecutionError;
}

export interface AiActionExecutionResult {
  readonly status: AiActionExecutionStatus;
  readonly mode: "single" | "multi-step" | "transactional";
  readonly stepResults: readonly AiActionStepExecutionResult[];
  readonly succeededCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
  readonly blockedCount: number;
  readonly durationMs: number;
  readonly summary: string;
  readonly errors: readonly AiActionExecutionError[];
}

function sanitize(value: string, max = 200): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildExecutionResultSummary(input: {
  readonly status: AiActionExecutionStatus;
  readonly succeededCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
  readonly blockedCount: number;
  readonly stepCount: number;
}): string {
  return sanitize(
    `Action execution ${input.status}: ${input.succeededCount}/${input.stepCount} succeeded, ${input.failedCount} failed, ${input.skippedCount} skipped, ${input.blockedCount} blocked`,
  );
}
