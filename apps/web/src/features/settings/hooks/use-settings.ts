"use client";

import type { SettingsOverviewDto } from "@enterprise/shared";
import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { settingsService } from "../services/settings.service";

export const SETTINGS_STALE_TIME_MS = 5 * 60 * 1000;
export const SETTINGS_GC_TIME_MS = 30 * 60 * 1000;

const SETTINGS_OVERVIEW_CACHE_KEY = "eliteflow-settings-overview";

export const settingsKeys = {
  all: ["settings"] as const,
  overview: () => [...settingsKeys.all, "overview"] as const,
  apiKeys: () => [...settingsKeys.all, "api-keys"] as const,
  backups: () => [...settingsKeys.all, "backups"] as const,
};

type CachedOverviewEnvelope = {
  data: SettingsOverviewDto;
  savedAt: number;
};

function readCachedOverview(): CachedOverviewEnvelope | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.sessionStorage.getItem(SETTINGS_OVERVIEW_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as
      | CachedOverviewEnvelope
      | SettingsOverviewDto;
    // Backward compatible with older bare-DTO cache.
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in parsed &&
      "savedAt" in parsed
    ) {
      return parsed as CachedOverviewEnvelope;
    }
    return {
      data: parsed as SettingsOverviewDto,
      savedAt: Date.now(),
    };
  } catch {
    return undefined;
  }
}

function writeCachedOverview(data: SettingsOverviewDto): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const envelope: CachedOverviewEnvelope = {
      data,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(
      SETTINGS_OVERVIEW_CACHE_KEY,
      JSON.stringify(envelope),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export async function fetchSettingsOverview(): Promise<SettingsOverviewDto> {
  const data = await settingsService.overview();
  writeCachedOverview(data);
  return data;
}

/** Prefetch after login so /settings opens from warm cache. */
export async function prefetchSettingsOverview(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: settingsKeys.overview(),
    queryFn: fetchSettingsOverview,
    staleTime: SETTINGS_STALE_TIME_MS,
  });
}

export function useSettingsOverview() {
  // Stabilize initialData so React Query doesn't see a new object every render.
  const [cached] = useState(() => readCachedOverview());

  return useQuery({
    queryKey: settingsKeys.overview(),
    queryFn: fetchSettingsOverview,
    staleTime: SETTINGS_STALE_TIME_MS,
    gcTime: SETTINGS_GC_TIME_MS,
    placeholderData: keepPreviousData,
    initialData: cached?.data,
    // RC#4: preserve real cache age — do not mark immediately stale.
    initialDataUpdatedAt: cached?.savedAt,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    structuralSharing: true,
  });
}

export function useSettingsApiKeys(enabled: boolean) {
  return useQuery({
    queryKey: settingsKeys.apiKeys(),
    queryFn: () => settingsService.listApiKeys(),
    enabled,
    staleTime: SETTINGS_STALE_TIME_MS,
    gcTime: SETTINGS_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    structuralSharing: true,
  });
}

export function useSettingsBackups(enabled: boolean) {
  return useQuery({
    queryKey: settingsKeys.backups(),
    queryFn: () => settingsService.listBackups(),
    enabled,
    staleTime: SETTINGS_STALE_TIME_MS,
    gcTime: SETTINGS_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    structuralSharing: true,
  });
}

export function useInvalidateSettings() {
  const queryClient = useQueryClient();
  return (scope: "all" | "overview" | "api-keys" | "backups" = "overview") => {
    switch (scope) {
      case "all":
        return queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      case "overview":
        return queryClient.invalidateQueries({
          queryKey: settingsKeys.overview(),
        });
      case "api-keys":
        return queryClient.invalidateQueries({
          queryKey: settingsKeys.apiKeys(),
        });
      case "backups":
        return queryClient.invalidateQueries({
          queryKey: settingsKeys.backups(),
        });
      default: {
        const _exhaustive: never = scope;
        return _exhaustive;
      }
    }
  };
}

export function useSettingsMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  invalidate: "all" | "overview" | "api-keys" | "backups" = "overview",
) {
  const invalidateSettings = useInvalidateSettings();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await invalidateSettings(invalidate);
    },
  });
}
