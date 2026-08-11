"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  retentionStatus: () => [...securityKeys.all, "retention-status"] as const,
  siemStatus: () => [...securityKeys.all, "siem-status"] as const,
  backupValidationStatus: () =>
    [...securityKeys.all, "backup-validation-status"] as const,
  encryptionAuditStatus: () =>
    [...securityKeys.all, "encryption-audit-status"] as const,
  disasterRecoveryStatus: () =>
    [...securityKeys.all, "disaster-recovery-status"] as const,
  webhookSecurityStatus: () =>
    [...securityKeys.all, "webhook-security-status"] as const,
  apiVersioningStatus: () =>
    [...securityKeys.all, "api-versioning-status"] as const,
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

export function useAuditLogs(page = 1, search = "", enabled = true) {
  return useQuery({
    queryKey: securityKeys.auditLogs(page, search),
    queryFn: () =>
      securityService.auditLogs({
        page,
        pageSize: 15,
        search: search || undefined,
      }),
    enabled,
  });
}

export function useRetentionStatus(enabled = true) {
  return useQuery({
    queryKey: securityKeys.retentionStatus(),
    queryFn: () => securityService.getRetentionStatus(),
    enabled,
  });
}

export function useSiemStatus(enabled = true) {
  return useQuery({
    queryKey: securityKeys.siemStatus(),
    queryFn: () => securityService.getSiemStatus(),
    enabled,
  });
}

export function useBackupValidationStatus(enabled = true) {
  return useQuery({
    queryKey: securityKeys.backupValidationStatus(),
    queryFn: () => securityService.getBackupValidationStatus(),
    enabled,
  });
}

export function useEncryptionAuditStatus(enabled = true) {
  return useQuery({
    queryKey: securityKeys.encryptionAuditStatus(),
    queryFn: () => securityService.getEncryptionAuditStatus(),
    enabled,
  });
}

export function useDisasterRecoveryStatus(enabled = true) {
  return useQuery({
    queryKey: securityKeys.disasterRecoveryStatus(),
    queryFn: () => securityService.getDisasterRecoveryStatus(),
    enabled,
  });
}

export function useWebhookSecurityStatus(enabled = true) {
  return useQuery({
    queryKey: securityKeys.webhookSecurityStatus(),
    queryFn: () => securityService.getWebhookSecurityStatus(),
    enabled,
  });
}

export function useApiVersioningStatus(enabled = true) {
  return useQuery({
    queryKey: securityKeys.apiVersioningStatus(),
    queryFn: () => securityService.getApiVersioningStatus(),
    enabled,
  });
}

export function useSecurityOpsMutations() {
  const queryClient = useQueryClient();
  const invalidateOps = async () => {
    await queryClient.invalidateQueries({ queryKey: securityKeys.all });
  };

  return {
    verifyAuditChain: useMutation({
      mutationFn: () => securityService.verifyAuditChain(),
    }),
    exportAuditLogs: useMutation({
      mutationFn: () => securityService.exportAuditLogs(),
    }),
    runRetention: useMutation({
      mutationFn: () => securityService.runRetentionProcessor(),
      onSuccess: invalidateOps,
    }),
    testSiem: useMutation({
      mutationFn: () => securityService.testSiemConnectivity(),
      onSuccess: invalidateOps,
    }),
    runBackupValidation: useMutation({
      mutationFn: () => securityService.runBackupValidation({}),
      onSuccess: invalidateOps,
    }),
    runEncryptionAudit: useMutation({
      mutationFn: () => securityService.runEncryptionAudit(),
      onSuccess: invalidateOps,
    }),
    runDisasterRecovery: useMutation({
      mutationFn: () => securityService.runDisasterRecoveryTest(),
      onSuccess: invalidateOps,
    }),
  };
}
