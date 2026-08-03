import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationQueueStatus,
  prisma,
  type Prisma,
} from "@enterprise/database";

import type { ListNotificationsQueryInput } from "@enterprise/shared";

import { isApiCommunicationWhatsappQueueEnabled } from "../../config/communication-flags.js";

export class NotificationsRepository {
  async findById(id: string) {
    return prisma.notification.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        deletedAt: null,
        isArchived: false,
        isRead: false,
      },
    });
  }

  async list(params: {
    userIds: string[] | null;
    query: ListNotificationsQueryInput;
  }) {
    const where: Prisma.NotificationWhereInput = {
      deletedAt: null,
      ...(params.userIds ? { userId: { in: params.userIds } } : {}),
      ...(params.query.category ? { category: params.query.category } : {}),
      ...(params.query.priority ? { priority: params.query.priority } : {}),
      ...(params.query.isRead !== undefined
        ? { isRead: params.query.isRead === "true" }
        : {}),
      ...(params.query.isArchived !== undefined
        ? { isArchived: params.query.isArchived === "true" }
        : { isArchived: false }),
      ...(params.query.search
        ? {
            OR: [
              { title: { contains: params.query.search, mode: "insensitive" } },
              { body: { contains: params.query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const skip = (params.query.page - 1) * params.query.pageSize;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take: params.query.pageSize,
      }),
      prisma.notification.count({ where }),
      params.userIds && params.userIds.length === 1
        ? this.countUnread(params.userIds[0]!)
        : prisma.notification.count({
            where: {
              ...where,
              isRead: false,
              isArchived: false,
            },
          }),
    ]);

    return {
      items,
      total,
      page: params.query.page,
      pageSize: params.query.pageSize,
      unreadCount,
    };
  }

  async create(data: {
    userId: string;
    title: string;
    body: string;
    category: NotificationCategory;
    priority: NotificationPriority;
    channel?: NotificationChannel;
    linkUrl?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
    createdById?: string | null;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        category: data.category,
        priority: data.priority,
        channel: data.channel ?? NotificationChannel.IN_APP,
        linkUrl: data.linkUrl ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        metadata: data.metadata ?? undefined,
        createdById: data.createdById ?? null,
      },
    });
  }

  async markRead(ids: string[], userId: string | null) {
    const where: Prisma.NotificationWhereInput = {
      id: { in: ids },
      deletedAt: null,
      ...(userId ? { userId } : {}),
    };
    const now = new Date();
    return prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: now },
    });
  }

  async markAllRead(userId: string) {
    const now = new Date();
    return prisma.notification.updateMany({
      where: {
        userId,
        deletedAt: null,
        isRead: false,
        isArchived: false,
      },
      data: { isRead: true, readAt: now },
    });
  }

  async archive(ids: string[], userId: string | null) {
    const now = new Date();
    return prisma.notification.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        ...(userId ? { userId } : {}),
      },
      data: { isArchived: true, archivedAt: now, isRead: true, readAt: now },
    });
  }

  async softDelete(ids: string[], userId: string | null) {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const result = await tx.notification.updateMany({
        where: {
          id: { in: ids },
          deletedAt: null,
          ...(userId ? { userId } : {}),
        },
        data: { deletedAt: now },
      });

      // Soft-delete reply thread with the notification (entities remain untouched).
      await tx.notificationReply.updateMany({
        where: {
          notificationId: { in: ids },
          deletedAt: null,
        },
        data: { deletedAt: now },
      });

      return result;
    });
  }

  async listReplies(notificationId: string) {
    return prisma.notificationReply.findMany({
      where: { notificationId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createReply(input: {
    notificationId: string;
    userId: string;
    message: string;
    syncedEntityType?: string | null;
    syncedEntityId?: string | null;
    syncedCommentId?: string | null;
  }) {
    return prisma.notificationReply.create({
      data: {
        notificationId: input.notificationId,
        userId: input.userId,
        message: input.message,
        syncedEntityType: input.syncedEntityType ?? null,
        syncedEntityId: input.syncedEntityId ?? null,
        syncedCommentId: input.syncedCommentId ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findReplyById(id: string) {
    return prisma.notificationReply.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async softDeleteReply(id: string) {
    const now = new Date();
    return prisma.notificationReply.update({
      where: { id },
      data: { deletedAt: now },
    });
  }

  async listPreferences(userId: string) {
    return prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { category: "asc" },
    });
  }

  async upsertPreference(input: {
    userId: string;
    category: NotificationCategory;
    inAppEnabled?: boolean;
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
  }) {
    return prisma.notificationPreference.upsert({
      where: {
        userId_category: {
          userId: input.userId,
          category: input.category,
        },
      },
      create: {
        userId: input.userId,
        category: input.category,
        inAppEnabled: input.inAppEnabled ?? true,
        emailEnabled: input.emailEnabled ?? true,
        pushEnabled: input.pushEnabled ?? false,
        smsEnabled: input.smsEnabled ?? false,
        whatsappEnabled: input.whatsappEnabled ?? false,
      },
      update: {
        ...(input.inAppEnabled !== undefined
          ? { inAppEnabled: input.inAppEnabled }
          : {}),
        ...(input.emailEnabled !== undefined
          ? { emailEnabled: input.emailEnabled }
          : {}),
        ...(input.pushEnabled !== undefined
          ? { pushEnabled: input.pushEnabled }
          : {}),
        ...(input.smsEnabled !== undefined ? { smsEnabled: input.smsEnabled } : {}),
        ...(input.whatsappEnabled !== undefined
          ? { whatsappEnabled: input.whatsappEnabled }
          : {}),
      },
    });
  }

  async ensureDefaultPreferences(userId: string) {
    const categories = Object.values(NotificationCategory);
    for (const category of categories) {
      await this.upsertPreference({ userId, category });
    }
    return this.listPreferences(userId);
  }

  async getPreference(userId: string, category: NotificationCategory) {
    return prisma.notificationPreference.findUnique({
      where: { userId_category: { userId, category } },
    });
  }

  async listTemplates() {
    return prisma.notificationTemplate.findMany({
      where: { deletedAt: null },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async listQueue(params: {
    page: number;
    pageSize: number;
    status?: NotificationQueueStatus;
    channel?: NotificationChannel;
    /** Recipient user id */
    userId?: string;
    /** Sender / creator of related notification */
    createdById?: string;
  }) {
    const ownership: Prisma.NotificationQueueWhereInput | undefined =
      params.userId || params.createdById
        ? {
            OR: [
              ...(params.userId ? [{ userId: params.userId }] : []),
              ...(params.createdById
                ? [{ notification: { createdById: params.createdById } }]
                : []),
            ],
          }
        : undefined;
    const where: Prisma.NotificationQueueWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.channel ? { channel: params.channel } : {}),
      ...ownership,
    };
    const skip = (params.page - 1) * params.pageSize;
    const [items, total] = await Promise.all([
      prisma.notificationQueue.findMany({
        where,
        orderBy: { scheduledFor: "asc" },
        skip,
        take: params.pageSize,
      }),
      prisma.notificationQueue.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async enqueue(data: {
    notificationId?: string | null;
    userId: string;
    channel: NotificationChannel;
    toAddress?: string | null;
    subject?: string | null;
    payload: Prisma.InputJsonValue;
    scheduledFor?: Date;
  }) {
    return prisma.notificationQueue.create({
      data: {
        notificationId: data.notificationId ?? null,
        userId: data.userId,
        channel: data.channel,
        toAddress: data.toAddress ?? null,
        subject: data.subject ?? null,
        payload: data.payload,
        scheduledFor: data.scheduledFor ?? new Date(),
        status: NotificationQueueStatus.PENDING,
      },
    });
  }

  async claimPendingQueue(limit = 20) {
    const now = new Date();
    const channels: NotificationChannel[] = [
      NotificationChannel.EMAIL,
      NotificationChannel.IN_APP,
    ];
    if (isApiCommunicationWhatsappQueueEnabled()) {
      channels.push(NotificationChannel.WHATSAPP);
    }
    const pending = await prisma.notificationQueue.findMany({
      where: {
        status: NotificationQueueStatus.PENDING,
        scheduledFor: { lte: now },
        channel: {
          in: channels,
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: limit,
    });

    const claimed = [];
    for (const item of pending) {
      const updated = await prisma.notificationQueue.updateMany({
        where: { id: item.id, status: NotificationQueueStatus.PENDING },
        data: {
          status: NotificationQueueStatus.PROCESSING,
          attempts: { increment: 1 },
        },
      });
      if (updated.count === 1) {
        claimed.push(item);
      }
    }
    return claimed;
  }

  async markQueueSent(id: string) {
    return prisma.notificationQueue.update({
      where: { id },
      data: {
        status: NotificationQueueStatus.SENT,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markQueueFailed(id: string, error: string) {
    return prisma.notificationQueue.update({
      where: { id },
      data: {
        status: NotificationQueueStatus.FAILED,
        processedAt: new Date(),
        lastError: error.slice(0, 1000),
      },
    });
  }

  /**
   * Re-queue FAILED EMAIL items as PENDING so existing POST /queue/process can retry.
   * Same API surface — no new routes.
   */
  async requeueFailedEmail(limit = 25): Promise<number> {
    const failed = await prisma.notificationQueue.findMany({
      where: {
        status: NotificationQueueStatus.FAILED,
        channel: NotificationChannel.EMAIL,
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
      select: { id: true },
    });

    let count = 0;
    for (const item of failed) {
      const updated = await prisma.notificationQueue.updateMany({
        where: {
          id: item.id,
          status: NotificationQueueStatus.FAILED,
          channel: NotificationChannel.EMAIL,
        },
        data: {
          status: NotificationQueueStatus.PENDING,
          scheduledFor: new Date(),
          lastError: null,
          processedAt: null,
        },
      });
      count += updated.count;
    }
    return count;
  }

  async listHistory(params: {
    userId: string | null;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.NotificationAuditWhereInput = params.userId
      ? { userId: params.userId }
      : {};
    const skip = (params.page - 1) * params.pageSize;
    const [items, total] = await Promise.all([
      prisma.notificationAudit.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: params.pageSize,
      }),
      prisma.notificationAudit.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }
}

export const notificationsRepository = new NotificationsRepository();
