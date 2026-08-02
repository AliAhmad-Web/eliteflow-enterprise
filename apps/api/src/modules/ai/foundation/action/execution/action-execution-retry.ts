/**
 * Action execution retry strategy.
 * Controlled by AI_ACTION_RETRY feature flag.
 */

import {
  isRetryableErrorCode,
  type AiActionExecutionError,
} from "./action-execution-errors.js";

export interface AiActionRetryPolicy {
  readonly enabled: boolean;
  readonly maxAttempts: number;
  readonly backoffMs: number;
}

export interface AiActionRetryAttempt {
  readonly attempt: number;
  readonly stepId: string;
  readonly success: boolean;
  readonly errorCode?: string;
}

export function buildActionRetryPolicy(input: {
  readonly enabled: boolean;
  readonly maxAttempts?: number;
}): AiActionRetryPolicy {
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

export function shouldRetryStep(input: {
  readonly policy: AiActionRetryPolicy;
  readonly attempt: number;
  readonly error?: AiActionExecutionError;
}): boolean {
  if (!input.policy.enabled) return false;
  if (input.attempt >= input.policy.maxAttempts) return false;
  if (!input.error) return false;
  return input.error.retryable || isRetryableErrorCode(input.error.code);
}

export async function waitRetryBackoff(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
