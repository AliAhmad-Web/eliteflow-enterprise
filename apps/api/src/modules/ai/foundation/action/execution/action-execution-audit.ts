/**
 * Action execution audit trail.
 * Controlled by AI_ACTION_AUDIT. Never includes sensitive payloads.
 */

import type { AiActionExecutionResult } from "./action-execution-result.js";
import type { AiActionExecutionStatus } from "./action-execution-status.js";

export type AiActionAuditEventType =
  | "requested"
  | "permission_checked"
  | "approval_checked"
  | "step_started"
  | "step_succeeded"
  | "step_failed"
  | "step_skipped"
  | "step_blocked"
  | "retried"
  | "rolled_back"
  | "completed";

export interface AiActionAuditEvent {
  readonly event: AiActionAuditEventType;
  readonly timestamp: string;
  readonly stepId?: string;
  readonly status?: string;
  readonly detail?: string;
}

export interface AiActionAuditRecord {
  readonly executionId: string;
  readonly userId: string | null;
  readonly actionId: string | null;
  readonly status: AiActionExecutionStatus;
  readonly events: readonly AiActionAuditEvent[];
  readonly generatedAt: string;
}

function sanitize(value: string, max = 80): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildActionAuditRecord(input: {
  readonly enabled: boolean;
  readonly executionId: string;
  readonly userId: string | null;
  readonly actionId: string | null;
  readonly result: AiActionExecutionResult;
  readonly extraEvents?: readonly AiActionAuditEvent[];
}): AiActionAuditRecord | null {
  if (!input.enabled) return null;

  const events: AiActionAuditEvent[] = [
    ...(input.extraEvents ?? []),
    ...input.result.stepResults.map((step) =>
      Object.freeze({
        event: (step.status === "succeeded"
          ? "step_succeeded"
          : step.status === "failed"
            ? "step_failed"
            : step.status === "blocked"
              ? "step_blocked"
              : step.status === "skipped"
                ? "step_skipped"
                : "step_started") as AiActionAuditEventType,
        timestamp: new Date().toISOString(),
        stepId: step.stepId,
        status: step.status,
        detail: sanitize(step.summary, 60),
      }),
    ),
    Object.freeze({
      event: "completed" as const,
      timestamp: new Date().toISOString(),
      status: input.result.status,
      detail: sanitize(input.result.summary, 60),
    }),
  ];

  return Object.freeze({
    executionId: input.executionId,
    userId: input.userId,
    actionId: input.actionId,
    status: input.result.status,
    events: Object.freeze(events.slice(0, 40)),
    generatedAt: new Date().toISOString(),
  });
}
