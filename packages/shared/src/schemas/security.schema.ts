import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

// =============================================================================
// Phase 17 — Enterprise Security Schemas
// =============================================================================

export const SECURITY_SEVERITIES = [
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export const SECURITY_EVENT_CATEGORIES = [
  "AUTH",
  "ACCOUNT",
  "SESSION",
  "ACCESS",
  "FILE",
  "API",
  "CAPTCHA",
  "RATE_LIMIT",
  "POLICY",
] as const;

export const securitySeveritySchema = z.enum(SECURITY_SEVERITIES);
export const securityEventCategorySchema = z.enum(SECURITY_EVENT_CATEGORIES);

/** Optional captcha token — required when reCAPTCHA is enabled server-side. */
export const captchaTokenSchema = z
  .string()
  .trim()
  .min(1, "Captcha verification is required")
  .max(4096, "Captcha token is invalid")
  .optional();

export const contactFormSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must not exceed 120 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .max(320)
    .toLowerCase(),
  subject: z
    .string({ required_error: "Subject is required" })
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject must not exceed 200 characters"),
  message: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must not exceed 5000 characters"),
  captchaToken: captchaTokenSchema,
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const listSecurityLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().max(200).optional(),
  action: z.string().trim().max(100).optional(),
  resource: z.string().trim().max(100).optional(),
  userId: uuidSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type ListSecurityLogsQueryInput = z.infer<
  typeof listSecurityLogsQuerySchema
>;

export const listLoginHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  email: z.string().trim().max(320).optional(),
  userId: uuidSchema.optional(),
  success: z.enum(["true", "false"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type ListLoginHistoryQueryInput = z.infer<
  typeof listLoginHistoryQuerySchema
>;

export const listSecurityEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  severity: securitySeveritySchema.optional(),
  category: securityEventCategorySchema.optional(),
  unresolvedOnly: z.enum(["true", "false"]).optional(),
  userId: uuidSchema.optional(),
});

export type ListSecurityEventsQueryInput = z.infer<
  typeof listSecurityEventsQuerySchema
>;

export const listActiveSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  userId: uuidSchema.optional(),
  search: z.string().trim().max(200).optional(),
  /** Device Management — when "true", return managed inventory (additive). */
  inventory: z.enum(["true", "false"]).optional(),
  state: z
    .enum([
      "NEW",
      "TRUSTED",
      "ACTIVE",
      "INACTIVE",
      "BLOCKED",
      "SUSPICIOUS",
      "REVOKED",
    ])
    .optional(),
});

export type ListActiveSessionsQueryInput = z.infer<
  typeof listActiveSessionsQuerySchema
>;

export const terminateSessionParamsSchema = z.object({
  sessionId: uuidSchema,
});

export type TerminateSessionParamsInput = z.infer<
  typeof terminateSessionParamsSchema
>;

export const unlockAccountSchema = z.object({
  userId: uuidSchema,
  reason: z
    .string()
    .trim()
    .max(500)
    .optional(),
});

export type UnlockAccountInput = z.infer<typeof unlockAccountSchema>;

export const resolveSecurityEventParamsSchema = z.object({
  eventId: uuidSchema,
});

export type ResolveSecurityEventParamsInput = z.infer<
  typeof resolveSecurityEventParamsSchema
>;

export const auditVerificationStatusSchema = z.enum([
  "valid",
  "legacy",
  "broken_hash",
  "missing_link",
  "corrupted_event",
]);

export type AuditVerificationStatus = z.infer<
  typeof auditVerificationStatusSchema
>;

export const securityAuditLogDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  userEmail: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable().optional(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  /** Tamper-evident integrity fields (Phase 3 Step 8). Optional for legacy. */
  hash: z.string().nullable().optional(),
  previousHash: z.string().nullable().optional(),
  chainVersion: z.number().int().optional(),
  hashVersion: z.number().int().optional(),
  timestampIntegrity: z.string().nullable().optional(),
  verificationStatus: auditVerificationStatusSchema.optional(),
});

export type SecurityAuditLogDto = z.infer<typeof securityAuditLogDtoSchema>;

/** Admin audit chain verification result — no internal hash material. */
export const auditChainVerifyResponseSchema = z.object({
  chainValid: z.boolean(),
  verifiedRows: z.number().int().nonnegative(),
  brokenRow: z
    .object({
      rowNumber: z.number().int().positive(),
      reason: z.enum([
        "broken_hash",
        "missing_link",
        "corrupted_event",
      ]),
    })
    .nullable(),
  verificationTime: z.number().nonnegative(),
});

export type AuditChainVerifyResponse = z.infer<
  typeof auditChainVerifyResponseSchema
>;

export const auditExportItemSchema = securityAuditLogDtoSchema.extend({
  hash: z.string().nullable(),
  previousHash: z.string().nullable(),
  chainVersion: z.number().int(),
  verificationStatus: auditVerificationStatusSchema,
});

export type AuditExportItem = z.infer<typeof auditExportItemSchema>;

export const auditExportResponseSchema = z.object({
  exportedAt: z.string(),
  chainValid: z.boolean(),
  items: z.array(auditExportItemSchema),
});

export type AuditExportResponse = z.infer<typeof auditExportResponseSchema>;

// =============================================================================
// Phase 3 Step 9 — Data Retention
// =============================================================================

export const retentionEntityTypeSchema = z.enum([
  "AUDIT_LOGS",
  "AI_MEMORY",
  "AI_DOCUMENTS",
  "FILES",
  "COMMUNICATIONS",
  "PROJECTS",
  "TASKS",
  "HR_DOCUMENTS",
  "NOTIFICATIONS",
  "REPORTS",
]);

export const retentionLifecycleStatusSchema = z.enum([
  "ACTIVE",
  "ARCHIVED",
  "LEGAL_HOLD",
  "PENDING_DELETION",
  "SECURE_DELETED",
]);

export const retentionPolicyDtoSchema = z.object({
  entityType: retentionEntityTypeSchema,
  label: z.string(),
  retentionPeriodDays: z.number().int().nonnegative(),
  archiveAfterDays: z.number().int().nonnegative().nullable(),
  deleteAfterDays: z.number().int().nonnegative().nullable(),
  autoCleanupEligible: z.boolean(),
  allowSecureDelete: z.boolean(),
  legalHold: z.boolean(),
  lifecycleStates: z.array(retentionLifecycleStatusSchema),
});

export type RetentionPolicyDto = z.infer<typeof retentionPolicyDtoSchema>;

export const retentionPoliciesResponseSchema = z.object({
  policies: z.array(retentionPolicyDtoSchema),
});

export type RetentionPoliciesResponse = z.infer<
  typeof retentionPoliciesResponseSchema
>;

export const retentionRunReportSchema = z.object({
  runId: z.string().uuid(),
  itemsArchived: z.number().int().nonnegative(),
  itemsDeleted: z.number().int().nonnegative(),
  legalHolds: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  executionTime: z.number().nonnegative(),
  status: z.enum(["RUNNING", "COMPLETED", "FAILED"]),
});

export type RetentionRunReportDto = z.infer<typeof retentionRunReportSchema>;

export const retentionStatusResponseSchema = z.object({
  lastRun: retentionRunReportSchema
    .extend({
      startedAt: z.string(),
      finishedAt: z.string().nullable(),
      triggeredBy: z.string().nullable().optional(),
    })
    .nullable(),
  activeLegalHolds: z.number().int().nonnegative(),
  lifecycleByStatus: z.record(z.number().int().nonnegative()),
  policies: z.array(retentionPolicyDtoSchema),
});

export type RetentionStatusResponse = z.infer<
  typeof retentionStatusResponseSchema
>;

export const loginHistoryDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  userId: z.string().uuid().nullable(),
  ipAddress: z.string(),
  userAgent: z.string(),
  success: z.boolean(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
});

export type LoginHistoryDto = z.infer<typeof loginHistoryDtoSchema>;

export const activeDeviceDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  deviceName: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
  lastActiveAt: z.string(),
  createdAt: z.string(),
  isCurrent: z.boolean().optional(),
});

