import { Router } from "express";

import {
  PERMISSIONS,
  RATE_LIMIT,
  RECAPTCHA,
  UserRole,
} from "@enterprise/shared";

import {
  authenticate,
  authorizeAnyPermission,
  authorizePermissions,
  authorizeRoles,
} from "../../shared/authorization.js";
import { requireRecaptcha } from "../../middleware/recaptcha.middleware.js";
import {
  rateLimit,
  rateLimitByIp,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { securityController } from "./security.controller.js";
import {
  changePasswordSchema,
  complianceControlsQuerySchema,
  contactFormSchema,
  listActiveSessionsQuerySchema,
  listLoginHistoryQuerySchema,
  listSecurityEventsQuerySchema,
  listSecurityIncidentsQuerySchema,
  listSecurityLogsQuerySchema,
  resolveSecurityEventParamsSchema,
  resolveSecurityIncidentParamsSchema,
  setBcdrRecoveryModeSchema,
  siemExportQuerySchema,
  siemRetryQuerySchema,
  runBackupValidationSchema,
  backupValidationHistoryQuerySchema,
  encryptionAuditHistoryQuerySchema,
  runDisasterRecoveryTestSchema,
  disasterRecoveryTestHistoryQuerySchema,
  runPenetrationTestSchema,
  penetrationTestHistoryQuerySchema,
  terminateSessionParamsSchema,
  unlockAccountSchema,
  deviceIdParamsSchema,
  deviceUserParamsSchema,
  trustDeviceSchema,
  renameDeviceSchema,
  deviceActionSchema,
  runTenantIsolationSchema,
  tenantIsolationHistoryQuerySchema,
  runSecurityRegressionSchema,
  securityRegressionHistoryQuerySchema,
  webhookRetryDeliveryParamsSchema,
} from "./security.validation.js";

const securityRouter = Router();

const readLimit = rateLimit({
  name: "security.read",
  ...RATE_LIMIT.SECURITY_READ,
  keyGenerator: rateLimitByUser,
});

const writeLimit = rateLimit({
  name: "security.write",
  max: 30,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

const contactLimit = rateLimit({
  name: "security.contact",
  ...RATE_LIMIT.CONTACT_FORM,
  keyGenerator: rateLimitByIp,
});

const passwordLimit = rateLimit({
  name: "security.change-password",
  ...RATE_LIMIT.CHANGE_PASSWORD,
  keyGenerator: rateLimitByUser,
});

/** Public CSRF token issuance */
securityRouter.get(
  "/csrf-token",
  rateLimit({
    name: "security.csrf",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByIp,
  }),
  asyncHandler((req, res) => securityController.csrfToken(req, res)),
);

/** Public contact form (reCAPTCHA + rate limit) */
securityRouter.post(
  "/contact",
  contactLimit,
  requireRecaptcha(RECAPTCHA.ACTIONS.CONTACT),
  validate(contactFormSchema),
  asyncHandler((req, res) => securityController.submitContact(req, res)),
);

securityRouter.use(authenticate);

securityRouter.get(
  "/dashboard",
  readLimit,
  asyncHandler((req, res) => securityController.dashboard(req, res)),
);

securityRouter.get(
  "/password-status",
  readLimit,
  asyncHandler((req, res) => securityController.passwordStatus(req, res)),
);

securityRouter.get(
  "/password-policy",
  readLimit,
  asyncHandler((req, res) => securityController.passwordPolicy(req, res)),
);

securityRouter.get(
  "/password-history",
  readLimit,
  asyncHandler((req, res) => securityController.listPasswordHistory(req, res)),
);

securityRouter.get(
  "/logs",
  authorizePermissions(PERMISSIONS.AUDIT_READ),
  readLimit,
  validate(listSecurityLogsQuerySchema, "query"),
  asyncHandler((req, res) => securityController.listAuditLogs(req, res)),
);

securityRouter.get(
  "/audit-logs",
  authorizePermissions(PERMISSIONS.AUDIT_READ),
  readLimit,
  validate(listSecurityLogsQuerySchema, "query"),
  asyncHandler((req, res) => securityController.listAuditLogs(req, res)),
);

/** Admin / Super Admin — tamper-evident audit chain verification */
securityRouter.get(
  "/audit/verify",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.verifyAuditChain(req, res)),
);

/** Admin / Super Admin — audit JSON export with integrity fields */
securityRouter.get(
  "/audit/export",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.exportAuditLogs(req, res)),
);

/** Admin / Super Admin — data retention policies */
securityRouter.get(
  "/retention/policies",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.listRetentionPolicies(req, res),
  ),
);

