import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

/**
 * Offline-ready QueryClient.
 * Persistence hydrates cached lists/details on cold start.
 * Full offline sync (queue/mutations) is deferred to M3.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000, // keep for persistence window
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "eliteflow-mobile-rq-cache",
  throttleTime: 1000,
});

/** Persist only read-model queries — never auth tokens or mutations. */
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = String(queryKey[0] ?? "");
  if (root === "auth") return false;
  return [
    "clients",
    "projects",
    "tasks",
    "calendar",
    "notifications",
    "reports",
    "search",
    "ai",
    "communication",
    "files",
  ].includes(root);
}
