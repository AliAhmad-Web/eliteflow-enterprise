import { Router } from "express";

import { RATE_LIMIT, UserRole } from "@enterprise/shared";

import {
  authenticate,
  authorizeRoles,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByIp,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { integrationsController } from "./integrations.controller.js";
import {
  connectApiKeyIntegrationSchema,
  connectIntegrationSchema,
  disconnectIntegrationSchema,
  integrationIdParamsSchema,
  integrationSlugParamsSchema,
  listIntegrationAlertsQuerySchema,
  listIntegrationLogsQuerySchema,
  listIntegrationsQuerySchema,
  listSyncHistoryQuerySchema,
  manualSyncSchema,
  oauthCallbackQuerySchema,
  oauthProviderParamsSchema,
  syncJobIdParamsSchema,
  testIntegrationSchema,
  updateSchedulerConfigSchema,
} from "./integrations.validation.js";

const integrationsRouter = Router();

const readLimit = rateLimit({
  name: "integrations.read",
  ...RATE_LIMIT.GLOBAL_API,
  keyGenerator: rateLimitByUser,
});

const writeLimit = rateLimit({
  name: "integrations.write",
  max: 40,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

const oauthCallbackLimit = rateLimit({
  name: "integrations.oauth_callback",
  max: 30,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByIp,
});

/** Only Admin and Super Admin may connect / disconnect / test. */
const manageGate = authorizeRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN);

/**
 * OAuth provider callbacks — public (validated via signed state).
 * Must be registered before authenticate middleware.
 */
integrationsRouter.get(
  "/oauth/callback/google",
  oauthCallbackLimit,
  validate(oauthCallbackQuerySchema, "query"),
  asyncHandler((req, res) =>
    integrationsController.oauthCallbackGoogle(req, res),
  ),
);

integrationsRouter.get(
  "/oauth/callback/github",
  oauthCallbackLimit,
  validate(oauthCallbackQuerySchema, "query"),
  asyncHandler((req, res) =>
    integrationsController.oauthCallbackGitHub(req, res),
  ),
);

integrationsRouter.use(authenticate);

integrationsRouter.get(
  "/",
  readLimit,
  validate(listIntegrationsQuerySchema, "query"),
  asyncHandler((req, res) => integrationsController.list(req, res)),
);

integrationsRouter.get(
  "/logs",
  readLimit,
  validate(listIntegrationLogsQuerySchema, "query"),
  asyncHandler((req, res) => integrationsController.logs(req, res)),
);

integrationsRouter.get(
  "/history",
  readLimit,
  validate(listSyncHistoryQuerySchema, "query"),
  asyncHandler((req, res) => integrationsController.history(req, res)),
);

integrationsRouter.get(
  "/by-slug/:slug",
  readLimit,
  validate(integrationSlugParamsSchema, "params"),
  asyncHandler((req, res) => integrationsController.getBySlug(req, res)),
);

/** Provider-specific routes MUST be registered before /:id and /:idOrSlug/* */
const oauthProviders = ["gmail", "google-calendar", "github"] as const;

for (const provider of oauthProviders) {
  integrationsRouter.post(
    `/${provider}/connect`,
    manageGate,
    writeLimit,
    asyncHandler((req, res) => {
      req.params.provider = provider;
      return integrationsController.providerConnect(req, res);
    }),
  );

  integrationsRouter.post(
    `/${provider}/disconnect`,
    manageGate,
    writeLimit,
    asyncHandler((req, res) => {
      req.params.provider = provider;
      return integrationsController.providerDisconnect(req, res);
    }),
  );

  integrationsRouter.post(
    `/${provider}/test`,
    manageGate,
    writeLimit,
    asyncHandler((req, res) => {
      req.params.provider = provider;
      return integrationsController.providerTest(req, res);
    }),
  );

  integrationsRouter.get(
    `/${provider}/status`,
    readLimit,
    asyncHandler((req, res) => {
      req.params.provider = provider;
      return integrationsController.providerStatus(req, res);
    }),
  );
}

const apiKeyProviders = [
  "gemini",
  "openai",
  "stripe",
  "cloudinary",
  "supabase",
  "resend",
] as const;

for (const provider of apiKeyProviders) {
  integrationsRouter.post(
    `/${provider}/connect`,
    manageGate,
    writeLimit,
    validate(connectApiKeyIntegrationSchema),
    asyncHandler((req, res) => {
      req.params.provider = provider;
      return integrationsController.apiKeyConnect(req, res);
    }),
  );

  integrationsRouter.post(
    `/${provider}/disconnect`,
    manageGate,
    writeLimit,
    asyncHandler((req, res) => {
      req.params.provider = provider;
      return integrationsController.apiKeyDisconnect(req, res);
    }),
  );

  integrationsRouter.post(
    `/${provider}/test`,
    manageGate,
    writeLimit,
    asyncHandler((req, res) => {
      req.params.provider = provider;
      return integrationsController.apiKeyTest(req, res);
    }),
  );

  integrationsRouter.get(
    `/${provider}/status`,
    readLimit,
    asyncHandler((req, res) => {
      req.params.provider = provider;
      return integrationsController.apiKeyStatus(req, res);
    }),
  );
}

/** Phase 19.4 — Monitoring platform */
integrationsRouter.get(
  "/monitoring",
  readLimit,
  asyncHandler((req, res) => integrationsController.monitoringOverview(req, res)),
);

integrationsRouter.get(
  "/monitoring/:idOrSlug",
  readLimit,
  asyncHandler((req, res) =>
    integrationsController.monitoringForIntegration(req, res),
  ),
);

integrationsRouter.get(
  "/queue",
  readLimit,
  asyncHandler((req, res) => integrationsController.queueOverview(req, res)),
);

integrationsRouter.get(
  "/queue/:idOrSlug",
  readLimit,
  asyncHandler((req, res) =>
    integrationsController.queueForIntegration(req, res),
  ),
);

integrationsRouter.get(
  "/webhooks/monitor",
  readLimit,
  asyncHandler((req, res) => integrationsController.webhookMonitor(req, res)),
);

integrationsRouter.get(
  "/webhooks/monitor/:idOrSlug",
  readLimit,
  asyncHandler((req, res) =>
    integrationsController.webhookMonitorForIntegration(req, res),
  ),
);

integrationsRouter.get(
  "/alerts",
  readLimit,
  validate(listIntegrationAlertsQuerySchema, "query"),
  asyncHandler((req, res) => integrationsController.listAlerts(req, res)),
);

integrationsRouter.post(
  "/alerts/evaluate",
  manageGate,
  writeLimit,
  asyncHandler((req, res) => integrationsController.evaluateAlerts(req, res)),
);

integrationsRouter.post(
  "/alerts/:alertId/acknowledge",
  manageGate,
  writeLimit,
  asyncHandler((req, res) => integrationsController.acknowledgeAlert(req, res)),
);

integrationsRouter.post(
  "/sync/:jobId/retry",
  manageGate,
  writeLimit,
  validate(syncJobIdParamsSchema, "params"),
  asyncHandler((req, res) => integrationsController.retrySync(req, res)),
);

integrationsRouter.post(
  "/sync/:jobId/cancel",
  manageGate,
  writeLimit,
  validate(syncJobIdParamsSchema, "params"),
  asyncHandler((req, res) => integrationsController.cancelSync(req, res)),
);

integrationsRouter.get(
  "/platform/:idOrSlug",
  readLimit,
  asyncHandler((req, res) => integrationsController.platformDetail(req, res)),
);

integrationsRouter.get(
  "/:idOrSlug/usage",
  readLimit,
  asyncHandler((req, res) => integrationsController.usageAnalytics(req, res)),
);

integrationsRouter.get(
  "/:idOrSlug/scheduler",
  readLimit,
  asyncHandler((req, res) => integrationsController.getScheduler(req, res)),
);

integrationsRouter.put(
  "/:idOrSlug/scheduler",
  manageGate,
  writeLimit,
  validate(updateSchedulerConfigSchema),
  asyncHandler((req, res) => integrationsController.updateScheduler(req, res)),
);

integrationsRouter.post(
  "/:idOrSlug/sync",
  manageGate,
  writeLimit,
  validate(manualSyncSchema),
  asyncHandler((req, res) => integrationsController.manualSync(req, res)),
);

/** Spec alias: GET /integrations/:provider/status (OAuth only via schema) */
integrationsRouter.get(
  "/:provider/status",
  readLimit,
  validate(oauthProviderParamsSchema, "params"),
  asyncHandler((req, res) => integrationsController.providerStatus(req, res)),
);

integrationsRouter.get(
  "/:id",
  readLimit,
  validate(integrationIdParamsSchema, "params"),
  asyncHandler((req, res) => integrationsController.getById(req, res)),
);

integrationsRouter.post(
  "/connect",
  manageGate,
  writeLimit,
  validate(connectIntegrationSchema),
  asyncHandler((req, res) => integrationsController.connect(req, res)),
);

integrationsRouter.post(
  "/disconnect",
  manageGate,
  writeLimit,
  validate(disconnectIntegrationSchema),
  asyncHandler((req, res) => integrationsController.disconnect(req, res)),
);

integrationsRouter.post(
  "/test",
  manageGate,
  writeLimit,
  validate(testIntegrationSchema),
  asyncHandler((req, res) => integrationsController.test(req, res)),
);

export { integrationsRouter };
