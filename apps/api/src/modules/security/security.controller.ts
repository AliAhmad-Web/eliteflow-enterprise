import type { Request, Response } from "express";

import type {
  ChangePasswordInput,
  ContactFormInput,
  ComplianceControlsQueryInput,
  ListActiveSessionsQueryInput,
  ListLoginHistoryQueryInput,
  ListSecurityEventsQueryInput,
  ListSecurityIncidentsQueryInput,
  ListSecurityLogsQueryInput,
  SetBcdrRecoveryModeInput,
  SiemExportQueryInput,
  SiemRetryQueryInput,
  RunBackupValidationInput,
  BackupValidationHistoryQueryInput,
  EncryptionAuditHistoryQueryInput,
  RunDisasterRecoveryTestInput,
  DisasterRecoveryTestHistoryQueryInput,
  RunPenetrationTestInput,
  PenetrationTestHistoryQueryInput,
  ListManagedDevicesQueryInput,
  TrustDeviceInput,
  RenameDeviceInput,
  DeviceActionInput,
  RunTenantIsolationInput,
  TenantIsolationHistoryQueryInput,
  RunSecurityRegressionInput,
  SecurityRegressionHistoryQueryInput,
  UnlockAccountInput,
} from "@enterprise/shared";

import { csrfService, issueCsrfToken } from "../../shared/security/csrf/index.js";
import { successResponse } from "../../shared/utils/api-response.js";
import { SECURITY_ERROR_CODES, SecurityError } from "./security.errors.js";
import { securityService } from "./security.service.js";
import type { SecurityActor, SecurityRequestContext } from "./security.types.js";

function getActor(req: Request): SecurityActor {
  if (!req.auth) {
    throw new SecurityError(
      "Authentication required",
      401,
      SECURITY_ERROR_CODES.FORBIDDEN,
    );
  }

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    permissions: req.auth.permissions,
    sessionId: req.auth.sessionId,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? null,
  };
}

function getContext(req: Request): SecurityRequestContext {
  return {
    ipAddress: req.ip ?? "0.0.0.0",
    userAgent: req.get("user-agent") ?? "unknown",
  };
}

