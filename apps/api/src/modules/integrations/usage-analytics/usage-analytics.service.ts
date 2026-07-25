/**
 * Phase 19.4 — API usage analytics from Integration.config.usage + request logs.
 */

import type { ChartPoint, IntegrationUsageAnalyticsDto } from "@enterprise/shared";

import { integrationsRepository } from "../integrations.repository.js";
import type { IntegrationsActor } from "../integrations.types.js";
import { requireIntegrationAccess } from "../integrations.access.js";

type LogPoint = {
  createdAt: Date;
  level: string;
  action: string;
  metadata: unknown;
};

function asConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function lastNDays(n: number): string[] {
  const labels: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    labels.push(d.toISOString().slice(0, 10));
  }
  return labels;
}

function buildSeriesFromLogs(
  logs: LogPoint[],
  labels: string[],
  predicate: (log: LogPoint) => boolean,
): ChartPoint[] {
  const counts = new Map(labels.map((label) => [label, 0]));
  for (const log of logs) {
    if (!predicate(log)) continue;
    const key = log.createdAt.toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return labels.map((label) => ({ label, value: counts.get(label) ?? 0 }));
}

function buildResponseSeries(logs: LogPoint[], labels: string[]): ChartPoint[] {
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const label of labels) buckets.set(label, { sum: 0, count: 0 });
  for (const log of logs) {
    const key = log.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const meta =
      log.metadata &&
      typeof log.metadata === "object" &&
      !Array.isArray(log.metadata)
        ? (log.metadata as Record<string, unknown>)
        : {};
    const latency =
      typeof meta.latencyMs === "number"
        ? meta.latencyMs
        : typeof meta.deliveryTimeMs === "number"
          ? meta.deliveryTimeMs
          : null;
    if (latency == null) continue;
    bucket.sum += latency;
    bucket.count += 1;
  }
  return labels.map((label) => {
    const bucket = buckets.get(label)!;
    return {
      label,
      value: bucket.count === 0 ? 0 : Math.round(bucket.sum / bucket.count),
    };
  });
}

function isRequestLog(log: LogPoint): boolean {
  return (
    log.action === "ai_request" ||
    log.action === "health_check" ||
    log.action === "sync_queued" ||
    log.action.includes("request")
  );
}

export class UsageAnalyticsService {
  async forIntegration(
    idOrSlug: string,
    actor: IntegrationsActor,
  ): Promise<IntegrationUsageAnalyticsDto> {
    const integration = await requireIntegrationAccess(actor, idOrSlug);
    const config = asConfig(integration.config);
    const usage = asConfig(config.usage);

    const dayLabels = lastNDays(14);
    const weekLabels = lastNDays(7);
    const monthLabels = lastNDays(30);

    const { items: logs } = await integrationsRepository.listLogs({
      page: 1,
      pageSize: 300,
      integrationId: integration.id,
    });

    const normalized: LogPoint[] = logs.map((log) => ({
      createdAt: log.createdAt,
      level: String(log.level),
      action: log.action,
      metadata: log.metadata as unknown,
    }));

    const requestsToday =
      typeof usage.requestsToday === "number" ? usage.requestsToday : 0;
    const monthlyRequests =
      typeof usage.monthlyRequests === "number" ? usage.monthlyRequests : 0;
    const remainingQuota =
      typeof usage.remainingQuota === "number" ? usage.remainingQuota : null;
    const rateLimitPerMinute =
      typeof usage.rateLimitPerMinute === "number"
        ? usage.rateLimitPerMinute
        : null;
    const averageResponseMs =
      typeof usage.averageResponseMs === "number"
        ? usage.averageResponseMs
        : null;

    const rateLimitUsagePercent =
      rateLimitPerMinute && rateLimitPerMinute > 0
        ? Math.min(
            100,
            Math.round((requestsToday / (rateLimitPerMinute * 60 * 24)) * 100),
          )
        : null;

    const dailyFromLogs = buildSeriesFromLogs(
      normalized,
      dayLabels,
      isRequestLog,
    );

    return {
      requestsToday,
      monthlyRequests,
      remainingQuota,
      rateLimitPerMinute,
      averageResponseMs,
      rateLimitUsagePercent,
      dailyRequests: dailyFromLogs,
      weeklyRequests: buildSeriesFromLogs(normalized, weekLabels, isRequestLog),
      monthlyRequestsSeries: buildSeriesFromLogs(
        normalized,
        monthLabels,
        isRequestLog,
      ),
      successRequests: buildSeriesFromLogs(
        normalized,
        dayLabels,
        (log) => isRequestLog(log) && log.level !== "ERROR",
      ),
      failedRequests: buildSeriesFromLogs(
        normalized,
        dayLabels,
        (log) => isRequestLog(log) && log.level === "ERROR",
      ),
      averageResponseTimeSeries: buildResponseSeries(normalized, dayLabels),
    };
  }
}

export const usageAnalyticsService = new UsageAnalyticsService();
