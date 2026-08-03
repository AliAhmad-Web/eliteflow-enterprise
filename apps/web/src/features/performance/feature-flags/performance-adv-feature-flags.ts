import { parseEnvFlag } from "@/features/ai/feature-flags";

import type {
  PerformanceAdvFeatureFlagId,
  PerformanceAdvFeatureFlags,
} from "./performance-adv-feature-flag.types";

/**
 * Advanced EliteFlow performance feature flags (Phase 5).
 * Defaults OFF. Phase 2 wires product surfaces behind these flags.
 */

export function isPerformanceAdvEnterpriseFoundationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_ENTERPRISE_FOUNDATION,
    false,
  );
}

export function isPerformanceAdvVirtualizationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_VIRTUALIZATION,
    false,
  );
}

export function isPerformanceAdvQueryCacheEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_QUERY_CACHE,
    false,
  );
}

/** Phase 2 query optimization; also honors QUERY_CACHE. */
export function isPerformanceAdvQueryEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_PERFORMANCE_ADV_QUERY, false) ||
    isPerformanceAdvQueryCacheEnabled()
  );
}

export function isPerformanceAdvCodeSplittingEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_CODE_SPLITTING,
    false,
  );
}

export function isPerformanceAdvBundleAnalysisEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_BUNDLE_ANALYSIS,
    false,
  );
}

/** Phase 2 bundle opts; also honors CODE_SPLITTING. */
export function isPerformanceAdvBundleEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_PERFORMANCE_ADV_BUNDLE, false) ||
    isPerformanceAdvCodeSplittingEnabled()
  );
}

export function isPerformanceAdvRouteOptimizationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_ROUTE_OPTIMIZATION,
    false,
  );
}

/** Phase 2 prefetch; also honors ROUTE_OPTIMIZATION. */
export function isPerformanceAdvPrefetchEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_PERFORMANCE_ADV_PREFETCH, false) ||
    isPerformanceAdvRouteOptimizationEnabled()
  );
}

export function isPerformanceAdvImageOptimizationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_IMAGE_OPTIMIZATION,
    false,
  );
}

export function isPerformanceAdvStreamingEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_STREAMING,
    false,
  );
}

export function isPerformanceAdvProgressiveRenderEnabled(): boolean {
  return (
    parseEnvFlag(
      process.env.NEXT_PUBLIC_PERFORMANCE_ADV_PROGRESSIVE_RENDER,
      false,
    ) || isPerformanceAdvStreamingEnabled()
  );
}

export function isPerformanceAdvWebVitalsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_WEB_VITALS,
    false,
  );
}

/** Phase 2 profiling; also honors WEB_VITALS. */
export function isPerformanceAdvProfilingEnabled(): boolean {
  return (
    parseEnvFlag(process.env.NEXT_PUBLIC_PERFORMANCE_ADV_PROFILING, false) ||
    isPerformanceAdvWebVitalsEnabled()
  );
}

export function isPerformanceAdvHydrationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_HYDRATION,
    false,
  );
}

export function isPerformanceAdvScriptLoadingEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ADV_SCRIPT_LOADING,
    false,
  );
}

export function isPerformanceAdvFeatureEnabled(
  flag: PerformanceAdvFeatureFlagId,
): boolean {
  switch (flag) {
    case "PERFORMANCE_ADV_ENTERPRISE_FOUNDATION":
      return isPerformanceAdvEnterpriseFoundationEnabled();
    case "PERFORMANCE_ADV_VIRTUALIZATION":
      return isPerformanceAdvVirtualizationEnabled();
    case "PERFORMANCE_ADV_QUERY_CACHE":
      return isPerformanceAdvQueryCacheEnabled();
    case "PERFORMANCE_ADV_QUERY":
      return isPerformanceAdvQueryEnabled();
    case "PERFORMANCE_ADV_CODE_SPLITTING":
      return isPerformanceAdvCodeSplittingEnabled();
    case "PERFORMANCE_ADV_BUNDLE":
      return isPerformanceAdvBundleEnabled();
    case "PERFORMANCE_ADV_BUNDLE_ANALYSIS":
      return isPerformanceAdvBundleAnalysisEnabled();
    case "PERFORMANCE_ADV_ROUTE_OPTIMIZATION":
      return isPerformanceAdvRouteOptimizationEnabled();
    case "PERFORMANCE_ADV_PREFETCH":
      return isPerformanceAdvPrefetchEnabled();
    case "PERFORMANCE_ADV_IMAGE_OPTIMIZATION":
      return isPerformanceAdvImageOptimizationEnabled();
    case "PERFORMANCE_ADV_STREAMING":
      return isPerformanceAdvStreamingEnabled();
    case "PERFORMANCE_ADV_PROGRESSIVE_RENDER":
      return isPerformanceAdvProgressiveRenderEnabled();
    case "PERFORMANCE_ADV_WEB_VITALS":
      return isPerformanceAdvWebVitalsEnabled();
    case "PERFORMANCE_ADV_PROFILING":
      return isPerformanceAdvProfilingEnabled();
    case "PERFORMANCE_ADV_HYDRATION":
      return isPerformanceAdvHydrationEnabled();
    case "PERFORMANCE_ADV_SCRIPT_LOADING":
      return isPerformanceAdvScriptLoadingEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getPerformanceAdvFeatureFlags(): PerformanceAdvFeatureFlags {
  return {
    PERFORMANCE_ADV_ENTERPRISE_FOUNDATION:
      isPerformanceAdvEnterpriseFoundationEnabled(),
    PERFORMANCE_ADV_VIRTUALIZATION: isPerformanceAdvVirtualizationEnabled(),
    PERFORMANCE_ADV_QUERY_CACHE: isPerformanceAdvQueryCacheEnabled(),
    PERFORMANCE_ADV_QUERY: isPerformanceAdvQueryEnabled(),
    PERFORMANCE_ADV_CODE_SPLITTING: isPerformanceAdvCodeSplittingEnabled(),
    PERFORMANCE_ADV_BUNDLE: isPerformanceAdvBundleEnabled(),
    PERFORMANCE_ADV_BUNDLE_ANALYSIS: isPerformanceAdvBundleAnalysisEnabled(),
    PERFORMANCE_ADV_ROUTE_OPTIMIZATION:
      isPerformanceAdvRouteOptimizationEnabled(),
    PERFORMANCE_ADV_PREFETCH: isPerformanceAdvPrefetchEnabled(),
    PERFORMANCE_ADV_IMAGE_OPTIMIZATION:
      isPerformanceAdvImageOptimizationEnabled(),
    PERFORMANCE_ADV_STREAMING: isPerformanceAdvStreamingEnabled(),
    PERFORMANCE_ADV_PROGRESSIVE_RENDER:
      isPerformanceAdvProgressiveRenderEnabled(),
    PERFORMANCE_ADV_WEB_VITALS: isPerformanceAdvWebVitalsEnabled(),
    PERFORMANCE_ADV_PROFILING: isPerformanceAdvProfilingEnabled(),
    PERFORMANCE_ADV_HYDRATION: isPerformanceAdvHydrationEnabled(),
    PERFORMANCE_ADV_SCRIPT_LOADING: isPerformanceAdvScriptLoadingEnabled(),
  };
}
