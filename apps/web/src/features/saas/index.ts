export type { SaasFeatureFlagId, SaasFeatureFlags } from "./feature-flags";
export {
  SAAS_FEATURE_FLAG_IDS,
  getSaasFeatureFlags,
  isSaasBackgroundProcessingEnabled,
  isSaasCacheStrategyEnabled,
  isSaasCapacityManagementEnabled,
  isSaasEnterpriseFoundationEnabled,
  isSaasFeatureEnabled,
  isSaasHealthMonitoringEnabled,
  isSaasObservabilityEnabled,
  isSaasOperationalReadinessEnabled,
  isSaasOperationsPresentationEnabled,
  isSaasQueueScalingEnabled,
  isSaasScalePresentationEnabled,
  isSaasScaleReadinessEnabled,
  isSaasTenantReadinessEnabled,
  isSaasUsageMetricsEnabled,
} from "./feature-flags";
export {
  buildStableQueryKey,
  getSaasCacheDefaultOverlay,
  invalidateQueryRoot,
  shouldReuseCachedQuery,
} from "./utils/cache-strategy";
export {
  getSaasFlagDiagnostics,
  logSaasWebDiagnostics,
} from "./utils/observability";
export {
  batchItems,
  createLazySingleton,
  createSharedResourceMap,
  mapWithConcurrency,
} from "./utils/scale-readiness";
export {
  SAAS_DEFAULT_ORGANIZATION_KEY,
  SAAS_DEFAULT_WORKSPACE_ID,
  buildTenantAwarePersistStorageKey,
  buildTenantQueryKeySegment,
  composeTenantSafeQueryParams,
  resolveWebTenantContext,
} from "./utils/tenant-context";
export type { SaasWebTenantContext } from "./utils/tenant-context";
