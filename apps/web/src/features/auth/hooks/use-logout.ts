"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clearPersistedQueryCache } from "@/services/api/query-client";

import { authService } from "../services/auth.service";
import { AUTH_QUERY_KEYS } from "../types/auth.types";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authService.logout();
    },
    onSettled: () => {
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.me });
      queryClient.clear();
      clearPersistedQueryCache();
    },
  });
}
