/**
 * Action execution telemetry — safe metrics only.
 */

import type { AiActionExecutionResult } from "./action-execution-result.js";

export interface AiActionExecutionTelemetry {
  readonly executionId: string;
  readonly durationMs: number;
  readonly stepCount: number;
  readonly succeededCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
  readonly blockedCount: number;
  readonly retryCount: number;
  readonly serviceCallCount: number;
  readonly mode: string;
  readonly recordedAt: string;
}

export function buildActionExecutionTelemetry(input: {
  readonly executionId: string;
  readonly result: AiActionExecutionResult;
  readonly retryCount: number;
}): AiActionExecutionTelemetry {
  const serviceCallCount = input.result.stepResults.filter(
    (s) => s.service !== null && s.status === "succeeded",
  ).length;

  return Object.freeze({
    executionId: input.executionId,
    durationMs: input.result.durationMs,
    stepCount: input.result.stepResults.length,
    succeededCount: input.result.succeededCount,
    failedCount: input.result.failedCount,
    skippedCount: input.result.skippedCount,
    blockedCount: input.result.blockedCount,
    retryCount: input.retryCount,
    serviceCallCount,
    mode: input.result.mode,
    recordedAt: new Date().toISOString(),
  });
}
