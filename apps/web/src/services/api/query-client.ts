"use client";

import { keepPreviousData, QueryClient } from "@tanstack/react-query";

import { getPerformanceQueryDefaultOverlay } from "@/features/performance";
import {
  buildTenantAwarePersistStorageKey,
  getSaasCacheDefaultOverlay,
  isSaasCacheStrategyEnabled,
  isSaasTenantReadinessEnabled,
} from "@/features/saas";

const PERSIST_KEY_BASE = "eliteflow-rq-cache-v1";
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getPersistKey(): string {
  if (!isSaasTenantReadinessEnabled()) {
    return PERSIST_KEY_BASE;
  }
  return buildTenantAwarePersistStorageKey(PERSIST_KEY_BASE);
}

/**
 * Queries safe to restore across F5. Keep narrow to avoid main-thread
 * serialize cost and large localStorage writes on every cache update.
 * List/detail surfaces (files, communication, reports) refetch from RQ memory.
 */
const PERSIST_KEY_PREFIXES = [
  "auth",
  "settings",
  "dashboard",
] as const;

function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  if (typeof root !== "string") return false;
  return PERSIST_KEY_PREFIXES.some(
    (prefix) => root === prefix || root.startsWith(`${prefix}`),
  );
}

function dehydrateForPersist(client: QueryClient): string {
  const cache = client.getQueryCache().getAll();
  const entries = cache
    .filter((q) => {
      if (q.state.status !== "success") return false;
      if (!shouldPersistQuery(q.queryKey)) return false;
      return true;
    })
    .map((q) => ({
      queryKey: q.queryKey,
      state: {
        data: q.state.data,
        dataUpdatedAt: q.state.dataUpdatedAt,
        status: "success" as const,
      },
    }));

  return JSON.stringify({
    timestamp: Date.now(),
    entries,
  });
}

function hydrateFromPersist(client: QueryClient): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(getPersistKey());
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      timestamp?: number;
      entries?: Array<{
        queryKey: unknown[];
        state: { data: unknown; dataUpdatedAt: number };
      }>;
    };
    if (
      !parsed.timestamp ||
      Date.now() - parsed.timestamp > PERSIST_MAX_AGE_MS ||
      !Array.isArray(parsed.entries)
    ) {
      window.localStorage.removeItem(getPersistKey());
      return;
    }

    for (const entry of parsed.entries) {
      if (!entry?.queryKey || !shouldPersistQuery(entry.queryKey)) continue;
      client.setQueryData(entry.queryKey, entry.state.data, {
        updatedAt: entry.state.dataUpdatedAt,
      });
    }
  } catch {
    try {
      window.localStorage.removeItem(getPersistKey());
    } catch {
      // ignore
    }
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(client: QueryClient): void {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(getPersistKey(), dehydrateForPersist(client));
    } catch {
      // Quota / private mode — ignore
    }
  }, 2_500);
}

/** Shared TanStack Query defaults for enterprise production caching. */
export function createQueryClient(): QueryClient {
  const baseQueries = {
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    /**
     * Soft nav + keep-alive remount: reuse cache (RC#6).
     * Realtime/poll queries opt into refetchInterval or explicit refetchOnMount.
     */
    refetchOnMount: false as const,
    placeholderData: keepPreviousData,
    structuralSharing: true,
    networkMode: "online" as const,
  };

  const baseMutations = {
    retry: 0,
    networkMode: "online" as const,
  };

  const overlay = getPerformanceQueryDefaultOverlay();
  const saasOverlay = getSaasCacheDefaultOverlay();

  return new QueryClient({
    defaultOptions: {
      queries: {
        ...baseQueries,
        ...(overlay?.queries ?? {}),
        ...(saasOverlay?.queries ?? {}),
      },
      mutations: {
        ...baseMutations,
        ...(overlay?.mutations ?? {}),
        ...(saasOverlay?.mutations ?? {}),
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return createQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
    hydrateFromPersist(browserQueryClient);
    browserQueryClient.getQueryCache().subscribe(() => {
      schedulePersist(browserQueryClient!);
    });
  }

  return browserQueryClient;
}

export function clearPersistedQueryCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getPersistKey());
    // Also clear legacy/global key when tenant readiness remaps storage.
    if (isSaasTenantReadinessEnabled() || isSaasCacheStrategyEnabled()) {
      window.localStorage.removeItem(PERSIST_KEY_BASE);
    }
  } catch {
    // ignore
  }
}
