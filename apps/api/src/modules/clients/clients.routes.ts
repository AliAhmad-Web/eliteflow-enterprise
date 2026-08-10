import { Router } from "express";

import { PERMISSIONS, RATE_LIMIT } from "@enterprise/shared";

import {
  authenticate,
  authorizePermissions,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { clientsController } from "./clients.controller.js";
import {
  clientActivityIdParamsSchema,
  clientIdParamsSchema,
  createClientActivitySchema,
  createClientSchema,
  linkPortalUserSchema,
  listClientActivitiesQuerySchema,
  listClientsQuerySchema,
  listUnlinkedPortalUsersQuerySchema,
  portalUserIdParamsSchema,
  updateClientPipelineStageSchema,
  updateClientSchema,
} from "./clients.validation.js";

const clientsRouter = Router();

clientsRouter.use(authenticate);

clientsRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.CLIENTS_READ),
  rateLimit({
    name: "clients.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listClientsQuerySchema, "query"),
  asyncHandler((req, res) => clientsController.list(req, res)),
);

clientsRouter.get(
  "/stats",
  authorizePermissions(PERMISSIONS.CLIENTS_READ),
  rateLimit({
    name: "clients.stats",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => clientsController.stats(req, res)),
);

clientsRouter.get(
  "/pipeline",
  authorizePermissions(PERMISSIONS.CLIENTS_READ),
  rateLimit({
    name: "clients.pipeline",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => clientsController.getPipelineBoard(req, res)),
);

// Must be registered before `/:id` so "portal-users" is not captured as an id.
clientsRouter.get(
  "/portal-users/unlinked",
  authorizePermissions(PERMISSIONS.CLIENTS_READ),
  rateLimit({
    name: "clients.portal_users.unlinked",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listUnlinkedPortalUsersQuerySchema, "query"),
  asyncHandler((req, res) =>
    clientsController.listUnlinkedPortalUsers(req, res),
  ),
);

clientsRouter.get(
  "/:id/portal-users",
  authorizePermissions(PERMISSIONS.CLIENTS_READ),
  rateLimit({
    name: "clients.portal_users.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientIdParamsSchema, "params"),
  asyncHandler((req, res) => clientsController.listPortalUsers(req, res)),
);

clientsRouter.post(
  "/:id/portal-users",
  authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
  rateLimit({
    name: "clients.portal_users.link",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientIdParamsSchema, "params"),
  validate(linkPortalUserSchema),
  asyncHandler((req, res) => clientsController.linkPortalUser(req, res)),
);

clientsRouter.delete(
  "/:id/portal-users/:userId",
  authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
  rateLimit({
    name: "clients.portal_users.unlink",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(portalUserIdParamsSchema, "params"),
  asyncHandler((req, res) => clientsController.unlinkPortalUser(req, res)),
);

clientsRouter.get(
  "/:id/activities",
  authorizePermissions(PERMISSIONS.CLIENTS_READ),
  rateLimit({
    name: "clients.activities.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientIdParamsSchema, "params"),
  validate(listClientActivitiesQuerySchema, "query"),
  asyncHandler((req, res) => clientsController.listActivities(req, res)),
);

clientsRouter.post(
  "/:id/activities",
  authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
  rateLimit({
    name: "clients.activities.create",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientIdParamsSchema, "params"),
  validate(createClientActivitySchema),
  asyncHandler((req, res) => clientsController.createActivity(req, res)),
);

clientsRouter.delete(
  "/:id/activities/:activityId",
  authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
  rateLimit({
    name: "clients.activities.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientActivityIdParamsSchema, "params"),
  asyncHandler((req, res) => clientsController.deleteActivity(req, res)),
);

clientsRouter.patch(
  "/:id/pipeline-stage",
  authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
  rateLimit({
    name: "clients.pipeline_stage.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientIdParamsSchema, "params"),
  validate(updateClientPipelineStageSchema),
  asyncHandler((req, res) => clientsController.updatePipelineStage(req, res)),
);

clientsRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.CLIENTS_READ),
  rateLimit({
    name: "clients.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientIdParamsSchema, "params"),
  asyncHandler((req, res) => clientsController.getById(req, res)),
);

clientsRouter.post(
  "/",
  authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
  rateLimit({
    name: "clients.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createClientSchema),
  asyncHandler((req, res) => clientsController.create(req, res)),
);

clientsRouter.patch(
  "/:id",
  authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
  rateLimit({
    name: "clients.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientIdParamsSchema, "params"),
  validate(updateClientSchema),
  asyncHandler((req, res) => clientsController.update(req, res)),
);

clientsRouter.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.CLIENTS_DELETE),
  rateLimit({
    name: "clients.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(clientIdParamsSchema, "params"),
  asyncHandler((req, res) => clientsController.remove(req, res)),
);

export { clientsRouter };