securityRouter.get(
  "/retention/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.getRetentionStatus(req, res)),
);

securityRouter.post(
  "/retention/run",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  asyncHandler((req, res) =>
    securityController.runRetentionProcessor(req, res),
  ),
);

/** Admin / Super Admin — Zero Trust status & policies */
securityRouter.get(
  "/zero-trust/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.getZeroTrustStatus(req, res)),
);

securityRouter.get(
  "/zero-trust/policies",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.listZeroTrustPolicies(req, res),
  ),
);

/** Admin / Super Admin — Business Continuity & Disaster Recovery */
securityRouter.get(
  "/business-continuity/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.getBcdrStatus(req, res)),
);

securityRouter.get(
  "/business-continuity/services",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.getBcdrServices(req, res)),
);

securityRouter.post(
  "/business-continuity/test",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  asyncHandler((req, res) =>
    securityController.runBcdrRecoveryTest(req, res),
  ),
);

securityRouter.post(
  "/business-continuity/recovery-mode",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(setBcdrRecoveryModeSchema),
  asyncHandler((req, res) =>
    securityController.setBcdrRecoveryMode(req, res),
  ),
);

/** Admin / Super Admin — Enterprise Compliance Framework */
securityRouter.get(
  "/compliance/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.getComplianceStatus(req, res)),
);

securityRouter.get(
  "/compliance/frameworks",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.listComplianceFrameworks(req, res),
  ),
);

securityRouter.get(
  "/compliance/controls",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(complianceControlsQuerySchema, "query"),
  asyncHandler((req, res) =>
    securityController.listComplianceControls(req, res),
  ),
);

securityRouter.post(
  "/compliance/assessment",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  asyncHandler((req, res) =>
    securityController.runComplianceAssessment(req, res),
  ),
);

/** Admin / Super Admin — Enterprise SIEM Integration */
securityRouter.get(
  "/siem/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.getSiemStatus(req, res)),
);

securityRouter.get(
  "/siem/config",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) => securityController.getSiemConfig(req, res)),
);

securityRouter.post(
  "/siem/test",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  asyncHandler((req, res) =>
    securityController.testSiemConnectivity(req, res),
  ),
);

securityRouter.post(
  "/siem/export",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(siemExportQuerySchema, "query"),
  asyncHandler((req, res) => securityController.exportSiemEvents(req, res)),
);

securityRouter.post(
  "/siem/retry",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(siemRetryQuerySchema, "query"),
  asyncHandler((req, res) =>
    securityController.retrySiemDeadLetters(req, res),
  ),
);

/** Admin / Super Admin — Enterprise Backup Validation */
securityRouter.get(
  "/backup-validation/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getBackupValidationStatus(req, res),
  ),
);

securityRouter.get(
  "/backup-validation/report",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getBackupValidationReport(req, res),
  ),
);

securityRouter.post(
  "/backup-validation/run",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(runBackupValidationSchema),
  asyncHandler((req, res) =>
    securityController.runBackupValidation(req, res),
  ),
);

securityRouter.post(
  "/backup-validation/history",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(backupValidationHistoryQuerySchema, "query"),
  asyncHandler((req, res) =>
    securityController.getBackupValidationHistory(req, res),
  ),
);

/** Admin / Super Admin — Enterprise Encryption Audit */
securityRouter.get(
  "/encryption-audit/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getEncryptionAuditStatus(req, res),
  ),
);

securityRouter.get(
  "/encryption-audit/report",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getEncryptionAuditReport(req, res),
  ),
);

securityRouter.post(
  "/encryption-audit/run",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  asyncHandler((req, res) => securityController.runEncryptionAudit(req, res)),
);

securityRouter.post(
  "/encryption-audit/history",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(encryptionAuditHistoryQuerySchema, "query"),
  asyncHandler((req, res) =>
    securityController.getEncryptionAuditHistory(req, res),
  ),
);

