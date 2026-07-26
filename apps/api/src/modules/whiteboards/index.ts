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
import { whiteboardsController } from "./whiteboards.controller.js";
import {
  createWhiteboardCommentSchema,
  createWhiteboardSchema,
  duplicateWhiteboardSchema,
  listWhiteboardsQuerySchema,
  renameWhiteboardSchema,
  updateWhiteboardSchema,
  whiteboardAiRequestSchema,
  whiteboardIdParamsSchema,
} from "./whiteboards.validation.js";

const whiteboardsRouter = Router();
whiteboardsRouter.use(authenticate);

const readLimit = rateLimit({
  name: "whiteboards.read",
  ...RATE_LIMIT.GLOBAL_API,
  keyGenerator: rateLimitByUser,
});

const writeLimit = rateLimit({
  name: "whiteboards.write",
  max: 120,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

whiteboardsRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_READ),
  readLimit,
  validate(listWhiteboardsQuerySchema, "query"),
  asyncHandler((req, res) => whiteboardsController.list(req, res)),
);

whiteboardsRouter.post(
  "/",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_WRITE),
  writeLimit,
  validate(createWhiteboardSchema),
  asyncHandler((req, res) => whiteboardsController.create(req, res)),
);

whiteboardsRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_READ),
  readLimit,
  validate(whiteboardIdParamsSchema, "params"),
  asyncHandler((req, res) => whiteboardsController.getById(req, res)),
);

whiteboardsRouter.patch(
  "/:id",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_WRITE),
  writeLimit,
  validate(whiteboardIdParamsSchema, "params"),
  validate(updateWhiteboardSchema),
  asyncHandler((req, res) => whiteboardsController.update(req, res)),
);

whiteboardsRouter.post(
  "/:id/rename",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_WRITE),
  writeLimit,
  validate(whiteboardIdParamsSchema, "params"),
  validate(renameWhiteboardSchema),
  asyncHandler((req, res) => whiteboardsController.rename(req, res)),
);

whiteboardsRouter.post(
  "/:id/duplicate",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_WRITE),
  writeLimit,
  validate(whiteboardIdParamsSchema, "params"),
  validate(duplicateWhiteboardSchema),
  asyncHandler((req, res) => whiteboardsController.duplicate(req, res)),
);

whiteboardsRouter.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_DELETE),
  writeLimit,
  validate(whiteboardIdParamsSchema, "params"),
  asyncHandler((req, res) => whiteboardsController.remove(req, res)),
);

whiteboardsRouter.get(
  "/:id/versions",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_READ),
  readLimit,
  validate(whiteboardIdParamsSchema, "params"),
  asyncHandler((req, res) => whiteboardsController.listVersions(req, res)),
);

whiteboardsRouter.post(
  "/:id/versions/:version/restore",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_WRITE),
  writeLimit,
  asyncHandler((req, res) => whiteboardsController.restoreVersion(req, res)),
);

whiteboardsRouter.get(
  "/:id/comments",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_READ),
  readLimit,
  validate(whiteboardIdParamsSchema, "params"),
  asyncHandler((req, res) => whiteboardsController.listComments(req, res)),
);

whiteboardsRouter.post(
  "/:id/comments",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_WRITE),
  writeLimit,
  validate(whiteboardIdParamsSchema, "params"),
  validate(createWhiteboardCommentSchema),
  asyncHandler((req, res) => whiteboardsController.addComment(req, res)),
);

whiteboardsRouter.post(
  "/:id/ai",
  authorizePermissions(PERMISSIONS.WHITEBOARDS_READ),
  writeLimit,
  validate(whiteboardIdParamsSchema, "params"),
  validate(whiteboardAiRequestSchema),
  asyncHandler((req, res) => whiteboardsController.runAi(req, res)),
);

export { whiteboardsRouter };
