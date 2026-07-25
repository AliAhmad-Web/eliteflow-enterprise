"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authService } from "../services/auth.service";
import { AUTH_QUERY_KEYS } from "../types/auth.types";

export function useRenameSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      deviceName,
    }: {
      sessionId: string;
      deviceName: string;
    }) => authService.renameSession(sessionId, deviceName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.sessions });
    },
  });
}
