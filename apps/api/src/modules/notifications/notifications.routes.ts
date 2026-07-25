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
import { notificationsController } from "./notifications.controller.js";
import {
  bulkNotificationIdsSchema,
  createNotificationReplySchema,
  createNotificationSchema,
  listHistoryQuerySchema,
  listNotificationsQuerySchema,
  listQueueQuerySchema,
  notificationIdParamsSchema,
  notificationReplyIdParamsSchema,
  updatePreferencesBatchSchema,
} from "./notifications.validation.js";

const notificationsRouter = Router();
notificationsRouter.use(authenticate);

const readLimit = rateLimit({
  name: "notifications.read",
  ...RATE_LIMIT.GLOBAL_API,
  keyGenerator: rateLimitByUser,
});

const writeLimit = rateLimit({
  name: "notifications.write",
  max: 60,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

notificationsRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  readLimit,
  validate(listNotificationsQuerySchema, "query"),
  asyncHandler((req, res) => notificationsController.list(req, res)),
);

notificationsRouter.get(
  "/unread-count",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  readLimit,
  asyncHandler((req, res) => notificationsController.unreadCount(req, res)),
);

notificationsRouter.get(
  "/preferences",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  readLimit,
  asyncHandler((req, res) => notificationsController.preferences(req, res)),
);

notificationsRouter.put(
  "/preferences",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(updatePreferencesBatchSchema),
  asyncHandler((req, res) => notificationsController.updatePreferences(req, res)),
);

notificationsRouter.get(
  "/templates",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  readLimit,
  asyncHandler((req, res) => notificationsController.templates(req, res)),
);

notificationsRouter.get(
  "/queue",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  readLimit,
  validate(listQueueQuerySchema, "query"),
  asyncHandler((req, res) => notificationsController.queue(req, res)),
);

notificationsRouter.post(
  "/queue/process",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  asyncHandler((req, res) => notificationsController.processQueue(req, res)),
);

notificationsRouter.post(
  "/triggers/run",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  asyncHandler((req, res) => notificationsController.runTriggers(req, res)),
);

notificationsRouter.get(
  "/history",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  readLimit,
  validate(listHistoryQuerySchema, "query"),
  asyncHandler((req, res) => notificationsController.history(req, res)),
);

notificationsRouter.post(
  "/mark-all-read",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  asyncHandler((req, res) => notificationsController.markAllRead(req, res)),
);

notificationsRouter.get(
  "/:id/replies",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  readLimit,
  validate(notificationIdParamsSchema, "params"),
  asyncHandler((req, res) => notificationsController.listReplies(req, res)),
);

notificationsRouter.post(
  "/:id/replies",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(notificationIdParamsSchema, "params"),
  validate(createNotificationReplySchema),
  asyncHandler((req, res) => notificationsController.createReply(req, res)),
);

notificationsRouter.delete(
  "/:id/replies/:replyId",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(notificationReplyIdParamsSchema, "params"),
  asyncHandler((req, res) => notificationsController.deleteReply(req, res)),
);

notificationsRouter.post(
  "/bulk/read",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(bulkNotificationIdsSchema),
  asyncHandler((req, res) => notificationsController.bulkRead(req, res)),
);

notificationsRouter.post(
  "/bulk/archive",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(bulkNotificationIdsSchema),
  asyncHandler((req, res) => notificationsController.bulkArchive(req, res)),
);

notificationsRouter.post(
  "/bulk/delete",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(bulkNotificationIdsSchema),
  asyncHandler((req, res) => notificationsController.bulkDelete(req, res)),
);

notificationsRouter.post(
  "/",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(createNotificationSchema),
  asyncHandler((req, res) => notificationsController.create(req, res)),
);

notificationsRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  readLimit,
  validate(notificationIdParamsSchema, "params"),
  asyncHandler((req, res) => notificationsController.getById(req, res)),
);

notificationsRouter.post(
  "/:id/read",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(notificationIdParamsSchema, "params"),
  asyncHandler((req, res) => notificationsController.markRead(req, res)),
);

notificationsRouter.post(
  "/:id/archive",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(notificationIdParamsSchema, "params"),
  asyncHandler((req, res) => notificationsController.archive(req, res)),
);

notificationsRouter.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.NOTIFICATIONS_READ),
  writeLimit,
  validate(notificationIdParamsSchema, "params"),
  asyncHandler((req, res) => notificationsController.remove(req, res)),
);

export { notificationsRouter };