/** Admin / Super Admin — Enterprise Disaster Recovery Test (simulation only) */
securityRouter.get(
  "/disaster-recovery/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getDisasterRecoveryTestStatus(req, res),
  ),
);

securityRouter.get(
  "/disaster-recovery/history",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(disasterRecoveryTestHistoryQuerySchema, "query"),
  asyncHandler((req, res) =>
    securityController.getDisasterRecoveryTestHistory(req, res),
  ),
);

securityRouter.post(
  "/disaster-recovery/run",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(runDisasterRecoveryTestSchema),
  asyncHandler((req, res) =>
    securityController.runDisasterRecoveryTest(req, res),
  ),
);

securityRouter.post(
  "/disaster-recovery/report",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getDisasterRecoveryTestReport(req, res),
  ),
);

/** Admin / Super Admin — Enterprise External Penetration Test (assessment only) */
securityRouter.get(
  "/pentest/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getPenetrationTestStatus(req, res),
  ),
);

securityRouter.get(
  "/pentest/report",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getPenetrationTestReport(req, res),
  ),
);

securityRouter.post(
  "/pentest/run",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(runPenetrationTestSchema),
  asyncHandler((req, res) => securityController.runPenetrationTest(req, res)),
);

securityRouter.get(
  "/pentest/history",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(penetrationTestHistoryQuerySchema, "query"),
  asyncHandler((req, res) =>
    securityController.getPenetrationTestHistory(req, res),
  ),
);

/** Admin / Super Admin — Enterprise Tenant Isolation Testing (assessment only) */
securityRouter.get(
  "/tenant-isolation/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getTenantIsolationStatus(req, res),
  ),
);

securityRouter.get(
  "/tenant-isolation/report",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getTenantIsolationReport(req, res),
  ),
);

securityRouter.post(
  "/tenant-isolation/run",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(runTenantIsolationSchema),
  asyncHandler((req, res) => securityController.runTenantIsolation(req, res)),
);

securityRouter.get(
  "/tenant-isolation/history",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(tenantIsolationHistoryQuerySchema, "query"),
  asyncHandler((req, res) =>
    securityController.getTenantIsolationHistory(req, res),
  ),
);

/** Admin / Super Admin — Enterprise Security Regression Testing (assessment only) */
securityRouter.get(
  "/regression/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getSecurityRegressionStatus(req, res),
  ),
);

securityRouter.get(
  "/regression/report",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getSecurityRegressionReport(req, res),
  ),
);

securityRouter.post(
  "/regression/run",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(runSecurityRegressionSchema),
  asyncHandler((req, res) =>
    securityController.runSecurityRegression(req, res),
  ),
);

securityRouter.get(
  "/regression/history",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(securityRegressionHistoryQuerySchema, "query"),
  asyncHandler((req, res) =>
    securityController.getSecurityRegressionHistory(req, res),
  ),
);

/** Admin / Super Admin — Enterprise API Versioning */
securityRouter.get(
  "/api-versioning/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getApiVersioningStatus(req, res),
  ),
);

securityRouter.get(
  "/api-versioning/versions",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getApiVersioningVersions(req, res),
  ),
);

securityRouter.get(
  "/api-versioning/compatibility",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getApiVersioningCompatibility(req, res),
  ),
);

/** Admin / Super Admin — Enterprise Signed Webhooks */
securityRouter.get(
  "/webhooks/status",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getWebhookSecurityStatus(req, res),
  ),
);

securityRouter.get(
  "/webhooks/deliveries",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getWebhookSecurityDeliveries(req, res),
  ),
);

securityRouter.get(
  "/webhooks/retries",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  asyncHandler((req, res) =>
    securityController.getWebhookSecurityRetries(req, res),
  ),
);

securityRouter.post(
  "/webhooks/rotate-secret",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  asyncHandler((req, res) =>
    securityController.rotateWebhookSecret(req, res),
  ),
);

securityRouter.post(
  "/webhooks/retry/:deliveryId",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(webhookRetryDeliveryParamsSchema, "params"),
  asyncHandler((req, res) =>
    securityController.retryWebhookDelivery(req, res),
  ),
);

