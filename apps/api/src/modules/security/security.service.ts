import { randomUUID } from "node:crypto";

import { SessionRevokedReason } from "@enterprise/database";
import {
  PASSWORD_RULES,
  PERMISSIONS,
  UserRole,
  type ActiveDeviceListResponse,
  type AuditChainVerifyResponse,
  type AuditExportResponse,
  type ChangePasswordInput,
  type ChangePasswordSecurityResponse,
  type ContactFormInput,
  type ContactFormResponse,
  type ListActiveSessionsQueryInput,
  type ListLoginHistoryQueryInput,
  type ListSecurityEventsQueryInput,
  type ListSecurityIncidentsQueryInput,
  type ListSecurityLogsQueryInput,
  type LoginHistoryListResponse,
  type PasswordHistoryListResponse,
  type PasswordStatusDto,
  type RetentionPoliciesResponse,
  type RetentionRunReportDto,
  type RetentionStatusResponse,
  type SecurityAuditLogListResponse,
  type SecurityDashboardDto,
  type SecurityEventListResponse,
  type SecurityIncidentListResponse,
  type SecurityScoreDto,
  type UnlockAccountInput,
  type UnlockAccountResponse,
  type ZeroTrustPoliciesResponse,
  type ZeroTrustStatusResponse,
  type BcdrStatusResponse,
  type BcdrServicesResponse,
  type BcdrRecoveryTestResponse,
  type BcdrRecoveryModeResponse,
  type SetBcdrRecoveryModeInput,
  type ComplianceStatusResponse,
  type ComplianceFrameworksResponse,
  type ComplianceControlsResponse,
  type ComplianceAssessmentResponse,
  type ComplianceControlsQueryInput,
  type SiemStatusResponse,
  type SiemConfigResponse,
  type SiemTestResponse,
  type SiemExportResponse,
  type SiemRetryResponse,
  type SiemExportQueryInput,
  type SiemRetryQueryInput,
  type BackupValidationStatusResponse,
  type BackupValidationReportResponse,
  type BackupValidationHistoryResponse,
  type RunBackupValidationInput,
  type BackupValidationHistoryQueryInput,
  type EncryptionAuditStatusResponse,
  type EncryptionAuditReportResponse,
  type EncryptionAuditHistoryResponse,
  type EncryptionAuditHistoryQueryInput,
  type DisasterRecoveryTestStatusResponse,
  type DisasterRecoveryTestReportResponse,
  type DisasterRecoveryTestHistoryResponse,
  type RunDisasterRecoveryTestInput,
  type DisasterRecoveryTestHistoryQueryInput,
  type PenetrationTestStatusResponse,
  type PenetrationTestReportResponse,
  type PenetrationTestHistoryResponse,
  type RunPenetrationTestInput,
  type PenetrationTestHistoryQueryInput,
  type ManagedDeviceListResponse,
  type ManagedDeviceDto,
  type ListManagedDevicesQueryInput,
  type TrustDeviceInput,
  type RenameDeviceInput,
  type DeviceActionInput,
  type TenantIsolationStatusResponse,
  type TenantIsolationReportResponse,
  type TenantIsolationHistoryResponse,
  type TenantIsolationHistoryQueryInput,
  type RunTenantIsolationInput,
  type SecurityRegressionStatusResponse,
  type SecurityRegressionReportResponse,
  type SecurityRegressionHistoryResponse,
  type SecurityRegressionHistoryQueryInput,
  type RunSecurityRegressionInput,
  type ApiVersioningStatusResponse,
  type ApiVersioningVersionsResponse,
  type ApiVersioningCompatibilityResponse,
  type WebhookSecurityStatusResponse,
  type WebhookSecurityDeliveriesResponse,
  type WebhookSecurityRetriesResponse,
  type WebhookRotateSecretResponse,
  type WebhookSecurityRetryResponse,
  DATA_CLASSIFICATIONS,
} from "@enterprise/shared";

import { authRepository } from "../auth/auth.repository.js";
import {
  sessionService,
  SESSION_AUDIT_ACTIONS,
} from "../auth/session/index.js";
import { sessionHardeningService } from "../../shared/security/session-hardening/index.js";
import {
  deviceManagementService,
  DeviceManagementError,
} from "../../shared/security/device-management/index.js";
import { tenantIsolationService } from "../../shared/security/tenant-isolation/index.js";
import { securityRegressionService } from "../../shared/security/security-regression/index.js";
import { apiVersionService } from "../../shared/api-versioning/index.js";
import {
  webhookSecurityService,
  WebhookSecurityError,
} from "../../shared/security/webhooks/index.js";
import { auditIntegrityService } from "../../shared/security/audit-integrity/index.js";
import {
  businessContinuityService,
  disasterRecoveryService,
  recoveryPolicyService,
} from "../../shared/security/bcdr/index.js";
import { complianceService } from "../../shared/security/compliance/index.js";
import { dataRetentionService } from "../../shared/security/data-retention/index.js";
import { securityMonitoringService } from "../../shared/security/monitoring/index.js";
import { siemIntegrationService } from "../../shared/security/siem/index.js";
import { backupValidationService } from "../../shared/security/backup-validation/index.js";
import { encryptionAuditService } from "../../shared/security/encryption-audit/index.js";
import { disasterRecoveryTestService } from "../../shared/security/disaster-recovery-test/index.js";
import { penetrationTestService } from "../../shared/security/penetration-test/index.js";
import { zeroTrustService } from "../../shared/security/zero-trust/index.js";
import {
  isApiZeroTrustEnabled,
  isApiZeroTrustEnforcementEnabled,
} from "../../config/security-flags.js";
import { passwordHistoryService } from "./password-history.service.js";
import {
  passwordPolicyService,
  PASSWORD_POLICY_AUDIT_ACTIONS,
} from "../../shared/security/password-policy/index.js";
import {
  logSecurityAuditEvent,
  SECURITY_AUDIT_ACTIONS,
} from "./security.audit.js";
import {
  SECURITY_EVENT_TYPES,
  SECURITY_MESSAGES,
} from "./security.constants.js";
import { SECURITY_ERROR_CODES, SecurityError } from "./security.errors.js";
import {
  toActiveDeviceDto,
  toAuditLogDto,
  toLoginHistoryDto,
  toPasswordHistoryItemDto,
  toSecurityEventDto,
  toSecurityIncidentDto,
} from "./security.mapper.js";
import { securityRepository } from "./security.repository.js";
import type { SecurityActor, SecurityRequestContext } from "./security.types.js";

