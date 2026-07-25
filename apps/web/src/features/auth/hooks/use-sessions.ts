"use client";

import { useQuery } from "@tanstack/react-query";
import type { Session } from "@enterprise/shared";

import { authService } from "../services/auth.service";
import { AUTH_QUERY_KEYS } from "../types/auth.types";

export function useSessions() {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.sessions,
    queryFn: async (): Promise<Session[]> => {
      const data = await authService.listSessions();
      return data.sessions;
    },
  });
}
