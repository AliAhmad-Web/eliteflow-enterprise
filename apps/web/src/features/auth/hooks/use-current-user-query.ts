"use client";

import { useQuery } from "@tanstack/react-query";

import { authService } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import { AUTH_QUERY_KEYS } from "../types/auth.types";
import { readCachedAuthUser } from "../utils/auth-session-cache";

/**
 * Current user via React Query — shares AUTH_QUERY_KEYS.me with bootstrap.
 * Instant from localStorage/store seed; background refresh only.
 */
export function useCurrentUserQuery(enabled = true) {
  const storeUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cached = readCachedAuthUser();

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.me,
    queryFn: () => authService.getMe(),
    enabled: enabled && isAuthenticated,
    initialData: storeUser ?? cached ?? undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
