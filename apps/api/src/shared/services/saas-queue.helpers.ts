/**
 * Notification queue scaling / background processing helpers (Phase 8 Phase 2).
 * Extends existing NotificationQueue — no external brokers.
 */

import {
  isApiSaasBackgroundProcessingEnabled,
  isApiSaasQueueScalingEnabled,
} from "../../config/saas-flags.js";

const BASE_BATCH = 25;
const SCALED_BATCH = 50;
const MAX_BATCH = 100;

/** Resolve claim/process batch size (preserves caller default when flags OFF). */
export function resolveNotificationQueueBatchSize(
  requestedLimit: number,
): number {
  if (!isApiSaasQueueScalingEnabled()) {
    return requestedLimit;
  }
  const scaled = Math.max(requestedLimit, SCALED_BATCH);
  return Math.min(scaled, MAX_BATCH);
}

export function getDefaultNotificationQueueBatchSize(): number {
  if (isApiSaasQueueScalingEnabled()) {
    return SCALED_BATCH;
  }
  return BASE_BATCH;
}

export interface QueueRetryPlan {
  shouldRetry: boolean;
  delayMs: number;
  reason: string;
}

/** Provider-agnostic retry preparation for deferred / transient failures. */
export function planNotificationQueueRetry(input: {
  attempts: number;
  lastError?: string | null;
}): QueueRetryPlan {
  if (!isApiSaasBackgroundProcessingEnabled()) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: "background_processing_disabled",
    };
  }

  const attempts = Math.max(0, input.attempts);
  if (attempts >= 5) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: "max_attempts",
    };
  }

  const deferred = (input.lastError ?? "")
    .toUpperCase()
    .includes("PROVIDER_DEFERRED");
  if (deferred) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: "provider_deferred",
    };
  }

  const delayMs = Math.min(60_000, 1_000 * 2 ** attempts);
  return {
    shouldRetry: true,
    delayMs,
    reason: "transient",
  };
}

export type SaasQueueWorkerResult = {
  processed: number;
  sent: number;
  failed: number;
};

/**
 * Worker abstraction over the existing processNotificationQueue function.
 * Does not introduce external queue providers.
 */
export async function runNotificationQueueWorker(
  processFn: (limit: number) => Promise<SaasQueueWorkerResult>,
  requestedLimit?: number,
): Promise<SaasQueueWorkerResult> {
  const limit = resolveNotificationQueueBatchSize(
    requestedLimit ?? getDefaultNotificationQueueBatchSize(),
  );
  return processFn(limit);
}
