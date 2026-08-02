/**
 * Enterprise AI Action Execution Engine public exports.
 * Service-backed only — never Prisma/repos, never duplicates business logic.
 */

export type { AiActionExecution } from "./ai-action-execution.js";

export type {
  AiActionExecutionStatus,
  AiActionStepExecutionStatus,
} from "./action-execution-status.js";
export {
  formatActionExecutionStatus,
  formatActionStepExecutionStatus,
} from "./action-execution-status.js";

export type {
  AiActionExecutionError,
  AiActionExecutionErrorCode,
} from "./action-execution-errors.js";
export {
  createActionExecutionError,
  isRetryableErrorCode,
} from "./action-execution-errors.js";

export type {
  AiActionExecutionResult,
  AiActionStepExecutionResult,
} from "./action-execution-result.js";
export { buildExecutionResultSummary } from "./action-execution-result.js";

export type {
  AiActionExecutionRequest,
  AiActionExecutionMode,
} from "./action-execution-request.js";
export {
  buildActionExecutionRequest,
  resolveExecutionMode,
} from "./action-execution-request.js";

export type {
  AiActionExecutionContext,
  AiActionExecutionActor,
} from "./action-execution-context.js";
export {
  buildActionExecutionContext,
  toPermissionSubject,
  toServiceActor,
  toPrivilegedServiceActor,
} from "./action-execution-context.js";

export type { AiActionPermissionDecision } from "./action-execution-permissions.js";
export {
  ACTION_READ_PERMISSIONS,
  resolveActionPermission,
  evaluateActionPermissions,
} from "./action-execution-permissions.js";

export type { AiActionExecutionApprovalGate } from "./action-execution-approval.js";
export { evaluateExecutionApproval } from "./action-execution-approval.js";

export type {
  AiActionRetryPolicy,
  AiActionRetryAttempt,
} from "./action-execution-retry.js";
export {
  buildActionRetryPolicy,
  shouldRetryStep,
  waitRetryBackoff,
} from "./action-execution-retry.js";

export type {
  AiActionRollbackResult,
  AiActionRollbackRecord,
} from "./action-execution-rollback.js";
export { buildActionRollbackResult } from "./action-execution-rollback.js";

export type {
  AiActionAuditRecord,
  AiActionAuditEvent,
  AiActionAuditEventType,
} from "./action-execution-audit.js";
export { buildActionAuditRecord } from "./action-execution-audit.js";

export type { AiActionExecutionTelemetry } from "./action-execution-telemetry.js";
export { buildActionExecutionTelemetry } from "./action-execution-telemetry.js";

export type { AiActionServiceCallResult } from "./action-executor.js";
export {
  executeActionStep,
  executeDomainService,
  executeFinanceService,
  executeHrService,
} from "./action-executor.js";

export type { ResolveActionExecutionInput } from "./action-execution-engine.js";
export {
  resolveActionExecution,
  actionExecutionEngine,
} from "./action-execution-engine.js";

export { formatActionExecutionForRuntime } from "./action-execution-runtime.js";
