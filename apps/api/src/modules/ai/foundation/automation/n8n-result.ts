/**
 * n8n result models — SAFE summaries only.
 */

import type { AiAutomationStatus } from "./automation-status.js";

export interface AiN8nResult {
  readonly executionId: string;
  readonly status: AiAutomationStatus;
  readonly summary: string;
  readonly nodesVisited: number;
  readonly callbackPending: boolean;
}

function sanitize(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildN8nResult(input: {
  readonly executionId: string;
  readonly status: AiAutomationStatus;
  readonly mode: string;
  readonly workflowName: string;
}): AiN8nResult {
  return Object.freeze({
    executionId: input.executionId,
    status: input.status,
    summary: sanitize(
      `n8n ${input.mode} stub for ${input.workflowName}: status ${input.status} (no live HTTP)`,
    ),
    nodesVisited: input.status === "succeeded" || input.status === "background" ? 2 : 1,
    callbackPending: input.status === "awaiting_callback",
  });
}
