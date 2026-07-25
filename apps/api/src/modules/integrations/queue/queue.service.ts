/**
 * Phase 19.4 — Sync queue overview built on SyncHistory (no duplicate queue table).
 */

import type { SyncQueueOverviewDto } from "@enterprise/shared";

import { integrationsRepository } from "../integrations.repository.js";
import type { IntegrationsActor } from "../integrations.types.js";
import {
  requireIntegrationAccess,
  requireRead,
  resolveAllowedIds,
} from "../integrations.access.js";
import { mapSyncQueueJobDto } from "../monitoring/monitoring.mappers.js";

export class QueueService {
  async overview(
    actor: IntegrationsActor,
    integrationIdOrSlug?: string,
  ): Promise<SyncQueueOverviewDto> {
    requireRead(actor);
    let integrationId: string | undefined;
    if (integrationIdOrSlug) {
      const row = await requireIntegrationAccess(actor, integrationIdOrSlug);
      integrationId = row.id;
    }

    const allowed = await resolveAllowedIds(actor);

    const [pendingJobs, runningJobs, failedJobs, completedJobs, cancelledJobs] =
      await Promise.all([
        integrationsRepository.countSyncByStatus({
          integrationId,
          status: "PENDING",
          allowedIntegrationIds: allowed,
        }),
        integrationsRepository.countSyncByStatus({
          integrationId,
          status: "RUNNING",
          allowedIntegrationIds: allowed,
        }),
        integrationsRepository.countSyncByStatus({
          integrationId,
          status: "FAILED",
          allowedIntegrationIds: allowed,
        }),
        integrationsRepository.countSyncByStatus({
          integrationId,
          status: "SUCCESS",
          allowedIntegrationIds: allowed,
        }),
        integrationsRepository.countSyncByStatus({
          integrationId,
          status: "CANCELLED",
          allowedIntegrationIds: allowed,
        }),
      ]);

    const { items } = await integrationsRepository.listSyncHistory({
      page: 1,
      pageSize: 40,
      integrationId,
      allowedIntegrationIds: allowed,
    });

    return {
      queueLength: pendingJobs + runningJobs,
      pendingJobs,
      runningJobs,
      failedJobs,
      completedJobs,
      cancelledJobs,
      jobs: items.map(mapSyncQueueJobDto),
    };
  }
}

export const queueService = new QueueService();
