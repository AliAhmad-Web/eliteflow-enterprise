"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChangePasswordInput, UnlockAccountInput } from "@enterprise/shared";

import { securityService } from "../services/security.service";
import { securityKeys } from "./use-security";

export function useTerminateSecuritySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      securityService.terminateSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: securityKeys.all });
    },
  });
}

export function useChangePasswordSecurity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      securityService.changePassword(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: securityKeys.all });
    },
  });
}

export function useUnlockAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UnlockAccountInput) =>
      securityService.unlockAccount(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: securityKeys.all });
    },
  });
}

export function useResolveSecurityAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => securityService.resolveAlert(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: securityKeys.all });
    },
  });
}
