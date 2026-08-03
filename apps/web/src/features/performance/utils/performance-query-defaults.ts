import type { DefaultOptions } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";

import {
  isPerformanceAdvQueryEnabled,
  isPerformanceQueryTuningEnabled,
} from "../feature-flags";

/**
 * When PERFORMANCE_QUERY_TUNING is ON → longer list stale/gc (Task 1.4).
 * When PERFORMANCE_ADV_QUERY is ON → slightly longer still (Phase 5), without replacing RQ.
 * Both OFF → null (baseline QueryClient defaults).
 */
export function getPerformanceQueryDefaultOverlay(): Partial<DefaultOptions> | null {
  const adv = isPerformanceAdvQueryEnabled();
  const basic = isPerformanceQueryTuningEnabled();
  if (!adv && !basic) {
    return null;
  }

  const staleTime = adv ? 15 * 60 * 1000 : 10 * 60 * 1000;
  const gcTime = adv ? 120 * 60 * 1000 : 90 * 60 * 1000;

  return {
    queries: {
      staleTime,
      gcTime,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
      structuralSharing: true,
      networkMode: "online",
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  };
}

/** Per-query staleTime when tuning / ADV query is ON (non-critical list/detail reads). */
export function getPerformanceListStaleTimeMs(): number | undefined {
  if (isPerformanceAdvQueryEnabled()) return 15 * 60 * 1000;
  if (isPerformanceQueryTuningEnabled()) return 10 * 60 * 1000;
  return undefined;
}