export type ActiveDeviceDto = z.infer<typeof activeDeviceDtoSchema>;

export const passwordHistoryItemDtoSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
});

export type PasswordHistoryItemDto = z.infer<
  typeof passwordHistoryItemDtoSchema
>;

export const securityEventDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  userEmail: z.string().nullable().optional(),
  severity: securitySeveritySchema,
  category: securityEventCategorySchema,
  eventType: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type SecurityEventDto = z.infer<typeof securityEventDtoSchema>;

export const passwordStatusDtoSchema = z.object({
  passwordSet: z.boolean(),
  passwordChangedAt: z.string().nullable(),
  historyCount: z.number().int().min(0),
  reusePreventionCount: z.number().int().min(1),
  lastLoginAt: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
  failedLoginCount: z.number().int().min(0),
  lockedUntil: z.string().nullable(),
  isLocked: z.boolean(),
  mustChangePassword: z.boolean().optional(),
  passwordExpired: z.boolean().optional(),
  passwordAgeDays: z.number().int().min(0).nullable().optional(),
  maxAgeDays: z.number().int().min(0).optional(),
});

export type PasswordStatusDto = z.infer<typeof passwordStatusDtoSchema>;

export const securityScoreDtoSchema = z.object({
  score: z.number().int().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  factors: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      passed: z.boolean(),
      weight: z.number().int().min(0),
    }),
  ),
});

export type SecurityScoreDto = z.infer<typeof securityScoreDtoSchema>;

export const securityDashboardDtoSchema = z.object({
  overview: z.object({
    activeSessions: z.number().int().min(0),
    successfulLogins24h: z.number().int().min(0),
    failedLogins24h: z.number().int().min(0),
    lockedAccounts: z.number().int().min(0),
    unresolvedAlerts: z.number().int().min(0),
    auditEvents24h: z.number().int().min(0),
  }),
  passwordStatus: passwordStatusDtoSchema,
  securityScore: securityScoreDtoSchema,
  recentLogins: z.array(loginHistoryDtoSchema),
  activeDevices: z.array(activeDeviceDtoSchema),
  alerts: z.array(securityEventDtoSchema),
  auditTimeline: z.array(securityAuditLogDtoSchema),
  /** Phase 3 Step 10 — additive threat monitoring metrics (admin). */
  threatMonitoring: z
    .object({
      openIncidents: z.number().int().nonnegative(),
      criticalAlerts: z.number().int().nonnegative(),
      topAttackTypes: z.array(
        z.object({
          type: z.string(),
          count: z.number().int().nonnegative(),
        }),
      ),
      topAffectedModules: z.array(
        z.object({
          module: z.string(),
          count: z.number().int().nonnegative(),
        }),
      ),
      eventsLast24Hours: z.number().int().nonnegative(),
      severityDistribution: z.record(z.number().int().nonnegative()),
    })
    .optional(),
  /** Enterprise SIEM Integration metrics (admin) — additive. */
  siemIntegration: z
    .object({
      connectionStatus: z.enum([
        "CONNECTED",
        "DEGRADED",
        "DISCONNECTED",
        "DISABLED",
      ]),
      queueSize: z.number().int().nonnegative(),
      failedDeliveries: z.number().int().nonnegative(),
      lastExportAt: z.string().nullable(),
      connectedProviders: z.array(z.string()),
      eventThroughput: z.number().int().nonnegative(),
    })
    .optional(),
  /** Enterprise Backup Validation metrics (admin) — additive. */
  backupValidation: z
    .object({
      status: z.enum(["HEALTHY", "WARNING", "FAILED", "UNKNOWN"]),
      coverage: z.number().int().min(0).max(100),
      health: z.enum(["HEALTHY", "WARNING", "FAILED", "UNKNOWN"]),
      failures: z.number().int().nonnegative(),
      lastValidationAt: z.string().nullable(),
      nextValidationAt: z.string().nullable(),
    })
    .optional(),
  /** Enterprise Encryption Audit metrics (admin) — additive. */
  encryptionAudit: z
    .object({
      overallScore: z.number().int().min(0).max(100),
      coverage: z.number().int().min(0).max(100),
      weakAlgorithms: z.number().int().nonnegative(),
      failedChecks: z.number().int().nonnegative(),
      recommendations: z.number().int().nonnegative(),
      lastAuditAt: z.string().nullable(),
    })
    .optional(),
  /** Enterprise Disaster Recovery Test metrics (admin) — additive. */
  disasterRecoveryTest: z
    .object({
      readiness: z.number().int().min(0).max(100),
      lastTestAt: z.string().nullable(),
      successRate: z.number().int().min(0).max(100),
      recoveryTimeMs: z.number().int().nonnegative().nullable(),
      recommendations: z.number().int().nonnegative(),
    })
    .optional(),
  /** Enterprise External Penetration Test assessment (admin) — additive. */
  penetrationTest: z
    .object({
      overallScore: z.number().int().min(0).max(100),
      securityMaturity: z
        .enum([
          "INITIAL",
          "DEVELOPING",
          "DEFINED",
          "MANAGED",
          "OPTIMIZING",
        ])
        .nullable(),
      criticalFindings: z.number().int().nonnegative(),
      highFindings: z.number().int().nonnegative(),
      recommendations: z.number().int().nonnegative(),
      lastAssessmentAt: z.string().nullable(),
    })
    .optional(),
  /** Enterprise Device Management metrics — additive. */
  deviceManagement: z
    .object({
      registeredDevices: z.number().int().nonnegative(),
      trustedDevices: z.number().int().nonnegative(),
      blockedDevices: z.number().int().nonnegative(),
      suspiciousDevices: z.number().int().nonnegative(),
      unknownDevices: z.number().int().nonnegative(),
      recentDevices: z.number().int().nonnegative(),
    })
    .optional(),
  /** Enterprise Tenant Isolation Testing metrics (admin) — additive. */
  tenantIsolation: z
    .object({
      isolationScore: z.number().int().min(0).max(100),
      coverage: z.number().int().min(0).max(100),
      criticalRisks: z.number().int().nonnegative(),
      warnings: z.number().int().nonnegative(),
      history: z.number().int().nonnegative(),
      lastAssessmentAt: z.string().nullable(),
    })
    .optional(),
  /** Enterprise Security Regression Testing metrics (admin) — additive. */
  securityRegression: z
    .object({
      overallHealth: z.number().int().min(0).max(100),
      coverage: z.number().int().min(0).max(100),
      failedControls: z.number().int().nonnegative(),
      deploymentReadiness: z.number().int().min(0).max(100),
      recommendations: z.number().int().nonnegative(),
      history: z.number().int().nonnegative(),
      lastAssessmentAt: z.string().nullable(),
    })
    .optional(),
  /** Enterprise API Versioning metrics (admin) — additive. */
  apiVersioning: z
    .object({
      supportedVersions: z.number().int().nonnegative(),
      deprecatedVersions: z.number().int().nonnegative(),
      experimentalVersions: z.number().int().nonnegative().optional(),
      traffic: z.number().int().nonnegative(),
      fallbackCount: z.number().int().nonnegative(),
      unsupportedCount: z.number().int().nonnegative().optional(),
    })
    .optional(),
  /** Enterprise Signed Webhooks metrics (admin) — additive. */
  webhookSecurity: z
    .object({
      deliveries: z.number().int().nonnegative(),
      failures: z.number().int().nonnegative(),
      retries: z.number().int().nonnegative(),
      replayAttacks: z.number().int().nonnegative(),
      signatureFailures: z.number().int().nonnegative(),
      deadLetters: z.number().int().nonnegative(),
    })
    .optional(),
});

export type SecurityDashboardDto = z.infer<typeof securityDashboardDtoSchema>;

export const securityIncidentStatusSchema = z.enum([
  "OPEN",
  "INVESTIGATING",
  "RESOLVED",
]);

export const securityIncidentDtoSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  severity: securitySeveritySchema,
  status: securityIncidentStatusSchema,
  actorUserId: z.string().uuid().nullable(),
  resource: z.string().nullable(),
  resourceId: z.string().nullable(),
  count: z.number().int().nonnegative(),
  message: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  windowStartedAt: z.string(),
  lastSeenAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedById: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
});

