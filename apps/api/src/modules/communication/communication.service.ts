import {
  ConversationMemberRole,
  ConversationType,
  MessageKind,
  MessageReadStatus,
  NotificationCategory,
  NotificationPriority,
  Prisma,
  prisma,
} from "@enterprise/database";
import type {
  AddConversationMembersInput,
  AttachmentInput,
  CommunicationSearchQueryInput,
  CreateCommentInput,
  CreateConversationInput,
  CreateMessageInput,
  ForwardMessageInput,
  ListActivitiesQueryInput,
  ListCommentsQueryInput,
  ListConversationsQueryInput,
  ListMessagesQueryInput,
  MarkMessagesReadInput,
  ReactToMessageInput,
  TypingInput,
  UpdateCommentInput,
  UpdateConversationInput,
  UpdateMessageInput,
} from "@enterprise/shared";

import { writeCommunicationAudit } from "./communication.audit.js";
import {
  COMMUNICATION_ERROR_CODES,
  CommunicationError,
} from "./communication.errors.js";
import {
  toActivityDto,
  toCommentDto,
  toConversationDto,
  toMessageDto,
} from "./communication.mapper.js";
import { communicationRepository } from "./communication.repository.js";
import {
  type CommunicationActor,
  isClient,
  isOrgAdmin,
} from "./communication.types.js";
import { notificationDispatcher } from "../notifications/index.js";
import { attachmentSecurityService } from "../files/attachment-security.service.js";

