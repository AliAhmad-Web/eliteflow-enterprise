/**
 * n8n client — integration adapter only.
 * Does NOT require a running n8n instance.
 * Does NOT perform real HTTP calls in this architecture layer.
 */

import type { AiAutomationProviderContext } from "./automation-provider-context.js";
import type { AiAutomationRequest } from "./automation-request.js";
import type { AiN8nWorkflowRef } from "./n8n-workflow.js";
import { buildN8nWorkflowRef } from "./n8n-workflow.js";
import type { AiN8nTrigger } from "./n8n-trigger.js";
import { buildN8nTrigger } from "./n8n-trigger.js";
import type { AiN8nExecutionRef } from "./n8n-execution.js";
import { createN8nExecutionRef } from "./n8n-execution.js";
import type { AiN8nResult } from "./n8n-result.js";
import { buildN8nResult } from "./n8n-result.js";
import type { AiAutomationStatus } from "./automation-status.js";

export interface AiN8nClientDispatch {
  readonly workflow: AiN8nWorkflowRef;
  readonly trigger: AiN8nTrigger;
  readonly execution: AiN8nExecutionRef;
  readonly result: AiN8nResult;
}

/**
 * Simulate an n8n dispatch without live network I/O.
 */
export async function dispatchN8nStub(
  request: AiAutomationRequest,
  context: AiAutomationProviderContext,
): Promise<AiN8nClientDispatch> {
  const workflow = buildN8nWorkflowRef({
    workflowKey: request.workflowKey,
    category: context.validated.actionCategory,
  });
  const trigger = buildN8nTrigger({
    mode: request.mode,
    workflowKey: request.workflowKey,
  });
  const execution = createN8nExecutionRef({
    workflowId: workflow.workflowId,
    mode: request.mode,
  });

  let status: AiAutomationStatus = "succeeded";
  if (request.mode === "callback") status = "awaiting_callback";
  else if (request.mode === "background") status = "background";
  else if (request.mode === "async") status = "queued";

  // Respect timeout budget as metadata only — no real wait beyond microtask.
  if (context.timeoutMs <= 0) {
    status = "timeout";
  }

  const result = buildN8nResult({
    executionId: execution.executionId,
    status,
    mode: request.mode,
    workflowName: workflow.workflowName,
  });

  return Object.freeze({
    workflow,
    trigger,
    execution,
    result,
  });
}

/**
 * Simulate cancel without live HTTP.
 */
export async function cancelN8nStub(
  externalExecutionId: string,
): Promise<boolean> {
  return Boolean(externalExecutionId?.trim());
}