function hasPermission(actor: SecurityActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function isAdmin(actor: SecurityActor): boolean {
  return (
    actor.role === UserRole.ADMIN ||
    actor.role === UserRole.SUPER_ADMIN ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ)
  );
}

function canManageSecurity(actor: SecurityActor): boolean {
  return (
    actor.role === UserRole.SUPER_ADMIN ||
    hasPermission(actor, PERMISSIONS.SECURITY_MANAGE) ||
    hasPermission(actor, PERMISSIONS.USERS_MANAGE)
  );
}

function paginationMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function buildSecurityScore(status: PasswordStatusDto): SecurityScoreDto {
  const factors = [
    {
      key: "password_set",
      label: "Password configured",
      passed: status.passwordSet,
      weight: 20,
    },
    {
      key: "password_fresh",
      label: `Password changed in last ${PASSWORD_RULES.MAX_AGE_DAYS} days`,
      passed: Boolean(
        status.passwordChangedAt &&
          Date.now() - new Date(status.passwordChangedAt).getTime() <
            PASSWORD_RULES.MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
      ),
      weight: 15,
    },
    {
      key: "two_factor",
      label: "Two-factor authentication enabled",
      passed: status.twoFactorEnabled,
      weight: 25,
    },
    {
      key: "not_locked",
      label: "Account not locked",
      passed: !status.isLocked,
      weight: 20,
    },
    {
      key: "clean_failures",
      label: "No recent failed login streak",
      passed: status.failedLoginCount < 3,
      weight: 10,
    },
    {
      key: "history",
      label: "Password history tracked",
      passed: status.historyCount > 0 || status.passwordSet,
      weight: 10,
    },
  ];

  const score = factors.reduce(
    (sum, factor) => sum + (factor.passed ? factor.weight : 0),
    0,
  );

  let grade: SecurityScoreDto["grade"] = "F";
  if (score >= 90) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";

  return { score, grade, factors };
}

