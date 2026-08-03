/**
 * Cache strategy helpers for React Query (Phase 8 Phase 2).
 * No Redis — client-side query key / invalidation utilities only.
 */

import type { DefaultOptions, QueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";

import { isSaasCacheStrategyEnabled } from "../feature-flags";
import {
  buildTenantQueryKeySegment,
  type SaasWebTenantContext,
} from "./tenant-context";

/** Overlay when SAAS_CACHE_STRATEGY is ON (composes with performance overlays). */
export function getSaasCacheDefaultOverlay(): Partial<DefaultOptions> | null {
  if (!isSaasCacheStrategyEnabled()) {
    return null;
  }
  return {
    queries: {
      staleTime: 8 * 60 * 1000,
      gcTime: 100 * 60 * 1000,
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

/** Stable cache key builder with optional tenant segment. */
export function buildStableQueryKey(
  root: string,
  parts: readonly unknown[] = [],
  tenant?: SaasWebTenantContext,
): readonly unknown[] {
  if (!isSaasCacheStrategyEnabled()) {
    return [root, ...parts];
  }
  return [root, buildTenantQueryKeySegment(tenant), ...parts];
}

/** Invalidate all queries under a root key (tenant-aware when flags ON). */
export function invalidateQueryRoot(
  client: QueryClient,
  root: string,
): Promise<void> {
  if (!isSaasCacheStrategyEnabled()) {
    return client.invalidateQueries({ queryKey: [root] });
  }
  return client.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === root;
    },
  });
}

export function shouldReuseCachedQuery(input: {
  dataUpdatedAt: number;
  staleTimeMs: number;
  now?: number;
}): boolean {
  if (!isSaasCacheStrategyEnabled()) {
    return false;
  }
  const now = input.now ?? Date.now();
  return now - input.dataUpdatedAt < input.staleTimeMs;
}
