import { Router } from "express";

import {
  PERMISSIONS,
  RATE_LIMIT,
  RECAPTCHA,
} from "@enterprise/shared";

import {
  authenticate,
  authorizeAnyPermission,
  authorizePermissions,
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
  contactFormSchema,
  listActiveSessionsQuerySchema,
  listLoginHistoryQuerySchema,
  listSecurityEventsQuerySchema,
  listSecurityLogsQuerySchema,
  resolveSecurityEventParamsSchema,
  terminateSessionParamsSchema,
  unlockAccountSchema,
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
