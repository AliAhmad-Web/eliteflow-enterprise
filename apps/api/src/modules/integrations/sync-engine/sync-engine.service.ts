/**
 * Phase 19.4 — Sync Engine (manual / retry / cancel).
 * Auto + scheduled sync are architecture-ready via scheduler config.
 */

import type { ManualSyncInput, SyncQueueJobDto } from "@enterprise/shared";

import { alertService } from "../alerts/alert.service.js";
import { logIntegrationsAuditEvent } from "../integrations.audit.js";
import { INTEGRATIONS_AUDIT_ACTIONS } from "../integrations.constants.js";
import {
  INTEGRATIONS_ERROR_CODES,
  IntegrationsError,
} from "../integrations.errors.js";
import { integrationsRepository } from "../integrations.repository.js";
import type {
  IntegrationsActor,
  IntegrationsRequestContext,
} from "../integrations.types.js";
import {
  requireIntegrationAccess,
  requireManage,
} from "../integrations.access.js";
import { mapSyncQueueJobDto } from "../monitoring/monitoring.mappers.js";

export class SyncEngineService {
  async startManualSync(
    idOrSlug: string,
    input: ManualSyncInput,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<SyncQueueJobDto> {
    requireManage(actor);
    const integration = await requireIntegrationAccess(actor, idOrSlug);

    if (!integration.isConnected) {
      throw new IntegrationsError(
        "Integration must be connected before syncing.",
        409,
        INTEGRATIONS_ERROR_CODES.CONFLICT,
      );
    }

    const pending = await integrationsRepository.createSyncHistory({
      integrationId: integration.id,
      status: "PENDING",
      direction: input.direction,
      message: "Manual sync queued.",
      metadata: { phase: "19.4", kind: "manual_sync", mode: "manual" },
      triggeredById: actor.userId,
    });

    await integrationsRepository.createLog({
      integrationId: integration.id,
      level: "INFO",
      action: "sync_queued",
      message: `Manual ${input.direction} sync queued.`,
      metadata: { jobId: pending.id, phase: "19.4" },
      userId: actor.userId,
    });

    const running = await integrationsRepository.updateSyncHistory(pending.id, {
      status: "RUNNING",
      startedAt: new Date(),
      message: "Manual sync running.",
    });

    const healthy =
      integration.healthStatus === "HEALTHY" ||
      integration.healthStatus === "DEGRADED";

    const completed = healthy
      ? await integrationsRepository.updateSyncHistory(running.id, {
          status: "SUCCESS",
          completedAt: new Date(),
          recordsProcessed: 1,
          message: "Manual sync completed (architecture).",
        })
      : await integrationsRepository.updateSyncHistory(running.id, {
          status: "FAILED",
          completedAt: new Date(),
          recordsFailed: 1,
          failureReason: "Integration health is not ready for sync.",
          message: "Manual sync failed — unhealthy connection.",
        });

    await integrationsRepository.updateConnection(integration.id, {
      lastSyncAt: new Date(),
    });

    if (!healthy) {
      await alertService.raise({
        integrationId: integration.id,
        type: "sync_failed",
        severity: "warning",
        title: "Sync failed",
        message: completed.failureReason ?? "Manual sync failed.",
        userId: actor.userId,
      });
    }

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.SYNC_STARTED,
      resourceId: integration.id,
      metadata: {
        phase: "19.4",
        kind: "manual_sync",
        jobId: completed.id,
        status: completed.status,
      },
      context,
    });

    return mapSyncQueueJobDto(completed);
  }

  async retryJob(
    jobId: string,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<SyncQueueJobDto> {
    requireManage(actor);
    const job = await integrationsRepository.findSyncById(jobId);
    if (!job) {
      throw new IntegrationsError(
        "Sync job not found",
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    await requireIntegrationAccess(actor, job.integrationId);

    if (job.status !== "FAILED" && job.status !== "CANCELLED") {
      throw new IntegrationsError(
        "Only failed or cancelled jobs can be retried.",
        409,
        INTEGRATIONS_ERROR_CODES.CONFLICT,
      );
    }

    const retryCount = (job.retryCount ?? 0) + 1;
    const running = await integrationsRepository.updateSyncHistory(job.id, {
      status: "RUNNING",
      startedAt: new Date(),
      completedAt: null,
      retryCount,
      lastRetryAt: new Date(),
      failureReason: null,
      message: `Retry #${retryCount} running.`,
      metadata: {
        phase: "19.4",
        kind: "retry_sync",
        previousStatus: job.status,
      },
    });

    const completed = await integrationsRepository.updateSyncHistory(
      running.id,
      {
        status: "SUCCESS",
        completedAt: new Date(),
        recordsProcessed: 1,
        message: `Retry #${retryCount} completed (architecture).`,
      },
    );

    await integrationsRepository.createLog({
      integrationId: job.integrationId,
      level: "INFO",
      action: "sync_retry",
      message: `Sync job retried (attempt ${retryCount}).`,
      metadata: { jobId, phase: "19.4" },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.SYNC_RETRY,
      resourceId: job.integrationId,
      metadata: { phase: "19.4", kind: "retry_sync", jobId },
      context,
    });

    return mapSyncQueueJobDto(completed);
  }

  async cancelJob(
    jobId: string,
    actor: IntegrationsActor,
    context: IntegrationsRequestContext,
  ): Promise<SyncQueueJobDto> {
    requireManage(actor);
    const job = await integrationsRepository.findSyncById(jobId);
    if (!job) {
      throw new IntegrationsError(
        "Sync job not found",
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    await requireIntegrationAccess(actor, job.integrationId);

    if (job.status !== "PENDING" && job.status !== "RUNNING") {
      throw new IntegrationsError(
        "Only pending or running jobs can be cancelled.",
        409,
        INTEGRATIONS_ERROR_CODES.CONFLICT,
      );
    }

    const cancelled = await integrationsRepository.updateSyncHistory(job.id, {
      status: "CANCELLED",
      completedAt: new Date(),
      message: "Sync job cancelled by administrator.",
      failureReason: "cancelled",
    });

    await integrationsRepository.createLog({
      integrationId: job.integrationId,
      level: "WARNING",
      action: "sync_cancelled",
      message: "Sync job cancelled.",
      metadata: { jobId, phase: "19.4" },
      userId: actor.userId,
    });

    await logIntegrationsAuditEvent({
      userId: actor.userId,
      action: INTEGRATIONS_AUDIT_ACTIONS.SYNC_CANCELLED,
      resourceId: job.integrationId,
      metadata: { phase: "19.4", kind: "cancel_sync", jobId },
      context,
    });

    return mapSyncQueueJobDto(cancelled);
  }
}

export const syncEngineService = new SyncEngineService();