export type SecurityIncidentDto = z.infer<typeof securityIncidentDtoSchema>;

export const listSecurityIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  severity: securitySeveritySchema.optional(),
  status: securityIncidentStatusSchema.optional(),
  type: z.string().trim().max(100).optional(),
  unresolvedOnly: z.enum(["true", "false"]).optional(),
});

export type ListSecurityIncidentsQueryInput = z.infer<
  typeof listSecurityIncidentsQuerySchema
>;

export const resolveSecurityIncidentParamsSchema = z.object({
  id: uuidSchema,
});

export type ResolveSecurityIncidentParamsInput = z.infer<
  typeof resolveSecurityIncidentParamsSchema
>;

export const threatMonitoringDashboardSchema = z.object({
  openIncidents: z.number().int().nonnegative(),
  criticalAlerts: z.number().int().nonnegative(),
  topAttackTypes: z.array(
    z.object({
      type: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  topAffectedModules: z.array(
    z.object({
      module: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  eventsLast24Hours: z.number().int().nonnegative(),
  severityDistribution: z.record(z.number().int().nonnegative()),
});

export type ThreatMonitoringDashboard = z.infer<
  typeof threatMonitoringDashboardSchema
>;

// =============================================================================
// Phase 3 Step 11 — Zero Trust
// =============================================================================

export const zeroTrustRiskLevelSchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const zeroTrustDecisionSchema = z.enum([
  "ALLOW",
  "ALLOW_AUDIT",
  "REQUIRE_STEP_UP",
  "BLOCK",
]);

export const zeroTrustPolicyDtoSchema = z.object({
  riskLevel: zeroTrustRiskLevelSchema,
  action: zeroTrustDecisionSchema,
  description: z.string(),
});

export type ZeroTrustPolicyDto = z.infer<typeof zeroTrustPolicyDtoSchema>;

export const zeroTrustPoliciesResponseSchema = z.object({
  policies: z.array(zeroTrustPolicyDtoSchema),
  classifications: z.array(
    z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]),
  ),
});

export type ZeroTrustPoliciesResponse = z.infer<
  typeof zeroTrustPoliciesResponseSchema
>;

export const zeroTrustStatusResponseSchema = z.object({
  enabled: z.boolean(),
  enforcement: z.boolean(),
  stepUpActive: z.boolean(),
  stepUpExpiresAt: z.string().nullable(),
  lastEvaluation: z
    .object({
      riskLevel: zeroTrustRiskLevelSchema,
      decision: zeroTrustDecisionSchema,
      score: z.number(),
      requiresStepUp: z.boolean(),
      reason: z.string(),
      evaluatedAt: z.string(),
      classification: z.enum([
        "PUBLIC",
        "INTERNAL",
        "CONFIDENTIAL",
        "RESTRICTED",
      ]),
    })
    .nullable(),
  policies: z.array(zeroTrustPolicyDtoSchema),
});

export type ZeroTrustStatusResponse = z.infer<
  typeof zeroTrustStatusResponseSchema
>;

// =============================================================================
// Phase 3 Step 12 — Business Continuity & Disaster Recovery
// =============================================================================

export const bcdrHealthStatusSchema = z.enum([
  "HEALTHY",
  "DEGRADED",
  "UNAVAILABLE",
  "MAINTENANCE",
]);

export const bcdrRecoveryModeSchema = z.enum([
  "NORMAL",
  "READ_ONLY",
  "LIMITED_OPERATION",
  "DISASTER_RECOVERY",
]);

export const bcdrServiceIdSchema = z.enum([
  "database",
  "file_storage",
  "ai_providers",
  "email_service",
  "background_jobs",
  "authentication",
  "cache",
]);

export const bcdrServiceHealthSchema = z.object({
  id: bcdrServiceIdSchema,
  label: z.string(),
  status: bcdrHealthStatusSchema,
  critical: z.boolean(),
  detail: z.string().nullable(),
  checkedAt: z.string(),
});

export type BcdrServiceHealthDto = z.infer<typeof bcdrServiceHealthSchema>;

export const bcdrServicesResponseSchema = z.object({
  services: z.array(bcdrServiceHealthSchema),
  evaluatedAt: z.string(),
});

export type BcdrServicesResponse = z.infer<typeof bcdrServicesResponseSchema>;

export const bcdrStatusResponseSchema = z.object({
  recoveryMode: bcdrRecoveryModeSchema,
  manualOverride: z.boolean(),
  serviceHealth: z.array(bcdrServiceHealthSchema),
  criticalDependencies: z.array(bcdrServiceIdSchema),
  activeDegradations: z.array(
    z.object({
      serviceId: bcdrServiceIdSchema,
      status: bcdrHealthStatusSchema,
      detail: z.string().nullable(),
      since: z.string(),
    }),
  ),
  lastRecoveryTestAt: z.string().nullable(),
  lastRecoveryTestPassed: z.boolean().nullable(),
  recoveryReadinessScore: z.number().int().min(0).max(100),
  capabilities: z.object({
    allowWrites: z.boolean(),
    allowFileUploads: z.boolean(),
    allowAi: z.boolean(),
    allowEmailSend: z.boolean(),
    allowBackgroundJobs: z.boolean(),
    queueNotificationsOnly: z.boolean(),
    mode: bcdrRecoveryModeSchema,
    reason: z.string(),
  }),
  evaluatedAt: z.string(),
});

export type BcdrStatusResponse = z.infer<typeof bcdrStatusResponseSchema>;

export const bcdrRecoveryTestResponseSchema = z.object({
  testedAt: z.string(),
  passed: z.boolean(),
  score: z.number().int().min(0).max(100),
  recoveryMode: bcdrRecoveryModeSchema,
  checks: z.array(
    z.object({
      name: z.string(),
      ok: z.boolean(),
      detail: z.string().optional(),
    }),
  ),
  summary: z.string(),
});

export type BcdrRecoveryTestResponse = z.infer<
  typeof bcdrRecoveryTestResponseSchema
>;

export const setBcdrRecoveryModeSchema = z.object({
  mode: z.union([bcdrRecoveryModeSchema, z.literal("AUTO")]),
  reason: z.string().trim().max(500).optional(),
});

export type SetBcdrRecoveryModeInput = z.infer<typeof setBcdrRecoveryModeSchema>;

export const bcdrRecoveryModeResponseSchema = z.object({
  recoveryMode: bcdrRecoveryModeSchema,
  manualOverride: z.boolean(),
  reason: z.string(),
  capabilities: z.object({
    allowWrites: z.boolean(),
    allowFileUploads: z.boolean(),
    allowAi: z.boolean(),
    allowEmailSend: z.boolean(),
    allowBackgroundJobs: z.boolean(),
    queueNotificationsOnly: z.boolean(),
    mode: bcdrRecoveryModeSchema,
    reason: z.string(),
  }),
});

export type BcdrRecoveryModeResponse = z.infer<
  typeof bcdrRecoveryModeResponseSchema
>;

// =============================================================================
// Phase 3 Final — Enterprise Compliance Framework
// =============================================================================

export const complianceFrameworkSchema = z.enum([
  "ISO_27001",
  "SOC_2",
  "GDPR",
  "NIST_CSF",
  "INTERNAL",
]);

export const complianceControlStatusSchema = z.enum([
  "IMPLEMENTED",
  "PARTIAL",
  "PLANNED",
  "NOT_APPLICABLE",
  "FAILED",
]);

export const complianceRiskLevelSchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const complianceEvidenceItemSchema = z.object({
  source: z.string(),
  label: z.string(),
  present: z.boolean(),
  detail: z.string(),
  collectedAt: z.string(),
});

export const complianceControlDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  framework: complianceFrameworkSchema,
  frameworks: z.array(complianceFrameworkSchema),
  category: z.string(),
  status: complianceControlStatusSchema,
  owner: z.string(),
  evidence: z.array(complianceEvidenceItemSchema),
  risk: complianceRiskLevelSchema,
  lastVerification: z.string().nullable(),
  manualOverride: z.boolean(),
  overrideReason: z.string().nullable(),
});

export type ComplianceControlDto = z.infer<typeof complianceControlDtoSchema>;

export const complianceFrameworkScoreSchema = z.object({
  framework: complianceFrameworkSchema,
  score: z.number().int().min(0).max(100),
  controlCount: z.number().int().nonnegative(),
  implemented: z.number().int().nonnegative(),
  partial: z.number().int().nonnegative(),
  planned: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  notApplicable: z.number().int().nonnegative(),
});

export const complianceRiskSummarySchema = z.object({
  low: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
  critical: z.number().int().nonnegative(),
});

export const complianceStatusResponseSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  frameworks: z.array(complianceFrameworkScoreSchema),
  evidenceCoveragePercent: z.number().int().min(0).max(100),
  lastAssessmentAt: z.string().nullable(),
  controlCounts: z.object({
    total: z.number().int().nonnegative(),
    implemented: z.number().int().nonnegative(),
    partial: z.number().int().nonnegative(),
    planned: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    notApplicable: z.number().int().nonnegative(),
  }),
  riskSummary: complianceRiskSummarySchema,
  evaluatedAt: z.string(),
});

