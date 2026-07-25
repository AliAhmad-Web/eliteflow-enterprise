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
import { filesController, uploadMiddleware } from "./files.controller.js";
import {
  createFolderSchema,
  fileIdParamsSchema,
  folderIdParamsSchema,
  listFilesQuerySchema,
  listFoldersQuerySchema,
  moveFileSchema,
  shareFileSchema,
  shareIdParamsSchema,
  updateFileSchema,
  updateFolderSchema,
} from "./files.validation.js";

const filesRouter = Router();

filesRouter.use(authenticate);

filesRouter.get(
  "/folders",
  authorizePermissions(PERMISSIONS.FILES_READ),
  rateLimit({
    name: "files.folders.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listFoldersQuerySchema, "query"),
  asyncHandler((req, res) => filesController.listFolders(req, res)),
);

filesRouter.post(
  "/folders",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.folders.create",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createFolderSchema),
  asyncHandler((req, res) => filesController.createFolder(req, res)),
);

filesRouter.patch(
  "/folders/:id",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.folders.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(folderIdParamsSchema, "params"),
  validate(updateFolderSchema),
  asyncHandler((req, res) => filesController.updateFolder(req, res)),
);

filesRouter.delete(
  "/folders/:id",
  authorizePermissions(PERMISSIONS.FILES_DELETE),
  rateLimit({
    name: "files.folders.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(folderIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.deleteFolder(req, res)),
);

filesRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.FILES_READ),
  rateLimit({
    name: "files.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listFilesQuerySchema, "query"),
  asyncHandler((req, res) => filesController.listFiles(req, res)),
);

filesRouter.post(
  "/upload",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.upload",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  uploadMiddleware.array("files", 20),
  asyncHandler((req, res) => filesController.upload(req, res)),
);

filesRouter.delete(
  "/shares/:id",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.unshare",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(shareIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.unshare(req, res)),
);

filesRouter.get(
  "/:id/download",
  authorizePermissions(PERMISSIONS.FILES_READ),
  rateLimit({
    name: "files.download",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.download(req, res)),
);

filesRouter.get(
  "/:id/preview",
  authorizePermissions(PERMISSIONS.FILES_READ),
  rateLimit({
    name: "files.preview",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.preview(req, res)),
);

filesRouter.get(
  "/:id/versions",
  authorizePermissions(PERMISSIONS.FILES_READ),
  rateLimit({
    name: "files.versions",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.versions(req, res)),
);

filesRouter.get(
  "/:id/activity",
  authorizePermissions(PERMISSIONS.FILES_READ),
  rateLimit({
    name: "files.activity",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.activities(req, res)),
);

filesRouter.get(
  "/:id/shares",
  authorizePermissions(PERMISSIONS.FILES_READ),
  rateLimit({
    name: "files.shares",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.shares(req, res)),
);

filesRouter.post(
  "/:id/share",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.share",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  validate(shareFileSchema),
  asyncHandler((req, res) => filesController.share(req, res)),
);

filesRouter.post(
  "/:id/move",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.move",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  validate(moveFileSchema),
  asyncHandler((req, res) => filesController.moveFile(req, res)),
);

filesRouter.post(
  "/:id/restore",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.restore",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.restoreFile(req, res)),
);

filesRouter.delete(
  "/:id/permanent",
  authorizePermissions(PERMISSIONS.FILES_DELETE),
  rateLimit({
    name: "files.permanent",
    max: 20,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.permanentDelete(req, res)),
);

filesRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.FILES_READ),
  rateLimit({
    name: "files.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.getFile(req, res)),
);

filesRouter.patch(
  "/:id",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  validate(updateFileSchema),
  asyncHandler((req, res) => filesController.updateFile(req, res)),
);

filesRouter.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.FILES_UPLOAD),
  rateLimit({
    name: "files.delete",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(fileIdParamsSchema, "params"),
  asyncHandler((req, res) => filesController.deleteFile(req, res)),
);

export { filesRouter };
