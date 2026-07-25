/**
 * Phase 19.4 — Live monitoring metrics derived from Integration + SyncHistory.
 */

import type {
  IntegrationLiveMonitoringDto,
  IntegrationMonitoringOverviewDto,
} from "@enterprise/shared";

import {
  INTEGRATIONS_ERROR_CODES,
  IntegrationsError,
} from "../integrations.errors.js";
import { mapIntegrationDto } from "../integrations.mapper.js";
import { integrationsRepository } from "../integrations.repository.js";
import type { IntegrationsActor } from "../integrations.types.js";
import {
  canManageIntegrations,
  requireIntegrationAccess,
  requireRead,
} from "../integrations.access.js";

function asConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function readUsageNumber(
  config: Record<string, unknown>,
  key: string,
): number | null {
  const usage = config.usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return null;
  const value = (usage as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export class MonitoringService {
  async overview(
    actor: IntegrationsActor,
  ): Promise<IntegrationMonitoringOverviewDto> {
    requireRead(actor);
    await integrationsRepository.ensureCatalogSeeded();

    const canManage = canManageIntegrations(actor);
    const integrations = await integrationsRepository.listIntegrations({
      visibility: { role: String(actor.role), canManage },
    });
    const allowedIds = integrations.map((row) => row.id);

    const items: IntegrationLiveMonitoringDto[] = [];
    for (const row of integrations) {
      items.push(await this.buildLiveMetrics(row.id));
    }

    const healthyCount = items.filter(
      (item) => item.healthStatus === "HEALTHY",
    ).length;
    const unhealthyCount = items.filter(
      (item) =>
        item.healthStatus === "UNHEALTHY" || item.healthStatus === "DEGRADED",
    ).length;
    const uptimes = items.map((item) => item.uptimePercentage);
    const averageUptimePercentage =
      uptimes.length === 0
        ? 100
        : Math.round(
            uptimes.reduce((sum, value) => sum + value, 0) / uptimes.length,
          );
    const responseTimes = items
      .map((item) => item.responseTimeMs)
      .filter((value): value is number => value != null);
    const averageResponseTimeMs =
      responseTimes.length === 0
        ? null
        : Math.round(
            responseTimes.reduce((sum, value) => sum + value, 0) /
              responseTimes.length,
          );

    const openAlerts = await integrationsRepository.listAlertLogs({
      page: 1,
      pageSize: 1,
      acknowledged: false,
      allowedIntegrationIds: canManage ? null : allowedIds,
    });

    const queueLength = await integrationsRepository.countSyncByStatus({
      status: ["PENDING", "RUNNING"],
      allowedIntegrationIds: canManage ? null : allowedIds,
    });

    return {
      monitoredCount: items.length,
      healthyCount,
      unhealthyCount,
      averageUptimePercentage,
      averageResponseTimeMs,
      openAlertCount: openAlerts.total,
      queueLength,
      items,
    };
  }

  async forIntegration(
    idOrSlug: string,
    actor: IntegrationsActor,
  ): Promise<IntegrationLiveMonitoringDto> {
    const row = await requireIntegrationAccess(actor, idOrSlug);
    return this.buildLiveMetrics(row.id);
  }

  async buildLiveMetrics(
    integrationId: string,
  ): Promise<IntegrationLiveMonitoringDto> {
    const integration = await integrationsRepository.findById(integrationId);
    if (!integration) {
      throw new IntegrationsError(
        "Integration not found",
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }

    const dto = mapIntegrationDto(integration);
    const config = asConfig(integration.config);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const probes = await integrationsRepository.countHealthyProbes(
      integrationId,
      since,
    );
    const uptimePercentage =
      probes.total === 0
        ? integration.isConnected && integration.healthStatus === "HEALTHY"
          ? 100
          : integration.isConnected
            ? 50
            : 0
        : Math.round((probes.healthy / probes.total) * 100);

    const { success, failed } =
      await integrationsRepository.countSyncOutcomes(integrationId);
    const total = success + failed;
    const successRate =
      total === 0 ? null : Math.round((success / total) * 100);
    const failureRate =
      total === 0 ? null : Math.round((failed / total) * 100);

    const lastSuccess = await integrationsRepository.findLatestSync({
      integrationId,
      status: "SUCCESS",
    });
    const lastFailed = await integrationsRepository.findLatestSync({
      integrationId,
      status: "FAILED",
    });

    const connectedAt = integration.connectedAt;
    const connectionDurationMs =
      integration.isConnected && connectedAt
        ? Date.now() - connectedAt.getTime()
        : null;

    return {
      integrationId: integration.id,
      slug: integration.slug,
      name: integration.name,
      currentStatus: dto.status,
      healthStatus: dto.healthStatus,
      uptimePercentage,
      responseTimeMs: readUsageNumber(config, "averageResponseMs"),
      lastSuccessfulSyncAt: lastSuccess?.startedAt.toISOString() ?? null,
      lastFailedSyncAt: lastFailed?.startedAt.toISOString() ?? null,
      successRate,
      failureRate,
      activeConnection: integration.isConnected,
      connectionDurationMs,
      lastHealthCheckAt: dto.lastHealthCheckAt,
      lastError: dto.lastError,
    };
  }
}

export const monitoringService = new MonitoringService();