export type ComplianceStatusResponse = z.infer<
  typeof complianceStatusResponseSchema
>;

export const complianceFrameworksResponseSchema = z.object({
  frameworks: z.array(
    z.object({
      id: complianceFrameworkSchema,
      label: z.string(),
      description: z.string(),
      score: z.number().int().min(0).max(100).nullable(),
      controlCount: z.number().int().nonnegative(),
    }),
  ),
});

export type ComplianceFrameworksResponse = z.infer<
  typeof complianceFrameworksResponseSchema
>;

export const complianceControlsQuerySchema = z.object({
  framework: complianceFrameworkSchema.optional(),
});

export type ComplianceControlsQueryInput = z.infer<
  typeof complianceControlsQuerySchema
>;

export const complianceControlsResponseSchema = z.object({
  controls: z.array(complianceControlDtoSchema),
  evaluatedAt: z.string(),
});

export type ComplianceControlsResponse = z.infer<
  typeof complianceControlsResponseSchema
>;

export const complianceAssessmentResponseSchema = z.object({
  assessedAt: z.string(),
  overallScore: z.number().int().min(0).max(100),
  frameworkScores: z.array(complianceFrameworkScoreSchema),
  missingControls: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      framework: complianceFrameworkSchema,
      status: complianceControlStatusSchema,
    }),
  ),
  failedControls: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      framework: complianceFrameworkSchema,
      risk: complianceRiskLevelSchema,
    }),
  ),
  evidenceCoverage: z.object({
    totalSources: z.number().int().nonnegative(),
    presentSources: z.number().int().nonnegative(),
    coveragePercent: z.number().int().min(0).max(100),
    sources: z.array(complianceEvidenceItemSchema),
  }),
  riskSummary: complianceRiskSummarySchema,
  controlCount: z.number().int().nonnegative(),
});

export type ComplianceAssessmentResponse = z.infer<
  typeof complianceAssessmentResponseSchema
>;

/** Enterprise SIEM Integration — admin DTOs */

export const siemProviderSchema = z.enum([
  "SPLUNK",
  "SENTINEL",
  "ELASTIC",
  "QRADAR",
  "DATADOG",
  "GENERIC_WEBHOOK",
]);

export const siemConnectionStatusSchema = z.enum([
  "CONNECTED",
  "DEGRADED",
  "DISCONNECTED",
  "DISABLED",
]);

export const siemDeliveryResultSchema = z.object({
  provider: siemProviderSchema,
  success: z.boolean(),
  statusCode: z.number().int().optional(),
  error: z.string().optional(),
  deliveredAt: z.string(),
});

export const siemStatusResponseSchema = z.object({
  enabled: z.boolean(),
  connectionStatus: siemConnectionStatusSchema,
  queueSize: z.number().int().nonnegative(),
  deadLetterSize: z.number().int().nonnegative(),
  offlineBufferSize: z.number().int().nonnegative(),
  failedDeliveries: z.number().int().nonnegative(),
  successfulDeliveries: z.number().int().nonnegative(),
  lastExportAt: z.string().nullable(),
  lastErrorAt: z.string().nullable(),
  lastError: z.string().nullable(),
  connectedProviders: z.array(siemProviderSchema),
  eventThroughputLastHour: z.number().int().nonnegative(),
  circuitBreakers: z.array(
    z.object({
      provider: siemProviderSchema,
      state: z.enum(["CLOSED", "OPEN", "HALF_OPEN"]),
      failures: z.number().int().nonnegative(),
    }),
  ),
  evaluatedAt: z.string(),
});

export type SiemStatusResponse = z.infer<typeof siemStatusResponseSchema>;

export const siemConfigResponseSchema = z.object({
  enabled: z.boolean(),
  batchSize: z.number().int().positive(),
  maxQueueSize: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
  providers: z.array(
    z.object({
      provider: siemProviderSchema,
      enabled: z.boolean(),
      transport: z.string(),
      endpoint: z.string().nullable(),
      authMode: z.string(),
      hasCredential: z.boolean(),
      syslogTarget: z.string().nullable(),
    }),
  ),
  evaluatedAt: z.string(),
});

export type SiemConfigResponse = z.infer<typeof siemConfigResponseSchema>;

export const siemTestResponseSchema = z.object({
  results: z.array(siemDeliveryResultSchema),
  overallSuccess: z.boolean(),
  testedAt: z.string(),
});

export type SiemTestResponse = z.infer<typeof siemTestResponseSchema>;

export const siemExportQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export type SiemExportQueryInput = z.infer<typeof siemExportQuerySchema>;

export const siemExportResponseSchema = z.object({
  exported: z.number().int().nonnegative(),
  format: z.literal("json"),
  events: z.array(z.record(z.unknown())),
  exportedAt: z.string(),
});

export type SiemExportResponse = z.infer<typeof siemExportResponseSchema>;

export const siemRetryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export type SiemRetryQueryInput = z.infer<typeof siemRetryQuerySchema>;

export const siemRetryResponseSchema = z.object({
  requeued: z.number().int().nonnegative(),
  remainingDeadLetters: z.number().int().nonnegative(),
  retriedAt: z.string(),
});

export type SiemRetryResponse = z.infer<typeof siemRetryResponseSchema>;

export const siemIntegrationDashboardSchema = z.object({
  connectionStatus: siemConnectionStatusSchema,
  queueSize: z.number().int().nonnegative(),
  failedDeliveries: z.number().int().nonnegative(),
  lastExportAt: z.string().nullable(),
  connectedProviders: z.array(z.string()),
  eventThroughput: z.number().int().nonnegative(),
});

export type SiemIntegrationDashboard = z.infer<
  typeof siemIntegrationDashboardSchema
>;

/** Enterprise Backup Validation — admin DTOs */

export const backupHealthStatusSchema = z.enum([
  "HEALTHY",
  "WARNING",
  "FAILED",
  "UNKNOWN",
]);

export const backupValidationTypeSchema = z.enum([
  "AUTOMATIC",
  "MANUAL",
  "INCREMENTAL",
  "FULL",
]);

export const backupValidationStatusResponseSchema = z.object({
  enabled: z.boolean(),
  health: backupHealthStatusSchema,
  coveragePercent: z.number().int().min(0).max(100),
  failures: z.number().int().nonnegative(),
  lastValidationAt: z.string().nullable(),
  nextValidationAt: z.string().nullable(),
  lastValidationType: backupValidationTypeSchema.nullable(),
  totalBackups: z.number().int().nonnegative(),
  encryptionStatus: z.enum([
    "ENCRYPTED",
    "PARTIAL",
    "UNENCRYPTED",
    "UNKNOWN",
  ]),
  evaluatedAt: z.string(),
});

export type BackupValidationStatusResponse = z.infer<
  typeof backupValidationStatusResponseSchema
>;

