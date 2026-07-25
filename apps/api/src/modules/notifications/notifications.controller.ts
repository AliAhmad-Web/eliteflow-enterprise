import type { Request, Response } from "express";

import type {
  BulkNotificationIdsInput,
  CreateNotificationInput,
  CreateNotificationReplyInput,
  ListHistoryQueryInput,
  ListNotificationsQueryInput,
  ListQueueQueryInput,
  NotificationIdParamsInput,
  NotificationReplyIdParamsInput,
  UpdatePreferencesBatchInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import {
  NOTIFICATIONS_ERROR_CODES,
  NotificationsError,
} from "./notifications.errors.js";
import { notificationsService } from "./notifications.service.js";
import type { NotificationsActor } from "./notifications.types.js";

function getActor(req: Request): NotificationsActor {
  if (!req.auth) {
    throw new NotificationsError(
      "Authentication required",
      401,
      NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
    );
  }

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    permissions: req.auth.permissions,
  };
}

export class NotificationsController {
  async list(req: Request, res: Response) {
    const result = await notificationsService.list(
      req.query as unknown as ListNotificationsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Notifications retrieved"));
  }

  async unreadCount(req: Request, res: Response) {
    const result = await notificationsService.unreadCount(getActor(req));
    res.json(successResponse(result, "Unread count retrieved"));
  }

  async getById(req: Request, res: Response) {
    const params = req.params as unknown as NotificationIdParamsInput;
    const result = await notificationsService.getById(params.id, getActor(req));
    res.json(successResponse(result, "Notification retrieved"));
  }

  async create(req: Request, res: Response) {
    const result = await notificationsService.create(
      req.body as CreateNotificationInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Notification created"));
  }

  async markRead(req: Request, res: Response) {
    const params = req.params as unknown as NotificationIdParamsInput;
    const result = await notificationsService.markRead([params.id], getActor(req));
    res.json(successResponse(result, "Notification marked as read"));
  }

  async markAllRead(req: Request, res: Response) {
    const result = await notificationsService.markAllRead(getActor(req));
    res.json(successResponse(result, "All notifications marked as read"));
  }

  async archive(req: Request, res: Response) {
    const params = req.params as unknown as NotificationIdParamsInput;
    const result = await notificationsService.archive([params.id], getActor(req));
    res.json(successResponse(result, "Notification archived"));
  }

  async remove(req: Request, res: Response) {
    const params = req.params as unknown as NotificationIdParamsInput;
    const result = await notificationsService.remove([params.id], getActor(req));
    res.json(successResponse(result, "Notification deleted"));
  }

  async bulkRead(req: Request, res: Response) {
    const result = await notificationsService.bulk(
      "read",
      req.body as BulkNotificationIdsInput,
      getActor(req),
    );
    res.json(successResponse(result, "Notifications marked as read"));
  }

  async bulkArchive(req: Request, res: Response) {
    const result = await notificationsService.bulk(
      "archive",
      req.body as BulkNotificationIdsInput,
      getActor(req),
    );
    res.json(successResponse(result, "Notifications archived"));
  }

  async bulkDelete(req: Request, res: Response) {
    const result = await notificationsService.bulk(
      "delete",
      req.body as BulkNotificationIdsInput,
      getActor(req),
    );
    res.json(successResponse(result, "Notifications deleted"));
  }

  async preferences(req: Request, res: Response) {
    const result = await notificationsService.listPreferences(getActor(req));
    res.json(successResponse(result, "Preferences retrieved"));
  }

  async updatePreferences(req: Request, res: Response) {
    const result = await notificationsService.updatePreferences(
      req.body as UpdatePreferencesBatchInput,
      getActor(req),
    );
    res.json(successResponse(result, "Preferences updated"));
  }

  async templates(req: Request, res: Response) {
    const result = await notificationsService.listTemplates(getActor(req));
    res.json(successResponse(result, "Templates retrieved"));
  }

  async queue(req: Request, res: Response) {
    const result = await notificationsService.listQueue(
      req.query as unknown as ListQueueQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Queue retrieved"));
  }

  async processQueue(req: Request, res: Response) {
    const result = await notificationsService.processQueue(getActor(req));
    res.json(successResponse(result, "Queue processed"));
  }

  async runTriggers(req: Request, res: Response) {
    const result = await notificationsService.runTriggers(getActor(req));
    res.json(successResponse(result, "Triggers executed"));
  }

  async history(req: Request, res: Response) {
    const result = await notificationsService.history(
      req.query as unknown as ListHistoryQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "History retrieved"));
  }

  async listReplies(req: Request, res: Response) {
    const params = req.params as unknown as NotificationIdParamsInput;
    const result = await notificationsService.listReplies(
      params.id,
      getActor(req),
    );
    res.json(successResponse(result, "Replies retrieved"));
  }

  async createReply(req: Request, res: Response) {
    const params = req.params as unknown as NotificationIdParamsInput;
    const result = await notificationsService.createReply(
      params.id,
      req.body as CreateNotificationReplyInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Reply created"));
  }

  async deleteReply(req: Request, res: Response) {
    const params = req.params as unknown as NotificationReplyIdParamsInput;
    const result = await notificationsService.deleteReply(
      params.id,
      params.replyId,
      getActor(req),
    );
    res.json(successResponse(result, "Reply deleted"));
  }
}

export const notificationsController = new NotificationsController();
