/**
 * Health / readiness helpers (Phase 8 Phase 2).
 * Does not change GET /health JSON contract — diagnostics for logs / internal use.
 */

import { prisma } from "@enterprise/database";

import {
  isApiSaasHealthMonitoringEnabled,
  isApiSaasObservabilityEnabled,
} from "../../config/saas-flags.js";
import { getSaasUsageSnapshot } from "./saas-metrics.service.js";

export type SaasReadinessLevel = "ready" | "degraded" | "unavailable";

export interface SaasReadinessReport {
  level: SaasReadinessLevel;
  checks: Array<{ name: string; ok: boolean; detail?: string }>;
  observedAt: string;
}

export async function buildSaasReadinessReport(): Promise<SaasReadinessReport | null> {
  if (!isApiSaasHealthMonitoringEnabled()) {
    return null;
  }

  const checks: SaasReadinessReport["checks"] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "database", ok: true });
  } catch (error) {
    checks.push({
      name: "database",
      ok: false,
      detail: error instanceof Error ? error.message : "db_unreachable",
    });
  }

  checks.push({
    name: "process",
    ok: true,
    detail: `uptime_s=${Math.floor(process.uptime())}`,
  });

  const failed = checks.filter((c) => !c.ok);
  const level: SaasReadinessLevel =
    failed.length === 0
      ? "ready"
      : failed.some((c) => c.name === "database")
        ? "unavailable"
        : "degraded";

  return {
    level,
    checks,
    observedAt: new Date().toISOString(),
  };
}

export function logSaasPerformanceSummary(input: {
  method: string;
  path: string;
  status: number;
  ms: number;
}): void {
  if (!isApiSaasObservabilityEnabled()) return;
  const usage = getSaasUsageSnapshot();
  console.info(
    `[saas] request method=${input.method} path=${input.path} status=${input.status} ms=${input.ms}` +
      (usage
        ? ` requests=${usage.requests} slow=${usage.slowRequests}`
        : ""),
  );
}

export function getSaasFeatureFlagDiagnostics(flags: Record<string, boolean>): {
  enabledCount: number;
  enabled: string[];
} {
  const enabled = Object.entries(flags)
    .filter(([, on]) => on)
    .map(([id]) => id);
  return { enabledCount: enabled.length, enabled };
}