export const backupCheckResultSchema = z.object({
  checkId: z.string(),
  status: z.enum(["PASS", "WARN", "FAIL", "SKIP"]),
  message: z.string(),
  evidence: z.record(z.unknown()).optional(),
});

export const backupCategoryValidationSchema = z.object({
  category: z.string(),
  health: backupHealthStatusSchema,
  checks: z.array(backupCheckResultSchema),
  targetCount: z.number().int().nonnegative(),
  passedChecks: z.number().int().nonnegative(),
  failedChecks: z.number().int().nonnegative(),
  warningChecks: z.number().int().nonnegative(),
});

export const backupValidationReportResponseSchema = z.object({
  runId: z.string(),
  validationType: backupValidationTypeSchema,
  health: backupHealthStatusSchema,
  totalBackups: z.number().int().nonnegative(),
  successful: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  corrupted: z.number().int().nonnegative(),
  encryptionStatus: z.enum([
    "ENCRYPTED",
    "PARTIAL",
    "UNENCRYPTED",
    "UNKNOWN",
  ]),
  coveragePercent: z.number().int().min(0).max(100),
  categories: z.array(backupCategoryValidationSchema),
  startedAt: z.string(),
  completedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  triggeredBy: z.string().nullable(),
  nextValidationAt: z.string().nullable(),
});

export type BackupValidationReportResponse = z.infer<
  typeof backupValidationReportResponseSchema
>;

export const runBackupValidationSchema = z
  .object({
    validationType: backupValidationTypeSchema.optional(),
  })
  .default({});

export type RunBackupValidationInput = z.infer<
  typeof runBackupValidationSchema
>;

export const backupValidationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type BackupValidationHistoryQueryInput = z.infer<
  typeof backupValidationHistoryQuerySchema
>;

export const backupValidationHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      runId: z.string(),
      validationType: backupValidationTypeSchema,
      health: backupHealthStatusSchema,
      coveragePercent: z.number().int().min(0).max(100),
      failures: z.number().int().nonnegative(),
      completedAt: z.string(),
      triggeredBy: z.string().nullable(),
    }),
  ),
});

export type BackupValidationHistoryResponse = z.infer<
  typeof backupValidationHistoryResponseSchema
>;

export const backupValidationDashboardSchema = z.object({
  status: backupHealthStatusSchema,
  coverage: z.number().int().min(0).max(100),
  health: backupHealthStatusSchema,
  failures: z.number().int().nonnegative(),
  lastValidationAt: z.string().nullable(),
  nextValidationAt: z.string().nullable(),
});

export type BackupValidationDashboard = z.infer<
  typeof backupValidationDashboardSchema
>;

/** Enterprise Encryption Audit — admin DTOs */

export const encryptionAuditStatusEnumSchema = z.enum([
  "HEALTHY",
  "WARNING",
  "FAILED",
  "UNKNOWN",
]);

export const encryptionAuditStatusResponseSchema = z.object({
  enabled: z.boolean(),
  status: encryptionAuditStatusEnumSchema,
  overallScore: z.number().int().min(0).max(100),
  coveragePercent: z.number().int().min(0).max(100),
  weakAlgorithms: z.number().int().nonnegative(),
  failedChecks: z.number().int().nonnegative(),
  recommendations: z.number().int().nonnegative(),
  lastAuditAt: z.string().nullable(),
  nextAuditAt: z.string().nullable(),
  evaluatedAt: z.string(),
});

export type EncryptionAuditStatusResponse = z.infer<
  typeof encryptionAuditStatusResponseSchema
>;

export const encryptionAuditCheckResultSchema = z.object({
  checkId: z.string(),
  status: z.enum(["PASS", "WARN", "FAIL", "SKIP"]),
  message: z.string(),
  evidence: z.record(z.unknown()).optional(),
});

export const encryptionAuditRecommendationSchema = z.object({
  severity: z.enum(["INFO", "WARN", "CRITICAL"]),
  code: z.string(),
  message: z.string(),
});

export const encryptionAuditSourceResultSchema = z.object({
  source: z.string(),
  status: encryptionAuditStatusEnumSchema,
  encryptedAssets: z.number().int().nonnegative(),
  unencryptedAssets: z.number().int().nonnegative(),
  checks: z.array(encryptionAuditCheckResultSchema),
});

export const encryptionAuditReportResponseSchema = z.object({
  runId: z.string(),
  status: encryptionAuditStatusEnumSchema,
  overallScore: z.number().int().min(0).max(100),
  encryptedAssets: z.number().int().nonnegative(),
  unencryptedAssets: z.number().int().nonnegative(),
  weakAlgorithms: z.number().int().nonnegative(),
  expiredKeys: z.number().int().nonnegative(),
  invalidConfigurations: z.number().int().nonnegative(),
  coveragePercent: z.number().int().min(0).max(100),
  recommendations: z.array(encryptionAuditRecommendationSchema),
  sources: z.array(encryptionAuditSourceResultSchema),
  checks: z.array(encryptionAuditCheckResultSchema),
  startedAt: z.string(),
  completedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  triggeredBy: z.string().nullable(),
  nextAuditAt: z.string().nullable(),
});

export type EncryptionAuditReportResponse = z.infer<
  typeof encryptionAuditReportResponseSchema
>;

export const encryptionAuditHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type EncryptionAuditHistoryQueryInput = z.infer<
  typeof encryptionAuditHistoryQuerySchema
>;

export const encryptionAuditHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      runId: z.string(),
      status: encryptionAuditStatusEnumSchema,
      overallScore: z.number().int().min(0).max(100),
      coveragePercent: z.number().int().min(0).max(100),
      failedChecks: z.number().int().nonnegative(),
      completedAt: z.string(),
      triggeredBy: z.string().nullable(),
    }),
  ),
});

export type EncryptionAuditHistoryResponse = z.infer<
  typeof encryptionAuditHistoryResponseSchema
>;

export const encryptionAuditDashboardSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  coverage: z.number().int().min(0).max(100),
  weakAlgorithms: z.number().int().nonnegative(),
  failedChecks: z.number().int().nonnegative(),
  recommendations: z.number().int().nonnegative(),
  lastAuditAt: z.string().nullable(),
});

export type EncryptionAuditDashboard = z.infer<
  typeof encryptionAuditDashboardSchema
>;

/** Enterprise Disaster Recovery Test — admin DTOs */

export const drTestStatusSchema = z.enum([
  "READY",
  "PASSED",
  "WARNING",
  "FAILED",
  "NOT_TESTED",
]);

export const drTestTypeSchema = z.enum([
  "DRY_RUN",
  "MANUAL",
  "SCHEDULED",
  "PARTIAL",
  "FULL_RECOVERY_SIMULATION",
]);

export const disasterRecoveryTestStatusResponseSchema = z.object({
  enabled: z.boolean(),
  status: drTestStatusSchema,
  readiness: z.number().int().min(0).max(100),
  successRate: z.number().int().min(0).max(100),
  lastTestAt: z.string().nullable(),
  lastRecoveryDurationMs: z.number().int().nonnegative().nullable(),
  recommendations: z.number().int().nonnegative(),
  nextTestAt: z.string().nullable(),
  evaluatedAt: z.string(),
});

export type DisasterRecoveryTestStatusResponse = z.infer<
  typeof disasterRecoveryTestStatusResponseSchema
>;

export const disasterRecoveryTestCategorySchema = z.object({
  category: z.string(),
  status: drTestStatusSchema,
  recoveryTimeMs: z.number().int().nonnegative(),
  rtoTargetMs: z.number().int().nonnegative(),
  rpoTargetMs: z.number().int().nonnegative(),
  rtoMet: z.boolean(),
  rpoMet: z.boolean(),
  message: z.string(),
  checks: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["PASS", "WARN", "FAIL", "SKIP"]),
      message: z.string(),
    }),
  ),
});

