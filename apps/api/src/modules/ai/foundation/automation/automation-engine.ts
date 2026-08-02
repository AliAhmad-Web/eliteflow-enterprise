/**
 * Automation Engine — orchestrates external automation providers.
 * EliteFlow AI remains the brain. Providers never own business logic.
 * Never bypasses Action Execution, approvals, or permissions.
 * No live HTTP required — providers may stub results.
 */

import type { AiActiveContext } from "../contracts/ai-active-context.js";
import type { AiEffectivePolicy } from "../contracts/ai-effective-policy.js";
import type { AiActionPlan } from "../action/planning/ai-action-plan.js";
import type { AiActiveAction } from "../action/ai-action.js";
import type { AiWorkflowPlan } from "../workflow/workflow-instance.js";
import type { AiActionExecution } from "../action/execution/ai-action-execution.js";
import type { AiAutomationProviderDefinition } from "./automation-provider-definition.js";
import type { AiAutomationRequest } from "./automation-request.js";
import {
  buildValidatedAutomationContext,
  type AiAutomationExecutionMode,
} from "./automation-request.js";
import type { AiAutomationResponse } from "./automation-response.js";
import {
  buildAutomationRetryPolicy,
  shouldRetryAutomation,
  waitAutomationBackoff,
  type AiAutomationRetryPolicy,
} from "./automation-retry.js";
import {
  buildAutomationAuditRecord,
  type AiAutomationAuditRecord,
} from "./automation-audit.js";
import {
  buildAutomationTelemetry,
  type AiAutomationTelemetry,
} from "./automation-telemetry.js";
import { buildAutomationProviderContext } from "./automation-provider-context.js";
import {
  enterpriseAutomationProviderRegistry,
  type AiAutomationProviderRegistry,
} from "./automation-provider-registry.js";
import { N8N_PROVIDER_ID } from "./n8n-provider.js";
import {
  createAutomationError,
  type AiAutomationError,
} from "./automation-errors.js";
import type { AiAutomationStatus } from "./automation-status.js";

export interface AiAutomationExecution {
  readonly executionId: string;
  readonly request: AiAutomationRequest | null;
  readonly response: AiAutomationResponse | null;
  readonly provider: AiAutomationProviderDefinition | null;
  readonly retryPolicy: AiAutomationRetryPolicy;
  readonly audit: AiAutomationAuditRecord | null;
  readonly telemetry: AiAutomationTelemetry | null;
  readonly summary: string;
  readonly notes: readonly string[];
  readonly executedAt: string;
}

export interface ResolveAutomationExecutionInput {
  readonly actionPlan?: AiActionPlan | null;
  readonly activeAction?: AiActiveAction | null;
  readonly workflowPlan?: AiWorkflowPlan | null;
  readonly actionExecution?: AiActionExecution | null;
  readonly userId?: string | null;
  readonly activeContext: AiActiveContext;
  readonly policy: AiEffectivePolicy;
  readonly enableN8n?: boolean;
  readonly enableExternalWorkflows?: boolean;
  readonly enableAudit?: boolean;
  readonly enableTelemetry?: boolean;
  readonly enableRetry?: boolean;
  readonly registry?: AiAutomationProviderRegistry;
  readonly preferredProviderId?: string | null;
  readonly mode?: AiAutomationExecutionMode;
  readonly cancelRequested?: boolean;
}

function sanitize(value: string, max = 200): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function newExecutionId(): string {
  return `auto.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}`;
}

function resolveMode(input: {
  readonly preferred?: AiAutomationExecutionMode;
  readonly workflowKind?: string | null;
}): AiAutomationExecutionMode {
  if (input.preferred) return input.preferred;
  if (input.workflowKind === "background") return "background";
  if (input.workflowKind === "human-in-the-loop") return "callback";
  if (input.workflowKind === "approval") return "async";
  return "sync";
}

function buildBlockedExecution(input: {
  readonly executionId: string;
  readonly summary: string;
  readonly status: AiAutomationStatus;
  readonly error: AiAutomationError;
  readonly retryPolicy: AiAutomationRetryPolicy;
  readonly notes: readonly string[];
  readonly enableAudit: boolean;
  readonly enableTelemetry: boolean;
  readonly userId: string | null;
}): AiAutomationExecution {
  const response: AiAutomationResponse = Object.freeze({
    requestId: input.executionId,
    providerId: "none",
    externalExecutionId: null,
    status: input.status,
    mode: "sync",
    summary: sanitize(input.summary),
    durationMs: 0,
    callbackExpected: false,
    cancelled: input.status === "cancelled",
    timedOut: input.status === "timeout",
    error: input.error,
    completedAt: new Date().toISOString(),
  });

  return Object.freeze({
    executionId: input.executionId,
    request: null,
    response,
    provider: null,
    retryPolicy: input.retryPolicy,
    audit: buildAutomationAuditRecord({
      enabled: input.enableAudit,
      executionId: input.executionId,
      providerId: null,
      userId: input.userId,
      status: input.status,
      summary: input.summary,
    }),
    telemetry: buildAutomationTelemetry({
      enabled: input.enableTelemetry,
      executionId: input.executionId,
      providerId: null,
      status: input.status,
      durationMs: 0,
      retryCount: 0,
      callbackExpected: false,
      background: false,
    }),
    summary: sanitize(input.summary),
    notes: Object.freeze(
      [...new Set(input.notes.map((n) => sanitize(n, 80)))].slice(0, 12),
    ),
    executedAt: new Date().toISOString(),
  });
}

