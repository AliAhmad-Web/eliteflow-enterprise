import {
  ActivityEntityType,
  CommentEntityType,
  ConversationMemberRole,
  ConversationType,
  MessageReadStatus,
  prisma,
  type Prisma,
} from "@enterprise/database";
import type {
  ListActivitiesQueryInput,
  ListCommentsQueryInput,
  ListConversationsQueryInput,
  ListMessagesQueryInput,
} from "@enterprise/shared";

// ---------------------------------------------------------------------------
// Shared include shapes
// ---------------------------------------------------------------------------

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
} as const;

const memberInclude = {
  user: { select: userSelect },
} as const;

const messageInclude = {
  sender: { select: userSelect },
  parent: {
    select: {
      id: true,
      body: true,
      senderId: true,
      sender: { select: userSelect },
    },
  },
  attachments: { where: { deletedAt: null } },
  reactions: { include: { user: { select: userSelect } } },
  reads: true,
} as const;

/** Thread list: same message payload without loading every read receipt row. */
const messageListInclude = {
  sender: { select: userSelect },
  parent: {
    select: {
      id: true,
      body: true,
      senderId: true,
      sender: { select: userSelect },
    },
  },
  attachments: { where: { deletedAt: null } },
  reactions: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
  reads: {
    select: {
      id: true,
      messageId: true,
      userId: true,
      status: true,
      deliveredAt: true,
      seenAt: true,
    },
  },
} as const;

const commentInclude = {
  author: { select: userSelect },
  attachments: { where: { deletedAt: null } },
} as const;

