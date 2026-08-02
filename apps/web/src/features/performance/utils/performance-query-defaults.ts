import type { DefaultOptions } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";

import { isPerformanceQueryTuningEnabled } from "../feature-flags";

/**
 * When PERFORMANCE_QUERY_TUNING is ON → longer list stale/gc (still no focus refetch).
 * Conservative: same refetch semantics as baseline, fewer network hits for CRM/AI lists.
 */
export function getPerformanceQueryDefaultOverlay(): Partial<DefaultOptions> | null {
  if (!isPerformanceQueryTuningEnabled()) {
    return null;
  }

  return {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 90 * 60 * 1000,
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

/** Per-query staleTime when tuning is ON (non-critical list/detail reads). */
export function getPerformanceListStaleTimeMs(): number | undefined {
  return isPerformanceQueryTuningEnabled() ? 10 * 60 * 1000 : undefined;
}
