"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { billingService } from "../services/billing.service";

export const billingKeys = {
  all: ["billing"] as const,
  plans: () => [...billingKeys.all, "plans"] as const,
  subscription: () => [...billingKeys.all, "subscription"] as const,
  events: () => [...billingKeys.all, "events"] as const,
  runtime: () => [...billingKeys.all, "runtime"] as const,
};

export function useBillingPlans(enabled = true) {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: () => billingService.listPlans(),
    enabled,
  });
}

export function useBillingSubscription(enabled = true) {
  return useQuery({
    queryKey: billingKeys.subscription(),
    queryFn: () => billingService.getSubscription(),
    enabled,
  });
}

export function useBillingEvents(enabled = true) {
  return useQuery({
    queryKey: billingKeys.events(),
    queryFn: () => billingService.listEvents(),
    enabled,
  });
}

export function useBillingRuntime(enabled = true) {
  return useQuery({
    queryKey: billingKeys.runtime(),
    queryFn: () => billingService.getRuntime(),
    enabled,
  });
}

export function useBillingCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planCode: string) => billingService.createCheckout(planCode),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useBillingCancel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (atPeriodEnd?: boolean) =>
      billingService.cancel(atPeriodEnd ?? true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useBillingReactivate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => billingService.reactivate(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () => billingService.createPortalSession(),
  });
}
