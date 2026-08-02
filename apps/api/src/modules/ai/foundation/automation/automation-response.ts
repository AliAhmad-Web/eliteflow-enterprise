/**
 * Automation response — SAFE result metadata only.
 */

import type { AiAutomationStatus } from "./automation-status.js";
import type { AiAutomationError } from "./automation-errors.js";
import type { AiAutomationExecutionMode } from "./automation-request.js";

export interface AiAutomationResponse {
  readonly requestId: string;
  readonly providerId: string;
  readonly externalExecutionId: string | null;
  readonly status: AiAutomationStatus;
  readonly mode: AiAutomationExecutionMode;
  readonly summary: string;
  readonly durationMs: number;
  readonly callbackExpected: boolean;
  readonly cancelled: boolean;
  readonly timedOut: boolean;
  readonly error?: AiAutomationError;
  readonly completedAt: string | null;
}
