/**
 * Automation retry policy.
 */

import {
  isRetryableAutomationError,
  type AiAutomationError,
} from "./automation-errors.js";

export interface AiAutomationRetryPolicy {
  readonly enabled: boolean;
  readonly maxAttempts: number;
  readonly backoffMs: number;
}

export function buildAutomationRetryPolicy(input: {
  readonly enabled: boolean;
  readonly maxAttempts?: number;
}): AiAutomationRetryPolicy {
  const maxAttempts =
    typeof input.maxAttempts === "number" && input.maxAttempts > 0
      ? Math.min(Math.floor(input.maxAttempts), 3)
      : 2;
  return Object.freeze({
    enabled: input.enabled,
    maxAttempts: input.enabled ? maxAttempts : 1,
    backoffMs: input.enabled ? 25 : 0,
  });
}

export function shouldRetryAutomation(input: {
  readonly policy: AiAutomationRetryPolicy;
  readonly attempt: number;
  readonly error?: AiAutomationError;
}): boolean {
  if (!input.policy.enabled) return false;
  if (input.attempt >= input.policy.maxAttempts) return false;
  if (!input.error) return false;
  return (
    input.error.retryable || isRetryableAutomationError(input.error.code)
  );
}

export async function waitAutomationBackoff(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
