import type { IntegrationSyncStatus } from "@enterprise/database";

import { integrationsRepository } from "../integrations.repository.js";
import { mapSyncHistoryDto } from "../integrations.mapper.js";

/**
 * RetryManager — prepares retryable sync jobs (Pending → Running → Completed/Failed).
 * Phase 19.2 stores retry metadata; provider event processing comes later.
 */
export class RetryManager {
  async createJob(input: {
    integrationId: string;
    userId?: string | null;
    direction?: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }) {
    const row = await integrationsRepository.createSyncHistory({
      integrationId: input.integrationId,
      status: "PENDING",
      direction: input.direction ?? "retry",
      message: input.message ?? "Retry job queued.",
      metadata: { phase: "19.2", kind: "retry", ...(input.metadata ?? {}) },
      triggeredById: input.userId ?? null,
    });
    return mapSyncHistoryDto(row);
  }

  async markRunning(id: string) {
    const row = await integrationsRepository.updateSyncHistory(id, {
      status: "RUNNING",
      startedAt: new Date(),
    });
    return mapSyncHistoryDto(row);
  }

  async markCompleted(id: string, message?: string) {
    const row = await integrationsRepository.updateSyncHistory(id, {
      status: "SUCCESS",
      message: message ?? "Retry job completed.",
      completedAt: new Date(),
      failureReason: null,
    });
    return mapSyncHistoryDto(row);
  }

  async markFailed(id: string, reason: string, retryCount: number) {
    const row = await integrationsRepository.updateSyncHistory(id, {
      status: "FAILED",
      failureReason: reason.slice(0, 500),
      retryCount,
      lastRetryAt: new Date(),
      completedAt: new Date(),
      message: reason.slice(0, 500),
    });
    return mapSyncHistoryDto(row);
  }

  async recordAttempt(input: {
    integrationId: string;
    userId?: string | null;
    success: boolean;
    reason?: string;
    retryCount?: number;
    kind?: string;
  }) {
    const status: IntegrationSyncStatus = input.success ? "SUCCESS" : "FAILED";
    const row = await integrationsRepository.createSyncHistory({
      integrationId: input.integrationId,
      status,
      direction: "retry",
      recordsProcessed: input.success ? 1 : 0,
      recordsFailed: input.success ? 0 : 1,
      message: input.success
        ? "Operation succeeded."
        : (input.reason ?? "Operation failed."),
      failureReason: input.success ? null : input.reason ?? "unknown",
      retryCount: input.retryCount ?? 0,
      lastRetryAt: input.success ? null : new Date(),
      metadata: {
        phase: "19.2",
        kind: input.kind ?? "attempt",
      },
      triggeredById: input.userId ?? null,
      startedAt: new Date(),
      completedAt: new Date(),
    });
    return mapSyncHistoryDto(row);
  }
}

export const retryManager = new RetryManager();
