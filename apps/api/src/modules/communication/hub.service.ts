import {
  ConversationType,
  NotificationCategory,
  NotificationPriority,
  prisma,
} from "@enterprise/database";
import { PERMISSIONS } from "@enterprise/shared";
import type {
  CommunicationAiRequestInput,
  CommunicationAiResponseDto,
  CreateAnnouncementInput,
  CreateDiscussionReplyInput,
  CreateDiscussionThreadInput,
  CreateMeetingRecordingInput,
  CreateMeetingRoomInput,
  CreateMeetingScreenShareInput,
  CreateTaskInput,
  ListAnnouncementsQueryInput,
  ListConversationsQueryInput,
  ListDiscussionThreadsQueryInput,
  ListMeetingsQueryInput,
  UpdateAnnouncementInput,
  UpdateDiscussionThreadInput,
  UpdateMeetingParticipantInput,
  UpdateMeetingRoomInput,
} from "@enterprise/shared";

import { getAiProvider } from "../ai/providers/index.js";
import { attachmentSecurityService } from "../files/attachment-security.service.js";
import { notificationDispatcher } from "../notifications/index.js";
import { tasksService } from "../tasks/index.js";
import { writeCommunicationAudit } from "./communication.audit.js";
import {
  COMMUNICATION_ERROR_CODES,
  CommunicationError,
} from "./communication.errors.js";
import { toConversationDto } from "./communication.mapper.js";
import { communicationRepository } from "./communication.repository.js";
import {
  activityPublisher,
} from "./communication.service.js";
import {
  type CommunicationActor,
  isOrgAdmin,
} from "./communication.types.js";
import {
  toAnnouncementDto,
  toDiscussionReplyDto,
  toDiscussionThreadDto,
  toMeetingRecordingDto,
  toMeetingRoomDto,
  toMeetingScreenShareDto,
  toMeetingParticipantDto,
} from "./hub.mapper.js";
import { communicationHubRepository } from "./hub.repository.js";

const CHANNEL_TYPES = [
  ConversationType.TEAM,
  ConversationType.DEPARTMENT,
  ConversationType.ORGANIZATION,
  ConversationType.GROUP,
] as const;

function hasPerm(actor: CommunicationActor, ...keys: string[]): boolean {
  if (isOrgAdmin(actor)) return true;
  return keys.some((k) => actor.permissions.includes(k));
}

function assertCanRead(actor: CommunicationActor) {
  if (
    !hasPerm(
      actor,
      PERMISSIONS.COMMUNICATION_READ,
      PERMISSIONS.CHAT_READ,
      PERMISSIONS.COMMUNICATION_MANAGE,
    )
  ) {
    throw new CommunicationError(
      "Access denied",
      403,
      COMMUNICATION_ERROR_CODES.FORBIDDEN,
    );
  }
}

function assertCanWrite(actor: CommunicationActor) {
  if (
    !hasPerm(
      actor,
      PERMISSIONS.COMMUNICATION_WRITE,
      PERMISSIONS.CHAT_WRITE,
      PERMISSIONS.COMMUNICATION_MANAGE,
    )
  ) {
    throw new CommunicationError(
      "Access denied",
      403,
      COMMUNICATION_ERROR_CODES.FORBIDDEN,
    );
  }
}

function assertAnnouncementManage(actor: CommunicationActor) {
  if (
    !hasPerm(
      actor,
      PERMISSIONS.ANNOUNCEMENT_MANAGE,
      PERMISSIONS.COMMUNICATION_MANAGE,
    )
  ) {
    throw new CommunicationError(
      "Announcement manage permission required",
      403,
      COMMUNICATION_ERROR_CODES.FORBIDDEN,
    );
  }
}

function assertThreadManage(actor: CommunicationActor) {
  if (
    !hasPerm(actor, PERMISSIONS.THREAD_MANAGE, PERMISSIONS.COMMUNICATION_MANAGE)
  ) {
    throw new CommunicationError(
      "Thread manage permission required",
      403,
      COMMUNICATION_ERROR_CODES.FORBIDDEN,
    );
  }
}

function assertMeetingManage(actor: CommunicationActor) {
  if (
    !hasPerm(actor, PERMISSIONS.MEETING_MANAGE, PERMISSIONS.COMMUNICATION_MANAGE)
  ) {
    throw new CommunicationError(
      "Meeting manage permission required",
      403,
      COMMUNICATION_ERROR_CODES.FORBIDDEN,
    );
  }
}

