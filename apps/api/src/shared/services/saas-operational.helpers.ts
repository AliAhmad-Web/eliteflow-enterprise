/**
 * Operational readiness / startup diagnostics (Phase 8 Phase 2).
 * Logs only — no route or contract changes.
 */

import {
  isApiSaasBackgroundProcessingEnabled,
  isApiSaasCapacityManagementEnabled,
  isApiSaasHealthMonitoringEnabled,
  isApiSaasObservabilityEnabled,
  isApiSaasOperationalReadinessEnabled,
  isApiSaasQueueScalingEnabled,
  isApiSaasScaleReadinessEnabled,
  isApiSaasTenantReadinessEnabled,
  isApiSaasUsageMetricsEnabled,
} from "../../config/saas-flags.js";
import { getSaasFeatureFlagDiagnostics } from "./saas-health.helpers.js";

export interface SaasOperationalDiagnostics {
  ok: boolean;
  notes: string[];
  flags: Record<string, boolean>;
}

export function collectSaasOperationalDiagnostics(): SaasOperationalDiagnostics | null {
  if (!isApiSaasOperationalReadinessEnabled()) {
    return null;
  }

  const flags = {
    SAAS_TENANT_READINESS: isApiSaasTenantReadinessEnabled(),
    SAAS_SCALE_READINESS: isApiSaasScaleReadinessEnabled(),
    SAAS_BACKGROUND_PROCESSING: isApiSaasBackgroundProcessingEnabled(),
    SAAS_QUEUE_SCALING: isApiSaasQueueScalingEnabled(),
    SAAS_OBSERVABILITY: isApiSaasObservabilityEnabled(),
    SAAS_HEALTH_MONITORING: isApiSaasHealthMonitoringEnabled(),
    SAAS_USAGE_METRICS: isApiSaasUsageMetricsEnabled(),
    SAAS_CAPACITY_MANAGEMENT: isApiSaasCapacityManagementEnabled(),
    SAAS_OPERATIONAL_READINESS: true,
  };

  const notes: string[] = [];
  if (!process.env.DATABASE_URL) {
    notes.push("DATABASE_URL missing");
  }
  if (!process.env.JWT_SECRET && !process.env.AUTH_JWT_SECRET) {
    notes.push("JWT secret env not detected (may still load from auth config)");
  }

  const diag = getSaasFeatureFlagDiagnostics(flags);
  notes.push(`saas_flags_enabled=${diag.enabledCount}`);

  return {
    ok: notes.every((n) => !n.includes("missing")),
    notes,
    flags,
  };
}

export function runSaasStartupValidation(): void {
  const diagnostics = collectSaasOperationalDiagnostics();
  if (!diagnostics) return;

  console.info(
    `[saas] operational_readiness ok=${diagnostics.ok} flags=${JSON.stringify(diagnostics.flags)}`,
  );
  for (const note of diagnostics.notes) {
    console.info(`[saas] diagnostic: ${note}`);
  }
}
