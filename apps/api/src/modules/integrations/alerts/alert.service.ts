/**
 * Phase 19.4 — Alerts stored as IntegrationLog rows (action: alert.*).
 * Avoids duplicate alert tables.
 */

import type {
  IntegrationAlertDto,
  IntegrationAlertListResponse,
  IntegrationAlertSeverityValue,
  IntegrationAlertTypeValue,
  ListIntegrationAlertsQueryInput,
} from "@enterprise/shared";

import {
  INTEGRATIONS_ERROR_CODES,
  IntegrationsError,
} from "../integrations.errors.js";
import { integrationsRepository } from "../integrations.repository.js";
import type { IntegrationsActor } from "../integrations.types.js";
import {
  canManageIntegrations,
  requireManage,
  requireRead,
  resolveAllowedIds,
} from "../integrations.access.js";

const HIGH_RESPONSE_MS = 3000;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapAlertDto(row: {
  id: string;
  integrationId: string;
  action: string;
  message: string;
  metadata: unknown;
  createdAt: Date;
  integration?: { name: string; slug?: string } | null;
}): IntegrationAlertDto {
  const meta = asRecord(row.metadata);
  const type = (row.action.replace(/^alert\./, "") ||
    "sync_failed") as IntegrationAlertTypeValue;
  const severity =
    (typeof meta.severity === "string"
      ? meta.severity
      : "warning") as IntegrationAlertSeverityValue;

  return {
    id: row.id,
    integrationId: row.integrationId,
    integrationName: row.integration?.name ?? null,
    integrationSlug: row.integration?.slug ?? null,
    type,
    severity,
    title:
      typeof meta.title === "string" ? meta.title : type.replaceAll("_", " "),
    message: row.message,
    acknowledged: meta.acknowledged === true,
    acknowledgedAt:
      typeof meta.acknowledgedAt === "string" ? meta.acknowledgedAt : null,
    createdAt: row.createdAt.toISOString(),
    metadata: meta,
  };
}

export class AlertService {
  async raise(input: {
    integrationId: string;
    type: IntegrationAlertTypeValue;
    severity: IntegrationAlertSeverityValue;
    title: string;
    message: string;
    userId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return integrationsRepository.createLog({
      integrationId: input.integrationId,
      level:
        input.severity === "critical"
          ? "ERROR"
          : input.severity === "warning"
            ? "WARNING"
            : "INFO",
      action: `alert.${input.type}`,
      message: input.message.slice(0, 1000),
      metadata: {
        phase: "19.4",
        title: input.title,
        severity: input.severity,
        acknowledged: false,
        ...(input.metadata ?? {}),
      },
      userId: input.userId ?? null,
    });
  }

  async list(
    query: ListIntegrationAlertsQueryInput,
    actor: IntegrationsActor,
  ): Promise<IntegrationAlertListResponse> {
    requireRead(actor);
    const allowed = await resolveAllowedIds(actor);
    const { items, total } = await integrationsRepository.listAlertLogs({
      page: query.page,
      pageSize: query.pageSize,
      integrationId: query.integrationId,
      alertType: query.type,
      acknowledged:
        query.acknowledged === undefined
          ? undefined
          : query.acknowledged === "true",
      allowedIntegrationIds: allowed,
    });

    return {
      items: items.map(mapAlertDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async acknowledge(alertId: string, actor: IntegrationsActor) {
    requireManage(actor);
    const row = await integrationsRepository.findLogById(alertId);
    if (!row || !row.action.startsWith("alert.")) {
      throw new IntegrationsError(
        "Alert not found",
        404,
        INTEGRATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    const meta = asRecord(row.metadata);
    const updated = await integrationsRepository.updateLogMetadata(alertId, {
      ...meta,
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: actor.userId,
    });
    return mapAlertDto(updated);
  }

  /**
   * Evaluate live conditions and raise alerts (idempotent per recent window).
   */
  async evaluateIntegration(integrationId: string, userId?: string | null) {
    const integration = await integrationsRepository.findById(integrationId);
    if (!integration) return [];

    const raised: IntegrationAlertDto[] = [];
    const config = asRecord(integration.config);
    const usage = asRecord(config.usage);

    if (
      integration.isConnected &&
      (integration.healthStatus === "UNHEALTHY" ||
        integration.status === "ERROR")
    ) {
      const log = await this.raise({
        integrationId,
        type: "integration_offline",
        severity: "critical",
        title: "Integration Offline",
        message:
          integration.healthMessage ||
          `${integration.name} is offline or unhealthy.`,
        userId,
      });
      raised.push(mapAlertDto(log));
    }

    const avgMs =
      typeof usage.averageResponseMs === "number"
        ? usage.averageResponseMs
        : null;
    if (avgMs != null && avgMs >= HIGH_RESPONSE_MS) {
      const log = await this.raise({
        integrationId,
        type: "high_response_time",
        severity: "warning",
        title: "High Response Time",
        message: `Average response time is ${avgMs}ms.`,
        userId,
        metadata: { averageResponseMs: avgMs },
      });
      raised.push(mapAlertDto(log));
    }

    const remaining =
      typeof usage.remainingQuota === "number" ? usage.remainingQuota : null;
    if (remaining != null && remaining <= 0) {
      const log = await this.raise({
        integrationId,
        type: "api_limit_reached",
        severity: "critical",
        title: "API Limit Reached",
        message: "Remaining API quota is exhausted.",
        userId,
      });
      raised.push(mapAlertDto(log));
    }

    const tokenExpiresAt =
      typeof config.tokenExpiresAt === "string" ? config.tokenExpiresAt : null;
    if (tokenExpiresAt && new Date(tokenExpiresAt).getTime() <= Date.now()) {
      const log = await this.raise({
        integrationId,
        type: "token_expired",
        severity: "critical",
        title: "Token Expired",
        message: "OAuth access token has expired.",
        userId,
      });
      raised.push(mapAlertDto(log));
    }

    if (config.lastError && String(config.lastError).toLowerCase().includes("auth")) {
      const log = await this.raise({
        integrationId,
        type: "authentication_expired",
        severity: "critical",
        title: "Authentication Expired",
        message: String(config.lastError),
        userId,
      });
      raised.push(mapAlertDto(log));
    }

    return raised;
  }

  async evaluateVisible(actor: IntegrationsActor) {
    requireManage(actor);
    const canManage = canManageIntegrations(actor);
    const integrations = await integrationsRepository.listIntegrations({
      visibility: { role: String(actor.role), canManage },
    });
    const all: IntegrationAlertDto[] = [];
    for (const row of integrations) {
      all.push(...(await this.evaluateIntegration(row.id, actor.userId)));
    }
    return all;
  }
}

export const alertService = new AlertService();