export const disasterRecoveryTestReportResponseSchema = z.object({
  runId: z.string(),
  testType: drTestTypeSchema,
  status: drTestStatusSchema,
  overallReadiness: z.number().int().min(0).max(100),
  successRate: z.number().int().min(0).max(100),
  recoveryDurationMs: z.number().int().nonnegative(),
  failedComponents: z.array(z.string()),
  recommendations: z.array(
    z.object({
      severity: z.enum(["INFO", "WARN", "CRITICAL"]),
      code: z.string(),
      message: z.string(),
    }),
  ),
  categories: z.array(disasterRecoveryTestCategorySchema),
  recoveryMode: z.string(),
  criticalServicesHealthy: z.boolean(),
  startedAt: z.string(),
  completedAt: z.string(),
  triggeredBy: z.string().nullable(),
  nextTestAt: z.string().nullable(),
  simulationOnly: z.literal(true),
});

export type DisasterRecoveryTestReportResponse = z.infer<
  typeof disasterRecoveryTestReportResponseSchema
>;

export const runDisasterRecoveryTestSchema = z
  .object({
    testType: drTestTypeSchema.optional(),
  })
  .default({});

export type RunDisasterRecoveryTestInput = z.infer<
  typeof runDisasterRecoveryTestSchema
>;

export const disasterRecoveryTestHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type DisasterRecoveryTestHistoryQueryInput = z.infer<
  typeof disasterRecoveryTestHistoryQuerySchema
>;

export const disasterRecoveryTestHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      runId: z.string(),
      testType: drTestTypeSchema,
      status: drTestStatusSchema,
      overallReadiness: z.number().int().min(0).max(100),
      successRate: z.number().int().min(0).max(100),
      recoveryDurationMs: z.number().int().nonnegative(),
      completedAt: z.string(),
      triggeredBy: z.string().nullable(),
    }),
  ),
});

export type DisasterRecoveryTestHistoryResponse = z.infer<
  typeof disasterRecoveryTestHistoryResponseSchema
>;

export const disasterRecoveryTestDashboardSchema = z.object({
  readiness: z.number().int().min(0).max(100),
  lastTestAt: z.string().nullable(),
  successRate: z.number().int().min(0).max(100),
  recoveryTimeMs: z.number().int().nonnegative().nullable(),
  recommendations: z.number().int().nonnegative(),
});

export type DisasterRecoveryTestDashboard = z.infer<
  typeof disasterRecoveryTestDashboardSchema
>;

/** Enterprise External Penetration Test — admin DTOs (assessment only) */

export const pentestSeveritySchema = z.enum([
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const pentestTypeSchema = z.enum([
  "CONFIGURATION_REVIEW",
  "POLICY_VALIDATION",
  "IMPLEMENTATION_VERIFICATION",
  "CONTROL_COVERAGE",
  "RISK_ASSESSMENT",
  "COMPLIANCE_MAPPING",
  "READINESS_ASSESSMENT",
]);

export const securityMaturitySchema = z.enum([
  "INITIAL",
  "DEVELOPING",
  "DEFINED",
  "MANAGED",
  "OPTIMIZING",
]);

export const penetrationTestStatusResponseSchema = z.object({
  enabled: z.boolean(),
  overallScore: z.number().int().min(0).max(100),
  securityMaturity: securityMaturitySchema.nullable(),
  criticalFindings: z.number().int().nonnegative(),
  highFindings: z.number().int().nonnegative(),
  recommendations: z.number().int().nonnegative(),
  lastAssessmentAt: z.string().nullable(),
  nextAssessmentAt: z.string().nullable(),
  evaluatedAt: z.string(),
});

export type PenetrationTestStatusResponse = z.infer<
  typeof penetrationTestStatusResponseSchema
>;

export const pentestFindingSchema = z.object({
  id: z.string(),
  category: z.string(),
  controlId: z.string(),
  title: z.string(),
  status: z.enum(["PASSED", "FAILED", "WARNING", "NOT_APPLICABLE"]),
  severity: pentestSeveritySchema,
  message: z.string(),
  recommendation: z.string().nullable(),
});

export const penetrationTestReportResponseSchema = z.object({
  runId: z.string(),
  testType: pentestTypeSchema,
  overallScore: z.number().int().min(0).max(100),
  securityMaturity: securityMaturitySchema,
  findings: z.array(pentestFindingSchema),
  passedControls: z.number().int().nonnegative(),
  failedControls: z.number().int().nonnegative(),
  warningControls: z.number().int().nonnegative(),
  riskSummary: z.object({
    info: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    critical: z.number().int().nonnegative(),
  }),
  recommendations: z.array(
    z.object({
      severity: pentestSeveritySchema,
      code: z.string(),
      message: z.string(),
      category: z.string(),
    }),
  ),
  executiveSummary: z.string(),
  categoriesAssessed: z.number().int().nonnegative(),
  startedAt: z.string(),
  completedAt: z.string(),
  triggeredBy: z.string().nullable(),
  nextAssessmentAt: z.string().nullable(),
  assessmentOnly: z.literal(true),
});

export type PenetrationTestReportResponse = z.infer<
  typeof penetrationTestReportResponseSchema
>;

export const runPenetrationTestSchema = z
  .object({
    testType: pentestTypeSchema.optional(),
  })
  .default({});

export type RunPenetrationTestInput = z.infer<typeof runPenetrationTestSchema>;

export const penetrationTestHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type PenetrationTestHistoryQueryInput = z.infer<
  typeof penetrationTestHistoryQuerySchema
>;

export const penetrationTestHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      runId: z.string(),
      testType: pentestTypeSchema,
      overallScore: z.number().int().min(0).max(100),
      securityMaturity: securityMaturitySchema,
      criticalFindings: z.number().int().nonnegative(),
      highFindings: z.number().int().nonnegative(),
      completedAt: z.string(),
      triggeredBy: z.string().nullable(),
    }),
  ),
});

export type PenetrationTestHistoryResponse = z.infer<
  typeof penetrationTestHistoryResponseSchema
>;

export const penetrationTestDashboardSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  securityMaturity: securityMaturitySchema.nullable(),
  criticalFindings: z.number().int().nonnegative(),
  highFindings: z.number().int().nonnegative(),
  recommendations: z.number().int().nonnegative(),
  lastAssessmentAt: z.string().nullable(),
});

export type PenetrationTestDashboard = z.infer<
  typeof penetrationTestDashboardSchema
>;

/** Enterprise Device Management — admin DTOs */

export const deviceStateSchema = z.enum([
  "NEW",
  "TRUSTED",
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
  "SUSPICIOUS",
  "REVOKED",
]);

export const deviceTypeSchema = z.enum([
  "DESKTOP",
  "LAPTOP",
  "BROWSER",
  "MOBILE",
  "TABLET",
  "UNKNOWN",
]);

export const managedDeviceDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  label: z.string().nullable(),
  deviceType: deviceTypeSchema,
  browser: z.string(),
  platform: z.string(),
  operatingSystem: z.string(),
  userAgent: z.string(),
  lastIpAddress: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  timezone: z.string().nullable(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  riskScore: z.number().int().min(0).max(100),
  riskSignals: z.array(z.string()),
  state: deviceStateSchema,
  trusted: z.boolean(),
  blocked: z.boolean(),
  fingerprintBound: z.boolean(),
});

export type ManagedDeviceDto = z.infer<typeof managedDeviceDtoSchema>;

export const managedDeviceListResponseSchema = z.object({
  items: z.array(managedDeviceDtoSchema),
  pagination: z
    .object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
    })
    .optional(),
});

export type ManagedDeviceListResponse = z.infer<
  typeof managedDeviceListResponseSchema
>;

export const deviceIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type DeviceIdParamsInput = z.infer<typeof deviceIdParamsSchema>;

export const deviceUserParamsSchema = z.object({
  userId: z.string().uuid(),
});

export type DeviceUserParamsInput = z.infer<typeof deviceUserParamsSchema>;

export const trustDeviceSchema = z.object({
  mfaCode: z.string().min(6).max(64),
  label: z.string().trim().min(1).max(200).optional(),
});

export type TrustDeviceInput = z.infer<typeof trustDeviceSchema>;

export const renameDeviceSchema = z.object({
  label: z.string().trim().min(1).max(200),
});

export type RenameDeviceInput = z.infer<typeof renameDeviceSchema>;

