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

export function toConversationDto(
  row: {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    avatarUrl: string | null;
    departmentId: string | null;
    teamId: string | null;
    projectId: string | null;
    clientId: string | null;
    lastMessageAt: Date | null;
    lastMessagePreview: string | null;
    archivedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{
      id: string;
      conversationId: string;
      userId: string;
      role: string;
      lastReadAt: Date | null;
      mutedUntil: Date | null;
      joinedAt: Date;
      user?: UserSummary;
    }>;
  },
  extras?: {
    unreadCount?: number;
    memberCount?: number;
    presence?: Map<string, { isOnline: boolean; lastSeenAt: Date | null }>;
    presenceMap?: Map<string, { isOnline: boolean; lastSeenAt: Date | null }>;
  },
) {
  const presence = extras?.presenceMap ?? extras?.presence;
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    avatarUrl: row.avatarUrl,
    departmentId: row.departmentId,
    teamId: row.teamId,
    projectId: row.projectId,
    clientId: row.clientId,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: row.lastMessagePreview,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    unreadCount: extras?.unreadCount ?? 0,
    memberCount: extras?.memberCount ?? row.members?.length ?? 0,
    members: row.members?.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      userId: m.userId,
      role: m.role,
      lastReadAt: m.lastReadAt?.toISOString() ?? null,
      mutedUntil: m.mutedUntil?.toISOString() ?? null,
      joinedAt: m.joinedAt.toISOString(),
      user: mapUser(m.user),
      isOnline: presence?.get(m.userId)?.isOnline ?? false,
      lastSeenAt: presence?.get(m.userId)?.lastSeenAt?.toISOString() ?? null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toMessageDto(row: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  kind: string;
  parentId: string | null;
  forwardedFromId: string | null;
  isPinned: boolean;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sender?: UserSummary;
  parent?: {
    id: string;
    body: string;
    senderId: string;
    sender?: UserSummary;
  } | null;
  attachments?: Array<{
    id: string;
    messageId: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    sizeBytes: number | null;
    managedFileId: string | null;
    durationSeconds?: number | null;
    waveformJson?: string | null;
    createdAt: Date;
  }>;
  reactions?: Array<{
    id: string;
    messageId: string;
    userId: string;
    emoji: string;
    createdAt: Date;
    user?: UserSummary;
  }>;
  reads?: Array<{
    id: string;
    messageId: string;
    userId: string;
    status: string;
    deliveredAt: Date | null;
    seenAt: Date | null;
  }>;
}) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    kind: row.kind,
    parentId: row.parentId,
    forwardedFromId: row.forwardedFromId,
    isPinned: row.isPinned,
    isEdited: row.isEdited,
    editedAt: row.editedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sender: mapUser(row.sender),
    parent: row.parent
      ? {
          id: row.parent.id,
          body: row.parent.body,
          senderId: row.parent.senderId,
          sender: mapUser(row.parent.sender),
        }
      : null,
    attachments: row.attachments
      ?.filter((a) => true)
      .map((a) => ({
        id: a.id,
        messageId: a.messageId,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        managedFileId: a.managedFileId,
        durationSeconds: a.durationSeconds ?? null,
        waveformJson: a.waveformJson ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    reactions: row.reactions?.map((r) => ({
      id: r.id,
      messageId: r.messageId,
      userId: r.userId,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
      user: mapUser(r.user),
    })),
    reads: row.reads?.map((r) => ({
      id: r.id,
      messageId: r.messageId,
      userId: r.userId,
      status: r.status,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      seenAt: r.seenAt?.toISOString() ?? null,
    })),
  };
}

type CommentRow = {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  body: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author?: UserSummary;
  attachments?: Array<{
    id: string;
    commentId: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    sizeBytes: number | null;
    managedFileId: string | null;
    createdAt: Date;
  }>;
  replies?: CommentRow[];
};

export type CommentDtoMapped = {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author?: ReturnType<typeof mapUser>;
  attachments?: Array<{
    id: string;
    commentId: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    sizeBytes: number | null;
    managedFileId: string | null;
    createdAt: string;
  }>;
  replies?: CommentDtoMapped[];
};

export function toCommentDto(row: CommentRow): CommentDtoMapped {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    authorId: row.authorId,
    body: row.body,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: mapUser(row.author),
    attachments: row.attachments?.map((a) => ({
      id: a.id,
      commentId: a.commentId,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      managedFileId: a.managedFileId,
      createdAt: a.createdAt.toISOString(),
    })),
    replies: row.replies?.map((reply) => toCommentDto(reply)),
  };
}

export function toActivityDto(row: {
  id: string;
  actorId: string | null;
  action: string;
  title: string;
  body: string | null;
  entityType: string;
  entityId: string | null;
  linkUrl: string | null;
  metadata: unknown;
  createdAt: Date;
  actor?: UserSummary | null;
  attachments?: Array<{
    id: string;
    activityId: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    sizeBytes: number | null;
    managedFileId: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    linkUrl: row.linkUrl,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor ? mapUser(row.actor) : null,
    attachments: row.attachments?.map((a) => ({
      id: a.id,
      activityId: a.activityId,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      managedFileId: a.managedFileId,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