function notFound(entity: string): never {
  throw new CommunicationError(
    `${entity} not found`,
    404,
    COMMUNICATION_ERROR_CODES.NOT_FOUND,
  );
}

function parseActionItems(
  content: string,
): Array<{ title: string; description?: string }> {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return { title: item };
          if (item && typeof item === "object" && "title" in item) {
            const row = item as { title: string; description?: string };
            return {
              title: String(row.title),
              description: row.description ? String(row.description) : undefined,
            };
          }
          return null;
        })
        .filter((x): x is { title: string; description?: string } => !!x);
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { actionItems?: unknown }).actionItems)
    ) {
      return parseActionItems(
        JSON.stringify((parsed as { actionItems: unknown[] }).actionItems),
      );
    }
  } catch {
    // fall through to line parsing
  }

  return content
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 20)
    .map((title) => ({ title }));
}

export class CommunicationHubService {
  // ---- Announcements --------------------------------------------------------

  async listAnnouncements(
    query: ListAnnouncementsQueryInput,
    actor: CommunicationActor,
  ) {
    assertCanRead(actor);
    const result = await communicationHubRepository.listAnnouncements({
      query,
      userId: actor.userId,
    });
    return {
      ...result,
      items: result.items.map((row) =>
        toAnnouncementDto(row, {
          isReadByMe: Array.isArray(row.reads) && row.reads.length > 0,
          readCount: row._count?.reads,
        }),
      ),
    };
  }

  async getAnnouncement(id: string, actor: CommunicationActor) {
    assertCanRead(actor);
    const row = await communicationHubRepository.findAnnouncementById(
      id,
      actor.userId,
    );
    if (!row) notFound("Announcement");
    return toAnnouncementDto(row, {
      isReadByMe: Array.isArray(row.reads) && row.reads.length > 0,
      readCount: row._count?.reads,
    });
  }

  async createAnnouncement(
    input: CreateAnnouncementInput,
    actor: CommunicationActor,
  ) {
    assertAnnouncementManage(actor);

    const attachments = input.attachments?.length
      ? await attachmentSecurityService.secureAttachments(
          input.attachments,
          actor,
        )
      : undefined;

    const created = await communicationHubRepository.createAnnouncement({
      title: input.title,
      body: input.body,
      priority: input.priority ?? "NORMAL",
      departmentId: input.departmentId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isPinned: input.isPinned ?? false,
      publishedAt: input.publish === false ? null : new Date(),
      createdById: actor.userId,
      attachments,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "ANNOUNCEMENT_CREATED",
      resourceId: created.id,
      metadata: { title: created.title, priority: created.priority },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "ANNOUNCEMENT_CREATED",
      title: `Announcement: ${created.title}`,
      body: created.body.substring(0, 200),
      entityType: "ANNOUNCEMENT",
      entityId: created.id,
      linkUrl: "/announcements",
      createdById: actor.userId,
    });

    const category =
      created.priority === "URGENT" || created.priority === "HIGH"
        ? NotificationCategory.SYSTEM
        : NotificationCategory.TEAM;

    void notificationDispatcher.notify({
      title: "New announcement",
      body: created.title,
      category,
      priority:
        created.priority === "URGENT"
          ? NotificationPriority.URGENT
          : created.priority === "HIGH"
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
      linkUrl: "/announcements",
      entityType: "Announcement",
      entityId: created.id,
      audience: { type: "ROLE", roleCode: "ADMIN" },
      createdById: actor.userId,
    });

    if (created.departmentId) {
      void notificationDispatcher.notify({
        title: "Department announcement",
        body: created.title,
        category,
        linkUrl: "/announcements",
        entityType: "Announcement",
        entityId: created.id,
        audience: {
          type: "DEPARTMENT",
          departmentId: created.departmentId,
        },
        createdById: actor.userId,
      });
    }

    return toAnnouncementDto(created);
  }

