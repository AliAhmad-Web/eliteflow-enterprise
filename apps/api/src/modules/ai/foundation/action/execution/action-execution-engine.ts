/**
 * Action Execution Engine — multi-step / transactional execution via services.
 * Never accesses Prisma or repositories. Never bypasses permissions.
 */

import type { AiActionPlan } from "../planning/ai-action-plan.js";
import type { AiActionStep } from "../planning/action-step.js";
import type { AiActionCategory } from "../action-definition.js";
import type { AiActiveAction } from "../ai-action.js";
import type { AiActionContext } from "../action-context.js";
import type { AiWorkflowPlan } from "../../workflow/workflow-instance.js";
import type { AiActionExecution } from "./ai-action-execution.js";
import {
  buildActionExecutionRequest,
  type AiActionExecutionMode,
} from "./action-execution-request.js";
import {
  buildActionExecutionContext,
  type AiActionExecutionContext,
} from "./action-execution-context.js";
import { evaluateActionPermissions } from "./action-execution-permissions.js";
import { evaluateExecutionApproval } from "./action-execution-approval.js";
import {
  buildActionRetryPolicy,
  shouldRetryStep,
  waitRetryBackoff,
} from "./action-execution-retry.js";
import { buildActionRollbackResult } from "./action-execution-rollback.js";
import { buildActionAuditRecord } from "./action-execution-audit.js";
import { buildActionExecutionTelemetry } from "./action-execution-telemetry.js";
import { executeActionStep } from "./action-executor.js";
import {
  buildExecutionResultSummary,
  type AiActionExecutionResult,
  type AiActionStepExecutionResult,
} from "./action-execution-result.js";
import type { AiActionExecutionStatus } from "./action-execution-status.js";
import type { AiActionExecutionError } from "./action-execution-errors.js";
import { createActionExecutionError } from "./action-execution-errors.js";
import type { AiActiveContext } from "../../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../../contracts/ai-effective-policy.js";

export interface ResolveActionExecutionInput {
  readonly actionPlan?: AiActionPlan | null;
  readonly activeAction?: AiActiveAction | null;
  readonly actionContext?: AiActionContext | null;
  readonly workflowPlan?: AiWorkflowPlan | null;
  readonly userId?: string | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly permissions?: readonly string[] | null;
  readonly role?: string | null;
  readonly email?: string | null;
  readonly mode?: string | null;
  readonly prompt?: string | null;
  readonly enableRetry?: boolean;
  readonly enableRollback?: boolean;
  readonly enableAudit?: boolean;
}

