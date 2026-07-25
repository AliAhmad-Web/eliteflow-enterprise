import type { ApiUsageSnapshot } from "./api-key-config.js";
import { emptyUsageSnapshot } from "./api-key-config.js";

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function readUsageFromConfig(
  config: Record<string, unknown>,
): ApiUsageSnapshot {
  const raw = config.usage;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyUsageSnapshot();
  }
  const row = raw as Record<string, unknown>;
  const updatedAt =
    typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString();
  const dayBucket =
    typeof row.dayBucket === "string" ? row.dayBucket : startOfTodayUtc().toISOString();
  const monthBucket =
    typeof row.monthBucket === "string"
      ? row.monthBucket
      : startOfMonthUtc().toISOString();

  let requestsToday = asNumber(row.requestsToday);
  let monthlyRequests = asNumber(row.monthlyRequests);

  if (dayBucket !== startOfTodayUtc().toISOString()) {
    requestsToday = 0;
  }
  if (monthBucket !== startOfMonthUtc().toISOString()) {
    monthlyRequests = 0;
  }

  return {
    requestsToday,
    monthlyRequests,
    remainingQuota:
      typeof row.remainingQuota === "number" ? row.remainingQuota : null,
    rateLimitPerMinute:
      typeof row.rateLimitPerMinute === "number"
        ? row.rateLimitPerMinute
        : null,
    averageResponseMs:
      typeof row.averageResponseMs === "number"
        ? row.averageResponseMs
        : null,
    updatedAt,
  };
}

export function writeUsageIntoConfig(
  config: Record<string, unknown>,
  usage: ApiUsageSnapshot,
): void {
  config.usage = {
    ...usage,
    dayBucket: startOfTodayUtc().toISOString(),
    monthBucket: startOfMonthUtc().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Increment request counters and rolling average latency. */
export function recordUsageLatency(
  usage: ApiUsageSnapshot,
  latencyMs: number,
): void {
  usage.requestsToday += 1;
  usage.monthlyRequests += 1;
  const prevAvg = usage.averageResponseMs;
  if (prevAvg == null || usage.requestsToday <= 1) {
    usage.averageResponseMs = Math.round(latencyMs);
  } else {
    usage.averageResponseMs = Math.round(
      prevAvg * 0.8 + latencyMs * 0.2,
    );
  }
  usage.updatedAt = new Date().toISOString();
}
