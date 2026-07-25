"use client";

import { useQuery } from "@tanstack/react-query";

import { securityService } from "../services/security.service";

export const securityKeys = {
  all: ["security"] as const,
  dashboard: () => [...securityKeys.all, "dashboard"] as const,
  passwordStatus: () => [...securityKeys.all, "password-status"] as const,
  passwordHistory: () => [...securityKeys.all, "password-history"] as const,
  loginHistory: (page: number) =>
    [...securityKeys.all, "login-history", page] as const,
  sessions: (page: number) => [...securityKeys.all, "sessions", page] as const,
  alerts: (page: number) => [...securityKeys.all, "alerts", page] as const,
  auditLogs: (page: number, search: string) =>
    [...securityKeys.all, "audit-logs", page, search] as const,
};

export function useSecurityDashboard() {
  return useQuery({
    queryKey: securityKeys.dashboard(),
    queryFn: () => securityService.dashboard(),
  });
}

export function usePasswordStatus() {
  return useQuery({
    queryKey: securityKeys.passwordStatus(),
    queryFn: () => securityService.passwordStatus(),
  });
}

export function useLoginHistory(page = 1) {
  return useQuery({
    queryKey: securityKeys.loginHistory(page),
    queryFn: () => securityService.loginHistory({ page, pageSize: 10 }),
  });
}

export function useSecuritySessions(page = 1) {
  return useQuery({
    queryKey: securityKeys.sessions(page),
    queryFn: () => securityService.sessions({ page, pageSize: 10 }),
  });
}

export function useSecurityAlerts(page = 1) {
  return useQuery({
    queryKey: securityKeys.alerts(page),
    queryFn: () =>
      securityService.alerts({
        page,
        pageSize: 10,
        unresolvedOnly: "true",
      }),
  });
}

export function useAuditLogs(page = 1, search = "") {
  return useQuery({
    queryKey: securityKeys.auditLogs(page, search),
    queryFn: () =>
      securityService.auditLogs({
        page,
        pageSize: 15,
        search: search || undefined,
      }),
  });
}
