import {
  SECURITY_API_PREFIX,
  type ActiveDeviceListResponse,
  type ChangePasswordInput,
  type ChangePasswordSecurityResponse,
  type ContactFormInput,
  type ContactFormResponse,
  type ListActiveSessionsQueryInput,
  type ListLoginHistoryQueryInput,
  type ListSecurityEventsQueryInput,
  type ListSecurityLogsQueryInput,
  type LoginHistoryListResponse,
  type PasswordHistoryListResponse,
  type PasswordStatusDto,
  type SecurityAuditLogListResponse,
  type SecurityDashboardDto,
  type SecurityEventListResponse,
  type UnlockAccountInput,
  type UnlockAccountResponse,
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
};
