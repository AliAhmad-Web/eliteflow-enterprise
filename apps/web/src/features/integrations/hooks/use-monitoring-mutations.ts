"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ManualSyncInput,
  UpdateSchedulerConfigInput,
} from "@enterprise/shared";

import { integrationsService } from "../services/integrations.service";
import { integrationsKeys } from "./use-integrations";

export function useManualSync(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: ManualSyncInput) =>
      integrationsService.manualSync(slug, body ?? { direction: "inbound" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}

export function useRetrySync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => integrationsService.retrySync(jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}

export function useCancelSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => integrationsService.cancelSync(jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}

export function useUpdateScheduler(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSchedulerConfigInput) =>
      integrationsService.updateScheduler(slug, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) =>
      integrationsService.acknowledgeAlert(alertId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}

export function useEvaluateAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsService.evaluateAlerts(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}
