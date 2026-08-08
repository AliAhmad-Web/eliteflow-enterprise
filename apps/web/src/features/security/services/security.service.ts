import {
  SECURITY_API_PREFIX,
  type ActiveDeviceListResponse,
  type ApiVersioningStatusResponse,
  type AuditChainVerifyResponse,
  type AuditExportResponse,
  type BackupValidationReportResponse,
  type BackupValidationStatusResponse,
  type ChangePasswordInput,
  type ChangePasswordSecurityResponse,
  type ContactFormInput,
  type ContactFormResponse,
  type DisasterRecoveryTestReportResponse,
  type DisasterRecoveryTestStatusResponse,
  type EncryptionAuditReportResponse,
  type EncryptionAuditStatusResponse,
  type ListActiveSessionsQueryInput,
  type ListLoginHistoryQueryInput,
  type ListSecurityEventsQueryInput,
  type ListSecurityLogsQueryInput,
  type LoginHistoryListResponse,
  type PasswordHistoryListResponse,
  type PasswordStatusDto,
  type RetentionRunReportDto,
  type RetentionStatusResponse,
  type RunBackupValidationInput,
  type SecurityAuditLogListResponse,
  type SecurityDashboardDto,
  type SecurityEventListResponse,
  type SiemStatusResponse,
  type SiemTestResponse,
  type UnlockAccountInput,
  type UnlockAccountResponse,
  type WebhookSecurityStatusResponse,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export const securityService = {
  dashboard() {
    return apiRequest<SecurityDashboardDto>(`${SECURITY_API_PREFIX}/dashboard`, {
      auth: true,
    });
  },

  passwordStatus() {
    return apiRequest<PasswordStatusDto>(
      `${SECURITY_API_PREFIX}/password-status`,
      { auth: true },
    );
  },

  passwordHistory() {
    return apiRequest<PasswordHistoryListResponse>(
      `${SECURITY_API_PREFIX}/password-history`,
      { auth: true },
    );
  },

  loginHistory(query: Partial<ListLoginHistoryQueryInput> = {}) {
    return apiRequest<LoginHistoryListResponse>(
      `${SECURITY_API_PREFIX}/login-history${toQuery({
        page: query.page,
        pageSize: query.pageSize,
        email: query.email,
        userId: query.userId,
        success: query.success,
        from: query.from,
        to: query.to,
      })}`,
      { auth: true },
    );
  },

  sessions(query: Partial<ListActiveSessionsQueryInput> = {}) {
    return apiRequest<ActiveDeviceListResponse>(
      `${SECURITY_API_PREFIX}/sessions${toQuery({
        page: query.page,
        pageSize: query.pageSize,
        userId: query.userId,
        search: query.search,
      })}`,
      { auth: true },
    );
  },

  devices(query: Partial<ListActiveSessionsQueryInput> = {}) {
    return apiRequest<ActiveDeviceListResponse>(
      `${SECURITY_API_PREFIX}/devices${toQuery({
        page: query.page,
        pageSize: query.pageSize,
        userId: query.userId,
        search: query.search,
      })}`,
      { auth: true },
    );
  },

  auditLogs(query: Partial<ListSecurityLogsQueryInput> = {}) {
    return apiRequest<SecurityAuditLogListResponse>(
      `${SECURITY_API_PREFIX}/audit-logs${toQuery({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        action: query.action,
        resource: query.resource,
        userId: query.userId,
        from: query.from,
        to: query.to,
      })}`,
      { auth: true },
    );
  },

  alerts(query: Partial<ListSecurityEventsQueryInput> = {}) {
    return apiRequest<SecurityEventListResponse>(
      `${SECURITY_API_PREFIX}/alerts${toQuery({
        page: query.page,
        pageSize: query.pageSize,
        severity: query.severity,
        category: query.category,
        unresolvedOnly:
          query.unresolvedOnly === undefined
            ? undefined
            : query.unresolvedOnly,
        userId: query.userId,
      })}`,
      { auth: true },
    );
  },

  terminateSession(sessionId: string) {
    return apiRequest<{ message: string }>(
      `${SECURITY_API_PREFIX}/sessions/${sessionId}`,
      { method: "DELETE", auth: true },
    );
  },

  changePassword(input: ChangePasswordInput) {
    return apiRequest<ChangePasswordSecurityResponse>(
      `${SECURITY_API_PREFIX}/password/change`,
      { method: "POST", body: input, auth: true },
    );
  },

  unlockAccount(input: UnlockAccountInput) {
    return apiRequest<UnlockAccountResponse>(
      `${SECURITY_API_PREFIX}/accounts/unlock`,
      { method: "POST", body: input, auth: true },
    );
  },

  resolveAlert(eventId: string) {
    return apiRequest<{ message: string }>(
      `${SECURITY_API_PREFIX}/alerts/${eventId}/resolve`,
      { method: "POST", auth: true },
    );
  },

  submitContact(input: ContactFormInput) {
    return apiRequest<ContactFormResponse>(`${SECURITY_API_PREFIX}/contact`, {
      method: "POST",
      body: input,
    });
  },

  csrfToken() {
    return apiRequest<{ csrfToken: string }>(
      `${SECURITY_API_PREFIX}/csrf-token`,
    );
  },

  /** Admin / Super Admin — audit integrity */
  verifyAuditChain() {
    return apiRequest<AuditChainVerifyResponse>(
      `${SECURITY_API_PREFIX}/audit/verify`,
      { auth: true },
    );
  },

  exportAuditLogs() {
    return apiRequest<AuditExportResponse>(
      `${SECURITY_API_PREFIX}/audit/export`,
      { auth: true },
    );
  },

  getRetentionStatus() {
    return apiRequest<RetentionStatusResponse>(
      `${SECURITY_API_PREFIX}/retention/status`,
      { auth: true },
    );
  },

  runRetentionProcessor() {
    return apiRequest<RetentionRunReportDto>(
      `${SECURITY_API_PREFIX}/retention/run`,
      {
        method: "POST",
        auth: true,
        body: {},
      },
    );
  },

  getSiemStatus() {
    return apiRequest<SiemStatusResponse>(`${SECURITY_API_PREFIX}/siem/status`, {
      auth: true,
    });
  },

  testSiemConnectivity() {
    return apiRequest<SiemTestResponse>(`${SECURITY_API_PREFIX}/siem/test`, {
      method: "POST",
      auth: true,
      body: {},
    });
  },

  getBackupValidationStatus() {
    return apiRequest<BackupValidationStatusResponse>(
      `${SECURITY_API_PREFIX}/backup-validation/status`,
      { auth: true },
    );
  },

  runBackupValidation(input: Partial<RunBackupValidationInput> = {}) {
    return apiRequest<BackupValidationReportResponse>(
      `${SECURITY_API_PREFIX}/backup-validation/run`,
      { method: "POST", auth: true, body: input },
    );
  },

  getEncryptionAuditStatus() {
    return apiRequest<EncryptionAuditStatusResponse>(
      `${SECURITY_API_PREFIX}/encryption-audit/status`,
      { auth: true },
    );
  },

  runEncryptionAudit() {
    return apiRequest<EncryptionAuditReportResponse>(
      `${SECURITY_API_PREFIX}/encryption-audit/run`,
      { method: "POST", auth: true, body: {} },
    );
  },

  getDisasterRecoveryStatus() {
    return apiRequest<DisasterRecoveryTestStatusResponse>(
      `${SECURITY_API_PREFIX}/disaster-recovery/status`,
      { auth: true },
    );
  },

  runDisasterRecoveryTest() {
    return apiRequest<DisasterRecoveryTestReportResponse>(
      `${SECURITY_API_PREFIX}/disaster-recovery/run`,
      { method: "POST", auth: true, body: {} },
    );
  },

  getWebhookSecurityStatus() {
    return apiRequest<WebhookSecurityStatusResponse>(
      `${SECURITY_API_PREFIX}/webhooks/status`,
      { auth: true },
    );
  },

  getApiVersioningStatus() {
    return apiRequest<ApiVersioningStatusResponse>(
      `${SECURITY_API_PREFIX}/api-versioning/status`,
      { auth: true },
    );
  },
};
