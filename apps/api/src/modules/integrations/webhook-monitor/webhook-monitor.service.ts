/**
 * Phase 19.4 — Webhook monitor dashboard (aggregates WebhookEndpoint + delivery logs).
 */

import type { WebhookMonitorOverviewDto } from "@enterprise/shared";

import { mapWebhookEndpointDto } from "../integrations.mapper.js";
import { integrationsRepository } from "../integrations.repository.js";
import type { IntegrationsActor } from "../integrations.types.js";
import {
  requireIntegrationAccess,
  requireRead,
  resolveAllowedIds,
} from "../integrations.access.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export class WebhookMonitorService {
  async overview(
    actor: IntegrationsActor,
    idOrSlug?: string,
  ): Promise<WebhookMonitorOverviewDto> {
    requireRead(actor);
    let integrationId: string | undefined;
    if (idOrSlug) {
      const row = await requireIntegrationAccess(actor, idOrSlug);
      integrationId = row.id;
    }
    const allowed = await resolveAllowedIds(actor);

    const endpoints = integrationId
      ? await integrationsRepository.listWebhooks(integrationId)
      : await integrationsRepository.listAllWebhooks(allowed);

    const active = endpoints.filter((row) => row.isActive).length;
    const disabled = endpoints.length - active;

    const deliveryLogs = await integrationsRepository.listLogs({
      page: 1,
      pageSize: 200,
      integrationId,
      search: "webhook",
      allowedIntegrationIds: allowed,
    });

    let failedDeliveries = 0;
    let successfulDeliveries = 0;
    let retryCount = 0;
    let deliveryTimeSum = 0;
    let deliveryTimeSamples = 0;
    let lastDeliveryAt: string | null = null;

    for (const log of deliveryLogs.items) {
      const meta = asRecord(log.metadata);
      if (log.action === "webhook_delivery_failed" || log.level === "ERROR") {
        if (log.action.includes("webhook")) failedDeliveries += 1;
      }
      if (log.action === "webhook_delivery_success") {
        successfulDeliveries += 1;
      }
      if (typeof meta.retryCount === "number") {
        retryCount += meta.retryCount;
      }
      if (typeof meta.deliveryTimeMs === "number") {
        deliveryTimeSum += meta.deliveryTimeMs;
        deliveryTimeSamples += 1;
      }
      if (!lastDeliveryAt || log.createdAt > new Date(lastDeliveryAt)) {
        if (log.action.includes("webhook")) {
          lastDeliveryAt = log.createdAt.toISOString();
        }
      }
    }

    for (const endpoint of endpoints) {
      if (endpoint.lastDeliveryStatus === "failed") failedDeliveries += 1;
      if (endpoint.lastDeliveryStatus === "success") successfulDeliveries += 1;
      if (endpoint.lastReceivedAt) {
        const iso = endpoint.lastReceivedAt.toISOString();
        if (!lastDeliveryAt || iso > lastDeliveryAt) lastDeliveryAt = iso;
      }
    }

    return {
      totalWebhooks: endpoints.length,
      active,
      disabled,
      failedDeliveries,
      successfulDeliveries,
      retryCount,
      averageDeliveryTimeMs:
        deliveryTimeSamples === 0
          ? null
          : Math.round(deliveryTimeSum / deliveryTimeSamples),
      lastDeliveryAt,
      endpoints: endpoints.map(mapWebhookEndpointDto),
    };
  }
}

export const webhookMonitorService = new WebhookMonitorService();
