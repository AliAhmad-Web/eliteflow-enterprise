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
  clientIdParamsSchema,
  createClientSchema,
  listClientsQuerySchema,
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