/**
 * Resolve automation execution after Action Execution.
 */
export async function resolveAutomationExecution(
  input: ResolveAutomationExecutionInput,
): Promise<AiAutomationExecution> {
  const executionId = newExecutionId();
  const startedAt = Date.now();
  const retryPolicy = buildAutomationRetryPolicy({
    enabled: input.enableRetry === true,
  });
  const notes: string[] = [`execution:${executionId}`];
  const userId = input.userId?.trim() || null;
  const registry = input.registry ?? enterpriseAutomationProviderRegistry;

  if (input.policy.privacyMode) {
    return buildBlockedExecution({
      executionId,
      summary: "Automation withheld in privacy mode",
      status: "blocked",
      error: createAutomationError(
        "privacy_mode",
        "Privacy mode blocks external automation",
      ),
      retryPolicy,
      notes: [...notes, "privacy-mode"],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  if (input.cancelRequested) {
    return buildBlockedExecution({
      executionId,
      summary: "Automation cancelled before dispatch",
      status: "cancelled",
      error: createAutomationError("cancelled", "Cancellation requested"),
      retryPolicy,
      notes: [...notes, "cancelled"],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  const actionExecution = input.actionExecution ?? null;
  if (!actionExecution) {
    return buildBlockedExecution({
      executionId,
      summary: "Automation requires Action Execution first",
      status: "blocked",
      error: createAutomationError(
        "action_execution_required",
        "Action Execution must run before Automation",
      ),
      retryPolicy,
      notes: [...notes, "missing-action-execution"],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  if (actionExecution.approval.blocksExecution) {
    return buildBlockedExecution({
      executionId,
      summary: "Automation blocked — action approval required",
      status: "blocked",
      error: createAutomationError(
        "approval_required",
        "Approval gate blocks external automation",
      ),
      retryPolicy,
      notes: [...notes, "approval-required"],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  if (!actionExecution.permissions.allowed) {
    return buildBlockedExecution({
      executionId,
      summary: "Automation blocked — permission denied",
      status: "blocked",
      error: createAutomationError(
        "permission_denied",
        "Permission check failed for automation",
      ),
      retryPolicy,
      notes: [...notes, "permission-denied"],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  const execStatus = actionExecution.result.status;
  if (
    execStatus === "failed" ||
    execStatus === "blocked" ||
    execStatus === "awaiting_approval" ||
    execStatus === "skipped"
  ) {
    return buildBlockedExecution({
      executionId,
      summary: `Automation skipped — action execution status ${execStatus}`,
      status: "skipped",
      error: createAutomationError(
        "action_execution_required",
        `Action execution status '${execStatus}' is not eligible for automation`,
      ),
      retryPolicy,
      notes: [...notes, `action-status:${execStatus}`],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  if (!input.enableExternalWorkflows && !input.enableN8n) {
    return buildBlockedExecution({
      executionId,
      summary: "External workflows disabled",
      status: "skipped",
      error: createAutomationError(
        "provider_disabled",
        "External automation flags are disabled",
      ),
      retryPolicy,
      notes: [...notes, "external-disabled"],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  const preferredId = input.preferredProviderId?.trim() || N8N_PROVIDER_ID;
  const provider =
    registry.get(preferredId) ??
    registry.getByKind("n8n") ??
    registry.listEnabled()[0];

  if (!provider || provider.definition.enabled === false) {
    return buildBlockedExecution({
      executionId,
      summary: "No automation provider available",
      status: "failed",
      error: createAutomationError(
        "provider_not_found",
        "Automation provider registry has no enabled provider",
      ),
      retryPolicy,
      notes: [...notes, "provider-missing"],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  if (provider.definition.kind === "n8n" && !input.enableN8n) {
    return buildBlockedExecution({
      executionId,
      summary: "n8n integration disabled",
      status: "skipped",
      error: createAutomationError(
        "provider_disabled",
        "AI_N8N_INTEGRATION is disabled",
      ),
      retryPolicy,
      notes: [...notes, "n8n-disabled"],
      enableAudit: input.enableAudit === true,
      enableTelemetry: input.enableTelemetry === true,
      userId,
    });
  }

  const mode = resolveMode({
    preferred: input.mode,
    workflowKind: input.workflowPlan?.definition.kind,
  });

  const category = input.activeAction?.category ?? "generic";
  const workflowKey = `action.${category}`;

  const validated = buildValidatedAutomationContext({
    actionId: input.activeAction?.id ?? null,
    actionCategory: category,
    actionPlanId: input.actionPlan?.plan.id ?? null,
    workflowPlanId: input.workflowPlan?.definition.id ?? null,
    actionExecutionId: actionExecution.executionId,
    actionExecutionStatus: actionExecution.result.status,
    priority: input.actionPlan?.priority ?? null,
    riskLevel: input.actionPlan?.riskLevel ?? null,
    stepSummaries: actionExecution.result.stepResults.map((s) => s.summary),
    notes: actionExecution.notes,
  });

  const request: AiAutomationRequest = Object.freeze({
    requestId: executionId,
    providerId: provider.definition.id,
    providerKind: provider.definition.kind,
    workflowKey,
    mode,
    context: validated,
    timeoutMs: 5_000,
    cancelable: provider.definition.supportsCancel,
    requestedAt: new Date().toISOString(),
  });

  const providerContext = buildAutomationProviderContext({
    userId,
    activeContext: input.activeContext,
    policy: input.policy,
    validated,
    mode,
    timeoutMs: request.timeoutMs,
    enableExternalWorkflows: input.enableExternalWorkflows === true,
    enableN8n: input.enableN8n === true,
  });

  let attempt = 0;
  let response: AiAutomationResponse | null = null;
  let retryCount = 0;
  let lastError: AiAutomationError | undefined;

  while (attempt < retryPolicy.maxAttempts) {
    attempt += 1;
    response = await provider.trigger(request, providerContext);

    if (
      response.status === "succeeded" ||
      response.status === "queued" ||
      response.status === "background" ||
      response.status === "awaiting_callback" ||
      response.status === "skipped"
    ) {
      break;
    }

    lastError = response.error;
    const canRetry = shouldRetryAutomation({
      policy: retryPolicy,
      attempt,
      error: lastError,
    });
    if (!canRetry) break;
    retryCount += 1;
    await waitAutomationBackoff(retryPolicy.backoffMs);
  }

  if (!response) {
    response = Object.freeze({
      requestId: executionId,
      providerId: provider.definition.id,
      externalExecutionId: null,
      status: "failed" as const,
      mode,
      summary: sanitize("Automation provider returned no response"),
      durationMs: Date.now() - startedAt,
      callbackExpected: false,
      cancelled: false,
      timedOut: false,
      error: createAutomationError("unknown", "No provider response"),
      completedAt: new Date().toISOString(),
    });
  }

  if (
    retryCount > 0 &&
    response.status === "failed" &&
    lastError &&
    !shouldRetryAutomation({
      policy: retryPolicy,
      attempt: retryPolicy.maxAttempts,
      error: lastError,
    })
  ) {
    notes.push("retry-exhausted");
  }

  notes.push(
    `provider:${provider.definition.id}`,
    `status:${response.status}`,
    `mode:${mode}`,
  );

  const summary = sanitize(response.summary);
  const durationMs = Date.now() - startedAt;

  return Object.freeze({
    executionId,
    request,
    response,
    provider: provider.definition,
    retryPolicy,
    audit: buildAutomationAuditRecord({
      enabled: input.enableAudit === true,
      executionId,
      providerId: provider.definition.id,
      userId,
      status: response.status,
      summary,
      extraEvents: Object.freeze([
        Object.freeze({
          event: "provider_selected" as const,
          timestamp: new Date().toISOString(),
          detail: sanitize(provider.definition.name, 40),
        }),
        Object.freeze({
          event: "triggered" as const,
          timestamp: new Date().toISOString(),
          status: response.status,
        }),
      ]),
    }),
    telemetry: buildAutomationTelemetry({
      enabled: input.enableTelemetry === true,
      executionId,
      providerId: provider.definition.id,
      status: response.status,
      durationMs,
      retryCount,
      callbackExpected: response.callbackExpected,
      background: response.status === "background" || mode === "background",
    }),
    summary,
    notes: Object.freeze(
      [...new Set(notes.map((n) => sanitize(n, 80)))].slice(0, 16),
    ),
    executedAt: new Date().toISOString(),
  });
}

export const automationEngine = Object.freeze({
  resolve: resolveAutomationExecution,
});