function messagesLink(conversationId: string, messageId?: string): string {
  const params = new URLSearchParams({ c: conversationId });
  if (messageId) params.set("m", messageId);
  return `/messages?${params.toString()}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveMemberUserIds(memberRefs: string[]): Promise<string[]> {
  const uniqueRefs = [...new Set(memberRefs.map((value) => value.trim()).filter(Boolean))];
  if (uniqueRefs.length === 0) {
    throw new CommunicationError(
      "Add at least one member",
      400,
      COMMUNICATION_ERROR_CODES.VALIDATION,
    );
  }

  const ids: string[] = [];
  const emails: string[] = [];

  for (const ref of uniqueRefs) {
    if (UUID_RE.test(ref)) ids.push(ref);
    else emails.push(ref.toLowerCase());
  }

  if (emails.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: emails.map((email) => ({
          email: { equals: email, mode: "insensitive" as const },
        })),
      },
      select: { id: true, email: true },
    });

    const foundByEmail = new Map(
      users.map((user) => [user.email.toLowerCase(), user.id]),
    );
    const missing = emails.filter((email) => !foundByEmail.has(email));
    if (missing.length > 0) {
      throw new CommunicationError(
        `No user found for: ${missing.join(", ")}`,
        400,
        COMMUNICATION_ERROR_CODES.VALIDATION,
      );
    }
    for (const email of emails) {
      const id = foundByEmail.get(email);
      if (id) ids.push(id);
    }
  }

  const uniqueIds = [...new Set(ids)];
  const existing = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, deletedAt: null },
    select: { id: true },
  });
  if (existing.length !== uniqueIds.length) {
    throw new CommunicationError(
      "One or more members could not be found",
      400,
      COMMUNICATION_ERROR_CODES.VALIDATION,
    );
  }

  return uniqueIds;
}

async function resolveActorCompanyId(
  actor: CommunicationActor,
): Promise<string | null | undefined> {
  if (actor.companyId !== undefined) return actor.companyId;
  if (!isClient(actor)) return null;
  const user = await prisma.user.findFirst({
    where: { id: actor.userId, deletedAt: null },
    select: { companyId: true },
  });
  actor.companyId = user?.companyId ?? null;
  return actor.companyId;
}

// ---------------------------------------------------------------------------
// Mention extraction
// ---------------------------------------------------------------------------

const MENTION_TAGGED_RE = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/gi;
const MENTION_PLAIN_RE =
  /@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

function extractMentionUserIds(
  body: string,
  extra?: string[],
): string[] {
  const ids = new Set<string>(extra ?? []);
  for (const match of body.matchAll(MENTION_TAGGED_RE)) {
    if (match[2]) ids.add(match[2]);
  }
  for (const match of body.matchAll(MENTION_PLAIN_RE)) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

// ---------------------------------------------------------------------------
// Activity publisher helper
// ---------------------------------------------------------------------------

export const activityPublisher = {
  async record(data: {
    actorId?: string | null;
    action: string;
    title: string;
    body?: string | null;
    entityType: string;
    entityId?: string | null;
    linkUrl?: string | null;
    metadata?: Prisma.InputJsonValue;
    createdById?: string | null;
    attachments?: AttachmentInput[];
  }) {
    return communicationRepository.createActivity(data);
  },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CommunicationService {
  // ---- Conversations --------------------------------------------------------

  async listConversations(
    query: ListConversationsQueryInput,
    actor: CommunicationActor,
  ) {
    const result = await communicationRepository.listConversations({
      userId: actor.userId,
      query,
      clientScope: isClient(actor),
      orgWide: isOrgAdmin(actor),
    });

    const items = await Promise.all(
      result.items.map(async (conv) => {
        const unreadCount = await communicationRepository.getUnreadCount(
          conv.id,
          actor.userId,
        );
        const memberUserIds = conv.members.map((m) => m.userId);
        const presenceMap =
          await communicationRepository.getPresenceMap(memberUserIds);
        return toConversationDto(conv, { unreadCount, presenceMap });
      }),
    );

    return {
      items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    };
  }

  async getConversation(id: string, actor: CommunicationActor) {
    const conv = await communicationRepository.findConversationById(id);
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const isMember = await communicationRepository.isMember(id, actor.userId);
    if (!isMember && !isOrgAdmin(actor)) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const memberUserIds = conv.members.map((m) => m.userId);
    const presenceMap =
      await communicationRepository.getPresenceMap(memberUserIds);
    const unreadCount = await communicationRepository.getUnreadCount(
      id,
      actor.userId,
    );

    return toConversationDto(conv, { unreadCount, presenceMap });
  }

  async createConversation(
    input: CreateConversationInput,
    actor: CommunicationActor,
  ) {
    await resolveActorCompanyId(actor);

    // Clients can only create CLIENT or DIRECT conversations
    if (isClient(actor)) {
      if (
        input.type !== ConversationType.CLIENT &&
        input.type !== ConversationType.DIRECT
      ) {
        throw new CommunicationError(
          "Clients can only create DIRECT or CLIENT conversations",
          403,
          COMMUNICATION_ERROR_CODES.FORBIDDEN,
        );
      }
    }

    const memberIds = await resolveMemberUserIds(input.memberIds);

    const conv = await communicationRepository.createConversation({
      type: input.type as ConversationType,
      name: input.name,
      description: input.description,
      avatarUrl: input.avatarUrl,
      departmentId: input.departmentId,
      teamId: input.teamId,
      projectId: input.projectId,
      clientId: input.clientId ?? (isClient(actor) ? actor.companyId : null),
      createdById: actor.userId,
      memberIds,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "CONVERSATION_CREATED",
      title: `Conversation "${conv.name ?? conv.type}" created`,
      entityType: "CONVERSATION",
      entityId: conv.id,
      linkUrl: messagesLink(conv.id),
      createdById: actor.userId,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "CONVERSATION_CREATED",
      metadata: { conversationId: conv.id, type: conv.type },
    });

    // Notify invited members about group invite
    if (input.type !== ConversationType.DIRECT && memberIds.length > 0) {
      for (const memberId of memberIds) {
        if (memberId === actor.userId) continue;
        void notificationDispatcher.notify({
          title: "You were added to a conversation",
          body: `You have been added to "${conv.name ?? conv.type}".`,
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.NORMAL,
          linkUrl: messagesLink(conv.id),
          entityType: "Conversation",
          entityId: conv.id,
          audience: { type: "INDIVIDUAL", userId: memberId },
          createdById: actor.userId,
        });
      }
    }

    return toConversationDto(conv);
  }

  async updateConversation(
    id: string,
    input: UpdateConversationInput,
    actor: CommunicationActor,
  ) {
    const conv = await communicationRepository.findConversationById(id);
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      id,
      actor.userId,
    );
    const canEdit =
      isOrgAdmin(actor) ||
      membership?.role === ConversationMemberRole.OWNER ||
      membership?.role === ConversationMemberRole.ADMIN;

    if (!canEdit) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await communicationRepository.updateConversation(id, {
      ...input,
      updatedById: actor.userId,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "CONVERSATION_UPDATED",
      metadata: { conversationId: id },
    });

    return toConversationDto(updated);
  }

  async deleteConversation(id: string, actor: CommunicationActor) {
    const conv = await communicationRepository.findConversationById(id);
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      id,
      actor.userId,
    );
    const canDelete =
      isOrgAdmin(actor) || membership?.role === ConversationMemberRole.OWNER;

    if (!canDelete) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    await communicationRepository.softDeleteConversation(id, actor.userId);

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "CONVERSATION_DELETED",
      metadata: { conversationId: id },
    });
  }

  async addMembers(
    conversationId: string,
    input: AddConversationMembersInput,
    actor: CommunicationActor,
  ) {
    const conv = await communicationRepository.findConversationById(
      conversationId,
    );
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      conversationId,
      actor.userId,
    );
    const canAdd =
      isOrgAdmin(actor) ||
      membership?.role === ConversationMemberRole.OWNER ||
      membership?.role === ConversationMemberRole.ADMIN;

    if (!canAdd) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const role =
      (input.role as ConversationMemberRole) ?? ConversationMemberRole.MEMBER;
    await communicationRepository.addMembers(
      conversationId,
      input.memberIds,
      role,
      actor.userId,
    );

    for (const memberId of input.memberIds) {
      void notificationDispatcher.notify({
        title: "You were added to a conversation",
        body: `You have been added to "${conv.name ?? conv.type}".`,
        category: NotificationCategory.TEAM,
        priority: NotificationPriority.NORMAL,
        linkUrl: messagesLink(conversationId),
        entityType: "Conversation",
        entityId: conversationId,
        audience: { type: "INDIVIDUAL", userId: memberId },
        createdById: actor.userId,
      });
    }

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEMBERS_ADDED",
      metadata: { conversationId, memberIds: input.memberIds },
    });

    return this.getConversation(conversationId, actor);
  }

  async removeMember(
    conversationId: string,
    userId: string,
    actor: CommunicationActor,
  ) {
    const conv = await communicationRepository.findConversationById(
      conversationId,
    );
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      conversationId,
      actor.userId,
    );
    const target = await communicationRepository.findMembership(
      conversationId,
      userId,
    );
    if (!target) {
      throw new CommunicationError(
        "Member not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const isSelf = actor.userId === userId;
    const canRemove =
      isSelf ||
      isOrgAdmin(actor) ||
      membership?.role === ConversationMemberRole.OWNER ||
      membership?.role === ConversationMemberRole.ADMIN;

    if (!canRemove) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    if (
      target.role === ConversationMemberRole.OWNER &&
      membership?.role !== ConversationMemberRole.OWNER &&
      !isOrgAdmin(actor)
    ) {
      throw new CommunicationError(
        "Only an owner can remove another owner",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    await communicationRepository.removeMember(
      conversationId,
      userId,
      actor.userId,
    );

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEMBER_REMOVED",
      metadata: { conversationId, removedUserId: userId },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "member.removed",
      title: "Channel member removed",
      entityType: "CONVERSATION",
      entityId: conversationId,
      linkUrl: `/channels/${conversationId}`,
      createdById: actor.userId,
    });

    return this.getConversation(conversationId, actor);
  }

  async updateMemberRole(
    conversationId: string,
    userId: string,
    role: string,
    actor: CommunicationActor,
  ) {
    const conv = await communicationRepository.findConversationById(
      conversationId,
    );
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      conversationId,
      actor.userId,
    );
    const canManage =
      isOrgAdmin(actor) || membership?.role === ConversationMemberRole.OWNER;

    if (!canManage) {
      throw new CommunicationError(
        "Only channel owners can change member roles",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const target = await communicationRepository.findMembership(
      conversationId,
      userId,
    );
    if (!target) {
      throw new CommunicationError(
        "Member not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    await communicationRepository.updateMemberRole(
      conversationId,
      userId,
      role as ConversationMemberRole,
      actor.userId,
    );

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEMBER_ROLE_UPDATED",
      metadata: { conversationId, userId, role },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "member.role_updated",
      title: "Channel member role updated",
      body: `Role set to ${role}`,
      entityType: "CONVERSATION",
      entityId: conversationId,
      linkUrl: `/channels/${conversationId}`,
      createdById: actor.userId,
    });

    return this.getConversation(conversationId, actor);
  }

  async archiveConversation(id: string, actor: CommunicationActor) {
    const conv = await communicationRepository.findConversationById(id);
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      id,
      actor.userId,
    );
    const canArchive =
      isOrgAdmin(actor) ||
      membership?.role === ConversationMemberRole.OWNER ||
      membership?.role === ConversationMemberRole.ADMIN;

    if (!canArchive) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await communicationRepository.archiveConversation(
      id,
      actor.userId,
    );

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "CONVERSATION_ARCHIVED",
      metadata: { conversationId: id },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "channel.archived",
      title: "Channel archived",
      body: conv.name ?? undefined,
      entityType: "CONVERSATION",
      entityId: id,
      linkUrl: `/channels`,
      createdById: actor.userId,
    });

    return toConversationDto(updated);
  }

  async unarchiveConversation(id: string, actor: CommunicationActor) {
    const conv = await communicationRepository.findConversationById(id);
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      id,
      actor.userId,
    );
    const canUnarchive =
      isOrgAdmin(actor) ||
      membership?.role === ConversationMemberRole.OWNER ||
      membership?.role === ConversationMemberRole.ADMIN;

    if (!canUnarchive) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await communicationRepository.unarchiveConversation(
      id,
      actor.userId,
    );

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "CONVERSATION_UNARCHIVED",
      metadata: { conversationId: id },
    });

    return toConversationDto(updated);
  }

  // ---- Messages -------------------------------------------------------------

  async listMessages(
    conversationId: string,
    query: ListMessagesQueryInput,
    actor: CommunicationActor,
  ) {
    await this._assertMember(conversationId, actor);

    const result = await communicationRepository.listMessages({
      conversationId,
      query,
    });

    return {
      items: result.items.map((m) => toMessageDto(m)),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  }

  async getPinnedMessages(conversationId: string, actor: CommunicationActor) {
    await this._assertMember(conversationId, actor);
    const messages =
      await communicationRepository.listPinnedMessages(conversationId);
    return messages.map((m) => toMessageDto(m));
  }

  async sendMessage(
    conversationId: string,
    input: CreateMessageInput,
    actor: CommunicationActor,
  ) {
    await this._assertMember(conversationId, actor);

    const attachments = input.attachments?.length
      ? await attachmentSecurityService.secureAttachments(
          input.attachments,
          actor,
        )
      : undefined;

    const msg = await communicationRepository.createMessage({
      conversationId,
      senderId: actor.userId,
      body: input.body,
      kind: input.kind ?? MessageKind.TEXT,
      parentId: input.parentId,
      attachments,
    });

    const mentionIds = extractMentionUserIds(
      input.body,
      input.mentionUserIds,
    );

    // Notify mentions
    for (const mentionedUserId of mentionIds) {
      if (mentionedUserId === actor.userId) continue;
      void notificationDispatcher.notify({
        title: "You were mentioned",
        body: input.body.substring(0, 200),
        category: NotificationCategory.TEAM,
        priority: NotificationPriority.HIGH,
        linkUrl: messagesLink(conversationId, msg.id),
        entityType: "Message",
        entityId: msg.id,
        audience: { type: "INDIVIDUAL", userId: mentionedUserId },
        createdById: actor.userId,
      });
    }

    // Notify reply parent
    if (input.parentId) {
      const parent = await communicationRepository.findMessageById(
        input.parentId,
      );
      if (parent && parent.senderId !== actor.userId) {
        void notificationDispatcher.notify({
          title: "New reply to your message",
          body: input.body.substring(0, 200),
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.NORMAL,
          linkUrl: messagesLink(conversationId, msg.id),
          entityType: "Message",
          entityId: msg.id,
          audience: { type: "INDIVIDUAL", userId: parent.senderId },
          createdById: actor.userId,
        });
      }
    }

    // Notify conversation members of new message (exclude sender & mentions already notified)
    const notifiedIds = new Set([actor.userId, ...mentionIds]);
    const conv = await communicationRepository.findConversationById(
      conversationId,
    );
    if (conv) {
      for (const member of conv.members) {
        if (notifiedIds.has(member.userId)) continue;
        void notificationDispatcher.notify({
          title: "New message",
          body: input.body.substring(0, 200),
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.NORMAL,
          linkUrl: messagesLink(conversationId, msg.id),
          entityType: "Message",
          entityId: msg.id,
          audience: { type: "INDIVIDUAL", userId: member.userId },
          createdById: actor.userId,
          sendEmail: false,
        });
      }
    }

    void activityPublisher.record({
      actorId: actor.userId,
      action: "MESSAGE_SENT",
      title: "Message sent",
      body: input.body.substring(0, 200),
      entityType: "MESSAGE",
      entityId: msg.id,
      linkUrl: messagesLink(conversationId, msg.id),
      createdById: actor.userId,
    });

    return toMessageDto(msg);
  }

  async updateMessage(
    id: string,
    input: UpdateMessageInput,
    actor: CommunicationActor,
  ) {
    const msg = await communicationRepository.findMessageById(id);
    if (!msg) {
      throw new CommunicationError(
        "Message not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    if (msg.senderId !== actor.userId) {
      throw new CommunicationError(
        "Only the sender can edit this message",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await communicationRepository.updateMessage(
      id,
      input.body,
      actor.userId,
    );

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MESSAGE_EDITED",
      metadata: { messageId: id },
    });

    return toMessageDto(updated);
  }

  async deleteMessage(id: string, actor: CommunicationActor) {
    const msg = await communicationRepository.findMessageById(id);
    if (!msg) {
      throw new CommunicationError(
        "Message not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const canDelete =
      msg.senderId === actor.userId || isOrgAdmin(actor);
    if (!canDelete) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    await communicationRepository.softDeleteMessage(id, actor.userId);

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MESSAGE_DELETED",
      metadata: { messageId: id },
    });
  }

  async getMessage(id: string, actor: CommunicationActor) {
    const msg = await communicationRepository.findMessageById(id);
    if (!msg) {
      throw new CommunicationError(
        "Message not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }
    await this._assertMember(msg.conversationId, actor);
    return toMessageDto(msg);
  }

  async forwardMessage(
    id: string,
    input: ForwardMessageInput,
    actor: CommunicationActor,
  ) {
    const original = await communicationRepository.findMessageById(id);
    if (!original) {
      throw new CommunicationError(
        "Message not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    await this._assertMember(input.targetConversationId, actor);

    const forwarded = await communicationRepository.createMessage({
      conversationId: input.targetConversationId,
      senderId: actor.userId,
      body: original.body,
      kind: MessageKind.TEXT,
      forwardedFromId: original.id,
    });

    return toMessageDto(forwarded);
  }

  async pinMessage(id: string, actor: CommunicationActor) {
    const msg = await communicationRepository.findMessageById(id);
    if (!msg) {
      throw new CommunicationError(
        "Message not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      msg.conversationId,
      actor.userId,
    );
    const canPin =
      isOrgAdmin(actor) ||
      membership?.role === ConversationMemberRole.OWNER ||
      membership?.role === ConversationMemberRole.ADMIN;

    if (!canPin) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await communicationRepository.pinMessage(
      id,
      true,
      actor.userId,
    );

    // Notify conversation members
    const conv = await communicationRepository.findConversationById(
      msg.conversationId,
    );
    if (conv) {
      for (const member of conv.members) {
        if (member.userId === actor.userId) continue;
        void notificationDispatcher.notify({
          title: "Message pinned",
          body: msg.body.substring(0, 200),
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.LOW,
          linkUrl: messagesLink(msg.conversationId, msg.id),
          entityType: "Message",
          entityId: id,
          audience: { type: "INDIVIDUAL", userId: member.userId },
          createdById: actor.userId,
          sendEmail: false,
        });
      }
    }

    void activityPublisher.record({
      actorId: actor.userId,
      action: "MESSAGE_PINNED",
      title: "Message pinned",
      entityType: "MESSAGE",
      entityId: id,
      linkUrl: messagesLink(msg.conversationId, msg.id),
      createdById: actor.userId,
    });

    return toMessageDto(updated);
  }

  async unpinMessage(id: string, actor: CommunicationActor) {
    const msg = await communicationRepository.findMessageById(id);
    if (!msg) {
      throw new CommunicationError(
        "Message not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const membership = await communicationRepository.findMembership(
      msg.conversationId,
      actor.userId,
    );
    const canUnpin =
      isOrgAdmin(actor) ||
      membership?.role === ConversationMemberRole.OWNER ||
      membership?.role === ConversationMemberRole.ADMIN;

    if (!canUnpin) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await communicationRepository.pinMessage(
      id,
      false,
      actor.userId,
    );
    return toMessageDto(updated);
  }

  async reactToMessage(
    id: string,
    input: ReactToMessageInput,
    actor: CommunicationActor,
  ) {
    const msg = await communicationRepository.findMessageById(id);
    if (!msg) {
      throw new CommunicationError(
        "Message not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }
    await this._assertMember(msg.conversationId, actor);
    await communicationRepository.addReaction(id, actor.userId, input.emoji);
    return this.getMessage(id, actor);
  }

  async unreactToMessage(
    id: string,
    emoji: string,
    actor: CommunicationActor,
  ) {
    const msg = await communicationRepository.findMessageById(id);
    if (!msg) {
      throw new CommunicationError(
        "Message not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }
    await this._assertMember(msg.conversationId, actor);
    await communicationRepository.removeReaction(id, actor.userId, emoji);
    return this.getMessage(id, actor);
  }

  async markRead(
    conversationId: string,
    input: MarkMessagesReadInput,
    actor: CommunicationActor,
  ) {
    await this._assertMember(conversationId, actor);
    await communicationRepository.markConversationRead(
      conversationId,
      actor.userId,
      {
        messageIds: input.messageIds,
        upToMessageId: input.upToMessageId,
      },
    );
    return { success: true };
  }

  async setTyping(
    conversationId: string,
    input: TypingInput,
    actor: CommunicationActor,
  ) {
    await this._assertMember(conversationId, actor);
    const now = new Date();
    await communicationRepository.upsertPresence(actor.userId, {
      typingConversationId: input.isTyping ? conversationId : null,
      typingUpdatedAt: input.isTyping ? now : null,
    });
    return { success: true };
  }

  // ---- Presence -------------------------------------------------------------

  async heartbeat(actor: CommunicationActor) {
    await communicationRepository.upsertPresence(actor.userId, {
      isOnline: true,
      lastSeenAt: new Date(),
    });
    return { success: true };
  }

  async setOffline(actor: CommunicationActor) {
    await communicationRepository.upsertPresence(actor.userId, {
      isOnline: false,
      lastSeenAt: new Date(),
    });
    return { success: true };
  }

  async getPresence(actor: CommunicationActor, userIds?: string[]) {
    const ids =
      userIds && userIds.length > 0
        ? [...new Set(userIds.filter(Boolean))]
        : [actor.userId];

    const presenceMap = await communicationRepository.getPresenceMap(ids);

    const TYPING_TTL_MS = 8_000;

    return ids.map((userId) => {
      const presence = presenceMap.get(userId);
      const typingUpdatedAt = presence?.typingUpdatedAt ?? null;
      const typingFresh =
        typingUpdatedAt != null &&
        Date.now() - typingUpdatedAt.getTime() < TYPING_TTL_MS;

      return {
        userId,
        isOnline: presence?.isOnline ?? false,
        lastSeenAt: presence?.lastSeenAt?.toISOString() ?? null,
        typingConversationId: typingFresh
          ? (presence?.typingConversationId ?? null)
          : null,
        typingUpdatedAt: typingFresh
          ? (typingUpdatedAt?.toISOString() ?? null)
          : null,
      };
    });
  }

  // ---- Comments -------------------------------------------------------------

  async listComments(query: ListCommentsQueryInput, actor: CommunicationActor) {
    const result = await communicationRepository.listComments({
      ...query,
      parentIdNull: true,
    });

    return {
      items: result.items.map((c) => toCommentDto(c)),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    };
  }

  async createComment(input: CreateCommentInput, actor: CommunicationActor) {
    // Clients can comment on CLIENT, PROJECT, INVOICE, TASK only
    if (isClient(actor)) {
      const allowed = ["CLIENT", "PROJECT", "INVOICE", "TASK"];
      if (!allowed.includes(input.entityType)) {
        throw new CommunicationError(
          "Access denied",
          403,
          COMMUNICATION_ERROR_CODES.FORBIDDEN,
        );
      }
    }

    const attachments = input.attachments?.length
      ? await attachmentSecurityService.secureAttachments(
          input.attachments,
          actor,
        )
      : undefined;

    const comment = await communicationRepository.createComment({
      entityType: input.entityType,
      entityId: input.entityId,
      authorId: actor.userId,
      body: input.body,
      parentId: input.parentId,
      attachments,
    });

    const mentionIds = extractMentionUserIds(
      input.body,
      input.mentionUserIds,
    );

    for (const mentionedUserId of mentionIds) {
      if (mentionedUserId === actor.userId) continue;
      void notificationDispatcher.notify({
        title: "You were mentioned in a comment",
        body: input.body.substring(0, 200),
        category: NotificationCategory.TEAM,
        priority: NotificationPriority.HIGH,
        linkUrl: `/${input.entityType.toLowerCase()}s/${input.entityId}`,
        entityType: "Comment",
        entityId: comment.id,
        audience: { type: "INDIVIDUAL", userId: mentionedUserId },
        createdById: actor.userId,
      });
    }

    // Notify parent comment author of reply
    if (input.parentId) {
      const parent = await communicationRepository.findCommentById(
        input.parentId,
      );
      if (parent && parent.authorId !== actor.userId) {
        void notificationDispatcher.notify({
          title: "New reply to your comment",
          body: input.body.substring(0, 200),
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.NORMAL,
          linkUrl: `/${input.entityType.toLowerCase()}s/${input.entityId}`,
          entityType: "Comment",
          entityId: comment.id,
          audience: { type: "INDIVIDUAL", userId: parent.authorId },
          createdById: actor.userId,
        });
      }
    }

    void activityPublisher.record({
      actorId: actor.userId,
      action: "COMMENT_CREATED",
      title: `Comment on ${input.entityType} ${input.entityId}`,
      body: input.body.substring(0, 200),
      entityType: "COMMENT",
      entityId: comment.id,
      linkUrl: `/${input.entityType.toLowerCase()}s/${input.entityId}`,
      createdById: actor.userId,
    });

    return toCommentDto(comment);
  }

  async updateComment(
    id: string,
    input: UpdateCommentInput,
    actor: CommunicationActor,
  ) {
    const comment = await communicationRepository.findCommentById(id);
    if (!comment) {
      throw new CommunicationError(
        "Comment not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    if (comment.authorId !== actor.userId && !isOrgAdmin(actor)) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await communicationRepository.updateComment(
      id,
      input.body,
      actor.userId,
    );
    return toCommentDto(updated);
  }

  async deleteComment(id: string, actor: CommunicationActor) {
    const comment = await communicationRepository.findCommentById(id);
    if (!comment) {
      throw new CommunicationError(
        "Comment not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    if (comment.authorId !== actor.userId && !isOrgAdmin(actor)) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    await communicationRepository.softDeleteComment(id, actor.userId);

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "COMMENT_DELETED",
      metadata: { commentId: id },
    });
  }

  // ---- Activities -----------------------------------------------------------

  async listActivities(
    query: ListActivitiesQueryInput,
    actor: CommunicationActor,
  ) {
    const result = await communicationRepository.listActivities(query);
    return {
      items: result.items.map((a) => toActivityDto(a)),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    };
  }

  // ---- Search ---------------------------------------------------------------

  async search(
    query: CommunicationSearchQueryInput,
    actor: CommunicationActor,
  ) {
    await resolveActorCompanyId(actor);
    const {
      q,
      scope,
      pageSize,
      userId,
      fromDate,
      toDate,
      hasAttachment,
      hasMention,
      isPinned,
    } = query;
    const take = pageSize;
    const clientId = isClient(actor) ? actor.companyId ?? undefined : undefined;
    const orgWide = isOrgAdmin(actor) && !isClient(actor);

    const messageFilters = {
      fromDate,
      toDate,
      senderId: userId,
      hasAttachment,
      hasMention,
      isPinned,
    };
    const attachmentFilters = {
      fromDate,
      toDate,
      senderId: userId,
    };

    const [conversations, messages, rawAttachments, users, projects, clients] =
      await Promise.all([
        scope === "all" || scope === "conversations"
          ? q
            ? communicationRepository.searchConversations(
                q,
                actor.userId,
                take,
                orgWide,
              )
            : Promise.resolve([])
          : Promise.resolve([]),
        scope === "all" || scope === "messages"
          ? communicationRepository.searchMessages(
              q,
              actor.userId,
              take,
              orgWide,
              messageFilters,
            )
          : Promise.resolve([]),
        scope === "all" || scope === "attachments"
          ? communicationRepository.searchMessageAttachments(
              q,
              actor.userId,
              take,
              orgWide,
              attachmentFilters,
            )
          : Promise.resolve([]),
        scope === "all" || scope === "users"
          ? isClient(actor) || !q
            ? Promise.resolve([])
            : communicationRepository.searchUsers(q, take)
          : Promise.resolve([]),
        scope === "all" || scope === "projects"
          ? q
            ? communicationRepository.searchProjects(q, take, clientId)
            : Promise.resolve([])
          : Promise.resolve([]),
        scope === "all" || scope === "clients"
          ? isClient(actor) || !q
            ? Promise.resolve([])
            : communicationRepository.searchClients(q, take)
          : Promise.resolve([]),
      ]);

    return {
      conversations: conversations.map((c) => toConversationDto(c)),
      messages: messages.map((m) => toMessageDto(m)),
      attachments: rawAttachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        mimeType: a.mimeType,
        messageId: a.messageId,
        conversationId: a.message.conversationId,
      })),
      users,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: String(p.status),
      })),
      clients: clients.map((c) => ({
        id: c.id,
        companyName: c.companyName,
        status: String(c.status),
      })),
    };
  }

  // ---- Helpers --------------------------------------------------------------

  private async _assertMember(
    conversationId: string,
    actor: CommunicationActor,
  ): Promise<void> {
    const conv = await communicationRepository.findConversationById(
      conversationId,
    );
    if (!conv) {
      throw new CommunicationError(
        "Conversation not found",
        404,
        COMMUNICATION_ERROR_CODES.NOT_FOUND,
      );
    }

    const isMember = await communicationRepository.isMember(
      conversationId,
      actor.userId,
    );
    if (!isMember && !isOrgAdmin(actor)) {
      throw new CommunicationError(
        "You are not a member of this conversation",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }
  }
}

export const communicationService = new CommunicationService();