export const deviceActionSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .default({});

export type DeviceActionInput = z.infer<typeof deviceActionSchema>;

export const listManagedDevicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  userId: z.string().uuid().optional(),
  state: deviceStateSchema.optional(),
  /** When true, return managed device inventory (admin). Default keeps session devices. */
  inventory: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type ListManagedDevicesQueryInput = z.infer<
  typeof listManagedDevicesQuerySchema
>;

export const deviceManagementDashboardSchema = z.object({
  registeredDevices: z.number().int().nonnegative(),
  trustedDevices: z.number().int().nonnegative(),
  blockedDevices: z.number().int().nonnegative(),
  suspiciousDevices: z.number().int().nonnegative(),
  unknownDevices: z.number().int().nonnegative(),
  recentDevices: z.number().int().nonnegative(),
});

export type DeviceManagementDashboard = z.infer<
  typeof deviceManagementDashboardSchema
>;

/** Enterprise Tenant Isolation Testing — admin DTOs */

export const tenantIsolationSeveritySchema = z.enum([
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const tenantIsolationControlStatusSchema = z.enum([
  "PASSED",
  "FAILED",
  "WARNING",
  "NOT_APPLICABLE",
]);

export const tenantIsolationCategorySchema = z.enum([
  "TENANT_CONTEXT",
  "DATABASE_QUERY",
  "RBAC",
  "AI_MEMORY",
  "FILE_ACCESS",
  "DOCUMENT",
  "CACHE",
  "SESSION",
  "SEARCH",
  "EXPORT",
  "NOTIFICATION",
  "BACKGROUND_JOB",
  "AUDIT",
  "REPORT",
]);

export const tenantIsolationStatusResponseSchema = z.object({
  enabled: z.boolean(),
  isolationScore: z.number().int().min(0).max(100),
  coverage: z.number().int().min(0).max(100),
  criticalRisks: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  validatedComponents: z.number().int().nonnegative(),
  failedComponents: z.number().int().nonnegative(),
  lastAssessmentAt: z.string().nullable(),
  nextAssessmentAt: z.string().nullable(),
  evaluatedAt: z.string(),
});

export type TenantIsolationStatusResponse = z.infer<
  typeof tenantIsolationStatusResponseSchema
>;

export const tenantIsolationFindingSchema = z.object({
  id: z.string(),
  category: tenantIsolationCategorySchema,
  checkType: z.string(),
  controlId: z.string(),
  title: z.string(),
  status: tenantIsolationControlStatusSchema,
  severity: tenantIsolationSeveritySchema,
  message: z.string(),
  recommendation: z.string().nullable(),
});

export const tenantIsolationReportResponseSchema = z.object({
  runId: z.string().uuid(),
  isolationScore: z.number().int().min(0).max(100),
  coverage: z.number().int().min(0).max(100),
  validatedComponents: z.array(
    z.object({
      category: tenantIsolationCategorySchema,
      status: tenantIsolationControlStatusSchema,
      findings: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      warnings: z.number().int().nonnegative(),
    }),
  ),
  failedComponents: z.array(tenantIsolationCategorySchema),
  criticalRisks: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  findings: z.array(tenantIsolationFindingSchema),
  riskSummary: z.object({
    info: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    critical: z.number().int().nonnegative(),
  }),
  recommendations: z.array(
    z.object({
      severity: tenantIsolationSeveritySchema,
      code: z.string(),
      message: z.string(),
      category: tenantIsolationCategorySchema,
    }),
  ),
  executiveSummary: z.string(),
  categoriesAssessed: z.number().int().nonnegative(),
  startedAt: z.string(),
  completedAt: z.string(),
  triggeredBy: z.string().nullable(),
  nextAssessmentAt: z.string().nullable(),
  assessmentOnly: z.literal(true),
});

export type TenantIsolationReportResponse = z.infer<
  typeof tenantIsolationReportResponseSchema
>;

export const runTenantIsolationSchema = z.object({}).default({});

export type RunTenantIsolationInput = z.infer<typeof runTenantIsolationSchema>;

export const tenantIsolationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type TenantIsolationHistoryQueryInput = z.infer<
  typeof tenantIsolationHistoryQuerySchema
>;

export const tenantIsolationHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      runId: z.string(),
      isolationScore: z.number().int().min(0).max(100),
      coverage: z.number().int().min(0).max(100),
      criticalRisks: z.number().int().nonnegative(),
      warnings: z.number().int().nonnegative(),
      failedComponents: z.number().int().nonnegative(),
      completedAt: z.string(),
      triggeredBy: z.string().nullable(),
    }),
  ),
});

export type TenantIsolationHistoryResponse = z.infer<
  typeof tenantIsolationHistoryResponseSchema
>;

export const tenantIsolationDashboardSchema = z.object({
  isolationScore: z.number().int().min(0).max(100),
  coverage: z.number().int().min(0).max(100),
  criticalRisks: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  history: z.number().int().nonnegative(),
  lastAssessmentAt: z.string().nullable(),
});

export type TenantIsolationDashboard = z.infer<
  typeof tenantIsolationDashboardSchema
>;

/** Enterprise Security Regression Testing — admin DTOs */

export const securityRegressionSeveritySchema = z.enum([
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const securityRegressionControlStatusSchema = z.enum([
  "PASSED",
  "FAILED",
  "WARNING",
  "NOT_APPLICABLE",
]);

export const securityRegressionCategorySchema = z.enum([
  "AUTHENTICATION",
  "AUTHORIZATION",
  "JWT_VALIDATION",
  "SESSION_VALIDATION",
  "PASSWORD_POLICIES",
  "MFA",
  "CSRF",
  "RATE_LIMITING",
  "SECURITY_HEADERS",
  "ZERO_TRUST",
  "RBAC",
  "AI_RESTRICTED_DATA",
  "PROMPT_INJECTION",
  "HUMAN_CONFIRMATION",
  "ENCRYPTION",
  "AUDIT_INTEGRITY",
  "MONITORING",
  "COMPLIANCE",
  "DEVICE_MANAGEMENT",
  "TENANT_ISOLATION",
]);

export const securityRegressionTestTypeSchema = z.enum([
  "CONFIGURATION_VALIDATION",
  "POLICY_VERIFICATION",
  "CONTROL_VERIFICATION",
  "WORKFLOW_VERIFICATION",
  "READ_ONLY_FUNCTIONAL",
  "INTEGRATION_VALIDATION",
  "DEPLOYMENT_READINESS",
]);

export const securityRegressionStatusResponseSchema = z.object({
  enabled: z.boolean(),
  overallHealth: z.number().int().min(0).max(100),
  coverage: z.number().int().min(0).max(100),
  failedControls: z.number().int().nonnegative(),
  criticalIssues: z.number().int().nonnegative(),
  deploymentReadinessScore: z.number().int().min(0).max(100),
  recommendations: z.number().int().nonnegative(),
  lastAssessmentAt: z.string().nullable(),
  nextAssessmentAt: z.string().nullable(),
  evaluatedAt: z.string(),
});

export type SecurityRegressionStatusResponse = z.infer<
  typeof securityRegressionStatusResponseSchema
>;

export const securityRegressionFindingSchema = z.object({
  id: z.string(),
  category: securityRegressionCategorySchema,
  testType: securityRegressionTestTypeSchema,
  controlId: z.string(),
  title: z.string(),
  status: securityRegressionControlStatusSchema,
  severity: securityRegressionSeveritySchema,
  message: z.string(),
  recommendation: z.string().nullable(),
});

export const securityRegressionReportResponseSchema = z.object({
  runId: z.string().uuid(),
  testType: securityRegressionTestTypeSchema,
  overallHealth: z.number().int().min(0).max(100),
  coverage: z.number().int().min(0).max(100),
  deploymentReadinessScore: z.number().int().min(0).max(100),
  passedControls: z.number().int().nonnegative(),
  failedControls: z.number().int().nonnegative(),
  warningControls: z.number().int().nonnegative(),
  criticalIssues: z.number().int().nonnegative(),
  findings: z.array(securityRegressionFindingSchema),
  riskSummary: z.object({
    info: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    critical: z.number().int().nonnegative(),
  }),
  recommendations: z.array(
    z.object({
      severity: securityRegressionSeveritySchema,
      code: z.string(),
      message: z.string(),
      category: securityRegressionCategorySchema,
    }),
  ),
  executiveSummary: z.string(),
  categoriesAssessed: z.number().int().nonnegative(),
  startedAt: z.string(),
  completedAt: z.string(),
  triggeredBy: z.string().nullable(),
  nextAssessmentAt: z.string().nullable(),
  assessmentOnly: z.literal(true),
});

export type SecurityRegressionReportResponse = z.infer<
  typeof securityRegressionReportResponseSchema
>;

export const runSecurityRegressionSchema = z
  .object({
    testType: securityRegressionTestTypeSchema.optional(),
  })
  .default({});

export type RunSecurityRegressionInput = z.infer<
  typeof runSecurityRegressionSchema
>;

export const securityRegressionHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type SecurityRegressionHistoryQueryInput = z.infer<
  typeof securityRegressionHistoryQuerySchema
>;

export const securityRegressionHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      runId: z.string(),
      testType: securityRegressionTestTypeSchema,
      overallHealth: z.number().int().min(0).max(100),
      coverage: z.number().int().min(0).max(100),
      failedControls: z.number().int().nonnegative(),
      criticalIssues: z.number().int().nonnegative(),
      deploymentReadinessScore: z.number().int().min(0).max(100),
      completedAt: z.string(),
      triggeredBy: z.string().nullable(),
    }),
  ),
});

