import type { IntegrationSyncStatus } from "@enterprise/database";

import { integrationsRepository } from "./integrations.repository.js";
import { mapSyncHistoryDto } from "./integrations.mapper.js";

/**
 * SyncManager — records sync runs for the Integration Center dashboard.
 * Phase 19.1 creates architecture + history entries; real provider syncs come later.
 */
export class SyncManager {
  async recordConnectSync(input: {
    integrationId: string;
    userId: string;
  }) {
    const startedAt = new Date();
    const completedAt = new Date();
    const row = await integrationsRepository.createSyncHistory({
      integrationId: input.integrationId,
      status: "SUCCESS",
      direction: "inbound",
      recordsProcessed: 0,
      recordsFailed: 0,
      message: "OAuth connection established.",
      metadata: { phase: "19.2", kind: "connect" },
      triggeredById: input.userId,
      startedAt,
      completedAt,
    });
    return mapSyncHistoryDto(row);
  }

  async recordHealthProbe(input: {
    integrationId: string;
    userId: string;
    healthy: boolean;
  }) {
    const status: IntegrationSyncStatus = input.healthy ? "SUCCESS" : "FAILED";
    const startedAt = new Date();
    const completedAt = new Date();
    const row = await integrationsRepository.createSyncHistory({
      integrationId: input.integrationId,
      status,
      direction: "probe",
      recordsProcessed: input.healthy ? 1 : 0,
      recordsFailed: input.healthy ? 0 : 1,
      message: input.healthy
        ? "Health probe completed successfully."
        : "Health probe reported failure.",
      metadata: { phase: "19.2", kind: "health_probe" },
      triggeredById: input.userId,
      startedAt,
      completedAt,
    });
    return mapSyncHistoryDto(row);
  }

  async list(input: {
    page: number;
    pageSize: number;
    integrationId?: string;
    status?: IntegrationSyncStatus;
    allowedIntegrationIds?: string[] | null;
  }) {
    const { items, total } =
      await integrationsRepository.listSyncHistory(input);
    return {
      items: items.map(mapSyncHistoryDto),
      total,
    };
  }
}

export const syncManager = new SyncManager();
