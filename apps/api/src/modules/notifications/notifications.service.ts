import type {
  BulkNotificationIdsInput,
  CreateNotificationInput,
  CreateNotificationReplyInput,
  ListHistoryQueryInput,
  ListNotificationsQueryInput,
  ListQueueQueryInput,
  UpdatePreferencesBatchInput,
} from "@enterprise/shared";
import {
  NotificationCategory,
  NotificationPriority,
  Prisma,
  prisma,
} from "@enterprise/database";

import { isApiCommunicationEmailAutomationEnabled } from "../../config/communication-flags.js";
import {
  notificationDispatcher,
  processNotificationQueue,
} from "./notification.dispatcher.js";
import { runNotificationTriggers } from "./notification.triggers.js";
import { writeNotificationAudit } from "./notifications.audit.js";
import {
  NOTIFICATIONS_ERROR_CODES,
  NotificationsError,
} from "./notifications.errors.js";
import {
  toAuditDto,
  toNotificationDto,
  toPreferenceDto,
  toQueueDto,
  toReplyDto,
  toTemplateDto,
} from "./notifications.mapper.js";
import { notificationsRepository } from "./notifications.repository.js";
import {
  canCreateNotifications,
  canProcessNotificationQueue,
  isOrgAdmin,
  isSuperAdmin,
  type NotificationsActor,
} from "./notifications.types.js";

function ownershipFilter(actor: NotificationsActor): string | null {
  if (isOrgAdmin(actor)) return null;
  return actor.userId;
}

function resolveListUserIds(
  actor: NotificationsActor,
  queryUserId?: string,
): string[] | null {
  if (!isOrgAdmin(actor)) {
    return [actor.userId];
  }
  if (queryUserId) {
    return [queryUserId];
  }
  // Super Admin / Admin — organization-wide (null = no user filter)
  if (isSuperAdmin(actor) || actor.role === "ADMIN") {
    return null;
  }
  return [actor.userId];
}