export type SecurityRegressionHistoryResponse = z.infer<
  typeof securityRegressionHistoryResponseSchema
>;

export const securityRegressionDashboardSchema = z.object({
  overallHealth: z.number().int().min(0).max(100),
  coverage: z.number().int().min(0).max(100),
  failedControls: z.number().int().nonnegative(),
  deploymentReadiness: z.number().int().min(0).max(100),
  recommendations: z.number().int().nonnegative(),
  history: z.number().int().nonnegative(),
  lastAssessmentAt: z.string().nullable(),
});

export type SecurityRegressionDashboard = z.infer<
  typeof securityRegressionDashboardSchema
>;

/** Enterprise API Versioning — admin DTOs */

export const apiVersionStatusEnumSchema = z.enum([
  "SUPPORTED",
  "DEPRECATED",
  "EXPERIMENTAL",
  "SUNSET",
]);

export const apiVersioningStatusResponseSchema = z.object({
  enabled: z.boolean(),
  defaultVersion: z.string(),
  latestVersion: z.string(),
  supportedVersions: z.array(z.string()),
  deprecatedVersions: z.array(z.string()),
  experimentalVersions: z.array(z.string()),
  traffic: z.number().int().nonnegative(),
  fallbackCount: z.number().int().nonnegative(),
  unsupportedCount: z.number().int().nonnegative(),
  evaluatedAt: z.string(),
});

export type ApiVersioningStatusResponse = z.infer<
  typeof apiVersioningStatusResponseSchema
>;

export const apiVersioningVersionsResponseSchema = z.object({
  items: z.array(
    z.object({
      version: z.string(),
      status: apiVersionStatusEnumSchema,
      releaseDate: z.string(),
      deprecationDate: z.string().nullable(),
      sunsetDate: z.string().nullable(),
      supportedRoutes: z.array(z.string()),
      aliases: z.array(z.string()),
      fallbackTo: z.string().nullable(),
      documentationUrl: z.string().nullable(),
      traffic: z.number().int().nonnegative(),
    }),
  ),
});

export type ApiVersioningVersionsResponse = z.infer<
  typeof apiVersioningVersionsResponseSchema
>;

export const apiVersioningCompatibilityResponseSchema = z.object({
  versions: z.array(
    z.object({
      version: z.string(),
      status: apiVersionStatusEnumSchema,
      fallbackTo: z.string().nullable(),
      aliases: z.array(z.string()),
      routeAliasCount: z.number().int().nonnegative(),
      responseTransform: z.string().nullable(),
      legacyDtoMapping: z.string().nullable(),
    }),
  ),
  evaluatedAt: z.string(),
});

export type ApiVersioningCompatibilityResponse = z.infer<
  typeof apiVersioningCompatibilityResponseSchema
>;

export const apiVersioningDashboardSchema = z.object({
  supportedVersions: z.number().int().nonnegative(),
  deprecatedVersions: z.number().int().nonnegative(),
  experimentalVersions: z.number().int().nonnegative().optional(),
  traffic: z.number().int().nonnegative(),
  fallbackCount: z.number().int().nonnegative(),
  unsupportedCount: z.number().int().nonnegative().optional(),
});

export type ApiVersioningDashboard = z.infer<
  typeof apiVersioningDashboardSchema
>;

/** Enterprise Signed Webhooks — admin DTOs */

export const webhookDeliveryStatusSchema = z.enum([
  "QUEUED",
  "SENDING",
  "DELIVERED",
  "FAILED",
  "RETRYING",
  "EXPIRED",
  "DEAD_LETTER",
]);

export const webhookFailureClassSchema = z.enum([
  "NETWORK",
  "TIMEOUT",
  "HTTP_4XX",
  "HTTP_5XX",
  "SIGNATURE",
  "REPLAY",
  "CONFIGURATION",
  "UNKNOWN",
]);

export const webhookDeliveryDtoSchema = z.object({
  deliveryId: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  urlHost: z.string(),
  status: webhookDeliveryStatusSchema,
  attempt: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  failureClass: webhookFailureClassSchema.nullable(),
  lastError: z.string().nullable(),
  httpStatus: z.number().int().nullable(),
  keyIdMasked: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nextRetryAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  metadata: z.object({
    payloadBytes: z.number().int().nonnegative(),
    eventType: z.string(),
    correlationId: z.string().nullable(),
  }),
});

export const webhookSecurityStatusResponseSchema = z.object({
  enabled: z.boolean(),
  algorithm: z.enum(["HMAC_SHA256", "HMAC_SHA512"]),
  keyIdMasked: z.string(),
  hasPreviousSecret: z.boolean(),
  timestampToleranceSeconds: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
  deliveries: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  replayAttacks: z.number().int().nonnegative(),
  signatureFailures: z.number().int().nonnegative(),
  deadLetters: z.number().int().nonnegative(),
  evaluatedAt: z.string(),
});

export type WebhookSecurityStatusResponse = z.infer<
  typeof webhookSecurityStatusResponseSchema
>;

export const webhookSecurityDeliveriesResponseSchema = z.object({
  items: z.array(webhookDeliveryDtoSchema),
});

export type WebhookSecurityDeliveriesResponse = z.infer<
  typeof webhookSecurityDeliveriesResponseSchema
>;

export const webhookSecurityRetriesResponseSchema = z.object({
  items: z.array(webhookDeliveryDtoSchema),
});

export type WebhookSecurityRetriesResponse = z.infer<
  typeof webhookSecurityRetriesResponseSchema
>;

export const webhookRotateSecretResponseSchema = z.object({
  keyIdMasked: z.string(),
  previousKeyIdMasked: z.string().nullable(),
});

export type WebhookRotateSecretResponse = z.infer<
  typeof webhookRotateSecretResponseSchema
>;

export const webhookRetryDeliveryParamsSchema = z.object({
  deliveryId: z.string().min(1),
});

export type WebhookRetryDeliveryParamsInput = z.infer<
  typeof webhookRetryDeliveryParamsSchema
>;

export const webhookSecurityRetryResponseSchema = webhookDeliveryDtoSchema;

export type WebhookSecurityRetryResponse = z.infer<
  typeof webhookSecurityRetryResponseSchema
>;

export const webhookSecurityDashboardSchema = z.object({
  deliveries: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  replayAttacks: z.number().int().nonnegative(),
  signatureFailures: z.number().int().nonnegative(),
  deadLetters: z.number().int().nonnegative(),
});

export type WebhookSecurityDashboard = z.infer<
  typeof webhookSecurityDashboardSchema
>;