export class SecurityController {
  async dashboard(req: Request, res: Response) {
    const result = await securityService.getDashboard(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Security dashboard retrieved"));
  }

  async passwordStatus(req: Request, res: Response) {
    const result = await securityService.getPasswordStatus(getActor(req).userId);
    res.json(successResponse(result, "Password status retrieved"));
  }

  async passwordPolicy(req: Request, res: Response) {
    void getActor(req);
    const result = await securityService.getPasswordPolicy();
    res.json(successResponse(result, "Password policy retrieved"));
  }

  async listAuditLogs(req: Request, res: Response) {
    const result = await securityService.listAuditLogs(
      req.query as unknown as ListSecurityLogsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Audit logs retrieved"));
  }

  async verifyAuditChain(req: Request, res: Response) {
    const result = await securityService.verifyAuditChain(
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(
        result,
        result.chainValid
          ? "Audit integrity chain verified"
          : "Audit integrity verification completed",
      ),
    );
  }

  async exportAuditLogs(req: Request, res: Response) {
    const result = await securityService.exportAuditLogs(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Audit log export ready"));
  }

  async listRetentionPolicies(req: Request, res: Response) {
    const result = await securityService.listRetentionPolicies(getActor(req));
    res.json(successResponse(result, "Retention policies retrieved"));
  }

  async getRetentionStatus(req: Request, res: Response) {
    const result = await securityService.getRetentionStatus(getActor(req));
    res.json(successResponse(result, "Retention status retrieved"));
  }

  async runRetentionProcessor(req: Request, res: Response) {
    const result = await securityService.runRetentionProcessor(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Retention processor completed"));
  }

  async getZeroTrustStatus(req: Request, res: Response) {
    const result = await securityService.getZeroTrustStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Zero Trust status retrieved"));
  }

  async listZeroTrustPolicies(req: Request, res: Response) {
    const result = await securityService.listZeroTrustPolicies(getActor(req));
    res.json(successResponse(result, "Zero Trust policies retrieved"));
  }

  async getBcdrStatus(req: Request, res: Response) {
    const result = await securityService.getBcdrStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Business continuity status retrieved"));
  }

  async getBcdrServices(req: Request, res: Response) {
    const result = await securityService.getBcdrServices(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Business continuity services retrieved"));
  }

  async runBcdrRecoveryTest(req: Request, res: Response) {
    const result = await securityService.runBcdrRecoveryTest(
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(result, "Business continuity recovery test completed"),
    );
  }

  async setBcdrRecoveryMode(req: Request, res: Response) {
    const result = await securityService.setBcdrRecoveryMode(
      req.body as SetBcdrRecoveryModeInput,
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(result, "Business continuity recovery mode updated"),
    );
  }

  async getComplianceStatus(req: Request, res: Response) {
    const result = await securityService.getComplianceStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Compliance status retrieved"));
  }

  async listComplianceFrameworks(req: Request, res: Response) {
    const result = await securityService.listComplianceFrameworks(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Compliance frameworks retrieved"));
  }

  async listComplianceControls(req: Request, res: Response) {
    const result = await securityService.listComplianceControls(
      req.query as unknown as ComplianceControlsQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Compliance controls retrieved"));
  }

  async runComplianceAssessment(req: Request, res: Response) {
    const result = await securityService.runComplianceAssessment(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Compliance assessment completed"));
  }

  async getSiemStatus(req: Request, res: Response) {
    const result = await securityService.getSiemStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "SIEM status retrieved"));
  }

  async getSiemConfig(req: Request, res: Response) {
    const result = await securityService.getSiemConfig(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "SIEM configuration retrieved"));
  }

  async testSiemConnectivity(req: Request, res: Response) {
    const result = await securityService.testSiemConnectivity(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "SIEM connectivity test completed"));
  }

  async exportSiemEvents(req: Request, res: Response) {
    const result = await securityService.exportSiemEvents(
      req.query as unknown as SiemExportQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "SIEM export ready"));
  }

  async retrySiemDeadLetters(req: Request, res: Response) {
    const result = await securityService.retrySiemDeadLetters(
      req.query as unknown as SiemRetryQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "SIEM dead-letter retry completed"));
  }

  async getBackupValidationStatus(req: Request, res: Response) {
    const result = await securityService.getBackupValidationStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Backup validation status retrieved"));
  }

  async getBackupValidationReport(req: Request, res: Response) {
    const result = await securityService.getBackupValidationReport(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Backup validation report retrieved"));
  }

  async runBackupValidation(req: Request, res: Response) {
    const result = await securityService.runBackupValidation(
      req.body as RunBackupValidationInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Backup validation completed"));
  }

  async getBackupValidationHistory(req: Request, res: Response) {
    const result = await securityService.getBackupValidationHistory(
      req.query as unknown as BackupValidationHistoryQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Backup validation history retrieved"));
  }

  async getEncryptionAuditStatus(req: Request, res: Response) {
    const result = await securityService.getEncryptionAuditStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Encryption audit status retrieved"));
  }

  async getEncryptionAuditReport(req: Request, res: Response) {
    const result = await securityService.getEncryptionAuditReport(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Encryption audit report retrieved"));
  }

  async runEncryptionAudit(req: Request, res: Response) {
    const result = await securityService.runEncryptionAudit(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Encryption audit completed"));
  }

  async getEncryptionAuditHistory(req: Request, res: Response) {
    const result = await securityService.getEncryptionAuditHistory(
      req.query as unknown as EncryptionAuditHistoryQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Encryption audit history retrieved"));
  }

  async getDisasterRecoveryTestStatus(req: Request, res: Response) {
    const result = await securityService.getDisasterRecoveryTestStatus(
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(result, "Disaster recovery test status retrieved"),
    );
  }

  async getDisasterRecoveryTestHistory(req: Request, res: Response) {
    const result = await securityService.getDisasterRecoveryTestHistory(
      req.query as unknown as DisasterRecoveryTestHistoryQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(result, "Disaster recovery test history retrieved"),
    );
  }

  async runDisasterRecoveryTest(req: Request, res: Response) {
    const result = await securityService.runDisasterRecoveryTest(
      req.body as RunDisasterRecoveryTestInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Disaster recovery test completed"));
  }

  async getDisasterRecoveryTestReport(req: Request, res: Response) {
    const result = await securityService.getDisasterRecoveryTestReport(
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(result, "Disaster recovery test report retrieved"),
    );
  }

  async getPenetrationTestStatus(req: Request, res: Response) {
    const result = await securityService.getPenetrationTestStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Penetration test status retrieved"));
  }

  async getPenetrationTestReport(req: Request, res: Response) {
    const result = await securityService.getPenetrationTestReport(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Penetration test report retrieved"));
  }

  async runPenetrationTest(req: Request, res: Response) {
    const result = await securityService.runPenetrationTest(
      req.body as RunPenetrationTestInput,
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(result, "Penetration test assessment completed"),
    );
  }

  async getPenetrationTestHistory(req: Request, res: Response) {
    const result = await securityService.getPenetrationTestHistory(
      req.query as unknown as PenetrationTestHistoryQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Penetration test history retrieved"));
  }

  async getTenantIsolationStatus(req: Request, res: Response) {
    const result = await securityService.getTenantIsolationStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Tenant isolation status retrieved"));
  }

  async getTenantIsolationReport(req: Request, res: Response) {
    const result = await securityService.getTenantIsolationReport(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Tenant isolation report retrieved"));
  }

  async runTenantIsolation(req: Request, res: Response) {
    const result = await securityService.runTenantIsolation(
      (req.body ?? {}) as RunTenantIsolationInput,
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(result, "Tenant isolation assessment completed"),
    );
  }

  async getTenantIsolationHistory(req: Request, res: Response) {
    const result = await securityService.getTenantIsolationHistory(
      req.query as unknown as TenantIsolationHistoryQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Tenant isolation history retrieved"));
  }

  async getSecurityRegressionStatus(req: Request, res: Response) {
    const result = await securityService.getSecurityRegressionStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Security regression status retrieved"));
  }

  async getSecurityRegressionReport(req: Request, res: Response) {
    const result = await securityService.getSecurityRegressionReport(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Security regression report retrieved"));
  }

  async runSecurityRegression(req: Request, res: Response) {
    const result = await securityService.runSecurityRegression(
      (req.body ?? {}) as RunSecurityRegressionInput,
      getActor(req),
      getContext(req),
    );
    res.json(
      successResponse(result, "Security regression assessment completed"),
    );
  }

  async getSecurityRegressionHistory(req: Request, res: Response) {
    const result = await securityService.getSecurityRegressionHistory(
      req.query as unknown as SecurityRegressionHistoryQueryInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Security regression history retrieved"));
  }

  async getApiVersioningStatus(req: Request, res: Response) {
    const result = await securityService.getApiVersioningStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "API versioning status retrieved"));
  }

  async getApiVersioningVersions(req: Request, res: Response) {
    const result = await securityService.getApiVersioningVersions(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "API versions retrieved"));
  }

  async getApiVersioningCompatibility(req: Request, res: Response) {
    const result = await securityService.getApiVersioningCompatibility(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "API version compatibility retrieved"));
  }

  async getWebhookSecurityStatus(req: Request, res: Response) {
    const result = await securityService.getWebhookSecurityStatus(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Webhook security status retrieved"));
  }

  async getWebhookSecurityDeliveries(req: Request, res: Response) {
    const result = await securityService.getWebhookSecurityDeliveries(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Webhook deliveries retrieved"));
  }

  async getWebhookSecurityRetries(req: Request, res: Response) {
    const result = await securityService.getWebhookSecurityRetries(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Webhook retries retrieved"));
  }

  async rotateWebhookSecret(req: Request, res: Response) {
    const result = await securityService.rotateWebhookSecret(
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Webhook signing secret rotated"));
  }

  async retryWebhookDelivery(req: Request, res: Response) {
    const result = await securityService.retryWebhookDelivery(
      String(req.params.deliveryId),
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Webhook delivery retry requested"));
  }

  async listLoginHistory(req: Request, res: Response) {
    const result = await securityService.listLoginHistory(
      req.query as unknown as ListLoginHistoryQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Login history retrieved"));
  }

  async listSessions(req: Request, res: Response) {
    const result = await securityService.listActiveDevices(
      req.query as unknown as ListActiveSessionsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Active sessions retrieved"));
  }

  async listDevices(req: Request, res: Response) {
    const query = req.query as unknown as ListActiveSessionsQueryInput & {
      inventory?: string;
      state?: string;
    };
    const inventory = query.inventory === "true";

    if (inventory) {
      const result = await securityService.listManagedDevices(
        {
          page: query.page,
          pageSize: query.pageSize,
          userId: query.userId,
          state: query.state as ListManagedDevicesQueryInput["state"],
          inventory: true,
        },
        getActor(req),
      );
      res.json(successResponse(result, "Managed devices retrieved"));
      return;
    }

    const result = await securityService.listActiveDevices(
      query,
      getActor(req),
    );
    res.json(successResponse(result, "Connected devices retrieved"));
  }

  async getManagedDevice(req: Request, res: Response) {
    const result = await securityService.getManagedDevice(
      req.params.id as string,
      getActor(req),
    );
    res.json(successResponse(result, "Device retrieved"));
  }

  async listManagedDevicesForUser(req: Request, res: Response) {
    const result = await securityService.listManagedDevicesForUser(
      req.params.userId as string,
      getActor(req),
    );
    res.json(successResponse(result, "User devices retrieved"));
  }

  async trustManagedDevice(req: Request, res: Response) {
    const result = await securityService.trustManagedDevice(
      req.params.id as string,
      req.body as TrustDeviceInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Device trusted"));
  }

  async renameManagedDevice(req: Request, res: Response) {
    const result = await securityService.renameManagedDevice(
      req.params.id as string,
      req.body as RenameDeviceInput,
      getActor(req),
    );
    res.json(successResponse(result, "Device renamed"));
  }

  async blockManagedDevice(req: Request, res: Response) {
    const result = await securityService.blockManagedDevice(
      req.params.id as string,
      (req.body ?? {}) as DeviceActionInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Device blocked"));
  }

  async revokeManagedDevice(req: Request, res: Response) {
    const result = await securityService.revokeManagedDevice(
      req.params.id as string,
      (req.body ?? {}) as DeviceActionInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Device revoked"));
  }

  async removeManagedDevice(req: Request, res: Response) {
    const result = await securityService.removeManagedDevice(
      req.params.id as string,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, "Device removed"));
  }

  async listPasswordHistory(req: Request, res: Response) {
    const result = await securityService.listPasswordHistory(getActor(req));
    res.json(successResponse(result, "Password history retrieved"));
  }

  async listAlerts(req: Request, res: Response) {
    const result = await securityService.listSecurityEvents(
      req.query as unknown as ListSecurityEventsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Security alerts retrieved"));
  }

  async listEvents(req: Request, res: Response) {
    const result = await securityService.listSecurityEvents(
      req.query as unknown as ListSecurityEventsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Security events retrieved"));
  }

  async listIncidents(req: Request, res: Response) {
    const result = await securityService.listSecurityIncidents(
      req.query as unknown as ListSecurityIncidentsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Security incidents retrieved"));
  }

  async resolveIncident(req: Request, res: Response) {
    const incidentId = String(req.params.id);
    const result = await securityService.resolveIncident(
      incidentId,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async terminateSession(req: Request, res: Response) {
    const sessionId = String(req.params.sessionId);
    const result = await securityService.terminateSession(
      sessionId,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async changePassword(req: Request, res: Response) {
    const result = await securityService.changePassword(
      req.body as ChangePasswordInput,
      getActor(req),
      getContext(req),
    );

    const actor = getActor(req);
    await csrfService.rotate(req, res, {
      sessionId: actor.sessionId,
      userId: actor.userId,
      tenantId: null,
    });

    res.json(successResponse(result, result.message));
  }

  async unlockAccount(req: Request, res: Response) {
    const result = await securityService.unlockAccount(
      req.body as UnlockAccountInput,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async resolveAlert(req: Request, res: Response) {
    const eventId = String(req.params.eventId);
    const result = await securityService.resolveAlert(
      eventId,
      getActor(req),
      getContext(req),
    );
    res.json(successResponse(result, result.message));
  }

  async submitContact(req: Request, res: Response) {
    const result = await securityService.submitContact(
      req.body as ContactFormInput,
      getContext(req),
    );
    res.status(201).json(successResponse(result, result.message));
  }

  async csrfToken(req: Request, res: Response) {
    const token = await issueCsrfToken(req, res);
    res.json(successResponse({ csrfToken: token }, "CSRF token issued"));
  }
}

export const securityController = new SecurityController();