function sanitize(value: string, max = 200): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function newExecutionId(): string {
  return `aex.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}

function resolveOverallStatus(input: {
  readonly stepResults: readonly AiActionStepExecutionResult[];
  readonly awaitingApproval: boolean;
  readonly rolledBack: boolean;
}): AiActionExecutionStatus {
  if (input.awaitingApproval) return "awaiting_approval";
  if (input.rolledBack) return "rolled_back";
  if (input.stepResults.length === 0) return "skipped";

  const succeeded = input.stepResults.filter((s) => s.status === "succeeded").length;
  const failed = input.stepResults.filter((s) => s.status === "failed").length;
  const blocked = input.stepResults.filter((s) => s.status === "blocked").length;

  if (failed > 0 && succeeded > 0) return "partial";
  if (failed > 0 && succeeded === 0) return "failed";
  if (blocked > 0 && succeeded === 0) return "blocked";
  if (blocked > 0 && succeeded > 0) return "partial";
  if (succeeded > 0) return "succeeded";
  return "skipped";
}

async function runStepWithRetry(input: {
  readonly step: AiActionStep;
  readonly category: AiActionCategory;
  readonly context: AiActionExecutionContext;
  readonly approvalBlocksWrites: boolean;
  readonly retryEnabled: boolean;
}): Promise<{
  result: AiActionStepExecutionResult;
  retries: number;
}> {
  const policy = buildActionRetryPolicy({ enabled: input.retryEnabled });
  let attempt = 0;
  let lastError: AiActionExecutionError | undefined;
  let retries = 0;

  while (attempt < policy.maxAttempts) {
    attempt += 1;
    const started = Date.now();
    const call = await executeActionStep({
      step: input.step,
      category: input.category,
      context: input.context,
      approvalBlocksWrites: input.approvalBlocksWrites,
    });
    const durationMs = Date.now() - started;

    if (call.ok) {
      return {
        result: Object.freeze({
          stepId: input.step.id,
          stepName: input.step.name,
          capability: input.step.capability,
          service: call.service,
          status: attempt > 1 ? ("retried" as const) : ("succeeded" as const),
          summary: call.summary,
          durationMs,
          attempt,
        }),
        retries,
      };
    }

    lastError = call.error;
    const canRetry = shouldRetryStep({
      policy,
      attempt,
      error: lastError,
    });
    if (!canRetry) {
      const status =
        lastError?.code === "approval_required" ||
        lastError?.code === "write_blocked" ||
        lastError?.code === "permission_denied" ||
        lastError?.code === "privacy_mode"
          ? ("blocked" as const)
          : ("failed" as const);
      return {
        result: Object.freeze({
          stepId: input.step.id,
          stepName: input.step.name,
          capability: input.step.capability,
          service: call.service,
          status,
          summary: call.summary,
          durationMs,
          attempt,
          ...(lastError ? { error: lastError } : {}),
        }),
        retries,
      };
    }

    retries += 1;
    await waitRetryBackoff(policy.backoffMs);
  }

  return {
    result: Object.freeze({
      stepId: input.step.id,
      stepName: input.step.name,
      capability: input.step.capability,
      service: null,
      status: "failed" as const,
      summary: sanitize("Step failed after retries"),
      durationMs: 0,
      attempt,
      error:
        lastError ??
        createActionExecutionError("unknown", "Unknown step failure", {
          stepId: input.step.id,
          retryable: false,
        }),
    }),
    retries,
  };
}

/**
 * Resolve/execute an immutable Action Execution from plan + context.
 */
export async function resolveActionExecution(
  input: ResolveActionExecutionInput,
): Promise<AiActionExecution> {
  const executionId = newExecutionId();
  const startedAt = Date.now();
  const actionPlan = input.actionPlan ?? null;
  const activeAction = input.activeAction ?? null;
  const category = activeAction?.category ?? "generic";

  const context = buildActionExecutionContext({
    userId: input.userId,
    activeContext: input.activeContext,
    policy: input.policy,
    permissions: input.permissions,
    role: input.role,
    email: input.email,
    mode: input.mode,
    prompt: input.prompt,
  });

  const request = buildActionExecutionRequest({
    actionPlan,
    activeAction,
    actionContext: input.actionContext,
    workflowPlan: input.workflowPlan,
  });

  const permissions = evaluateActionPermissions(context, category);
  const approval = evaluateExecutionApproval(actionPlan);
  const retryPolicy = buildActionRetryPolicy({
    enabled: input.enableRetry === true,
  });

  const notes: string[] = [
    `execution:${executionId}`,
    `mode:${request.mode}`,
    `category:${category}`,
  ];

  if (context.privacyMode) {
    const result = buildEmptyResult(
      request.mode,
      Date.now() - startedAt,
      "blocked",
      createActionExecutionError(
        "privacy_mode",
        "Action execution withheld in privacy mode",
      ),
    );
    return finalizeExecution({
      executionId,
      request,
      result,
      permissions,
      approval,
      retryPolicy,
      actionPlan,
      enableRollback: input.enableRollback === true,
      enableAudit: input.enableAudit === true,
      userId: context.userId,
      actionId: activeAction?.id ?? null,
      retryCount: 0,
      notes: [...notes, "privacy-mode"],
      startedAt,
    });
  }

  if (!actionPlan) {
    const result = buildEmptyResult(
      request.mode,
      Date.now() - startedAt,
      "skipped",
      createActionExecutionError("missing_plan", "No action plan to execute"),
    );
    return finalizeExecution({
      executionId,
      request,
      result,
      permissions,
      approval,
      retryPolicy,
      actionPlan,
      enableRollback: input.enableRollback === true,
      enableAudit: input.enableAudit === true,
      userId: context.userId,
      actionId: activeAction?.id ?? null,
      retryCount: 0,
      notes: [...notes, "missing-plan"],
      startedAt,
    });
  }

  if (!actionPlan.validation.valid) {
    const result = buildEmptyResult(
      request.mode,
      Date.now() - startedAt,
      "blocked",
      createActionExecutionError("invalid_plan", "Action plan failed validation"),
    );
    return finalizeExecution({
      executionId,
      request,
      result,
      permissions,
      approval,
      retryPolicy,
      actionPlan,
      enableRollback: input.enableRollback === true,
      enableAudit: input.enableAudit === true,
      userId: context.userId,
      actionId: activeAction?.id ?? null,
      retryCount: 0,
      notes: [...notes, "invalid-plan"],
      startedAt,
    });
  }

  if (!permissions.allowed) {
    const result = buildEmptyResult(
      request.mode,
      Date.now() - startedAt,
      "blocked",
      createActionExecutionError(
        permissions.reason === "privacy-mode"
          ? "privacy_mode"
          : permissions.reason === "missing-user"
            ? "missing_user"
            : "permission_denied",
        `Permission check failed: ${permissions.reason}`,
      ),
    );
    return finalizeExecution({
      executionId,
      request,
      result,
      permissions,
      approval,
      retryPolicy,
      actionPlan,
      enableRollback: input.enableRollback === true,
      enableAudit: input.enableAudit === true,
      userId: context.userId,
      actionId: activeAction?.id ?? null,
      retryCount: 0,
      notes: [...notes, `perm:${permissions.reason}`],
      startedAt,
    });
  }

  if (approval.blocksExecution) {
    const result = buildEmptyResult(
      request.mode,
      Date.now() - startedAt,
      "awaiting_approval",
      createActionExecutionError(
        "approval_required",
        "Human approval required before execution",
      ),
    );
    return finalizeExecution({
      executionId,
      request,
      result,
      permissions,
      approval,
      retryPolicy,
      actionPlan,
      enableRollback: input.enableRollback === true,
      enableAudit: input.enableAudit === true,
      userId: context.userId,
      actionId: activeAction?.id ?? null,
      retryCount: 0,
      notes: [...notes, "awaiting-approval"],
      startedAt,
    });
  }

  const stepResults: AiActionStepExecutionResult[] = [];
  let retryCount = 0;
  const steps =
    request.mode === "single"
      ? actionPlan.plan.steps.slice(0, 1)
      : actionPlan.plan.steps;

  for (const step of steps) {
    const { result, retries } = await runStepWithRetry({
      step,
      category,
      context,
      approvalBlocksWrites: approval.required,
      retryEnabled: input.enableRetry === true,
    });
    retryCount += retries;
    stepResults.push(result);

    // Transactional: stop on first hard failure
    if (
      request.mode === "transactional" &&
      (result.status === "failed" || result.status === "blocked")
    ) {
      notes.push("transactional-abort");
      break;
    }
  }

  const rollback = buildActionRollbackResult({
    enabled: input.enableRollback === true,
    actionPlan,
    stepResults,
    mode: request.mode,
  });

  const status = resolveOverallStatus({
    stepResults,
    awaitingApproval: false,
    rolledBack: rollback.applied,
  });

  const succeededCount = stepResults.filter((s) =>
    s.status === "succeeded" || s.status === "retried",
  ).length;
  const failedCount = stepResults.filter((s) => s.status === "failed").length;
  const skippedCount = stepResults.filter((s) => s.status === "skipped").length;
  const blockedCount = stepResults.filter((s) => s.status === "blocked").length;

  const errors = Object.freeze(
    stepResults
      .map((s) => s.error)
      .filter((e): e is AiActionExecutionError => Boolean(e)),
  );

  const result: AiActionExecutionResult = Object.freeze({
    status,
    mode: request.mode,
    stepResults: Object.freeze(stepResults),
    succeededCount,
    failedCount,
    skippedCount,
    blockedCount,
    durationMs: Date.now() - startedAt,
    summary: buildExecutionResultSummary({
      status,
      succeededCount,
      failedCount,
      skippedCount,
      blockedCount,
      stepCount: stepResults.length,
    }),
    errors,
  });

  notes.push(`status:${status}`, `steps:${stepResults.length}`);

  return finalizeExecution({
    executionId,
    request,
    result,
    permissions,
    approval,
    retryPolicy,
    actionPlan,
    enableRollback: input.enableRollback === true,
    enableAudit: input.enableAudit === true,
    userId: context.userId,
    actionId: activeAction?.id ?? null,
    retryCount,
    notes,
    startedAt,
    rollbackOverride: rollback,
  });
}

function buildEmptyResult(
  mode: AiActionExecutionMode,
  durationMs: number,
  status: AiActionExecutionStatus,
  error: AiActionExecutionError,
): AiActionExecutionResult {
  return Object.freeze({
    status,
    mode,
    stepResults: Object.freeze([]),
    succeededCount: 0,
    failedCount: status === "failed" ? 1 : 0,
    skippedCount: status === "skipped" ? 1 : 0,
    blockedCount:
      status === "blocked" || status === "awaiting_approval" ? 1 : 0,
    durationMs,
    summary: sanitize(error.message),
    errors: Object.freeze([error]),
  });
}

function finalizeExecution(input: {
  readonly executionId: string;
  readonly request: ReturnType<typeof buildActionExecutionRequest>;
  readonly result: AiActionExecutionResult;
  readonly permissions: ReturnType<typeof evaluateActionPermissions>;
  readonly approval: ReturnType<typeof evaluateExecutionApproval>;
  readonly retryPolicy: ReturnType<typeof buildActionRetryPolicy>;
  readonly actionPlan: AiActionPlan | null;
  readonly enableRollback: boolean;
  readonly enableAudit: boolean;
  readonly userId: string | null;
  readonly actionId: string | null;
  readonly retryCount: number;
  readonly notes: readonly string[];
  readonly startedAt: number;
  readonly rollbackOverride?: ReturnType<typeof buildActionRollbackResult>;
}): AiActionExecution {
  const rollback =
    input.rollbackOverride ??
    buildActionRollbackResult({
      enabled: input.enableRollback,
      actionPlan: input.actionPlan,
      stepResults: input.result.stepResults,
      mode: input.request.mode,
    });

  const audit = buildActionAuditRecord({
    enabled: input.enableAudit,
    executionId: input.executionId,
    userId: input.userId,
    actionId: input.actionId,
    result: input.result,
  });

  const telemetry = buildActionExecutionTelemetry({
    executionId: input.executionId,
    result: input.result,
    retryCount: input.retryCount,
  });

  return Object.freeze({
    executionId: input.executionId,
    request: input.request,
    result: input.result,
    permissions: input.permissions,
    approval: input.approval,
    retryPolicy: input.retryPolicy,
    rollback,
    audit,
    telemetry,
    summary: sanitize(input.result.summary),
    notes: Object.freeze(
      [...new Set(input.notes.map((n) => sanitize(n, 80)))].slice(0, 16),
    ),
    executedAt: new Date().toISOString(),
  });
}

export const actionExecutionEngine = Object.freeze({
  resolve: resolveActionExecution,
});