export class SecurityService {
  async getDashboard(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SecurityDashboardDto> {
    const orgWide = isAdmin(actor);
    const scopeUserId = orgWide ? undefined : actor.userId;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeSessions,
      successfulLogins24h,
      failedLogins24h,
      lockedAccounts,
      unresolvedAlerts,
      auditEvents24h,
      passwordStatus,
      recentLogins,
      activeDevices,
      alerts,
      auditTimeline,
    ] = await Promise.all([
      securityRepository.countActiveSessions(scopeUserId),
      securityRepository.countLoginAttempts({
        since,
        success: true,
        userId: scopeUserId,
      }),
      securityRepository.countLoginAttempts({
        since,
        success: false,
        userId: scopeUserId,
      }),
      orgWide ? securityRepository.countLockedAccounts() : Promise.resolve(0),
      orgWide
        ? securityRepository.countUnresolvedAlerts()
        : securityRepository
            .listSecurityEvents({
              skip: 0,
              take: 1,
              unresolvedOnly: true,
              userId: actor.userId,
            })
            .then((result) => result.total),
      securityRepository.countAuditEvents(since),
      this.getPasswordStatus(actor.userId),
      securityRepository.listRecentLogins({
        take: 8,
        userId: scopeUserId,
      }),
      securityRepository.listActiveSessions({
        skip: 0,
        take: 8,
        userId: scopeUserId,
      }),
      securityRepository.listSecurityEvents({
        skip: 0,
        take: 8,
        unresolvedOnly: true,
        userId: scopeUserId,
      }),
      securityRepository.listAuditLogs({
        skip: 0,
        take: 12,
        userId: scopeUserId,
      }),
    ]);

    const securityScore = buildSecurityScore(passwordStatus);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.DASHBOARD_VIEWED,
      context,
    });

    const threatMonitoring = orgWide
      ? await securityMonitoringService.getThreatDashboardMetrics(since)
      : undefined;

    const siemIntegration = orgWide
      ? siemIntegrationService.getDashboardMetrics()
      : undefined;

    const backupValidation = orgWide
      ? backupValidationService.getDashboardMetrics()
      : undefined;

    const encryptionAudit = orgWide
      ? encryptionAuditService.getDashboardMetrics()
      : undefined;

    const disasterRecoveryTest = orgWide
      ? disasterRecoveryTestService.getDashboardMetrics()
      : undefined;

    const penetrationTest = orgWide
      ? penetrationTestService.getDashboardMetrics()
      : undefined;

    const deviceManagement = await deviceManagementService.getDashboardMetricsAsync(
      orgWide ? undefined : actor.userId,
    );

    const tenantIsolation = orgWide
      ? tenantIsolationService.getDashboardMetrics()
      : undefined;

    const securityRegression = orgWide
      ? securityRegressionService.getDashboardMetrics()
      : undefined;

    const apiVersioning = orgWide
      ? apiVersionService.getDashboardMetrics()
      : undefined;

    const webhookSecurity = orgWide
      ? webhookSecurityService.getDashboardMetrics()
      : undefined;

    return {
      overview: {
        activeSessions,
        successfulLogins24h,
        failedLogins24h,
        lockedAccounts: orgWide ? lockedAccounts : passwordStatus.isLocked ? 1 : 0,
        unresolvedAlerts,
        auditEvents24h,
      },
      passwordStatus,
      securityScore,
      recentLogins: recentLogins.map(toLoginHistoryDto),
      activeDevices: activeDevices.items.map((item) =>
        toActiveDeviceDto(item, actor.sessionId),
      ),
      alerts: alerts.items.map(toSecurityEventDto),
      auditTimeline: auditTimeline.items.map(toAuditLogDto),
      ...(threatMonitoring ? { threatMonitoring } : {}),
      ...(siemIntegration ? { siemIntegration } : {}),
      ...(backupValidation ? { backupValidation } : {}),
      ...(encryptionAudit ? { encryptionAudit } : {}),
      ...(disasterRecoveryTest ? { disasterRecoveryTest } : {}),
      ...(penetrationTest ? { penetrationTest } : {}),
      deviceManagement,
      ...(tenantIsolation ? { tenantIsolation } : {}),
      ...(securityRegression ? { securityRegression } : {}),
      ...(apiVersioning ? { apiVersioning } : {}),
      ...(webhookSecurity ? { webhookSecurity } : {}),
    };
  }

  async getPasswordStatus(userId: string): Promise<PasswordStatusDto> {
    const user = await securityRepository.findUserSecurityProfile(userId);
    if (!user) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const historyCount = await securityRepository.countPasswordHistory(userId);
    const isLocked = Boolean(
      user.lockedUntil && user.lockedUntil > new Date(),
    );
    const policy = passwordPolicyService.getPolicy();
    const snapshot = {
      id: user.id,
      mustChangePassword: user.mustChangePassword,
      passwordHash: user.passwordHash,
      passwordChangedAt: user.passwordChangedAt,
      deletedAt: null,
    };
    const decision = passwordPolicyService.requiresPasswordChange(snapshot);

    return {
      passwordSet: Boolean(user.passwordHash),
      passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
      historyCount,
      reusePreventionCount: policy.historyCount,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      twoFactorEnabled: user.twoFactorEnabled,
      failedLoginCount: user.failedLoginCount,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
      isLocked,
      mustChangePassword: user.mustChangePassword || decision.expired,
      passwordExpired: decision.expired,
      passwordAgeDays: decision.ageDays,
      maxAgeDays: policy.maxAgeDays,
    };
  }

  async getPasswordPolicy() {
    return passwordPolicyService.getPolicy();
  }

  async listAuditLogs(
    query: ListSecurityLogsQueryInput,
    actor: SecurityActor,
  ): Promise<SecurityAuditLogListResponse> {
    if (!isAdmin(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await securityRepository.listAuditLogs({
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: query.search,
      action: query.action,
      resource: query.resource,
      userId: query.userId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return {
      items: result.items.map(toAuditLogDto),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  /**
   * Admin-only: stream-verify the tamper-evident audit hash chain.
   * Client response never includes hash material or internal row IDs.
   */
  async verifyAuditChain(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<AuditChainVerifyResponse> {
    if (
      actor.role !== UserRole.ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    const result = await auditIntegrityService.verifyAuditChain({
      emitSecurityEventOnBreak: true,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.AUDIT_CHAIN_VERIFIED,
      resourceId: undefined,
      metadata: {
        chainValid: result.chainValid,
        verifiedRows: result.verifiedRows,
        verificationTimeMs: result.verificationTimeMs,
      },
      context,
    });

    return {
      chainValid: result.chainValid,
      verifiedRows: result.verifiedRows,
      brokenRow: result.brokenRow
        ? {
            rowNumber: result.brokenRow.rowNumber,
            reason: result.brokenRow.reason,
          }
        : null,
      verificationTime: result.verificationTimeMs,
    };
  }

  /**
   * Admin-only JSON export including integrity fields and per-row status.
   */
  async exportAuditLogs(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<AuditExportResponse> {
    if (
      actor.role !== UserRole.ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    const items: AuditExportResponse["items"] = [];
    let chainValid = true;

    for await (const row of auditIntegrityService.exportAuditIntegrityRows()) {
      if (
        row.verificationStatus !== "valid" &&
        row.verificationStatus !== "legacy"
      ) {
        chainValid = false;
      }

      items.push({
        ...toAuditLogDto({
          ...row,
          verificationStatus: row.verificationStatus,
        }),
        hash: row.hash,
        previousHash: row.previousHash,
        chainVersion: row.chainVersion,
        verificationStatus: row.verificationStatus,
      });
    }

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.AUDIT_EXPORTED,
      resourceId: undefined,
      metadata: {
        exportedRows: items.length,
        chainValid,
      },
      context,
    });

    void securityMonitoringService.reportMassExport({
      userId: actor.userId,
      resource: "audit",
      message: "Audit log export executed",
      metadata: { exportedRows: items.length },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      exportedAt: new Date().toISOString(),
      chainValid,
      items,
    };
  }

  private assertAdminOrSuperAdmin(actor: SecurityActor): void {
    if (
      actor.role !== UserRole.ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  async listRetentionPolicies(
    actor: SecurityActor,
  ): Promise<RetentionPoliciesResponse> {
    this.assertAdminOrSuperAdmin(actor);
    const policies = await dataRetentionService.listPolicies();
    return { policies };
  }

  async getRetentionStatus(
    actor: SecurityActor,
  ): Promise<RetentionStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);
    return dataRetentionService.getStatus();
  }

  async runRetentionProcessor(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<RetentionRunReportDto> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await dataRetentionService.runRetentionProcessor({
      triggeredBy: actor.userId,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.RETENTION_RUN,
      resourceId: result.runId,
      metadata: {
        itemsArchived: result.itemsArchived,
        itemsDeleted: result.itemsDeleted,
        legalHolds: result.legalHolds,
        failures: result.failures,
        executionTime: result.executionTime,
        status: result.status,
      },
      context,
    });

    return {
      runId: result.runId,
      itemsArchived: result.itemsArchived,
      itemsDeleted: result.itemsDeleted,
      legalHolds: result.legalHolds,
      failures: result.failures,
      executionTime: result.executionTime,
      status: result.status,
    };
  }

  async getZeroTrustStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ZeroTrustStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await zeroTrustService.getStatus(
      {
        userId: actor.userId,
        email: actor.email,
        role: String(actor.role),
        permissions: actor.permissions,
        sessionId: actor.sessionId ?? "",
      },
      {
        path: "/security/zero-trust/status",
        method: "GET",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      {
        enabled: isApiZeroTrustEnabled(),
        enforcement: isApiZeroTrustEnforcementEnabled(),
      },
    );

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ZERO_TRUST_STATUS,
      context,
    });

    return {
      enabled: status.enabled,
      enforcement: status.enforcement,
      stepUpActive: status.stepUpActive,
      stepUpExpiresAt: status.stepUpExpiresAt,
      lastEvaluation: status.lastEvaluation
        ? {
            riskLevel: status.lastEvaluation.riskLevel,
            decision: status.lastEvaluation.decision,
            score: status.lastEvaluation.score,
            requiresStepUp: status.lastEvaluation.requiresStepUp,
            reason: status.lastEvaluation.reason,
            evaluatedAt: status.lastEvaluation.evaluatedAt,
            classification: status.lastEvaluation.resource.classification,
          }
        : null,
      policies: status.policies,
    };
  }

  async listZeroTrustPolicies(
    actor: SecurityActor,
  ): Promise<ZeroTrustPoliciesResponse> {
    this.assertAdminOrSuperAdmin(actor);
    return {
      policies: zeroTrustService.getPolicies(),
      classifications: [...DATA_CLASSIFICATIONS],
    };
  }

  async getBcdrStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<BcdrStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await businessContinuityService.getStatus();
    const capabilities = recoveryPolicyService.getCapabilities();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.BCDR_STATUS,
      context,
    });

    return {
      recoveryMode: status.recoveryMode,
      manualOverride: status.manualOverride,
      serviceHealth: status.serviceHealth,
      criticalDependencies: status.criticalDependencies,
      activeDegradations: status.activeDegradations,
      lastRecoveryTestAt: status.lastRecoveryTestAt,
      lastRecoveryTestPassed: status.lastRecoveryTestPassed,
      recoveryReadinessScore: status.recoveryReadinessScore,
      capabilities,
      evaluatedAt: status.evaluatedAt,
    };
  }

  async getBcdrServices(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<BcdrServicesResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const services = await businessContinuityService.getServices();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.BCDR_SERVICES,
      context,
    });

    return {
      services,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async runBcdrRecoveryTest(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<BcdrRecoveryTestResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await disasterRecoveryService.runRecoveryTest(actor.userId);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.BCDR_TEST,
      context,
      metadata: {
        passed: result.passed,
        score: result.score,
        recoveryMode: result.recoveryMode,
      },
    });

    return result;
  }

  async setBcdrRecoveryMode(
    input: SetBcdrRecoveryModeInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<BcdrRecoveryModeResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await disasterRecoveryService.setRecoveryMode({
      mode: input.mode,
      actorUserId: actor.userId,
      reason: input.reason,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.BCDR_RECOVERY_MODE,
      context,
      metadata: {
        recoveryMode: result.recoveryMode,
        manualOverride: result.manualOverride,
        reason: result.reason,
      },
    });

    return result;
  }

  async getComplianceStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ComplianceStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await complianceService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.COMPLIANCE_STATUS,
      context,
    });

    return status;
  }

  async listComplianceFrameworks(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ComplianceFrameworksResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const frameworks = complianceService.listFrameworks();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.COMPLIANCE_FRAMEWORKS,
      context,
    });

    return { frameworks };
  }

  async listComplianceControls(
    query: ComplianceControlsQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ComplianceControlsResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const controls = complianceService.listControls({
      framework: query.framework,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.COMPLIANCE_CONTROLS,
      context,
      metadata: {
        framework: query.framework ?? null,
        count: controls.length,
      },
    });

    return {
      controls,
      evaluatedAt: new Date().toISOString(),
    };
  }

  async runComplianceAssessment(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ComplianceAssessmentResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await complianceService.runAssessment(actor.userId);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.COMPLIANCE_ASSESSMENT,
      context,
      metadata: {
        overallScore: result.overallScore,
        controlCount: result.controlCount,
        failedCount: result.failedControls.length,
      },
    });

    return result;
  }

  async getSiemStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SiemStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = siemIntegrationService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SIEM_STATUS,
      context,
    });

    return status;
  }

  async getSiemConfig(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SiemConfigResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const config = siemIntegrationService.getConfig();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SIEM_CONFIG,
      context,
    });

    return config;
  }

  async testSiemConnectivity(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SiemTestResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await siemIntegrationService.testConnectivity();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SIEM_TEST,
      context,
      metadata: {
        overallSuccess: result.overallSuccess,
        providers: result.results.map((r) => ({
          provider: r.provider,
          success: r.success,
        })),
      },
    });

    return result;
  }

  async exportSiemEvents(
    query: SiemExportQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SiemExportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = siemIntegrationService.exportEvents(query.limit ?? 100);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SIEM_EXPORT,
      context,
      metadata: { exported: result.exported },
    });

    return {
      exported: result.exported,
      format: "json",
      events: result.events.map((e) => ({ ...e }) as Record<string, unknown>),
      exportedAt: result.exportedAt,
    };
  }

  async retrySiemDeadLetters(
    query: SiemRetryQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SiemRetryResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = siemIntegrationService.retryDeadLetters(query.limit);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SIEM_RETRY,
      context,
      metadata: {
        requeued: result.requeued,
        remainingDeadLetters: result.remainingDeadLetters,
      },
    });

    return result;
  }

  async getBackupValidationStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<BackupValidationStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await backupValidationService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.BACKUP_VALIDATION_STATUS,
      context,
    });

    return status;
  }

  async getBackupValidationReport(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<BackupValidationReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const report = await backupValidationService.getReport();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.BACKUP_VALIDATION_REPORT,
      context,
      metadata: { hasReport: Boolean(report) },
    });

    if (!report) {
      throw new SecurityError(
        "No backup validation report available. Run validation first.",
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    return report;
  }

  async runBackupValidation(
    input: RunBackupValidationInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<BackupValidationReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await backupValidationService.runValidation({
      validationType: input.validationType ?? "MANUAL",
      triggeredBy: actor.userId,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.BACKUP_VALIDATION_RUN,
      context,
      metadata: {
        runId: result.runId,
        health: result.health,
        coveragePercent: result.coveragePercent,
        validationType: result.validationType,
      },
    });

    return result;
  }

  async getBackupValidationHistory(
    query: BackupValidationHistoryQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<BackupValidationHistoryResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = backupValidationService.getHistory(query.limit);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.BACKUP_VALIDATION_HISTORY,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async getEncryptionAuditStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<EncryptionAuditStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await encryptionAuditService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ENCRYPTION_AUDIT_STATUS,
      context,
    });

    return status;
  }

  async getEncryptionAuditReport(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<EncryptionAuditReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const report = await encryptionAuditService.getReport();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ENCRYPTION_AUDIT_REPORT,
      context,
      metadata: { hasReport: Boolean(report) },
    });

    if (!report) {
      throw new SecurityError(
        "No encryption audit report available. Run audit first.",
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    return report;
  }

  async runEncryptionAudit(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<EncryptionAuditReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await encryptionAuditService.runAudit({
      triggeredBy: actor.userId,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ENCRYPTION_AUDIT_RUN,
      context,
      metadata: {
        runId: result.runId,
        status: result.status,
        overallScore: result.overallScore,
      },
    });

    return result;
  }

  async getEncryptionAuditHistory(
    query: EncryptionAuditHistoryQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<EncryptionAuditHistoryResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = encryptionAuditService.getHistory(query.limit);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ENCRYPTION_AUDIT_HISTORY,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async getDisasterRecoveryTestStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<DisasterRecoveryTestStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await disasterRecoveryTestService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.DR_TEST_STATUS,
      context,
    });

    return status;
  }

  async getDisasterRecoveryTestHistory(
    query: DisasterRecoveryTestHistoryQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<DisasterRecoveryTestHistoryResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = disasterRecoveryTestService.getHistory(query.limit);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.DR_TEST_HISTORY,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async runDisasterRecoveryTest(
    input: RunDisasterRecoveryTestInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<DisasterRecoveryTestReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await disasterRecoveryTestService.runTest({
      testType: input.testType ?? "MANUAL",
      triggeredBy: actor.userId,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.DR_TEST_RUN,
      context,
      metadata: {
        runId: result.runId,
        status: result.status,
        testType: result.testType,
        simulationOnly: true,
      },
    });

    return result;
  }

  async getDisasterRecoveryTestReport(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<DisasterRecoveryTestReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const report = await disasterRecoveryTestService.getReport();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.DR_TEST_REPORT,
      context,
      metadata: { hasReport: Boolean(report) },
    });

    if (!report) {
      throw new SecurityError(
        "No disaster recovery test report available. Run a test first.",
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    return report;
  }

  async getPenetrationTestStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<PenetrationTestStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await penetrationTestService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.PENTEST_STATUS,
      context,
    });

    return status;
  }

  async getPenetrationTestReport(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<PenetrationTestReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const report = await penetrationTestService.getReport();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.PENTEST_REPORT,
      context,
      metadata: { hasReport: Boolean(report) },
    });

    if (!report) {
      throw new SecurityError(
        "No penetration test report available. Run an assessment first.",
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    return report;
  }

  async runPenetrationTest(
    input: RunPenetrationTestInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<PenetrationTestReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await penetrationTestService.runAssessment({
      testType: input.testType ?? "CONFIGURATION_REVIEW",
      triggeredBy: actor.userId,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.PENTEST_RUN,
      context,
      metadata: {
        runId: result.runId,
        overallScore: result.overallScore,
        testType: result.testType,
        assessmentOnly: true,
      },
    });

    return result;
  }

  async getPenetrationTestHistory(
    query: PenetrationTestHistoryQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<PenetrationTestHistoryResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = penetrationTestService.getHistory(query.limit);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.PENTEST_HISTORY,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async getTenantIsolationStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<TenantIsolationStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await tenantIsolationService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.TENANT_ISOLATION_STATUS,
      context,
    });

    return status;
  }

  async getTenantIsolationReport(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<TenantIsolationReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const report = await tenantIsolationService.getReport();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.TENANT_ISOLATION_REPORT,
      context,
      metadata: { hasReport: Boolean(report) },
    });

    if (!report) {
      throw new SecurityError(
        "No tenant isolation report available. Run an assessment first.",
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    return report;
  }

  async runTenantIsolation(
    _input: RunTenantIsolationInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<TenantIsolationReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await tenantIsolationService.runAssessment({
      triggeredBy: actor.userId,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.TENANT_ISOLATION_RUN,
      context,
      metadata: {
        runId: result.runId,
        isolationScore: result.isolationScore,
        coverage: result.coverage,
        assessmentOnly: true,
      },
    });

    return result;
  }

  async getTenantIsolationHistory(
    query: TenantIsolationHistoryQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<TenantIsolationHistoryResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = tenantIsolationService.getHistory(query.limit);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.TENANT_ISOLATION_HISTORY,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async getSecurityRegressionStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SecurityRegressionStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = await securityRegressionService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SECURITY_REGRESSION_STATUS,
      context,
    });

    return status;
  }

  async getSecurityRegressionReport(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SecurityRegressionReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const report = await securityRegressionService.getReport();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SECURITY_REGRESSION_REPORT,
      context,
      metadata: { hasReport: Boolean(report) },
    });

    if (!report) {
      throw new SecurityError(
        "No security regression report available. Run an assessment first.",
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    return report;
  }

  async runSecurityRegression(
    input: RunSecurityRegressionInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SecurityRegressionReportResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await securityRegressionService.runAssessment({
      testType: input.testType ?? "CONTROL_VERIFICATION",
      triggeredBy: actor.userId,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SECURITY_REGRESSION_RUN,
      context,
      metadata: {
        runId: result.runId,
        overallHealth: result.overallHealth,
        coverage: result.coverage,
        deploymentReadinessScore: result.deploymentReadinessScore,
        assessmentOnly: true,
      },
    });

    return result;
  }

  async getSecurityRegressionHistory(
    query: SecurityRegressionHistoryQueryInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<SecurityRegressionHistoryResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = securityRegressionService.getHistory(query.limit);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SECURITY_REGRESSION_HISTORY,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async getApiVersioningStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ApiVersioningStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = apiVersionService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.API_VERSIONING_STATUS,
      context,
    });

    return status;
  }

  async getApiVersioningVersions(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ApiVersioningVersionsResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = apiVersionService.listVersions();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.API_VERSIONING_VERSIONS,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async getApiVersioningCompatibility(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ApiVersioningCompatibilityResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const snapshot = apiVersionService.getCompatibility();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.API_VERSIONING_COMPATIBILITY,
      context,
    });

    return snapshot;
  }

  async getWebhookSecurityStatus(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<WebhookSecurityStatusResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const status = webhookSecurityService.getStatus();

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.WEBHOOK_SECURITY_STATUS,
      context,
    });

    return status;
  }

  async getWebhookSecurityDeliveries(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<WebhookSecurityDeliveriesResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = webhookSecurityService.getDeliveries(50);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.WEBHOOK_SECURITY_DELIVERIES,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async getWebhookSecurityRetries(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<WebhookSecurityRetriesResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const items = webhookSecurityService.getRetries(50);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.WEBHOOK_SECURITY_RETRIES,
      context,
      metadata: { count: items.length },
    });

    return { items };
  }

  async rotateWebhookSecret(
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<WebhookRotateSecretResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const result = await webhookSecurityService.rotateSecret({
      actorUserId: actor.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.WEBHOOK_SECURITY_ROTATE,
      context,
      metadata: {
        keyIdMasked: result.keyIdMasked,
        previousKeyIdMasked: result.previousKeyIdMasked,
      },
    });

    return result;
  }

  async retryWebhookDelivery(
    deliveryId: string,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<WebhookSecurityRetryResponse> {
    this.assertAdminOrSuperAdmin(actor);

    try {
      const result = await webhookSecurityService.retryDelivery(deliveryId);

      await logSecurityAuditEvent({
        userId: actor.userId,
        action: SECURITY_AUDIT_ACTIONS.WEBHOOK_SECURITY_RETRY,
        context,
        metadata: {
          deliveryId,
          status: result.status,
          attempt: result.attempt,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof WebhookSecurityError) {
        throw new SecurityError(
          error.message,
          error.statusCode,
          error.statusCode === 404
            ? SECURITY_ERROR_CODES.NOT_FOUND
            : SECURITY_ERROR_CODES.VALIDATION,
        );
      }
      throw error;
    }
  }

  async listLoginHistory(
    query: ListLoginHistoryQueryInput,
    actor: SecurityActor,
  ): Promise<LoginHistoryListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const orgWide = isAdmin(actor);

    const result = await securityRepository.listLoginHistory({
      skip: (page - 1) * pageSize,
      take: pageSize,
      email: orgWide ? query.email : undefined,
      userId: orgWide ? query.userId : actor.userId,
      success:
        query.success === undefined ? undefined : query.success === "true",
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return {
      items: result.items.map(toLoginHistoryDto),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  async listActiveDevices(
    query: ListActiveSessionsQueryInput,
    actor: SecurityActor,
  ): Promise<ActiveDeviceListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const orgWide = isAdmin(actor);

    const result = await securityRepository.listActiveSessions({
      skip: (page - 1) * pageSize,
      take: pageSize,
      userId: orgWide ? query.userId : actor.userId,
      search: orgWide ? query.search : undefined,
    });

    return {
      items: result.items.map((item) =>
        toActiveDeviceDto(item, actor.sessionId),
      ),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  /** Managed device inventory (Redis/memory registry) — additive admin surface. */
  async listManagedDevices(
    query: ListManagedDevicesQueryInput,
    actor: SecurityActor,
  ): Promise<ManagedDeviceListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const orgWide = isAdmin(actor);
    const scopeUserId = orgWide ? query.userId : actor.userId;

    let items = await deviceManagementService.listDevices(
      scopeUserId ? { userId: scopeUserId } : undefined,
    );

    if (!orgWide) {
      items = items.filter((d) => d.userId === actor.userId);
    }
    if (query.state) {
      items = items.filter((d) => d.state === query.state);
    }

    const total = items.length;
    const sliced = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: sliced,
      pagination: paginationMeta(total, page, pageSize),
    };
  }

  async getManagedDevice(
    deviceId: string,
    actor: SecurityActor,
  ): Promise<ManagedDeviceDto> {
    const device = await deviceManagementService.getDevice(deviceId);
    if (!device) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }
    if (device.userId !== actor.userId && !isAdmin(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }
    return device;
  }

  async listManagedDevicesForUser(
    userId: string,
    actor: SecurityActor,
  ): Promise<ManagedDeviceListResponse> {
    if (userId !== actor.userId && !isAdmin(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }
    const items = await deviceManagementService.listDevicesForUser(userId);
    return {
      items,
      pagination: paginationMeta(items.length, 1, items.length || 1),
    };
  }

  async trustManagedDevice(
    deviceId: string,
    body: TrustDeviceInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ManagedDeviceDto> {
    try {
      return await deviceManagementService.trustDevice({
        deviceId,
        actorUserId: actor.userId,
        mfaCode: body.mfaCode,
        label: body.label,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      this.rethrowDeviceError(error);
    }
  }

  async renameManagedDevice(
    deviceId: string,
    body: RenameDeviceInput,
    actor: SecurityActor,
  ): Promise<ManagedDeviceDto> {
    try {
      return await deviceManagementService.renameDevice({
        deviceId,
        actorUserId: actor.userId,
        label: body.label,
      });
    } catch (error) {
      this.rethrowDeviceError(error);
    }
  }

  async blockManagedDevice(
    deviceId: string,
    body: DeviceActionInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ManagedDeviceDto> {
    this.assertAdminOrSuperAdmin(actor);
    try {
      return await deviceManagementService.blockDevice({
        deviceId,
        actorUserId: actor.userId,
        reason: body.reason,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      this.rethrowDeviceError(error);
    }
  }

  async revokeManagedDevice(
    deviceId: string,
    body: DeviceActionInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ManagedDeviceDto> {
    const device = await deviceManagementService.getDevice(deviceId);
    if (!device) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }
    if (device.userId !== actor.userId && !isAdmin(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }
    try {
      return await deviceManagementService.revokeDevice({
        deviceId,
        actorUserId: actor.userId,
        reason: body.reason,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      this.rethrowDeviceError(error);
    }
  }

  async removeManagedDevice(
    deviceId: string,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<{ message: string }> {
    const device = await deviceManagementService.getDevice(deviceId);
    if (!device) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }
    if (device.userId !== actor.userId && !isAdmin(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }
    try {
      await deviceManagementService.removeDevice({
        deviceId,
        actorUserId: actor.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      return { message: "Device removed" };
    } catch (error) {
      this.rethrowDeviceError(error);
    }
  }

  private rethrowDeviceError(error: unknown): never {
    if (error instanceof DeviceManagementError) {
      throw new SecurityError(
        error.message,
        error.statusCode,
        error.statusCode === 404
          ? SECURITY_ERROR_CODES.NOT_FOUND
          : error.statusCode === 403
            ? SECURITY_ERROR_CODES.FORBIDDEN
            : SECURITY_ERROR_CODES.VALIDATION,
      );
    }
    throw error;
  }

  async listPasswordHistory(
    actor: SecurityActor,
  ): Promise<PasswordHistoryListResponse> {
    const items = await securityRepository.listPasswordHistory(actor.userId);
    return {
      items: items.map(toPasswordHistoryItemDto),
      pagination: paginationMeta(items.length, 1, items.length || 1),
    };
  }

  async listSecurityEvents(
    query: ListSecurityEventsQueryInput,
    actor: SecurityActor,
  ): Promise<SecurityEventListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const orgWide = isAdmin(actor);

    const result = await securityRepository.listSecurityEvents({
      skip: (page - 1) * pageSize,
      take: pageSize,
      severity: query.severity,
      category: query.category,
      unresolvedOnly:
        query.unresolvedOnly === undefined
          ? undefined
          : query.unresolvedOnly === "true",
      userId: orgWide ? query.userId : actor.userId,
    });

    return {
      items: result.items.map(toSecurityEventDto),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  async listSecurityIncidents(
    query: ListSecurityIncidentsQueryInput,
    actor: SecurityActor,
  ): Promise<SecurityIncidentListResponse> {
    this.assertAdminOrSuperAdmin(actor);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await securityRepository.listSecurityIncidents({
      skip: (page - 1) * pageSize,
      take: pageSize,
      severity: query.severity,
      status: query.status,
      type: query.type,
      unresolvedOnly:
        query.unresolvedOnly === undefined
          ? undefined
          : query.unresolvedOnly === "true",
    });

    return {
      items: result.items.map(toSecurityIncidentDto),
      pagination: paginationMeta(result.total, page, pageSize),
    };
  }

  async resolveIncident(
    incidentId: string,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ) {
    this.assertAdminOrSuperAdmin(actor);

    const existing = await securityRepository.findSecurityIncident(incidentId);
    if (!existing) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const updated = await securityMonitoringService.resolveIncident(
      incidentId,
      actor.userId,
    );

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.INCIDENT_RESOLVED,
      resourceId: incidentId,
      context,
    });

    return {
      message: SECURITY_MESSAGES.INCIDENT_RESOLVED,
      incident: toSecurityIncidentDto(updated ?? existing),
    };
  }

  async terminateSession(
    sessionId: string,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<{ message: string }> {
    const session = await securityRepository.findActiveSession(sessionId);
    if (!session) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const ownsSession = session.userId === actor.userId;
    if (!ownsSession && !canManageSecurity(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    if (session.id === actor.sessionId) {
      throw new SecurityError(
        "Cannot terminate the current session from this action. Use logout instead.",
        400,
        SECURITY_ERROR_CODES.VALIDATION,
      );
    }

    await sessionService.revokeSession({
      sessionId: session.id,
      userId: session.userId,
      reason: ownsSession
        ? SessionRevokedReason.LOGOUT
        : SessionRevokedReason.ADMIN_REVOKE,
      actorUserId: actor.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      auditAction: ownsSession
        ? SESSION_AUDIT_ACTIONS.REVOKED
        : SESSION_AUDIT_ACTIONS.REVOKED_ADMIN,
      metadata: { flow: "security_terminate_session" },
    });

    await securityRepository.createSecurityEvent({
      userId: session.userId,
      severity: "MEDIUM",
      category: "SESSION",
      eventType: SECURITY_EVENT_TYPES.SESSION_TERMINATED,
      message: ownsSession
        ? "User terminated an active session"
        : `Admin terminated session for ${session.user.email}`,
      metadata: { sessionId: session.id, terminatedBy: actor.userId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.SESSION_TERMINATED,
      resourceId: session.id,
      metadata: { targetUserId: session.userId },
      context,
    });

    return { message: SECURITY_MESSAGES.SESSION_TERMINATED };
  }

  async changePassword(
    input: ChangePasswordInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<ChangePasswordSecurityResponse> {
    const user = await securityRepository.findUserSecurityProfile(actor.userId);
    if (!user?.passwordHash) {
      throw new SecurityError(
        "Password login is not configured for this account",
        400,
        SECURITY_ERROR_CODES.VALIDATION,
      );
    }

    const snapshot = {
      id: user.id,
      mustChangePassword: user.mustChangePassword,
      passwordHash: user.passwordHash,
      passwordChangedAt: user.passwordChangedAt,
      deletedAt: null,
    };

    // Forced / expired changes bypass minimum age; voluntary changes do not.
    try {
      passwordPolicyService.assertMinimumAge(snapshot, {
        force:
          user.mustChangePassword ||
          passwordPolicyService.passwordExpiredForUser(snapshot),
      });
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        throw new SecurityError(
          error.message,
          400,
          SECURITY_ERROR_CODES.VALIDATION,
        );
      }
      throw error;
    }

    const valid = await passwordHistoryService.verifyPassword(
      user.passwordHash,
      input.currentPassword,
    );
    if (!valid) {
      throw new SecurityError(
        "Current password is incorrect",
        400,
        SECURITY_ERROR_CODES.VALIDATION,
      );
    }

    try {
      await passwordPolicyService.assertNotReused(
        actor.userId,
        input.newPassword,
        user.passwordHash,
      );
    } catch (error) {
      if (
        error instanceof SecurityError &&
        error.code === SECURITY_ERROR_CODES.PASSWORD_REUSED
      ) {
        await securityRepository.createSecurityEvent({
          userId: actor.userId,
          severity: "LOW",
          category: "POLICY",
          eventType: SECURITY_EVENT_TYPES.PASSWORD_REUSE,
          message: "Password reuse blocked",
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        });
        await logSecurityAuditEvent({
          userId: actor.userId,
          action: SECURITY_AUDIT_ACTIONS.PASSWORD_REUSE_BLOCKED,
          context,
        });
      }
      throw error;
    }

    const nextHash = await passwordHistoryService.hashPassword(input.newPassword);
    await passwordHistoryService.recordPasswordChange(
      actor.userId,
      user.passwordHash,
    );
    const updated = await securityRepository.updateUserPassword(
      actor.userId,
      nextHash,
    );

    // Clear force-change flag, invalidate setup tokens, audit completion
    await passwordPolicyService.completePasswordChange(actor.userId, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Revoke every other session; rebind current so password watermark passes
    if (actor.sessionId) {
      await sessionHardeningService.rotateAfterPasswordChange({
        userId: actor.userId,
        currentSessionId: actor.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } else {
      await sessionService.revokeAllSessions({
        userId: actor.userId,
        reason: SessionRevokedReason.PASSWORD_CHANGE,
        actorUserId: actor.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        auditAction: SESSION_AUDIT_ACTIONS.PASSWORD_CHANGED,
      });
    }

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.PASSWORD_CHANGED,
      context,
      metadata: { event: PASSWORD_POLICY_AUDIT_ACTIONS.CHANGE_COMPLETED },
    });

    return {
      message: SECURITY_MESSAGES.PASSWORD_CHANGED,
      passwordChangedAt:
        updated.passwordChangedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async unlockAccount(
    input: UnlockAccountInput,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ): Promise<UnlockAccountResponse> {
    if (!canManageSecurity(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    const user = await securityRepository.findUserSecurityProfile(input.userId);
    if (!user) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const isLocked = Boolean(
      (user.lockedUntil && user.lockedUntil > new Date()) ||
        user.status === "LOCKED",
    );
    if (!isLocked && user.failedLoginCount === 0) {
      throw new SecurityError(
        "Account is not locked",
        400,
        SECURITY_ERROR_CODES.ACCOUNT_NOT_LOCKED,
      );
    }

    await securityRepository.unlockUser(input.userId);

    await securityRepository.createSecurityEvent({
      userId: input.userId,
      severity: "INFO",
      category: "ACCOUNT",
      eventType: SECURITY_EVENT_TYPES.ACCOUNT_UNLOCKED,
      message: `Account unlocked by ${actor.email}`,
      metadata: { reason: input.reason ?? null, unlockedBy: actor.userId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ACCOUNT_UNLOCKED,
      resourceId: input.userId,
      metadata: { reason: input.reason ?? null },
      context,
    });

    return {
      message: SECURITY_MESSAGES.ACCOUNT_UNLOCKED,
      userId: input.userId,
      unlockedAt: new Date().toISOString(),
    };
  }

  async resolveAlert(
    eventId: string,
    actor: SecurityActor,
    context: SecurityRequestContext,
  ) {
    if (!canManageSecurity(actor)) {
      throw new SecurityError(
        SECURITY_MESSAGES.FORBIDDEN,
        403,
        SECURITY_ERROR_CODES.FORBIDDEN,
      );
    }

    const existing = await securityRepository.findSecurityEvent(eventId);
    if (!existing) {
      throw new SecurityError(
        SECURITY_MESSAGES.NOT_FOUND,
        404,
        SECURITY_ERROR_CODES.NOT_FOUND,
      );
    }

    const updated = await securityRepository.resolveSecurityEvent(eventId);

    await logSecurityAuditEvent({
      userId: actor.userId,
      action: SECURITY_AUDIT_ACTIONS.ALERT_RESOLVED,
      resourceId: eventId,
      context,
    });

    return {
      message: SECURITY_MESSAGES.ALERT_RESOLVED,
      event: toSecurityEventDto(updated),
    };
  }

  async submitContact(
    input: ContactFormInput,
    context: SecurityRequestContext,
  ): Promise<ContactFormResponse> {
    const ticketId = randomUUID();

    await logSecurityAuditEvent({
      action: SECURITY_AUDIT_ACTIONS.CONTACT_SUBMITTED,
      resourceId: ticketId,
      metadata: {
        name: input.name,
        email: input.email,
        subject: input.subject,
        // Store truncated message only — avoid dumping full PII into audit forever
        messagePreview: input.message.slice(0, 200),
      },
      context,
    });

    await securityRepository.createSecurityEvent({
      severity: "INFO",
      category: "API",
      eventType: "contact_form",
      message: `Contact form submitted: ${input.subject}`,
      metadata: { ticketId, email: input.email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      message: SECURITY_MESSAGES.CONTACT_RECEIVED,
      ticketId,
    };
  }
}

export const securityService = new SecurityService();