securityRouter.get(
  "/login-history",
  readLimit,
  validate(listLoginHistoryQuerySchema, "query"),
  asyncHandler((req, res) => securityController.listLoginHistory(req, res)),
);

securityRouter.get(
  "/sessions",
  readLimit,
  validate(listActiveSessionsQuerySchema, "query"),
  asyncHandler((req, res) => securityController.listSessions(req, res)),
);

securityRouter.get(
  "/devices/user/:userId",
  readLimit,
  validate(deviceUserParamsSchema, "params"),
  asyncHandler((req, res) =>
    securityController.listManagedDevicesForUser(req, res),
  ),
);

securityRouter.get(
  "/devices/:id",
  readLimit,
  validate(deviceIdParamsSchema, "params"),
  asyncHandler((req, res) => securityController.getManagedDevice(req, res)),
);

securityRouter.post(
  "/devices/:id/trust",
  writeLimit,
  validate(deviceIdParamsSchema, "params"),
  validate(trustDeviceSchema),
  asyncHandler((req, res) => securityController.trustManagedDevice(req, res)),
);

securityRouter.post(
  "/devices/:id/rename",
  writeLimit,
  validate(deviceIdParamsSchema, "params"),
  validate(renameDeviceSchema),
  asyncHandler((req, res) => securityController.renameManagedDevice(req, res)),
);

securityRouter.post(
  "/devices/:id/block",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(deviceIdParamsSchema, "params"),
  validate(deviceActionSchema),
  asyncHandler((req, res) => securityController.blockManagedDevice(req, res)),
);

securityRouter.post(
  "/devices/:id/revoke",
  writeLimit,
  validate(deviceIdParamsSchema, "params"),
  validate(deviceActionSchema),
  asyncHandler((req, res) => securityController.revokeManagedDevice(req, res)),
);

securityRouter.delete(
  "/devices/:id",
  writeLimit,
  validate(deviceIdParamsSchema, "params"),
  asyncHandler((req, res) => securityController.removeManagedDevice(req, res)),
);

securityRouter.get(
  "/devices",
  readLimit,
  validate(listActiveSessionsQuerySchema, "query"),
  asyncHandler((req, res) => securityController.listDevices(req, res)),
);

securityRouter.get(
  "/alerts",
  readLimit,
  validate(listSecurityEventsQuerySchema, "query"),
  asyncHandler((req, res) => securityController.listAlerts(req, res)),
);

/** Phase 3 Step 10 — security events (alias of alerts list) */
securityRouter.get(
  "/events",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(listSecurityEventsQuerySchema, "query"),
  asyncHandler((req, res) => securityController.listEvents(req, res)),
);

securityRouter.get(
  "/incidents",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  readLimit,
  validate(listSecurityIncidentsQuerySchema, "query"),
  asyncHandler((req, res) => securityController.listIncidents(req, res)),
);

securityRouter.post(
  "/incidents/:id/resolve",
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  writeLimit,
  validate(resolveSecurityIncidentParamsSchema, "params"),
  asyncHandler((req, res) => securityController.resolveIncident(req, res)),
);

securityRouter.delete(
  "/sessions/:sessionId",
  writeLimit,
  validate(terminateSessionParamsSchema, "params"),
  asyncHandler((req, res) => securityController.terminateSession(req, res)),
);

securityRouter.post(
  "/password/change",
  passwordLimit,
  validate(changePasswordSchema),
  asyncHandler((req, res) => securityController.changePassword(req, res)),
);

securityRouter.post(
  "/accounts/unlock",
  authorizeAnyPermission(PERMISSIONS.SECURITY_MANAGE, PERMISSIONS.USERS_MANAGE),
  writeLimit,
  validate(unlockAccountSchema),
  asyncHandler((req, res) => securityController.unlockAccount(req, res)),
);

securityRouter.post(
  "/alerts/:eventId/resolve",
  authorizeAnyPermission(PERMISSIONS.SECURITY_MANAGE, PERMISSIONS.AUDIT_READ),
  writeLimit,
  validate(resolveSecurityEventParamsSchema, "params"),
  asyncHandler((req, res) => securityController.resolveAlert(req, res)),
);

export { securityRouter };
