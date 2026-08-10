import { Router } from "express";

import {
  PERMISSIONS,
  PUBLIC_API_SCOPES,
  RATE_LIMIT,
  createPublicApiKeySchema,
  publicApiIdParamsSchema,
  publicApiKeyIdParamsSchema,
  publicApiListQuerySchema,
} from "@enterprise/shared";

import {
  authenticate,
  authorizePermissions,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByIp,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import {
  authenticatePublicApiKey,
  publicApiContractMiddleware,
  requirePublicScopes,
} from "./public-api.auth.middleware.js";
import { publicApiController } from "./public-api.controller.js";

const publicApiRouter = Router();

publicApiRouter.use(publicApiContractMiddleware);

/** OpenAPI — unauthenticated documentation only (no data). */
publicApiRouter.get(
  "/openapi.json",
  rateLimit({
    name: "public.openapi",
    max: 30,
    windowMs: 60_000,
    keyGenerator: rateLimitByIp,
  }),
  asyncHandler((req, res) => publicApiController.openapi(req, res)),
);

/**
 * Key management — session JWT + INTEGRATIONS_MANAGE.
 * CLIENT cannot create or revoke public API keys.
 */
publicApiRouter.post(
  "/keys",
  authenticate,
  authorizePermissions(PERMISSIONS.INTEGRATIONS_MANAGE),
  rateLimit({
    name: "public.keys.create",
    ...RATE_LIMIT.PUBLIC_API_KEY_MANAGE,
    keyGenerator: rateLimitByUser,
  }),
  validate(createPublicApiKeySchema, "body"),
  asyncHandler((req, res) => publicApiController.createKey(req, res)),
);

publicApiRouter.get(
  "/keys",
  authenticate,
  authorizePermissions(PERMISSIONS.INTEGRATIONS_MANAGE),
  rateLimit({
    name: "public.keys.list",
    ...RATE_LIMIT.PUBLIC_API_KEY_MANAGE,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => publicApiController.listKeys(req, res)),
);

publicApiRouter.post(
  "/keys/:id/revoke",
  authenticate,
  authorizePermissions(PERMISSIONS.INTEGRATIONS_MANAGE),
  rateLimit({
    name: "public.keys.revoke",
    ...RATE_LIMIT.PUBLIC_API_KEY_MANAGE,
    keyGenerator: rateLimitByUser,
  }),
  validate(publicApiKeyIdParamsSchema, "params"),
  asyncHandler((req, res) => publicApiController.revokeKey(req, res)),
);

function publicReadRateLimit(name: string) {
  return rateLimit({
    name,
    ...RATE_LIMIT.PUBLIC_API,
    keyGenerator: (req) =>
      req.publicApi?.keyId
        ? `public-key:${req.publicApi.keyId}`
        : rateLimitByIp(req),
  });
}

/** Data plane — API key auth only. Company scope from key, never from query. */
publicApiRouter.get(
  "/me",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.PUBLIC_READ),
  publicReadRateLimit("public.me"),
  asyncHandler((req, res) => publicApiController.me(req, res)),
);

publicApiRouter.get(
  "/clients",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.CLIENTS_READ),
  publicReadRateLimit("public.clients.list"),
  validate(publicApiListQuerySchema, "query"),
  asyncHandler((req, res) => publicApiController.listClients(req, res)),
);

publicApiRouter.get(
  "/clients/:id",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.CLIENTS_READ),
  publicReadRateLimit("public.clients.get"),
  validate(publicApiIdParamsSchema, "params"),
  asyncHandler((req, res) => publicApiController.getClient(req, res)),
);

publicApiRouter.get(
  "/projects",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.PROJECTS_READ),
  publicReadRateLimit("public.projects.list"),
  validate(publicApiListQuerySchema, "query"),
  asyncHandler((req, res) => publicApiController.listProjects(req, res)),
);

publicApiRouter.get(
  "/projects/:id",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.PROJECTS_READ),
  publicReadRateLimit("public.projects.get"),
  validate(publicApiIdParamsSchema, "params"),
  asyncHandler((req, res) => publicApiController.getProject(req, res)),
);

publicApiRouter.get(
  "/tasks",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.TASKS_READ),
  publicReadRateLimit("public.tasks.list"),
  validate(publicApiListQuerySchema, "query"),
  asyncHandler((req, res) => publicApiController.listTasks(req, res)),
);

publicApiRouter.get(
  "/tasks/:id",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.TASKS_READ),
  publicReadRateLimit("public.tasks.get"),
  validate(publicApiIdParamsSchema, "params"),
  asyncHandler((req, res) => publicApiController.getTask(req, res)),
);

publicApiRouter.get(
  "/invoices",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.INVOICES_READ),
  publicReadRateLimit("public.invoices.list"),
  validate(publicApiListQuerySchema, "query"),
  asyncHandler((req, res) => publicApiController.listInvoices(req, res)),
);

publicApiRouter.get(
  "/invoices/:id",
  authenticatePublicApiKey,
  requirePublicScopes(PUBLIC_API_SCOPES.INVOICES_READ),
  publicReadRateLimit("public.invoices.get"),
  validate(publicApiIdParamsSchema, "params"),
  asyncHandler((req, res) => publicApiController.getInvoice(req, res)),
);

export { publicApiRouter };
