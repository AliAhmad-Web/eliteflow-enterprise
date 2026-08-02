/**
 * Immutable Enterprise AI Action Execution model.
 * Service-backed execution results only — never raw records/secrets.
 */

import type { AiActionExecutionRequest } from "./action-execution-request.js";
import type { AiActionExecutionResult } from "./action-execution-result.js";
import type { AiActionExecutionApprovalGate } from "./action-execution-approval.js";
import type { AiActionPermissionDecision } from "./action-execution-permissions.js";
import type { AiActionRetryPolicy } from "./action-execution-retry.js";
import type { AiActionRollbackResult } from "./action-execution-rollback.js";
import type { AiActionAuditRecord } from "./action-execution-audit.js";
import type { AiActionExecutionTelemetry } from "./action-execution-telemetry.js";

/**
 * Frozen action execution attached to pipeline state.
 */
export interface AiActionExecution {
  readonly executionId: string;
  readonly request: AiActionExecutionRequest;
  readonly result: AiActionExecutionResult;
  readonly permissions: AiActionPermissionDecision;
  readonly approval: AiActionExecutionApprovalGate;
  readonly retryPolicy: AiActionRetryPolicy;
  readonly rollback: AiActionRollbackResult;
  readonly audit: AiActionAuditRecord | null;
  readonly telemetry: AiActionExecutionTelemetry;
  readonly summary: string;
  readonly notes: readonly string[];
  readonly executedAt: string;
}
