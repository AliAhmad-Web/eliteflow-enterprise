import type {
  ActiveDeviceDto,
  AuditChainVerifyResponse,
  AuditExportResponse,
  BcdrRecoveryModeResponse,
  BcdrRecoveryTestResponse,
  BcdrServicesResponse,
  BcdrStatusResponse,
  ComplianceAssessmentResponse,
  ComplianceControlsResponse,
  ComplianceFrameworksResponse,
  ComplianceStatusResponse,
  LoginHistoryDto,
  PasswordHistoryItemDto,
  PasswordStatusDto,
  RetentionPoliciesResponse,
  RetentionPolicyDto,
  RetentionRunReportDto,
  RetentionStatusResponse,
  SecurityAuditLogDto,
  SecurityDashboardDto,
  SecurityEventDto,
  SecurityIncidentDto,
  SecurityScoreDto,
  SiemConfigResponse,
  SiemExportResponse,
  SiemIntegrationDashboard,
  SiemRetryResponse,
  SiemStatusResponse,
  SiemTestResponse,
  BackupValidationStatusResponse,
  BackupValidationReportResponse,
  BackupValidationHistoryResponse,
  BackupValidationDashboard,
  EncryptionAuditStatusResponse,
  EncryptionAuditReportResponse,
  EncryptionAuditHistoryResponse,
  EncryptionAuditDashboard,
  DisasterRecoveryTestStatusResponse,
  DisasterRecoveryTestReportResponse,
  DisasterRecoveryTestHistoryResponse,
  DisasterRecoveryTestDashboard,
  PenetrationTestStatusResponse,
  PenetrationTestReportResponse,
  PenetrationTestHistoryResponse,
  PenetrationTestDashboard,
  ThreatMonitoringDashboard,
  ZeroTrustPoliciesResponse,
  ZeroTrustStatusResponse,
} from "../schemas/security.schema.js";

export type {
  ActiveDeviceDto,
  AuditChainVerifyResponse,
  AuditExportResponse,
  BcdrRecoveryModeResponse,
  BcdrRecoveryTestResponse,
  BcdrServicesResponse,
  BcdrStatusResponse,
  ComplianceAssessmentResponse,
  ComplianceControlsResponse,
  ComplianceFrameworksResponse,
  ComplianceStatusResponse,
  LoginHistoryDto,
  PasswordHistoryItemDto,
  PasswordStatusDto,
  RetentionPoliciesResponse,
  RetentionPolicyDto,
  RetentionRunReportDto,
  RetentionStatusResponse,
  SecurityAuditLogDto,
  SecurityDashboardDto,
  SecurityEventDto,
  SecurityIncidentDto,
  SecurityScoreDto,
  SiemConfigResponse,
  SiemExportResponse,
  SiemIntegrationDashboard,
  SiemRetryResponse,
  SiemStatusResponse,
  SiemTestResponse,
  BackupValidationStatusResponse,
  BackupValidationReportResponse,
  BackupValidationHistoryResponse,
  BackupValidationDashboard,
  EncryptionAuditStatusResponse,
  EncryptionAuditReportResponse,
  EncryptionAuditHistoryResponse,
  EncryptionAuditDashboard,
  DisasterRecoveryTestStatusResponse,
  DisasterRecoveryTestReportResponse,
  DisasterRecoveryTestHistoryResponse,
  DisasterRecoveryTestDashboard,
  PenetrationTestStatusResponse,
  PenetrationTestReportResponse,
  PenetrationTestHistoryResponse,
  PenetrationTestDashboard,
  ThreatMonitoringDashboard,
  ZeroTrustPoliciesResponse,
  ZeroTrustStatusResponse,
};

/** Security list pagination (pageSize aligns with notifications / communication). */
export interface SecurityPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface SecurityAuditLogListResponse {
  items: SecurityAuditLogDto[];
  pagination: SecurityPagination;
}

export interface LoginHistoryListResponse {
  items: LoginHistoryDto[];
  pagination: SecurityPagination;
}

export interface ActiveDeviceListResponse {
  items: ActiveDeviceDto[];
  pagination: SecurityPagination;
}

export interface PasswordHistoryListResponse {
  items: PasswordHistoryItemDto[];
  pagination: SecurityPagination;
}

export interface SecurityEventListResponse {
  items: SecurityEventDto[];
  pagination: SecurityPagination;
}

export interface SecurityIncidentListResponse {
  items: SecurityIncidentDto[];
  pagination: SecurityPagination;
}

export interface ChangePasswordSecurityResponse {
  message: string;
  passwordChangedAt: string;
}

export interface UnlockAccountResponse {
  message: string;
  userId: string;
  unlockedAt: string;
}

export interface ContactFormResponse {
  message: string;
  ticketId: string;
}

export interface CsrfTokenResponse {
  csrfToken: string;
}
