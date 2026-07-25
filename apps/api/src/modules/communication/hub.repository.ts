import {
  prisma,
  type Prisma,
} from "@enterprise/database";
import type {
  ListAnnouncementsQueryInput,
  ListDiscussionThreadsQueryInput,
  ListMeetingsQueryInput,
} from "@enterprise/shared";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
} as const;

const announcementInclude = {
  createdBy: { select: userSelect },
  attachments: { where: { deletedAt: null } },
  _count: { select: { reads: true } },
} as const;

const replyInclude = {
  author: { select: userSelect },
} as const;

const threadInclude = {
  createdBy: { select: userSelect },
  resolvedBy: { select: userSelect },
  tags: true,
  _count: { select: { replies: { where: { deletedAt: null } } } },
} as const;

const meetingDetailInclude = {
  host: { select: userSelect },
  participants: {
    include: { user: { select: userSelect } },
    orderBy: { invitedAt: "asc" as const },
  },
  recordings: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
  },
  screenShares: {
    include: { user: { select: userSelect } },
    orderBy: { startedAt: "desc" as const },
  },
  _count: { select: { participants: true } },
} as const;

export class CommunicationHubRepository {
  // ---- Announcements --------------------------------------------------------

  async listAnnouncements(params: {
    query: ListAnnouncementsQueryInput;
    userId?: string;
  }) {
    const { query, userId } = params;
    const where: Prisma.AnnouncementWhereInput = {
      deletedAt: null,
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.pinnedOnly ? { isPinned: true } : {}),
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
      prisma.announcement.findMany({
        where,
        orderBy: [
          { isPinned: "desc" },
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: query.pageSize,
        include: {
          ...announcementInclude,
          ...(userId
            ? {
                reads: {
                  where: { userId },
                  select: { userId: true },
                  take: 1,
                },
              }
            : {}),
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findAnnouncementById(id: string, userId?: string) {
    return prisma.announcement.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...announcementInclude,
        ...(userId
          ? {
              reads: {
                where: { userId },
                select: { userId: true },
                take: 1,
              },
            }
          : {}),
      },
    });
  }

  async createAnnouncement(data: {
    title: string;
    body: string;
    priority: string;
    departmentId?: string | null;
    expiresAt?: Date | null;
    isPinned: boolean;
    publishedAt?: Date | null;
    createdById: string;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
      managedFileId?: string | null;
    }>;
  }) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        priority: data.priority as never,
        departmentId: data.departmentId,
        expiresAt: data.expiresAt,
        isPinned: data.isPinned,
        publishedAt: data.publishedAt,
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
      include: announcementInclude,
    });
  }

  async updateAnnouncement(
    id: string,
    data: {
      title?: string;
      body?: string;
      priority?: string;
      departmentId?: string | null;
      expiresAt?: Date | null;
      isPinned?: boolean;
      publishedAt?: Date | null;
      updatedById: string;
    },
  ) {
    return prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.priority !== undefined
          ? { priority: data.priority as never }
          : {}),
        ...(data.departmentId !== undefined
          ? { departmentId: data.departmentId }
          : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
        ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
        ...(data.publishedAt !== undefined
          ? { publishedAt: data.publishedAt }
          : {}),
        updatedById: data.updatedById,
      },
      include: announcementInclude,
    });
  }

  async softDeleteAnnouncement(id: string, updatedById: string) {
    return prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  async markAnnouncementRead(announcementId: string, userId: string) {
    return prisma.announcementRead.upsert({
      where: {
        announcementId_userId: { announcementId, userId },
      },
      create: { announcementId, userId },
      update: { readAt: new Date() },
    });
  }

  async countAnnouncementReads(announcementId: string) {
    return prisma.announcementRead.count({ where: { announcementId } });
  }

  // ---- Discussion threads ---------------------------------------------------

  async listThreads(params: { query: ListDiscussionThreadsQueryInput }) {
    const { query } = params;
    const where: Prisma.DiscussionThreadWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.pinnedOnly ? { isPinned: true } : {}),
      ...(query.tag
        ? { tags: { some: { tag: { equals: query.tag, mode: "insensitive" } } } }
        : {}),
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
      prisma.discussionThread.findMany({
        where,
        orderBy: [
          { isPinned: "desc" },
          { updatedAt: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: query.pageSize,
        include: threadInclude,
      }),
      prisma.discussionThread.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findThreadById(id: string) {
    return prisma.discussionThread.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...threadInclude,
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: replyInclude,
        },
      },
    });
  }

  async createThread(data: {
    title: string;
    body: string;
    category?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    projectId?: string | null;
    isPinned: boolean;
    createdById: string;
    tags?: string[];
  }) {
    return prisma.discussionThread.create({
      data: {
        title: data.title,
        body: data.body,
        category: data.category,
        departmentId: data.departmentId,
        teamId: data.teamId,
        projectId: data.projectId,
        isPinned: data.isPinned,
        createdById: data.createdById,
        updatedById: data.createdById,
        tags: data.tags?.length
          ? {
              createMany: {
                data: data.tags.map((tag) => ({ tag })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: threadInclude,
    });
  }

  async updateThread(
    id: string,
    data: {
      title?: string;
      body?: string;
      category?: string | null;
      isPinned?: boolean;
      status?: string;
      resolvedAt?: Date | null;
      resolvedById?: string | null;
      updatedById: string;
    },
  ) {
    return prisma.discussionThread.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
        ...(data.status !== undefined ? { status: data.status as never } : {}),
        ...(data.resolvedAt !== undefined
          ? { resolvedAt: data.resolvedAt }
          : {}),
        ...(data.resolvedById !== undefined
          ? { resolvedById: data.resolvedById }
          : {}),
        updatedById: data.updatedById,
      },
      include: threadInclude,
    });
  }

  async softDeleteThread(id: string, updatedById: string) {
    return prisma.discussionThread.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  async resolveThread(id: string, resolvedById: string) {
    return prisma.discussionThread.update({
      where: { id },
      data: {
        status: "RESOLVED" as never,
        resolvedAt: new Date(),
        resolvedById,
        updatedById: resolvedById,
      },
      include: {
        ...threadInclude,
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: replyInclude,
        },
      },
    });
  }

  async createReply(data: {
    threadId: string;
    authorId: string;
    body: string;
    parentId?: string | null;
  }) {
    return prisma.discussionReply.create({
      data: {
        threadId: data.threadId,
        authorId: data.authorId,
        body: data.body,
        parentId: data.parentId,
        createdById: data.authorId,
        updatedById: data.authorId,
      },
      include: replyInclude,
    });
  }

  async replaceTags(threadId: string, tags: string[]) {
    await prisma.discussionThreadTag.deleteMany({ where: { threadId } });
    if (tags.length === 0) return [];
    await prisma.discussionThreadTag.createMany({
      data: tags.map((tag) => ({ threadId, tag })),
      skipDuplicates: true,
    });
    return prisma.discussionThreadTag.findMany({ where: { threadId } });
  }

  // ---- Meetings -------------------------------------------------------------

  async listMeetings(params: {
    query: ListMeetingsQueryInput;
    userId?: string;
    orgWide?: boolean;
  }) {
    const { query, userId, orgWide } = params;
    const and: Prisma.MeetingRoomWhereInput[] = [{ deletedAt: null }];
    if (query.status) and.push({ status: query.status });
    if (query.search) {
      and.push({
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }
    if (userId && !orgWide) {
      and.push({
        OR: [{ hostId: userId }, { participants: { some: { userId } } }],
      });
    }
    const where: Prisma.MeetingRoomWhereInput = { AND: and };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      prisma.meetingRoom.findMany({
        where,
        orderBy: [{ scheduledStart: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.pageSize,
        include: {
          host: { select: userSelect },
          _count: { select: { participants: true } },
        },
      }),
      prisma.meetingRoom.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findMeetingById(id: string) {
    return prisma.meetingRoom.findFirst({
      where: { id, deletedAt: null },
      include: meetingDetailInclude,
    });
  }

  async createMeeting(data: {
    title: string;
    description?: string | null;
    scheduledStart: Date;
    scheduledEnd?: Date | null;
    waitingRoomEnabled: boolean;
    conversationId?: string | null;
    hostId: string;
    participantIds?: string[];
  }) {
    const participantIds = [
      ...new Set([
        data.hostId,
        ...(data.participantIds ?? []).filter((id) => id !== data.hostId),
      ]),
    ];

    return prisma.meetingRoom.create({
      data: {
        title: data.title,
        description: data.description,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        waitingRoomEnabled: data.waitingRoomEnabled,
        conversationId: data.conversationId,
        hostId: data.hostId,
        createdById: data.hostId,
        updatedById: data.hostId,
        participants: {
          createMany: {
            data: participantIds.map((userId) => ({
              userId,
              createdById: data.hostId,
            })),
            skipDuplicates: true,
          },
        },
      },
      include: meetingDetailInclude,
    });
  }

  async updateMeeting(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      scheduledStart?: Date;
      scheduledEnd?: Date | null;
      waitingRoomEnabled?: boolean;
      status?: string;
      startedAt?: Date | null;
      endedAt?: Date | null;
      updatedById: string;
    },
  ) {
    return prisma.meetingRoom.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.scheduledStart !== undefined
          ? { scheduledStart: data.scheduledStart }
          : {}),
        ...(data.scheduledEnd !== undefined
          ? { scheduledEnd: data.scheduledEnd }
          : {}),
        ...(data.waitingRoomEnabled !== undefined
          ? { waitingRoomEnabled: data.waitingRoomEnabled }
          : {}),
        ...(data.status !== undefined ? { status: data.status as never } : {}),
        ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
        ...(data.endedAt !== undefined ? { endedAt: data.endedAt } : {}),
        updatedById: data.updatedById,
      },
      include: meetingDetailInclude,
    });
  }

  async softDeleteMeeting(id: string, updatedById: string) {
    return prisma.meetingRoom.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  async updateParticipantStatus(
    meetingId: string,
    userId: string,
    status: string,
  ) {
    const now = new Date();
    const statusTimestamps: Record<string, Partial<{
      joinedAt: Date;
      leftAt: Date;
      admittedAt: Date;
    }>> = {
      JOINED: { joinedAt: now },
      LEFT: { leftAt: now },
      ADMITTED: { admittedAt: now },
    };

    return prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data: {
        status: status as never,
        ...(statusTimestamps[status] ?? {}),
      },
      include: { user: { select: userSelect } },
    });
  }

  async addRecording(
    meetingId: string,
    data: {
      fileName: string;
      storageUrl?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      durationSeconds?: number | null;
      managedFileId?: string | null;
      startedAt?: Date | null;
      endedAt?: Date | null;
      createdById: string;
    },
  ) {
    return prisma.meetingRecording.create({
      data: {
        meetingId,
        fileName: data.fileName,
        storageUrl: data.storageUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        durationSeconds: data.durationSeconds,
        managedFileId: data.managedFileId,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        createdById: data.createdById,
      },
    });
  }

  async addScreenShare(meetingId: string, userId: string) {
    return prisma.meetingScreenShare.create({
      data: { meetingId, userId },
      include: { user: { select: userSelect } },
    });
  }

  async endScreenShare(id: string) {
    return prisma.meetingScreenShare.update({
      where: { id },
      data: { endedAt: new Date() },
      include: { user: { select: userSelect } },
    });
  }

  async endActiveScreenShares(meetingId: string, excludeId?: string) {
    return prisma.meetingScreenShare.updateMany({
      where: {
        meetingId,
        endedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      data: { endedAt: new Date() },
    });
  }
}

export const communicationHubRepository = new CommunicationHubRepository();
