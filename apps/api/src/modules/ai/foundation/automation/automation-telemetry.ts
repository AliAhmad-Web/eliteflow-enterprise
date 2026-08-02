/**
 * Automation telemetry — SAFE metrics only.
 * Controlled by AI_AUTOMATION_TELEMETRY.
 */

import type { AiAutomationStatus } from "./automation-status.js";

export interface AiAutomationTelemetry {
  readonly executionId: string;
  readonly providerId: string | null;
  readonly status: AiAutomationStatus;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly callbackExpected: boolean;
  readonly background: boolean;
  readonly recordedAt: string;
}

export function buildAutomationTelemetry(input: {
  readonly enabled: boolean;
  readonly executionId: string;
  readonly providerId: string | null;
  readonly status: AiAutomationStatus;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly callbackExpected: boolean;
  readonly background: boolean;
}): AiAutomationTelemetry | null {
  if (!input.enabled) return null;
  return Object.freeze({
    executionId: input.executionId,
    providerId: input.providerId,
    status: input.status,
    durationMs: input.durationMs,
    retryCount: input.retryCount,
    callbackExpected: input.callbackExpected,
    background: input.background,
    recordedAt: new Date().toISOString(),
  });
}
