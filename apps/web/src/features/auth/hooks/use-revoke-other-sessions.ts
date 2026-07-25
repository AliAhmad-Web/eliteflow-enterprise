"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authService } from "../services/auth.service";
import { AUTH_QUERY_KEYS } from "../types/auth.types";

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.revokeOtherSessions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.sessions });
    },
  });
}