  async updateAnnouncement(
    id: string,
    input: UpdateAnnouncementInput,
    actor: CommunicationActor,
  ) {
    assertAnnouncementManage(actor);
    const existing = await communicationHubRepository.findAnnouncementById(id);
    if (!existing) notFound("Announcement");

    let publishedAt: Date | null | undefined;
    if (input.publish === true && !existing.publishedAt) {
      publishedAt = new Date();
    } else if (input.publish === false) {
      publishedAt = null;
    }

    const updated = await communicationHubRepository.updateAnnouncement(id, {
      title: input.title,
      body: input.body,
      priority: input.priority,
      departmentId: input.departmentId,
      expiresAt:
        input.expiresAt === undefined
          ? undefined
          : input.expiresAt
            ? new Date(input.expiresAt)
            : null,
      isPinned: input.isPinned,
      publishedAt,
      updatedById: actor.userId,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "ANNOUNCEMENT_UPDATED",
      resourceId: id,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "ANNOUNCEMENT_UPDATED",
      title: `Announcement updated: ${updated.title}`,
      entityType: "ANNOUNCEMENT",
      entityId: id,
      linkUrl: "/announcements",
      createdById: actor.userId,
    });

    return toAnnouncementDto(updated);
  }

  async deleteAnnouncement(id: string, actor: CommunicationActor) {
    assertAnnouncementManage(actor);
    const existing = await communicationHubRepository.findAnnouncementById(id);
    if (!existing) notFound("Announcement");

    await communicationHubRepository.softDeleteAnnouncement(id, actor.userId);

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "ANNOUNCEMENT_DELETED",
      resourceId: id,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "ANNOUNCEMENT_DELETED",
      title: `Announcement deleted: ${existing.title}`,
      entityType: "ANNOUNCEMENT",
      entityId: id,
      linkUrl: "/announcements",
      createdById: actor.userId,
    });
  }

  async markAnnouncementRead(id: string, actor: CommunicationActor) {
    assertCanRead(actor);
    const existing = await communicationHubRepository.findAnnouncementById(id);
    if (!existing) notFound("Announcement");

    await communicationHubRepository.markAnnouncementRead(id, actor.userId);

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "ANNOUNCEMENT_READ",
      resourceId: id,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "ANNOUNCEMENT_READ",
      title: "Announcement marked read",
      entityType: "ANNOUNCEMENT",
      entityId: id,
      linkUrl: "/announcements",
      createdById: actor.userId,
    });

    const readCount =
      await communicationHubRepository.countAnnouncementReads(id);
    return { id, readCount, isReadByMe: true };
  }

  // ---- Threads --------------------------------------------------------------

  async listThreads(
    query: ListDiscussionThreadsQueryInput,
    actor: CommunicationActor,
  ) {
    assertCanRead(actor);
    const result = await communicationHubRepository.listThreads({ query });
    return {
      ...result,
      items: result.items.map((row) => toDiscussionThreadDto(row)),
    };
  }

  async getThread(id: string, actor: CommunicationActor) {
    assertCanRead(actor);
    const row = await communicationHubRepository.findThreadById(id);
    if (!row) notFound("Thread");
    return toDiscussionThreadDto(row, { nestReplies: true });
  }

  async createThread(
    input: CreateDiscussionThreadInput,
    actor: CommunicationActor,
  ) {
    assertCanWrite(actor);

    const created = await communicationHubRepository.createThread({
      title: input.title,
      body: input.body,
      category: input.category,
      departmentId: input.departmentId,
      teamId: input.teamId,
      projectId: input.projectId,
      isPinned: input.isPinned ?? false,
      createdById: actor.userId,
      tags: input.tags,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "THREAD_CREATED",
      resourceId: created.id,
      metadata: { title: created.title },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "THREAD_CREATED",
      title: `Thread: ${created.title}`,
      body: created.body.substring(0, 200),
      entityType: "THREAD",
      entityId: created.id,
      linkUrl: "/threads",
      createdById: actor.userId,
    });

    return toDiscussionThreadDto(created);
  }

  async updateThread(
    id: string,
    input: UpdateDiscussionThreadInput,
    actor: CommunicationActor,
  ) {
    const existing = await communicationHubRepository.findThreadById(id);
    if (!existing) notFound("Thread");

    const needsManage =
      input.isPinned !== undefined ||
      input.status !== undefined ||
      (input.title !== undefined && input.title !== existing.title);

    // Pin / status changes require thread.manage; other edits need write.
    if (input.isPinned !== undefined || input.status === "ARCHIVED") {
      assertThreadManage(actor);
    } else if (needsManage && existing.createdById !== actor.userId) {
      assertCanWrite(actor);
    } else {
      assertCanWrite(actor);
    }

    if (input.tags) {
      await communicationHubRepository.replaceTags(id, input.tags);
    }

    const updated = await communicationHubRepository.updateThread(id, {
      title: input.title,
      body: input.body,
      category: input.category,
      isPinned: input.isPinned,
      status: input.status,
      updatedById: actor.userId,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "THREAD_UPDATED",
      resourceId: id,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "THREAD_UPDATED",
      title: `Thread updated: ${updated.title}`,
      entityType: "THREAD",
      entityId: id,
      linkUrl: "/threads",
      createdById: actor.userId,
    });

    const full = await communicationHubRepository.findThreadById(id);
    return toDiscussionThreadDto(full ?? updated, { nestReplies: true });
  }

  async deleteThread(id: string, actor: CommunicationActor) {
    assertThreadManage(actor);
    const existing = await communicationHubRepository.findThreadById(id);
    if (!existing) notFound("Thread");

    await communicationHubRepository.softDeleteThread(id, actor.userId);

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "THREAD_DELETED",
      resourceId: id,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "THREAD_DELETED",
      title: `Thread deleted: ${existing.title}`,
      entityType: "THREAD",
      entityId: id,
      linkUrl: "/threads",
      createdById: actor.userId,
    });
  }

  async resolveThread(id: string, actor: CommunicationActor) {
    assertThreadManage(actor);
    const existing = await communicationHubRepository.findThreadById(id);
    if (!existing) notFound("Thread");

    const resolved = await communicationHubRepository.resolveThread(
      id,
      actor.userId,
    );

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "THREAD_RESOLVED",
      resourceId: id,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "THREAD_RESOLVED",
      title: `Thread resolved: ${resolved.title}`,
      entityType: "THREAD",
      entityId: id,
      linkUrl: "/threads",
      createdById: actor.userId,
    });

    return toDiscussionThreadDto(resolved, { nestReplies: true });
  }

  async createReply(
    threadId: string,
    input: CreateDiscussionReplyInput,
    actor: CommunicationActor,
  ) {
    assertCanWrite(actor);
    const thread = await communicationHubRepository.findThreadById(threadId);
    if (!thread) notFound("Thread");

    const reply = await communicationHubRepository.createReply({
      threadId,
      authorId: actor.userId,
      body: input.body,
      parentId: input.parentId,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "THREAD_REPLY_CREATED",
      resourceId: reply.id,
      metadata: { threadId },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "THREAD_REPLY_CREATED",
      title: `Reply on: ${thread.title}`,
      body: input.body.substring(0, 200),
      entityType: "THREAD",
      entityId: threadId,
      linkUrl: "/threads",
      createdById: actor.userId,
    });

    const mentionIds = new Set(input.mentionUserIds ?? []);
    for (const mentionedUserId of mentionIds) {
      if (mentionedUserId === actor.userId) continue;
      void notificationDispatcher.notify({
        title: "You were mentioned in a thread",
        body: input.body.substring(0, 200),
        category: NotificationCategory.TEAM,
        priority: NotificationPriority.HIGH,
        linkUrl: "/threads",
        entityType: "DiscussionReply",
        entityId: reply.id,
        audience: { type: "INDIVIDUAL", userId: mentionedUserId },
        createdById: actor.userId,
      });
    }

    if (thread.createdById && thread.createdById !== actor.userId) {
      void notificationDispatcher.notify({
        title: "New reply on your thread",
        body: input.body.substring(0, 200),
        category: NotificationCategory.TEAM,
        linkUrl: "/threads",
        entityType: "DiscussionThread",
        entityId: threadId,
        audience: { type: "INDIVIDUAL", userId: thread.createdById },
        createdById: actor.userId,
      });
    }

    return toDiscussionReplyDto(reply);
  }

  // ---- Meetings -------------------------------------------------------------

  async listMeetings(query: ListMeetingsQueryInput, actor: CommunicationActor) {
    assertCanRead(actor);
    const result = await communicationHubRepository.listMeetings({
      query,
      userId: actor.userId,
      orgWide: isOrgAdmin(actor),
    });
    return {
      ...result,
      items: result.items.map((row) => toMeetingRoomDto(row)),
    };
  }

  async getMeeting(id: string, actor: CommunicationActor) {
    assertCanRead(actor);
    const row = await communicationHubRepository.findMeetingById(id);
    if (!row) notFound("Meeting");
    return toMeetingRoomDto(row);
  }

  async createMeeting(input: CreateMeetingRoomInput, actor: CommunicationActor) {
    assertMeetingManage(actor);

    const created = await communicationHubRepository.createMeeting({
      title: input.title,
      description: input.description,
      scheduledStart: new Date(input.scheduledStart),
      scheduledEnd: input.scheduledEnd
        ? new Date(input.scheduledEnd)
        : null,
      waitingRoomEnabled: input.waitingRoomEnabled ?? true,
      conversationId: input.conversationId,
      hostId: actor.userId,
      participantIds: input.participantIds,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEETING_CREATED",
      resourceId: created.id,
      metadata: { title: created.title },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "MEETING_CREATED",
      title: `Meeting: ${created.title}`,
      body: created.description,
      entityType: "MEETING",
      entityId: created.id,
      linkUrl: "/meetings",
      createdById: actor.userId,
    });

    for (const participant of created.participants ?? []) {
      if (participant.userId === actor.userId) continue;
      void notificationDispatcher.notify({
        title: "Meeting invitation",
        body: `You are invited to "${created.title}".`,
        category: NotificationCategory.CALENDAR,
        priority: NotificationPriority.HIGH,
        linkUrl: "/meetings",
        entityType: "MeetingRoom",
        entityId: created.id,
        audience: { type: "INDIVIDUAL", userId: participant.userId },
        createdById: actor.userId,
      });
    }

    return toMeetingRoomDto(created);
  }

  async updateMeeting(
    id: string,
    input: UpdateMeetingRoomInput,
    actor: CommunicationActor,
  ) {
    assertMeetingManage(actor);
    const existing = await communicationHubRepository.findMeetingById(id);
    if (!existing) notFound("Meeting");

    const status = input.status;
    const updated = await communicationHubRepository.updateMeeting(id, {
      title: input.title,
      description: input.description,
      scheduledStart: input.scheduledStart
        ? new Date(input.scheduledStart)
        : undefined,
      scheduledEnd:
        input.scheduledEnd === undefined
          ? undefined
          : input.scheduledEnd
            ? new Date(input.scheduledEnd)
            : null,
      waitingRoomEnabled: input.waitingRoomEnabled,
      status,
      startedAt:
        status === "LIVE" && !existing.startedAt ? new Date() : undefined,
      endedAt:
        status === "ENDED" || status === "CANCELLED"
          ? new Date()
          : undefined,
      updatedById: actor.userId,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEETING_UPDATED",
      resourceId: id,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "MEETING_UPDATED",
      title: `Meeting updated: ${updated.title}`,
      entityType: "MEETING",
      entityId: id,
      linkUrl: "/meetings",
      createdById: actor.userId,
    });

    return toMeetingRoomDto(updated);
  }

  async deleteMeeting(id: string, actor: CommunicationActor) {
    assertMeetingManage(actor);
    const existing = await communicationHubRepository.findMeetingById(id);
    if (!existing) notFound("Meeting");

    await communicationHubRepository.softDeleteMeeting(id, actor.userId);

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEETING_DELETED",
      resourceId: id,
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "MEETING_DELETED",
      title: `Meeting deleted: ${existing.title}`,
      entityType: "MEETING",
      entityId: id,
      linkUrl: "/meetings",
      createdById: actor.userId,
    });
  }

  async updateParticipantStatus(
    meetingId: string,
    userId: string,
    input: UpdateMeetingParticipantInput,
    actor: CommunicationActor,
  ) {
    assertCanWrite(actor);
    const meeting = await communicationHubRepository.findMeetingById(meetingId);
    if (!meeting) notFound("Meeting");

    const isSelf = userId === actor.userId;
    const canManage = hasPerm(
      actor,
      PERMISSIONS.MEETING_MANAGE,
      PERMISSIONS.COMMUNICATION_MANAGE,
    );
    if (!isSelf && !canManage) {
      throw new CommunicationError(
        "Access denied",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await communicationHubRepository.updateParticipantStatus(
      meetingId,
      userId,
      input.status,
    );

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEETING_PARTICIPANT_UPDATED",
      resourceId: meetingId,
      metadata: { userId, status: input.status },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "MEETING_PARTICIPANT_UPDATED",
      title: `Participant ${input.status.toLowerCase()}`,
      entityType: "MEETING",
      entityId: meetingId,
      linkUrl: "/meetings",
      createdById: actor.userId,
    });

    return toMeetingParticipantDto(updated);
  }

  async addRecording(
    meetingId: string,
    input: CreateMeetingRecordingInput,
    actor: CommunicationActor,
  ) {
    assertMeetingManage(actor);
    const meeting = await communicationHubRepository.findMeetingById(meetingId);
    if (!meeting) notFound("Meeting");

    const secured = await attachmentSecurityService.secureAttachment(
      {
        fileName: input.fileName,
        fileUrl: input.storageUrl,
        storageUrl: input.storageUrl,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        managedFileId: input.managedFileId,
        durationSeconds: input.durationSeconds,
      },
      actor,
    );

    const recording = await communicationHubRepository.addRecording(meetingId, {
      fileName: secured.fileName,
      storageUrl: secured.fileUrl,
      mimeType: secured.mimeType,
      sizeBytes: secured.sizeBytes,
      durationSeconds: secured.durationSeconds ?? input.durationSeconds,
      managedFileId: secured.managedFileId,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      endedAt: input.endedAt ? new Date(input.endedAt) : null,
      createdById: actor.userId,
    });

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEETING_RECORDING_ADDED",
      resourceId: recording.id,
      metadata: { meetingId },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "MEETING_RECORDING_ADDED",
      title: `Recording added: ${recording.fileName}`,
      entityType: "MEETING",
      entityId: meetingId,
      linkUrl: "/meetings",
      createdById: actor.userId,
    });

    return toMeetingRecordingDto(recording);
  }

  async addScreenShare(
    meetingId: string,
    input: CreateMeetingScreenShareInput,
    actor: CommunicationActor,
  ) {
    assertCanWrite(actor);
    const meeting = await communicationHubRepository.findMeetingById(meetingId);
    if (!meeting) notFound("Meeting");

    const userId = input.userId ?? actor.userId;
    await communicationHubRepository.endActiveScreenShares(meetingId);
    const share = await communicationHubRepository.addScreenShare(
      meetingId,
      userId,
    );

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "MEETING_SCREEN_SHARE_STARTED",
      resourceId: share.id,
      metadata: { meetingId, userId },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "MEETING_SCREEN_SHARE_STARTED",
      title: "Screen share started",
      entityType: "MEETING",
      entityId: meetingId,
      linkUrl: "/meetings",
      createdById: actor.userId,
    });

    return toMeetingScreenShareDto(share);
  }

  // ---- Channels -------------------------------------------------------------

  async listChannels(
    query: ListConversationsQueryInput,
    actor: CommunicationActor,
  ) {
    assertCanRead(actor);

    const types = query.type
      ? CHANNEL_TYPES.includes(query.type as (typeof CHANNEL_TYPES)[number])
        ? [query.type as (typeof CHANNEL_TYPES)[number]]
        : [...CHANNEL_TYPES]
      : [...CHANNEL_TYPES];

    const result = await communicationRepository.listConversations({
      userId: actor.userId,
      query: { ...query, type: undefined },
      clientScope: actor.role === "CLIENT",
      orgWide: isOrgAdmin(actor),
      types,
    });

    const items = await Promise.all(
      result.items.map(async (conv) => {
        const unreadCount = await communicationRepository.getUnreadCount(
          conv.id,
          actor.userId,
        );
        return toConversationDto(conv, {
          unreadCount,
          memberCount: conv.members?.length ?? 0,
        });
      }),
    );

    return { ...result, items };
  }

  // ---- AI -------------------------------------------------------------------

  async runAi(
    input: CommunicationAiRequestInput,
    actor: CommunicationActor,
  ): Promise<CommunicationAiResponseDto> {
    if (!hasPerm(actor, PERMISSIONS.AI_USE)) {
      throw new CommunicationError(
        "AI use permission required",
        403,
        COMMUNICATION_ERROR_CODES.FORBIDDEN,
      );
    }
    assertCanRead(actor);

    let sourceText = input.text?.trim() ?? "";

    if (input.conversationId) {
      const messages = await prisma.message.findMany({
        where: {
          conversationId: input.conversationId,
          deletedAt: null,
          ...(input.messageIds?.length
            ? { id: { in: input.messageIds } }
            : {}),
        },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { body: true, sender: { select: { firstName: true, lastName: true } } },
      });
      const transcript = messages
        .map(
          (m) =>
            `${m.sender.firstName} ${m.sender.lastName}: ${m.body}`,
        )
        .join("\n");
      sourceText = [sourceText, transcript].filter(Boolean).join("\n\n");
    }

    if (input.meetingId) {
      const meeting = await communicationHubRepository.findMeetingById(
        input.meetingId,
      );
      if (meeting) {
        const meetingCtx = [
          `Meeting: ${meeting.title}`,
          meeting.description ?? "",
          `Status: ${meeting.status}`,
          `Scheduled: ${meeting.scheduledStart.toISOString()}`,
          `Participants: ${(meeting.participants ?? [])
            .map((p) => p.user?.email ?? p.userId)
            .join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n");
        sourceText = [sourceText, meetingCtx].filter(Boolean).join("\n\n");
      }
    }

    if (!sourceText.trim()) {
      throw new CommunicationError(
        "Provide text, conversationId, or meetingId for AI",
        400,
        COMMUNICATION_ERROR_CODES.VALIDATION,
      );
    }

    const modeByAction = {
      SUMMARIZE_CONVERSATION: "SUMMARIZE",
      MEETING_SUMMARY: "MEETING_NOTES",
      ACTION_ITEMS: "ANALYZE",
      TRANSLATE: "ASK",
      FOLLOW_UP_TASKS: "ANALYZE",
    } as const;

    const mode = modeByAction[input.action];
    let prompt = sourceText;
    switch (input.action) {
      case "SUMMARIZE_CONVERSATION":
        prompt = `Summarize this conversation clearly and concisely:\n\n${sourceText}`;
        break;
      case "MEETING_SUMMARY":
        prompt = `Produce structured meeting notes (agenda, discussion, decisions, next steps):\n\n${sourceText}`;
        break;
      case "ACTION_ITEMS":
        prompt = `Extract action items as a JSON array of objects with "title" and optional "description":\n\n${sourceText}`;
        break;
      case "TRANSLATE":
        prompt = `Translate the following text to ${input.targetLanguage ?? "English"}. Return only the translation:\n\n${sourceText}`;
        break;
      case "FOLLOW_UP_TASKS":
        prompt = `Suggest follow-up tasks as a JSON array of objects with "title" and optional "description":\n\n${sourceText}`;
        break;
      default: {
        const _exhaustive: never = input.action;
        return _exhaustive;
      }
    }

    const provider = getAiProvider();
    const generated = await provider.generate({ mode, prompt });

    const response: CommunicationAiResponseDto = {
      action: input.action,
      provider: generated.provider,
      content: generated.content,
    };

    if (
      input.action === "ACTION_ITEMS" ||
      input.action === "FOLLOW_UP_TASKS"
    ) {
      response.actionItems = parseActionItems(generated.content);
    }

    if (
      input.action === "FOLLOW_UP_TASKS" &&
      response.actionItems?.length &&
      hasPerm(actor, PERMISSIONS.TASKS_WRITE) &&
      isOrgAdmin(actor)
    ) {
      const createdTaskIds: string[] = [];
      for (const item of response.actionItems.slice(0, 10)) {
        try {
          const taskInput: CreateTaskInput = {
            title: item.title.slice(0, 200),
            description: item.description ?? "",
            projectId: input.projectId ?? "",
            assignedToId: "",
            status: "TODO",
            priority: "MEDIUM",
            labels: ["follow-up"],
            startDate: "",
            dueDate: "",
            progress: 0,
            estimatedHours: "",
            attachments: [],
          };
          const task = await tasksService.create(taskInput, {
            userId: actor.userId,
            role: String(actor.role),
            email: actor.email,
          });
          createdTaskIds.push(task.id);
        } catch {
          // Admin-only / validation failures — keep suggestions only
          break;
        }
      }
      if (createdTaskIds.length > 0) {
        response.createdTaskIds = createdTaskIds;
      }
    }

    void writeCommunicationAudit({
      userId: actor.userId,
      action: "COMMUNICATION_AI",
      metadata: { aiAction: input.action, provider: generated.provider },
    });

    void activityPublisher.record({
      actorId: actor.userId,
      action: "COMMUNICATION_AI",
      title: `AI ${input.action}`,
      entityType: "AI",
      linkUrl: "/messages",
      createdById: actor.userId,
    });

    return response;
  }
}

export const communicationHubService = new CommunicationHubService();