const activityInclude = {
  actor: { select: userSelect },
  attachments: { where: { deletedAt: null } },
} as const;

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export class CommunicationRepository {
  // ---- Conversations --------------------------------------------------------

  async findConversationById(id: string) {
    return prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          include: memberInclude,
        },
      },
    });
  }

  async listConversations(params: {
    userId: string;
    query: ListConversationsQueryInput;
    clientScope?: boolean;
    /** SUPER_ADMIN / ADMIN can list all non-deleted conversations */
    orgWide?: boolean;
    /** When set, filter by multiple conversation types (e.g. channels). */
    types?: ConversationType[];
  }) {
    const { userId, query, clientScope, orgWide, types } = params;

    const where: Prisma.ConversationWhereInput = {
      deletedAt: null,
      // Org admins see all conversations; everyone else only membership.
      ...(!orgWide || clientScope
        ? {
            members: {
              some: { userId, deletedAt: null },
            },
          }
        : {}),
      ...(types?.length
        ? { type: { in: types } }
        : query.type
          ? { type: query.type as ConversationType }
          : {}),
      ...(query.archivedOnly
        ? { archivedAt: { not: null } }
        : query.includeArchived
          ? {}
          : { archivedAt: null }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              {
                messages: {
                  some: {
                    body: { contains: query.search, mode: "insensitive" },
                    deletedAt: null,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
        include: {
          members: {
            where: { deletedAt: null },
            include: memberInclude,
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async createConversation(data: {
    type: ConversationType;
    name?: string | null;
    description?: string | null;
    avatarUrl?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    projectId?: string | null;
    clientId?: string | null;
    createdById: string;
    memberIds: string[];
    memberRole?: ConversationMemberRole;
  }) {
    const ownerRole = ConversationMemberRole.OWNER;
    const memberRole = data.memberRole ?? ConversationMemberRole.MEMBER;

    return prisma.conversation.create({
      data: {
        type: data.type,
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        departmentId: data.departmentId,
        teamId: data.teamId,
        projectId: data.projectId,
        clientId: data.clientId,
        createdById: data.createdById,
        updatedById: data.createdById,
        members: {
          createMany: {
            data: [
              { userId: data.createdById, role: ownerRole },
              ...data.memberIds
                .filter((id) => id !== data.createdById)
                .map((userId) => ({ userId, role: memberRole })),
            ],
            skipDuplicates: true,
          },
        },
      },
      include: {
        members: {
          where: { deletedAt: null },
          include: memberInclude,
        },
      },
    });
  }

  async updateConversation(
    id: string,
    data: {
      name?: string | null;
      description?: string | null;
      avatarUrl?: string | null;
      updatedById: string;
    },
  ) {
    return prisma.conversation.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        updatedById: data.updatedById,
      },
      include: {
        members: { where: { deletedAt: null }, include: memberInclude },
      },
    });
  }

  async softDeleteConversation(id: string, actorId: string) {
    return prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  }

  async archiveConversation(id: string, actorId: string) {
    return prisma.conversation.update({
      where: { id },
      data: { archivedAt: new Date(), updatedById: actorId },
      include: {
        members: { where: { deletedAt: null }, include: memberInclude },
      },
    });
  }

  async unarchiveConversation(id: string, actorId: string) {
    return prisma.conversation.update({
      where: { id },
      data: { archivedAt: null, updatedById: actorId },
      include: {
        members: { where: { deletedAt: null }, include: memberInclude },
      },
    });
  }

  // ---- Membership -----------------------------------------------------------

  async findMembership(conversationId: string, userId: string) {
    return prisma.conversationMember.findFirst({
      where: { conversationId, userId, deletedAt: null },
    });
  }

  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const m = await this.findMembership(conversationId, userId);
    return m !== null;
  }

  async addMembers(
    conversationId: string,
    userIds: string[],
    role: ConversationMemberRole,
    actorId: string,
  ) {
    await prisma.conversationMember.createMany({
      data: userIds.map((userId) => ({
        conversationId,
        userId,
        role,
        createdById: actorId,
        updatedById: actorId,
      })),
      skipDuplicates: true,
    });
  }

  async removeMember(conversationId: string, userId: string, actorId: string) {
    await prisma.conversationMember.updateMany({
      where: { conversationId, userId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        leftAt: new Date(),
        updatedById: actorId,
      },
    });
  }

  async updateMemberRole(
    conversationId: string,
    userId: string,
    role: ConversationMemberRole,
    actorId: string,
  ) {
    return prisma.conversationMember.updateMany({
      where: { conversationId, userId, deletedAt: null },
      data: { role, updatedById: actorId },
    });
  }

  // ---- Messages -------------------------------------------------------------

  async findMessageById(id: string) {
    return prisma.message.findFirst({
      where: { id, deletedAt: null },
      include: messageInclude,
    });
  }

  async listMessages(params: {
    conversationId: string;
    query: ListMessagesQueryInput;
  }) {
    const { conversationId, query } = params;

    const where: Prisma.MessageWhereInput = {
      conversationId,
      deletedAt: null,
      ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      ...(query.search
        ? { body: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const skip = query.cursor ? undefined : (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        include: messageListInclude,
        ...(query.cursor
          ? {
              cursor: { id: query.cursor },
              skip: 1,
            }
          : {}),
      }),
      prisma.message.count({ where }),
    ]);

    const hasMore = items.length === query.pageSize;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.reverse(),
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasMore,
      nextCursor,
    };
  }

  async listPinnedMessages(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId, isPinned: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: messageInclude,
    });
  }

  async createMessage(data: {
    conversationId: string;
    senderId: string;
    body: string;
    kind?: string;
    parentId?: string | null;
    forwardedFromId?: string | null;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
      managedFileId?: string | null;
      durationSeconds?: number | null;
      waveformJson?: string | null;
    }>;
  }) {
    const msg = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        body: data.body,
        kind: (data.kind as "TEXT" | "SYSTEM" | "VOICE") ?? "TEXT",
        parentId: data.parentId,
        forwardedFromId: data.forwardedFromId,
        createdById: data.senderId,
        updatedById: data.senderId,
        attachments: data.attachments?.length
          ? {
              createMany: {
                data: data.attachments.map((a) => ({
                  fileName: a.fileName,
                  fileUrl: a.fileUrl,
                  mimeType: a.mimeType,
                  sizeBytes: a.sizeBytes,
                  managedFileId: a.managedFileId,
                  durationSeconds: a.durationSeconds,
                  waveformJson: a.waveformJson,
                  createdById: data.senderId,
                })),
              },
            }
          : undefined,
      },
      include: messageInclude,
    });

    // Update conversation preview
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: {
        lastMessageAt: msg.createdAt,
        lastMessagePreview: data.body.substring(0, 200),
        updatedById: data.senderId,
      },
    });

    return msg;
  }

  async updateMessage(id: string, body: string, actorId: string) {
    return prisma.message.update({
      where: { id },
      data: {
        body,
        isEdited: true,
        editedAt: new Date(),
        updatedById: actorId,
      },
      include: messageInclude,
    });
  }

  async softDeleteMessage(id: string, actorId: string) {
    return prisma.message.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  }

  async pinMessage(id: string, isPinned: boolean, actorId: string) {
    return prisma.message.update({
      where: { id },
      data: { isPinned, updatedById: actorId },
      include: messageInclude,
    });
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    return prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    await prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
  }

  async upsertMessageRead(
    messageId: string,
    userId: string,
    status: MessageReadStatus,
  ) {
    const now = new Date();
    return prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: {
        messageId,
        userId,
        status,
        deliveredAt: status !== MessageReadStatus.SENT ? now : null,
        seenAt: status === MessageReadStatus.SEEN ? now : null,
      },
      update: {
        status,
        deliveredAt:
          status !== MessageReadStatus.SENT
            ? now
            : undefined,
        seenAt: status === MessageReadStatus.SEEN ? now : undefined,
      },
    });
  }

  async markConversationRead(
    conversationId: string,
    userId: string,
    opts?: { messageIds?: string[]; upToMessageId?: string },
  ) {
    const now = new Date();

    let messageIds: string[] = opts?.messageIds ?? [];

    if (opts?.upToMessageId && !messageIds.length) {
      const pivot = await prisma.message.findFirst({
        where: { id: opts.upToMessageId },
        select: { createdAt: true },
      });
      if (pivot) {
        const msgs = await prisma.message.findMany({
          where: {
            conversationId,
            deletedAt: null,
            createdAt: { lte: pivot.createdAt },
          },
          select: { id: true },
        });
        messageIds = msgs.map((m) => m.id);
      }
    }

    if (!messageIds.length) {
      const msgs = await prisma.message.findMany({
        where: { conversationId, deletedAt: null },
        select: { id: true },
      });
      messageIds = msgs.map((m) => m.id);
    }

    for (const messageId of messageIds) {
      await this.upsertMessageRead(messageId, userId, MessageReadStatus.SEEN);
    }

    await prisma.conversationMember.updateMany({
      where: { conversationId, userId, deletedAt: null },
      data: { lastReadAt: now },
    });
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const member = await this.findMembership(conversationId, userId);
    if (!member) return 0;

    return prisma.message.count({
      where: {
        conversationId,
        deletedAt: null,
        createdAt: member.lastReadAt
          ? { gt: member.lastReadAt }
          : undefined,
        senderId: { not: userId },
      },
    });
  }

  // ---- Presence -------------------------------------------------------------

  async upsertPresence(
    userId: string,
    data: {
      isOnline?: boolean;
      lastSeenAt?: Date | null;
      typingConversationId?: string | null;
      typingUpdatedAt?: Date | null;
    },
  ) {
    return prisma.userPresence.upsert({
      where: { userId },
      create: {
        userId,
        isOnline: data.isOnline ?? false,
        lastSeenAt: data.lastSeenAt,
        typingConversationId: data.typingConversationId,
        typingUpdatedAt: data.typingUpdatedAt,
      },
      update: {
        ...(data.isOnline !== undefined ? { isOnline: data.isOnline } : {}),
        ...(data.lastSeenAt !== undefined ? { lastSeenAt: data.lastSeenAt } : {}),
        ...(data.typingConversationId !== undefined
          ? { typingConversationId: data.typingConversationId }
          : {}),
        ...(data.typingUpdatedAt !== undefined
          ? { typingUpdatedAt: data.typingUpdatedAt }
          : {}),
      },
    });
  }

  async getPresence(userId: string) {
    return prisma.userPresence.findUnique({ where: { userId } });
  }

  async listPresenceForConversation(conversationId: string) {
    const members = await prisma.conversationMember.findMany({
      where: { conversationId, deletedAt: null },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);
    const presences = await prisma.userPresence.findMany({
      where: { userId: { in: userIds } },
    });
    return presences;
  }

  async getPresenceMap(
    userIds: string[],
  ): Promise<
    Map<
      string,
      {
        isOnline: boolean;
        lastSeenAt: Date | null;
        typingConversationId: string | null;
        typingUpdatedAt: Date | null;
      }
    >
  > {
    const rows = await prisma.userPresence.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        isOnline: true,
        lastSeenAt: true,
        typingConversationId: true,
        typingUpdatedAt: true,
      },
    });
    const map = new Map<
      string,
      {
        isOnline: boolean;
        lastSeenAt: Date | null;
        typingConversationId: string | null;
        typingUpdatedAt: Date | null;
      }
    >();
    for (const r of rows) {
      map.set(r.userId, {
        isOnline: r.isOnline,
        lastSeenAt: r.lastSeenAt,
        typingConversationId: r.typingConversationId,
        typingUpdatedAt: r.typingUpdatedAt,
      });
    }
    return map;
  }

  // ---- Comments -------------------------------------------------------------

  async findCommentById(id: string) {
    return prisma.comment.findFirst({
      where: { id, deletedAt: null },
      include: commentInclude,
    });
  }

  async listComments(query: ListCommentsQueryInput & { parentIdNull?: boolean }) {
    const where: Prisma.CommentWhereInput = {
      entityType: query.entityType as CommentEntityType,
      entityId: query.entityId,
      deletedAt: null,
      parentId: query.parentIdNull ? null : undefined,
    };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: query.pageSize,
        include: {
          ...commentInclude,
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: commentInclude,
          },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async createComment(data: {
    entityType: string;
    entityId: string;
    authorId: string;
    body: string;
    parentId?: string | null;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
      managedFileId?: string | null;
    }>;
  }) {
    return prisma.comment.create({
      data: {
        entityType: data.entityType as CommentEntityType,
        entityId: data.entityId,
        authorId: data.authorId,
        body: data.body,
        parentId: data.parentId,
        createdById: data.authorId,
        updatedById: data.authorId,
        attachments: data.attachments?.length
          ? {
              createMany: {
                data: data.attachments.map((a) => ({
                  ...a,
                  createdById: data.authorId,
                })),
              },
            }
          : undefined,
      },
      include: commentInclude,
    });
  }

  async updateComment(id: string, body: string, actorId: string) {
    return prisma.comment.update({
      where: { id },
      data: { body, updatedById: actorId },
      include: commentInclude,
    });
  }

  async softDeleteComment(id: string, actorId: string) {
    return prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  }

  // ---- Activities -----------------------------------------------------------

  async createActivity(data: {
    actorId?: string | null;
    action: string;
    title: string;
    body?: string | null;
    entityType: string;
    entityId?: string | null;
    linkUrl?: string | null;
    metadata?: Prisma.InputJsonValue;
    createdById?: string | null;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
      managedFileId?: string | null;
    }>;
  }) {
    return prisma.activity.create({
      data: {
        actorId: data.actorId,
        action: data.action,
        title: data.title,
        body: data.body,
        entityType: data.entityType as ActivityEntityType,
        entityId: data.entityId,
        linkUrl: data.linkUrl,
        metadata: data.metadata,
        createdById: data.createdById,
        updatedById: data.createdById,
        attachments: data.attachments?.length
          ? {
              createMany: {
                data: data.attachments.map((a) => ({
                  ...a,
                  createdById: data.createdById,
                })),
              },
            }
          : undefined,
      },
      include: activityInclude,
    });
  }

  async listActivities(query: ListActivitiesQueryInput) {
    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      ...(query.entityType ? { entityType: query.entityType as ActivityEntityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { body: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        include: activityInclude,
      }),
      prisma.activity.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async activityExists(opts: {
    action: string;
    entityType: string;
    entityId: string;
    since?: Date;
  }): Promise<boolean> {
    const count = await prisma.activity.count({
      where: {
        action: opts.action,
        entityType: opts.entityType as ActivityEntityType,
        entityId: opts.entityId,
        deletedAt: null,
        ...(opts.since ? { createdAt: { gte: opts.since } } : {}),
      },
    });
    return count > 0;
  }

  // ---- Search ---------------------------------------------------------------

  async searchConversations(
    q: string,
    userId: string,
    take: number,
    orgWide = false,
  ) {
    return prisma.conversation.findMany({
      where: {
        deletedAt: null,
        ...(orgWide
          ? {}
          : { members: { some: { userId, deletedAt: null } } }),
        name: { contains: q, mode: "insensitive" },
      },
      take,
      include: {
        members: { where: { deletedAt: null }, include: memberInclude },
      },
    });
  }

  async searchMessages(
    q: string,
    userId: string,
    take: number,
    orgWide = false,
    filters?: {
      fromDate?: string;
      toDate?: string;
      senderId?: string;
      hasAttachment?: boolean;
      hasMention?: boolean;
      isPinned?: boolean;
    },
  ) {
    return prisma.message.findMany({
      where: {
        deletedAt: null,
        ...(q
          ? { body: { contains: q, mode: "insensitive" as const } }
          : {}),
        ...(filters?.senderId ? { senderId: filters.senderId } : {}),
        ...(filters?.isPinned ? { isPinned: true } : {}),
        ...(filters?.hasAttachment
          ? { attachments: { some: { deletedAt: null } } }
          : {}),
        ...(filters?.hasMention
          ? { body: { contains: "@[", mode: "insensitive" as const } }
          : {}),
        ...(filters?.fromDate || filters?.toDate
          ? {
              createdAt: {
                ...(filters.fromDate
                  ? { gte: new Date(filters.fromDate) }
                  : {}),
                ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
              },
            }
          : {}),
        conversation: {
          deletedAt: null,
          ...(orgWide
            ? {}
            : { members: { some: { userId, deletedAt: null } } }),
        },
      },
      take,
      orderBy: { createdAt: "desc" },
      include: messageInclude,
    });
  }

  async searchMessageAttachments(
    q: string,
    userId: string,
    take: number,
    orgWide = false,
    filters?: {
      fromDate?: string;
      toDate?: string;
      senderId?: string;
    },
  ) {
    return prisma.messageAttachment.findMany({
      where: {
        deletedAt: null,
        ...(q
          ? { fileName: { contains: q, mode: "insensitive" as const } }
          : {}),
        message: {
          deletedAt: null,
          ...(filters?.senderId ? { senderId: filters.senderId } : {}),
          ...(filters?.fromDate || filters?.toDate
            ? {
                createdAt: {
                  ...(filters.fromDate
                    ? { gte: new Date(filters.fromDate) }
                    : {}),
                  ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
                },
              }
            : {}),
          conversation: {
            deletedAt: null,
            ...(orgWide
              ? {}
              : { members: { some: { userId, deletedAt: null } } }),
          },
        },
      },
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        mimeType: true,
        messageId: true,
        message: { select: { conversationId: true } },
      },
    });
  }

  async searchUsers(q: string, take: number) {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
      },
    });
  }

  async searchProjects(q: string, take: number, clientId?: string | null) {
    return prisma.project.findMany({
      where: {
        deletedAt: null,
        name: { contains: q, mode: "insensitive" },
        ...(clientId ? { clientId } : {}),
      },
      take,
      select: { id: true, name: true, status: true },
    });
  }

  async searchClients(q: string, take: number) {
    return prisma.client.findMany({
      where: {
        deletedAt: null,
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, companyName: true, status: true },
    });
  }
}
export const communicationRepository = new CommunicationRepository();
