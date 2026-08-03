import { parseEnvFlag } from "@/features/ai/feature-flags";

import type {
  SaasFeatureFlagId,
  SaasFeatureFlags,
} from "./saas-feature-flag.types";

/**
 * EliteFlow Enterprise SaaS Scaling flags (Phase 8).
 * Defaults OFF. Phase 1 declares only; Phase 2 may wire readiness helpers behind these flags.
 */

export function isSaasEnterpriseFoundationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SAAS_ENTERPRISE_FOUNDATION,
    false,
  );
}

export function isSaasTenantReadinessEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SAAS_TENANT_READINESS, false);
}

export function isSaasScaleReadinessEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SAAS_SCALE_READINESS, false);
}

export function isSaasCacheStrategyEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SAAS_CACHE_STRATEGY, false);
}

export function isSaasBackgroundProcessingEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SAAS_BACKGROUND_PROCESSING,
    false,
  );
}

export function isSaasQueueScalingEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SAAS_QUEUE_SCALING, false);
}

export function isSaasObservabilityEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SAAS_OBSERVABILITY, false);
}

export function isSaasHealthMonitoringEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SAAS_HEALTH_MONITORING, false);
}

export function isSaasUsageMetricsEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_SAAS_USAGE_METRICS, false);
}

export function isSaasCapacityManagementEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SAAS_CAPACITY_MANAGEMENT,
    false,
  );
}

export function isSaasOperationalReadinessEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_SAAS_OPERATIONAL_READINESS,
    false,
  );
}

/** True when any operational / monitoring SaaS flag is ON. */
export function isSaasOperationsPresentationEnabled(): boolean {
  return (
    isSaasObservabilityEnabled() ||
    isSaasHealthMonitoringEnabled() ||
    isSaasUsageMetricsEnabled() ||
    isSaasCapacityManagementEnabled() ||
    isSaasOperationalReadinessEnabled()
  );
}

/** True when any scale / processing SaaS flag is ON. */
export function isSaasScalePresentationEnabled(): boolean {
  return (
    isSaasScaleReadinessEnabled() ||
    isSaasCacheStrategyEnabled() ||
    isSaasBackgroundProcessingEnabled() ||
    isSaasQueueScalingEnabled()
  );
}

export function isSaasFeatureEnabled(flag: SaasFeatureFlagId): boolean {
  switch (flag) {
    case "SAAS_ENTERPRISE_FOUNDATION":
      return isSaasEnterpriseFoundationEnabled();
    case "SAAS_TENANT_READINESS":
      return isSaasTenantReadinessEnabled();
    case "SAAS_SCALE_READINESS":
      return isSaasScaleReadinessEnabled();
    case "SAAS_CACHE_STRATEGY":
      return isSaasCacheStrategyEnabled();
    case "SAAS_BACKGROUND_PROCESSING":
      return isSaasBackgroundProcessingEnabled();
    case "SAAS_QUEUE_SCALING":
      return isSaasQueueScalingEnabled();
    case "SAAS_OBSERVABILITY":
      return isSaasObservabilityEnabled();
    case "SAAS_HEALTH_MONITORING":
      return isSaasHealthMonitoringEnabled();
    case "SAAS_USAGE_METRICS":
      return isSaasUsageMetricsEnabled();
    case "SAAS_CAPACITY_MANAGEMENT":
      return isSaasCapacityManagementEnabled();
    case "SAAS_OPERATIONAL_READINESS":
      return isSaasOperationalReadinessEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getSaasFeatureFlags(): SaasFeatureFlags {
  return {
    SAAS_ENTERPRISE_FOUNDATION: isSaasEnterpriseFoundationEnabled(),
    SAAS_TENANT_READINESS: isSaasTenantReadinessEnabled(),
    SAAS_SCALE_READINESS: isSaasScaleReadinessEnabled(),
    SAAS_CACHE_STRATEGY: isSaasCacheStrategyEnabled(),
    SAAS_BACKGROUND_PROCESSING: isSaasBackgroundProcessingEnabled(),
    SAAS_QUEUE_SCALING: isSaasQueueScalingEnabled(),
    SAAS_OBSERVABILITY: isSaasObservabilityEnabled(),
    SAAS_HEALTH_MONITORING: isSaasHealthMonitoringEnabled(),
    SAAS_USAGE_METRICS: isSaasUsageMetricsEnabled(),
    SAAS_CAPACITY_MANAGEMENT: isSaasCapacityManagementEnabled(),
    SAAS_OPERATIONAL_READINESS: isSaasOperationalReadinessEnabled(),
  };
}
