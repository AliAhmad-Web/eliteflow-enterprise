import type {
  Notification,
  NotificationAudit,
  NotificationPreference,
  NotificationQueue,
  NotificationTemplate,
  Prisma,
} from "@enterprise/database";

export function toNotificationDto(row: Notification) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    category: row.category,
    priority: row.priority,
    channel: row.channel,
    linkUrl: row.linkUrl,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    isRead: row.isRead,
    readAt: row.readAt?.toISOString() ?? null,
    isArchived: row.isArchived,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPreferenceDto(row: NotificationPreference) {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    inAppEnabled: row.inAppEnabled,
    emailEnabled: row.emailEnabled,
    pushEnabled: row.pushEnabled,
    smsEnabled: row.smsEnabled,
    whatsappEnabled: row.whatsappEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTemplateDto(row: NotificationTemplate) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    subject: row.subject,
    bodyTemplate: row.bodyTemplate,
    emailTemplate: row.emailTemplate,
    channels: row.channels,
    isSystem: row.isSystem,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toQueueDto(row: NotificationQueue) {
  return {
    id: row.id,
    notificationId: row.notificationId,
    userId: row.userId,
    channel: row.channel,
    status: row.status,
    toAddress: row.toAddress,
    subject: row.subject,
    payload: row.payload,
    attempts: row.attempts,
    lastError: row.lastError,
    scheduledFor: row.scheduledFor.toISOString(),
    processedAt: row.processedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAuditDto(row: NotificationAudit) {
  return {
    id: row.id,
    notificationId: row.notificationId,
    userId: row.userId,
    action: row.action,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

type ReplyRow = {
  id: string;
  notificationId: string;
  userId: string;
  message: string;
  syncedEntityType: string | null;
  syncedEntityId: string | null;
  syncedCommentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

export function toReplyDto(row: ReplyRow) {
  return {
    id: row.id,
    notificationId: row.notificationId,
    userId: row.userId,
    message: row.message,
    author: {
      id: row.user.id,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      avatarUrl: row.user.avatarUrl,
    },
    syncedEntityType: row.syncedEntityType,
    syncedEntityId: row.syncedEntityId,
    syncedCommentId: row.syncedCommentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type NotificationCreateData = Prisma.NotificationCreateInput;
