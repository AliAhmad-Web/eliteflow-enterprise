import type { Request, Response } from "express";

import type {
  ChangePasswordInput,
  ContactFormInput,
  ListActiveSessionsQueryInput,
  ListLoginHistoryQueryInput,
  ListSecurityEventsQueryInput,
  ListSecurityLogsQueryInput,
  UnlockAccountInput,
} from "@enterprise/shared";

import { issueCsrfToken } from "../../middleware/csrf.middleware.js";
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

  async listAuditLogs(req: Request, res: Response) {
    const result = await securityService.listAuditLogs(
      req.query as unknown as ListSecurityLogsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Audit logs retrieved"));
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
    const result = await securityService.listActiveDevices(
      req.query as unknown as ListActiveSessionsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Connected devices retrieved"));
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
    const token = issueCsrfToken(res);
    res.json(successResponse({ csrfToken: token }, "CSRF token issued"));
  }
}

export const securityController = new SecurityController();
