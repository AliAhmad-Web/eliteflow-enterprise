/**
 * In-process SaaS usage / capacity metrics (Phase 8 Phase 2).
 * No new storage — process memory only. Lost on restart (by design).
 */

import {
  isApiSaasCapacityManagementEnabled,
  isApiSaasUsageMetricsEnabled,
} from "../../config/saas-flags.js";

export interface SaasUsageSnapshot {
  requests: number;
  slowRequests: number;
  notificationQueueProcessed: number;
  notificationQueueFailed: number;
  aiRequests: number;
  reportGenerations: number;
  startedAt: string;
}

const state: SaasUsageSnapshot = {
  requests: 0,
  slowRequests: 0,
  notificationQueueProcessed: 0,
  notificationQueueFailed: 0,
  aiRequests: 0,
  reportGenerations: 0,
  startedAt: new Date().toISOString(),
};

export function recordSaasRequest(options?: { slow?: boolean }): void {
  if (!isApiSaasUsageMetricsEnabled()) return;
  state.requests += 1;
  if (options?.slow) state.slowRequests += 1;
}

export function recordSaasNotificationQueueResult(input: {
  processed: number;
  failed: number;
}): void {
  if (!isApiSaasUsageMetricsEnabled()) return;
  state.notificationQueueProcessed += input.processed;
  state.notificationQueueFailed += input.failed;
}

export function recordSaasAiRequest(): void {
  if (!isApiSaasUsageMetricsEnabled()) return;
  state.aiRequests += 1;
}

export function recordSaasReportGeneration(): void {
  if (!isApiSaasUsageMetricsEnabled()) return;
  state.reportGenerations += 1;
}

export function getSaasUsageSnapshot(): SaasUsageSnapshot | null {
  if (!isApiSaasUsageMetricsEnabled()) return null;
  return { ...state };
}

export interface SaasCapacityAssessment {
  level: "ok" | "watch" | "critical";
  notes: string[];
}

/** Soft capacity thresholds — warnings only, no enforcement. */
export function assessSaasCapacity(input?: {
  pendingQueueDepth?: number;
}): SaasCapacityAssessment | null {
  if (!isApiSaasCapacityManagementEnabled()) return null;

  const notes: string[] = [];
  let level: SaasCapacityAssessment["level"] = "ok";

  if (isApiSaasUsageMetricsEnabled()) {
    const slowRatio =
      state.requests > 0 ? state.slowRequests / state.requests : 0;
    if (slowRatio >= 0.25 && state.requests >= 20) {
      level = "critical";
      notes.push(`High slow-request ratio (${(slowRatio * 100).toFixed(1)}%)`);
    } else if (slowRatio >= 0.1 && state.requests >= 20) {
      level = "watch";
      notes.push(`Elevated slow-request ratio (${(slowRatio * 100).toFixed(1)}%)`);
    }
  }

  const depth = input?.pendingQueueDepth;
  if (typeof depth === "number") {
    if (depth >= 500) {
      level = "critical";
      notes.push(`Notification queue depth ${depth}`);
    } else if (depth >= 100) {
      if (level === "ok") level = "watch";
      notes.push(`Notification queue depth ${depth}`);
    }
  }

  if (notes.length === 0) {
    notes.push("Capacity within soft thresholds");
  }

  return { level, notes };
}
