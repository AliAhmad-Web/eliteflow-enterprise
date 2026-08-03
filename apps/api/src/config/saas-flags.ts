/**
 * API-side SaaS scaling feature flags (Phase 8 Phase 2).
 * Reads SAAS_* and NEXT_PUBLIC_SAAS_* (defaults OFF).
 */

function parseEnvFlag(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

function flag(...keys: string[]): boolean {
  for (const key of keys) {
    if (parseEnvFlag(process.env[key], false)) return true;
  }
  return false;
}

export function isApiSaasTenantReadinessEnabled(): boolean {
  return flag(
    "SAAS_TENANT_READINESS",
    "NEXT_PUBLIC_SAAS_TENANT_READINESS",
  );
}

export function isApiSaasScaleReadinessEnabled(): boolean {
  return flag("SAAS_SCALE_READINESS", "NEXT_PUBLIC_SAAS_SCALE_READINESS");
}

export function isApiSaasBackgroundProcessingEnabled(): boolean {
  return flag(
    "SAAS_BACKGROUND_PROCESSING",
    "NEXT_PUBLIC_SAAS_BACKGROUND_PROCESSING",
  );
}

export function isApiSaasQueueScalingEnabled(): boolean {
  return flag("SAAS_QUEUE_SCALING", "NEXT_PUBLIC_SAAS_QUEUE_SCALING");
}

export function isApiSaasObservabilityEnabled(): boolean {
  return flag("SAAS_OBSERVABILITY", "NEXT_PUBLIC_SAAS_OBSERVABILITY");
}

export function isApiSaasHealthMonitoringEnabled(): boolean {
  return flag(
    "SAAS_HEALTH_MONITORING",
    "NEXT_PUBLIC_SAAS_HEALTH_MONITORING",
  );
}

export function isApiSaasUsageMetricsEnabled(): boolean {
  return flag("SAAS_USAGE_METRICS", "NEXT_PUBLIC_SAAS_USAGE_METRICS");
}

export function isApiSaasCapacityManagementEnabled(): boolean {
  return flag(
    "SAAS_CAPACITY_MANAGEMENT",
    "NEXT_PUBLIC_SAAS_CAPACITY_MANAGEMENT",
  );
}

export function isApiSaasOperationalReadinessEnabled(): boolean {
  return flag(
    "SAAS_OPERATIONAL_READINESS",
    "NEXT_PUBLIC_SAAS_OPERATIONAL_READINESS",
  );
}
