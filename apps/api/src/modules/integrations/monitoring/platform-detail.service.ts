/**
 * Phase 19.4 — Aggregated platform detail payload for the Integration detail page.
 */

import type { IntegrationPlatformDetailDto } from "@enterprise/shared";

import { alertService } from "../alerts/alert.service.js";
import type { IntegrationsActor } from "../integrations.types.js";
import { requireIntegrationAccess } from "../integrations.access.js";
import { monitoringService } from "../monitoring/monitoring.service.js";
import { queueService } from "../queue/queue.service.js";
import { schedulerService } from "../scheduler/scheduler.service.js";
import { usageAnalyticsService } from "../usage-analytics/usage-analytics.service.js";
import { webhookMonitorService } from "../webhook-monitor/webhook-monitor.service.js";

function asConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export class PlatformDetailService {
  async get(
    idOrSlug: string,
    actor: IntegrationsActor,
  ): Promise<IntegrationPlatformDetailDto> {
    const integration = await requireIntegrationAccess(actor, idOrSlug);
    const config = asConfig(integration.config);

    const [monitoring, queue, scheduler, webhooks, usage, alerts] =
      await Promise.all([
        monitoringService.buildLiveMetrics(integration.id),
        queueService.overview(actor, integration.id),
        schedulerService.get(integration.id, actor),
        webhookMonitorService.overview(actor, integration.id),
        usageAnalyticsService.forIntegration(integration.id, actor),
        alertService.list(
          {
            page: 1,
            pageSize: 20,
            integrationId: integration.id,
          },
          actor,
        ),
      ]);

    return {
      monitoring,
      queue,
      scheduler,
      webhooks,
      usage,
      alerts: alerts.items,
      configuration: {
        connectionMode:
          typeof config.connectionMode === "string"
            ? config.connectionMode
            : null,
        apiVersion:
          typeof config.apiVersion === "string" ? config.apiVersion : null,
        accountLabel:
          typeof config.accountLabel === "string" ? config.accountLabel : null,
        phase: typeof config.phase === "string" ? config.phase : null,
        architecture:
          config.architecture &&
          typeof config.architecture === "object" &&
          !Array.isArray(config.architecture)
            ? (config.architecture as Record<string, unknown>)
            : null,
      },
    };
  }
}

export const platformDetailService = new PlatformDetailService();