export class NotificationsService {
  async list(query: ListNotificationsQueryInput, actor: NotificationsActor) {
    const userIds = resolveListUserIds(actor, query.userId);
    const result = await notificationsRepository.list({ userIds, query });
    return {
      items: result.items.map(toNotificationDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      unreadCount: result.unreadCount,
    };
  }

  async unreadCount(actor: NotificationsActor) {
    const count = await notificationsRepository.countUnread(actor.userId);
    return { count };
  }

  async getById(id: string, actor: NotificationsActor) {
    const row = await notificationsRepository.findById(id);
    if (!row) {
      throw new NotificationsError(
        "Notification not found",
        404,
        NOTIFICATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (!isOrgAdmin(actor) && row.userId !== actor.userId) {
      throw new NotificationsError(
        "You do not have access to this notification",
        403,
        NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
      );
    }
    return toNotificationDto(row);
  }

  async create(input: CreateNotificationInput, actor: NotificationsActor) {
    if (!canCreateNotifications(actor)) {
      throw new NotificationsError(
        "You do not have permission to send notifications or email",
        403,
        NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
      );
    }

    let audience:
      | { type: "INDIVIDUAL"; userId: string }
      | { type: "ROLE"; roleCode: string }
      | { type: "DEPARTMENT"; departmentId: string }
      | { type: "CLIENT_GROUP"; companyId: string }
      | { type: "USER_LIST"; userIds: string[] };

    switch (input.audienceType) {
      case "INDIVIDUAL":
        if (!input.userId) {
          throw new NotificationsError(
            "userId is required for individual audience",
            400,
            NOTIFICATIONS_ERROR_CODES.VALIDATION,
          );
        }
        audience = { type: "INDIVIDUAL", userId: input.userId };
        break;
      case "USER_LIST": {
        const ids = [
          ...new Set(
            [...(input.userIds ?? []), ...(input.userId ? [input.userId] : [])].filter(
              Boolean,
            ),
          ),
        ];
        if (ids.length === 0) {
          throw new NotificationsError(
            "userIds is required for USER_LIST audience",
            400,
            NOTIFICATIONS_ERROR_CODES.VALIDATION,
          );
        }
        audience = { type: "USER_LIST", userIds: ids };
        break;
      }
      case "ROLE":
        if (!input.roleCode) {
          throw new NotificationsError(
            "roleCode is required for role audience",
            400,
            NOTIFICATIONS_ERROR_CODES.VALIDATION,
          );
        }
        audience = { type: "ROLE", roleCode: input.roleCode };
        break;
      case "DEPARTMENT":
        if (!input.departmentId) {
          throw new NotificationsError(
            "departmentId is required for department audience",
            400,
            NOTIFICATIONS_ERROR_CODES.VALIDATION,
          );
        }
        audience = { type: "DEPARTMENT", departmentId: input.departmentId };
        break;
      case "CLIENT_GROUP":
        if (!input.companyId) {
          throw new NotificationsError(
            "companyId is required for client group audience",
            400,
            NOTIFICATIONS_ERROR_CODES.VALIDATION,
          );
        }
        audience = { type: "CLIENT_GROUP", companyId: input.companyId };
        break;
      default: {
        const _exhaustive: never = input.audienceType;
        throw new NotificationsError(
          `Unsupported audience type: ${_exhaustive}`,
          400,
          NOTIFICATIONS_ERROR_CODES.VALIDATION,
        );
      }
    }

    const result = await notificationDispatcher.notify({
      title: input.title,
      body: input.body,
      category: input.category as NotificationCategory,
      priority: input.priority as NotificationPriority,
      linkUrl: input.linkUrl,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      createdById: actor.userId,
      sendEmail: input.sendEmail,
      audience,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
    });

    // Flush freshly queued mail first (not the whole backlog) under the 45s client timeout.
    // Older PENDING items drain in the background.
    if (input.sendEmail && result.queued > 0) {
      try {
        await processNotificationQueue(Math.min(result.queued, 3), {
          budgetMs: 35_000,
          skipBatchScaling: true,
          preferNewest: true,
        });
      } catch {
        // Queue worker may retry later via automation / admin flush.
      }
      void processNotificationQueue(25, { budgetMs: 60_000 }).catch(() => {
        // Best-effort backlog drain — failures remain PENDING/FAILED for retry.
      });
    }

    return result;
  }

  async markRead(ids: string[], actor: NotificationsActor) {
    const owner = ownershipFilter(actor);
    const result = await notificationsRepository.markRead(ids, owner);
    await writeNotificationAudit({
      userId: actor.userId,
      action: "MARK_READ",
      metadata: { ids, count: result.count },
    });
    return { count: result.count };
  }

  async markAllRead(actor: NotificationsActor) {
    const result = await notificationsRepository.markAllRead(actor.userId);
    await writeNotificationAudit({
      userId: actor.userId,
      action: "MARK_ALL_READ",
      metadata: { count: result.count },
    });
    return { count: result.count };
  }

  async archive(ids: string[], actor: NotificationsActor) {
    const owner = ownershipFilter(actor);
    const result = await notificationsRepository.archive(ids, owner);
    await writeNotificationAudit({
      userId: actor.userId,
      action: "ARCHIVE",
      metadata: { ids, count: result.count },
    });
    return { count: result.count };
  }

  async remove(ids: string[], actor: NotificationsActor) {
    const owner = ownershipFilter(actor);
    // Soft-deletes notification + reply thread only. Related ERP records stay intact.
    const result = await notificationsRepository.softDelete(ids, owner);
    await writeNotificationAudit({
      userId: actor.userId,
      action: "DELETE",
      metadata: { ids, count: result.count, repliesSoftDeleted: true },
    });
    return { count: result.count };
  }

  async bulk(
    action: "read" | "archive" | "delete",
    input: BulkNotificationIdsInput,
    actor: NotificationsActor,
  ) {
    switch (action) {
      case "read":
        return this.markRead(input.ids, actor);
      case "archive":
        return this.archive(input.ids, actor);
      case "delete":
        return this.remove(input.ids, actor);
      default: {
        const _exhaustive: never = action;
        throw new NotificationsError(
          `Unsupported bulk action: ${_exhaustive}`,
          400,
          NOTIFICATIONS_ERROR_CODES.VALIDATION,
        );
      }
    }
  }

  async listPreferences(actor: NotificationsActor) {
    const items = await notificationsRepository.ensureDefaultPreferences(
      actor.userId,
    );
    return { items: items.map(toPreferenceDto) };
  }

  async updatePreferences(
    input: UpdatePreferencesBatchInput,
    actor: NotificationsActor,
  ) {
    const items = [];
    for (const pref of input.preferences) {
      const row = await notificationsRepository.upsertPreference({
        userId: actor.userId,
        category: pref.category as NotificationCategory,
        inAppEnabled: pref.inAppEnabled,
        emailEnabled: pref.emailEnabled,
        pushEnabled: pref.pushEnabled,
        smsEnabled: pref.smsEnabled,
        whatsappEnabled: pref.whatsappEnabled,
      });
      items.push(toPreferenceDto(row));
    }
    await writeNotificationAudit({
      userId: actor.userId,
      action: "PREFERENCES_UPDATED",
      metadata: { count: items.length },
    });
    return { items };
  }

  async listTemplates(actor: NotificationsActor) {
    if (!isOrgAdmin(actor)) {
      throw new NotificationsError(
        "Only organization admins can view templates",
        403,
        NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
      );
    }
    const items = await notificationsRepository.listTemplates();
    return { items: items.map(toTemplateDto) };
  }

  async listQueue(query: ListQueueQueryInput, actor: NotificationsActor) {
    if (!canCreateNotifications(actor) && !isOrgAdmin(actor)) {
      throw new NotificationsError(
        "You do not have permission to view the email queue",
        403,
        NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
      );
    }
    const result = await notificationsRepository.listQueue({
      ...query,
      // Non-admins only see deliveries they triggered (createdBy) or own recipient rows.
      userId: isOrgAdmin(actor) ? undefined : actor.userId,
      createdById: isOrgAdmin(actor) ? undefined : actor.userId,
    });
    return {
      items: result.items.map(toQueueDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async processQueue(actor: NotificationsActor) {
    if (!canProcessNotificationQueue(actor)) {
      throw new NotificationsError(
        "You do not have permission to process the email queue",
        403,
        NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
      );
    }
    // Re-arm failed EMAIL rows before claim — powers "Retry Failed Emails" UI.
    if (isApiCommunicationEmailAutomationEnabled()) {
      await notificationsRepository.requeueFailedEmail(25);
    }
    return processNotificationQueue(25, {
      budgetMs: 35_000,
      skipBatchScaling: true,
    });
  }

  async runTriggers(actor: NotificationsActor) {
    if (!isOrgAdmin(actor)) {
      throw new NotificationsError(
        "Only organization admins can run notification triggers",
        403,
        NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
      );
    }
    return runNotificationTriggers(actor.userId);
  }

  async history(query: ListHistoryQueryInput, actor: NotificationsActor) {
    const userId = isOrgAdmin(actor) ? null : actor.userId;
    const result = await notificationsRepository.listHistory({
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: result.items.map(toAuditDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async listReplies(notificationId: string, actor: NotificationsActor) {
    await this.assertCanAccessNotification(notificationId, actor);
    const items = await notificationsRepository.listReplies(notificationId);
    return { items: items.map(toReplyDto) };
  }

  async createReply(
    notificationId: string,
    input: CreateNotificationReplyInput,
    actor: NotificationsActor,
  ) {
    const notification = await this.assertCanAccessNotification(
      notificationId,
      actor,
    );

    const sync =
      input.syncToEntity === false
        ? {
            syncedEntityType: null as string | null,
            syncedEntityId: null as string | null,
            syncedCommentId: null as string | null,
          }
        : await this.syncReplyToEntityDiscussion({
            notification,
            userId: actor.userId,
            message: input.message,
          });

    const reply = await notificationsRepository.createReply({
      notificationId,
      userId: actor.userId,
      message: input.message,
      ...sync,
    });

    await writeNotificationAudit({
      notificationId,
      userId: actor.userId,
      action: "REPLY",
      metadata: {
        replyId: reply.id,
        syncedEntityType: sync.syncedEntityType,
        syncedCommentId: sync.syncedCommentId,
      },
    });

    // Deliver reply into the original sender's inbox + email (threaded).
    const originalSenderId = notification.createdById;
    if (originalSenderId && originalSenderId !== actor.userId) {
      const meta =
        notification.metadata &&
        typeof notification.metadata === "object" &&
        !Array.isArray(notification.metadata)
          ? (notification.metadata as Record<string, unknown>)
          : {};
      const threadId =
        typeof meta.threadId === "string"
          ? meta.threadId
          : `thread:${notification.id}`;
      try {
        await notificationDispatcher.notify({
          title: notification.title.startsWith("Re:")
            ? notification.title
            : `Re: ${notification.title}`,
          body: input.message,
          category: notification.category,
          priority: NotificationPriority.NORMAL,
          linkUrl: notification.linkUrl,
          entityType: notification.entityType,
          entityId: notification.entityId,
          createdById: actor.userId,
          sendEmail: true,
          audience: { type: "INDIVIDUAL", userId: originalSenderId },
          metadata: {
            ...meta,
            threadId,
            source: "communication_email_reply",
            inReplyToNotificationId: notification.id,
            replyId: reply.id,
          } as Prisma.InputJsonValue,
        });
        await processNotificationQueue(3, {
          budgetMs: 35_000,
          skipBatchScaling: true,
          preferNewest: true,
        });
        void processNotificationQueue(25, { budgetMs: 60_000 }).catch(() => {});
      } catch {
        // Reply row is persisted even if outbound notify fails.
      }
    }

    return toReplyDto(reply);
  }

  async deleteReply(
    notificationId: string,
    replyId: string,
    actor: NotificationsActor,
  ) {
    await this.assertCanAccessNotification(notificationId, actor);
    const reply = await notificationsRepository.findReplyById(replyId);
    if (!reply || reply.notificationId !== notificationId) {
      throw new NotificationsError(
        "Reply not found",
        404,
        NOTIFICATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (reply.userId !== actor.userId && !isOrgAdmin(actor)) {
      throw new NotificationsError(
        "You can only delete your own replies",
        403,
        NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
      );
    }

    await notificationsRepository.softDeleteReply(replyId);
    await writeNotificationAudit({
      notificationId,
      userId: actor.userId,
      action: "REPLY_DELETE",
      metadata: { replyId },
    });

    return { id: replyId };
  }

  private async assertCanAccessNotification(
    id: string,
    actor: NotificationsActor,
  ) {
    const row = await notificationsRepository.findById(id);
    if (!row) {
      throw new NotificationsError(
        "Notification not found",
        404,
        NOTIFICATIONS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (!isOrgAdmin(actor) && row.userId !== actor.userId) {
      throw new NotificationsError(
        "You do not have access to this notification",
        403,
        NOTIFICATIONS_ERROR_CODES.FORBIDDEN,
      );
    }
    return row;
  }

  /**
   * Mirror a reply into the related entity discussion when supported.
   * Tasks get a real task comment; other entities keep the thread on the notification.
   */
  private async syncReplyToEntityDiscussion(input: {
    notification: NonNullable<
      Awaited<ReturnType<typeof notificationsRepository.findById>>
    >;
    userId: string;
    message: string;
  }) {
    const { notification } = input;
    if (!notification.entityId) {
      return {
        syncedEntityType: null,
        syncedEntityId: null,
        syncedCommentId: null,
      };
    }

    const entityType = (
      notification.entityType ?? notification.category
    ).toLowerCase();
    const isTask =
      entityType.includes("task") ||
      notification.category === NotificationCategory.TASK;

    if (isTask) {
      const task = await prisma.task.findFirst({
        where: { id: notification.entityId, deletedAt: null },
        select: { id: true },
      });
      if (!task) {
        return {
          syncedEntityType: null,
          syncedEntityId: null,
          syncedCommentId: null,
        };
      }

      const comment = await prisma.$transaction(async (tx) => {
        const created = await tx.taskComment.create({
          data: {
            taskId: task.id,
            authorId: input.userId,
            body: input.message,
          },
        });
        await tx.taskActivityLog.create({
          data: {
            taskId: task.id,
            actorId: input.userId,
            action: "task.commented",
            message: "Added a comment from notification",
          },
        });
        return created;
      });

      return {
        syncedEntityType: "Task",
        syncedEntityId: task.id,
        syncedCommentId: comment.id,
      };
    }

    return {
      syncedEntityType: notification.entityType ?? notification.category,
      syncedEntityId: notification.entityId,
      syncedCommentId: null,
    };
  }
}

export const notificationsService = new NotificationsService();
