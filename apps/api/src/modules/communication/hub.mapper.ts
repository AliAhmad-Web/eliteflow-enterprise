import type {
  AnnouncementDto,
  DiscussionReplyDto,
  DiscussionThreadDto,
  MeetingParticipantDto,
  MeetingRecordingDto,
  MeetingRoomDto,
  MeetingScreenShareDto,
} from "@enterprise/shared";

type UserSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
};

function mapUser(user?: UserSummary | null) {
  if (!user) return undefined;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

export function toAnnouncementDto(
  row: {
    id: string;
    title: string;
    body: string;
    priority: string;
    departmentId: string | null;
    expiresAt: Date | null;
    isPinned: boolean;
    publishedAt: Date | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: UserSummary | null;
    attachments?: Array<{
      id: string;
      announcementId: string;
      fileName: string;
      fileUrl: string;
      mimeType: string | null;
      sizeBytes: number | null;
      managedFileId: string | null;
      createdAt: Date;
    }>;
    _count?: { reads?: number };
    reads?: Array<{ userId: string }>;
  },
  extras?: { isReadByMe?: boolean; readCount?: number },
): AnnouncementDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    priority: row.priority as AnnouncementDto["priority"],
    departmentId: row.departmentId,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    isPinned: row.isPinned,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy ? mapUser(row.createdBy) : null,
    attachments: row.attachments?.map((a) => ({
      id: a.id,
      announcementId: a.announcementId,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      managedFileId: a.managedFileId,
      createdAt: a.createdAt.toISOString(),
    })),
    readCount: extras?.readCount ?? row._count?.reads,
    isReadByMe: extras?.isReadByMe,
  };
}

type ReplyRow = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author?: UserSummary | null;
  replies?: ReplyRow[];
};

export function toDiscussionReplyDto(row: ReplyRow): DiscussionReplyDto {
  return {
    id: row.id,
    threadId: row.threadId,
    authorId: row.authorId,
    body: row.body,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: mapUser(row.author),
    replies: row.replies?.map((r) => toDiscussionReplyDto(r)),
  };
}

/** Build a nested reply tree from a flat list (parentId links). */
export function nestDiscussionReplies(rows: ReplyRow[]): DiscussionReplyDto[] {
  const byId = new Map<string, ReplyRow & { replies: ReplyRow[] }>();
  for (const row of rows) {
    byId.set(row.id, { ...row, replies: [] });
  }
  const roots: Array<ReplyRow & { replies: ReplyRow[] }> = [];
  for (const row of byId.values()) {
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId)!.replies.push(row);
    } else {
      roots.push(row);
    }
  }
  return roots.map((r) => toDiscussionReplyDto(r));
}

export function toDiscussionThreadDto(
  row: {
    id: string;
    title: string;
    body: string;
    category: string | null;
    status: string;
    isPinned: boolean;
    departmentId: string | null;
    teamId: string | null;
    projectId: string | null;
    resolvedAt: Date | null;
    resolvedById: string | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: UserSummary | null;
    resolvedBy?: UserSummary | null;
    tags?: Array<{ tag: string }>;
    replies?: ReplyRow[];
    _count?: { replies?: number };
  },
  extras?: { nestReplies?: boolean },
): DiscussionThreadDto {
  const flatReplies = row.replies ?? [];
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    status: row.status as DiscussionThreadDto["status"],
    isPinned: row.isPinned,
    departmentId: row.departmentId,
    teamId: row.teamId,
    projectId: row.projectId,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedById: row.resolvedById,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy ? mapUser(row.createdBy) : null,
    resolvedBy: row.resolvedBy ? mapUser(row.resolvedBy) : null,
    tags: row.tags?.map((t) => t.tag),
    replyCount: row._count?.replies ?? flatReplies.length,
    replies: extras?.nestReplies
      ? nestDiscussionReplies(flatReplies)
      : flatReplies.map((r) => toDiscussionReplyDto(r)),
  };
}

export function toMeetingParticipantDto(row: {
  id: string;
  meetingId: string;
  userId: string;
  status: string;
  invitedAt: Date;
  joinedAt: Date | null;
  leftAt: Date | null;
  admittedAt: Date | null;
  user?: UserSummary | null;
}): MeetingParticipantDto {
  return {
    id: row.id,
    meetingId: row.meetingId,
    userId: row.userId,
    status: row.status as MeetingParticipantDto["status"],
    invitedAt: row.invitedAt.toISOString(),
    joinedAt: row.joinedAt?.toISOString() ?? null,
    leftAt: row.leftAt?.toISOString() ?? null,
    admittedAt: row.admittedAt?.toISOString() ?? null,
    user: mapUser(row.user),
  };
}

export function toMeetingRecordingDto(row: {
  id: string;
  meetingId: string;
  fileName: string;
  storageUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  managedFileId: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}): MeetingRecordingDto {
  return {
    id: row.id,
    meetingId: row.meetingId,
    fileName: row.fileName,
    storageUrl: row.storageUrl,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    durationSeconds: row.durationSeconds,
    managedFileId: row.managedFileId,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toMeetingScreenShareDto(row: {
  id: string;
  meetingId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  user?: UserSummary | null;
}): MeetingScreenShareDto {
  return {
    id: row.id,
    meetingId: row.meetingId,
    userId: row.userId,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    user: mapUser(row.user),
  };
}

export function toMeetingRoomDto(
  row: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    scheduledStart: Date;
    scheduledEnd: Date | null;
    startedAt: Date | null;
    endedAt: Date | null;
    waitingRoomEnabled: boolean;
    webrtcRoomId: string | null;
    conversationId: string | null;
    hostId: string;
    createdAt: Date;
    updatedAt: Date;
    host?: UserSummary | null;
    participants?: Array<{
      id: string;
      meetingId: string;
      userId: string;
      status: string;
      invitedAt: Date;
      joinedAt: Date | null;
      leftAt: Date | null;
      admittedAt: Date | null;
      user?: UserSummary | null;
    }>;
    recordings?: Array<{
      id: string;
      meetingId: string;
      fileName: string;
      storageUrl: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      durationSeconds: number | null;
      managedFileId: string | null;
      startedAt: Date | null;
      endedAt: Date | null;
      createdAt: Date;
    }>;
    screenShares?: Array<{
      id: string;
      meetingId: string;
      userId: string;
      startedAt: Date;
      endedAt: Date | null;
      user?: UserSummary | null;
    }>;
    _count?: { participants?: number };
  },
): MeetingRoomDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as MeetingRoomDto["status"],
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    waitingRoomEnabled: row.waitingRoomEnabled,
    webrtcRoomId: row.webrtcRoomId,
    conversationId: row.conversationId,
    hostId: row.hostId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    host: mapUser(row.host),
    participants: row.participants?.map((p) => toMeetingParticipantDto(p)),
    recordings: row.recordings?.map((r) => toMeetingRecordingDto(r)),
    screenShares: row.screenShares?.map((s) => toMeetingScreenShareDto(s)),
    participantCount:
      row._count?.participants ?? row.participants?.length ?? undefined,
  };
}
