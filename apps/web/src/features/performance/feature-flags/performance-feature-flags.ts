import { parseEnvFlag } from "@/features/ai/feature-flags";

import type {
  PerformanceFeatureFlagId,
  PerformanceFeatureFlags,
} from "./performance-feature-flag.types";

/**
 * Centralized EliteFlow performance feature flags (Task 1.4).
 *
 * Uses Next.js NEXT_PUBLIC_PERFORMANCE_* env vars with static access.
 * Defaults are always OFF — existing runtime behavior unchanged.
 *
 * Rollback: set the corresponding NEXT_PUBLIC_PERFORMANCE_* var to false/unset
 * and restart the web app.
 */

export function isPerformanceEnterpriseFoundationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ENTERPRISE_FOUNDATION,
    false,
  );
}

export function isPerformanceQueryTuningEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_QUERY_TUNING,
    false,
  );
}

export function isPerformanceMemoizationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_MEMOIZATION,
    false,
  );
}

export function isPerformanceStableCallbacksEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_STABLE_CALLBACKS,
    false,
  );
}

export function isPerformanceRenderProfilingEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_RENDER_PROFILING,
    false,
  );
}

export function isPerformanceRoutePrefetchEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_ROUTE_PREFETCH,
    false,
  );
}

export function isPerformanceVirtualListsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_VIRTUAL_LISTS,
    false,
  );
}

export function isPerformanceBundleAnalyticsEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_BUNDLE_ANALYTICS,
    false,
  );
}

export function isPerformanceBundleOptimizationEnabled(): boolean {
  return parseEnvFlag(
    process.env.NEXT_PUBLIC_PERFORMANCE_BUNDLE_OPTIMIZATION,
    false,
  );
}

export function isPerformanceFeatureEnabled(
  flag: PerformanceFeatureFlagId,
): boolean {
  switch (flag) {
    case "PERFORMANCE_ENTERPRISE_FOUNDATION":
      return isPerformanceEnterpriseFoundationEnabled();
    case "PERFORMANCE_QUERY_TUNING":
      return isPerformanceQueryTuningEnabled();
    case "PERFORMANCE_MEMOIZATION":
      return isPerformanceMemoizationEnabled();
    case "PERFORMANCE_STABLE_CALLBACKS":
      return isPerformanceStableCallbacksEnabled();
    case "PERFORMANCE_RENDER_PROFILING":
      return isPerformanceRenderProfilingEnabled();
    case "PERFORMANCE_ROUTE_PREFETCH":
      return isPerformanceRoutePrefetchEnabled();
    case "PERFORMANCE_VIRTUAL_LISTS":
      return isPerformanceVirtualListsEnabled();
    case "PERFORMANCE_BUNDLE_ANALYTICS":
      return isPerformanceBundleAnalyticsEnabled();
    case "PERFORMANCE_BUNDLE_OPTIMIZATION":
      return isPerformanceBundleOptimizationEnabled();
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

export function getPerformanceFeatureFlags(): PerformanceFeatureFlags {
  return {
    PERFORMANCE_ENTERPRISE_FOUNDATION:
      isPerformanceEnterpriseFoundationEnabled(),
    PERFORMANCE_QUERY_TUNING: isPerformanceQueryTuningEnabled(),
    PERFORMANCE_MEMOIZATION: isPerformanceMemoizationEnabled(),
    PERFORMANCE_STABLE_CALLBACKS: isPerformanceStableCallbacksEnabled(),
    PERFORMANCE_RENDER_PROFILING: isPerformanceRenderProfilingEnabled(),
    PERFORMANCE_ROUTE_PREFETCH: isPerformanceRoutePrefetchEnabled(),
    PERFORMANCE_VIRTUAL_LISTS: isPerformanceVirtualListsEnabled(),
    PERFORMANCE_BUNDLE_ANALYTICS: isPerformanceBundleAnalyticsEnabled(),
    PERFORMANCE_BUNDLE_OPTIMIZATION: isPerformanceBundleOptimizationEnabled(),
  };
}
