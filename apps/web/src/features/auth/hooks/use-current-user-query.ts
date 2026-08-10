"use client";

import { useQuery } from "@tanstack/react-query";

import { authService } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import { AUTH_QUERY_KEYS } from "../types/auth.types";

/**
 * Current user via React Query — shares AUTH_QUERY_KEYS.me with bootstrap.
 * Always revalidates on mount so portal UI cannot keep a stale CLIENT identity
 * against a different access-token user (multi-tab / cookie swap).
 */
export function useCurrentUserQuery(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.me,
    queryFn: () => authService.getMe(),
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
