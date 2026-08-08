import { z } from "zod";

import { isAttachmentUrlSchemeAllowed } from "../utils/attachment-url.js";
import { uuidSchema } from "./common.schema.js";
import { communicationUserSummarySchema } from "./communication.schema.js";

/** Phase 20 — Announcement Center, Discussion Threads, Meeting Architecture, Hub AI */

export const ANNOUNCEMENT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const MEETING_STATUSES = [
  "SCHEDULED",
  "WAITING",
  "LIVE",
  "ENDED",
  "CANCELLED",
] as const;
export const MEETING_PARTICIPANT_STATUSES = [
  "INVITED",
  "WAITING",
  "ADMITTED",
  "JOINED",
  "LEFT",
  "DECLINED",
] as const;
export const DISCUSSION_THREAD_STATUSES = ["OPEN", "RESOLVED", "ARCHIVED"] as const;
export const COMMUNICATION_AI_ACTIONS = [
  "SUMMARIZE_CONVERSATION",
  "MEETING_SUMMARY",
  "ACTION_ITEMS",
  "TRANSLATE",
  "FOLLOW_UP_TASKS",
] as const;

export const announcementPrioritySchema = z.enum(ANNOUNCEMENT_PRIORITIES);
export const meetingStatusSchema = z.enum(MEETING_STATUSES);
export const meetingParticipantStatusSchema = z.enum(MEETING_PARTICIPANT_STATUSES);
export const discussionThreadStatusSchema = z.enum(DISCUSSION_THREAD_STATUSES);
export const communicationAiActionSchema = z.enum(COMMUNICATION_AI_ACTIONS);

export type AnnouncementPriorityValue = z.infer<typeof announcementPrioritySchema>;
export type MeetingStatusValue = z.infer<typeof meetingStatusSchema>;
export type MeetingParticipantStatusValue = z.infer<
  typeof meetingParticipantStatusSchema
>;
export type DiscussionThreadStatusValue = z.infer<
  typeof discussionThreadStatusSchema
>;
export type CommunicationAiActionValue = z.infer<
  typeof communicationAiActionSchema
>;

const hubAttachmentInputSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      isAttachmentUrlSchemeAllowed,
      "Forbidden attachment URL scheme. Use a File Manager file.",
    ),
  mimeType: z.string().trim().max(120).optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
  managedFileId: uuidSchema.optional().nullable(),
});

export const announcementAttachmentDtoSchema = hubAttachmentInputSchema.extend({
  id: uuidSchema,
  announcementId: uuidSchema,
  createdAt: z.string(),
});

export const announcementDtoSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  body: z.string(),
  priority: announcementPrioritySchema,
  departmentId: uuidSchema.nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isPinned: z.boolean(),
  publishedAt: z.string().nullable().optional(),
  createdById: uuidSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: communicationUserSummarySchema.nullable().optional(),
  attachments: z.array(announcementAttachmentDtoSchema).optional(),
  readCount: z.number().int().nonnegative().optional(),
  isReadByMe: z.boolean().optional(),
});

export const announcementIdParamsSchema = z.object({
  id: uuidSchema,
});

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(50000),
  priority: announcementPrioritySchema.optional().default("NORMAL"),
  departmentId: uuidSchema.optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isPinned: z.boolean().optional().default(false),
  publish: z.boolean().optional().default(true),
  attachments: z.array(hubAttachmentInputSchema).max(20).optional(),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  body: z.string().trim().min(1).max(50000).optional(),
  priority: announcementPrioritySchema.optional(),
  departmentId: uuidSchema.optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isPinned: z.boolean().optional(),
  publish: z.boolean().optional(),
});

export const listAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().trim().max(200).optional(),
  priority: announcementPrioritySchema.optional(),
  departmentId: uuidSchema.optional(),
  pinnedOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true";
    }),
});

export const discussionReplyDtoSchema: z.ZodType<{
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: z.infer<typeof communicationUserSummarySchema>;
  replies?: unknown[];
}> = z.lazy(() =>
  z.object({
    id: uuidSchema,
    threadId: uuidSchema,
    authorId: uuidSchema,
    body: z.string(),
    parentId: uuidSchema.nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    author: communicationUserSummarySchema.optional(),
    replies: z.array(discussionReplyDtoSchema).optional(),
  }),
);

export const discussionThreadDtoSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  body: z.string(),
  category: z.string().nullable().optional(),
  status: discussionThreadStatusSchema,
  isPinned: z.boolean(),
  departmentId: uuidSchema.nullable().optional(),
  teamId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  resolvedById: uuidSchema.nullable().optional(),
  createdById: uuidSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: communicationUserSummarySchema.nullable().optional(),
  resolvedBy: communicationUserSummarySchema.nullable().optional(),
  tags: z.array(z.string()).optional(),
  replyCount: z.number().int().nonnegative().optional(),
  replies: z.array(discussionReplyDtoSchema).optional(),
});

export const threadIdParamsSchema = z.object({
  id: uuidSchema,
});

export const replyIdParamsSchema = z.object({
  id: uuidSchema,
  replyId: uuidSchema,
});

export const createDiscussionThreadSchema = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(50000),
  category: z.string().trim().max(100).optional().nullable(),
  departmentId: uuidSchema.optional().nullable(),
  teamId: uuidSchema.optional().nullable(),
  projectId: uuidSchema.optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  isPinned: z.boolean().optional().default(false),
});

export const updateDiscussionThreadSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  body: z.string().trim().min(1).max(50000).optional(),
  category: z.string().trim().max(100).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  isPinned: z.boolean().optional(),
  status: discussionThreadStatusSchema.optional(),
});

export const createDiscussionReplySchema = z.object({
  body: z.string().trim().min(1).max(20000),
  parentId: uuidSchema.optional().nullable(),
  mentionUserIds: z.array(uuidSchema).max(50).optional(),
});

export const listDiscussionThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().trim().max(200).optional(),
  status: discussionThreadStatusSchema.optional(),
  category: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(80).optional(),
  pinnedOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true";
    }),
});

export const meetingParticipantDtoSchema = z.object({
  id: uuidSchema,
  meetingId: uuidSchema,
  userId: uuidSchema,
  status: meetingParticipantStatusSchema,
  invitedAt: z.string(),
  joinedAt: z.string().nullable().optional(),
  leftAt: z.string().nullable().optional(),
  admittedAt: z.string().nullable().optional(),
  user: communicationUserSummarySchema.optional(),
});

export const meetingRecordingDtoSchema = z.object({
  id: uuidSchema,
  meetingId: uuidSchema,
  fileName: z.string(),
  storageUrl: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nullable().optional(),
  durationSeconds: z.number().int().nullable().optional(),
  managedFileId: uuidSchema.nullable().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const meetingScreenShareDtoSchema = z.object({
  id: uuidSchema,
  meetingId: uuidSchema,
  userId: uuidSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  user: communicationUserSummarySchema.optional(),
});

export const meetingRoomDtoSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable().optional(),
  status: meetingStatusSchema,
  scheduledStart: z.string(),
  scheduledEnd: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  endedAt: z.string().nullable().optional(),
  waitingRoomEnabled: z.boolean(),
  webrtcRoomId: z.string().nullable().optional(),
  conversationId: uuidSchema.nullable().optional(),
  hostId: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  host: communicationUserSummarySchema.optional(),
  participants: z.array(meetingParticipantDtoSchema).optional(),
  recordings: z.array(meetingRecordingDtoSchema).optional(),
  screenShares: z.array(meetingScreenShareDtoSchema).optional(),
  participantCount: z.number().int().nonnegative().optional(),
});

export const meetingIdParamsSchema = z.object({
  id: uuidSchema,
});

export const createMeetingRoomSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional().nullable(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime().optional().nullable(),
  waitingRoomEnabled: z.boolean().optional().default(true),
  conversationId: uuidSchema.optional().nullable(),
  participantIds: z.array(uuidSchema).max(200).optional(),
});

export const updateMeetingRoomSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional().nullable(),
  waitingRoomEnabled: z.boolean().optional(),
  status: meetingStatusSchema.optional(),
});

export const listMeetingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().trim().max(200).optional(),
  status: meetingStatusSchema.optional(),
});

export const updateMeetingParticipantSchema = z.object({
  status: meetingParticipantStatusSchema,
});

export const createMeetingRecordingSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  storageUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) => value.length === 0 || isAttachmentUrlSchemeAllowed(value),
      "Forbidden attachment URL scheme. Use a File Manager file.",
    )
    .optional()
    .nullable(),
  mimeType: z.string().trim().max(120).optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  managedFileId: uuidSchema.optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  endedAt: z.string().datetime().optional().nullable(),
});

export const createMeetingScreenShareSchema = z.object({
  userId: uuidSchema.optional(),
});

export const communicationAiRequestSchema = z.object({
  action: communicationAiActionSchema,
  conversationId: uuidSchema.optional(),
  meetingId: uuidSchema.optional(),
  messageIds: z.array(uuidSchema).max(200).optional(),
  text: z.string().trim().max(100000).optional(),
  targetLanguage: z.string().trim().min(2).max(40).optional(),
  projectId: uuidSchema.optional().nullable(),
});

export const communicationAiResponseSchema = z.object({
  action: communicationAiActionSchema,
  provider: z.string(),
  content: z.string(),
  actionItems: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  createdTaskIds: z.array(uuidSchema).optional(),
});

export type AnnouncementDto = z.infer<typeof announcementDtoSchema>;
export type AnnouncementAttachmentDto = z.infer<
  typeof announcementAttachmentDtoSchema
>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type ListAnnouncementsQueryInput = z.infer<
  typeof listAnnouncementsQuerySchema
>;
export type AnnouncementIdParamsInput = z.infer<typeof announcementIdParamsSchema>;

export type DiscussionThreadDto = z.infer<typeof discussionThreadDtoSchema>;
export type DiscussionReplyDto = z.infer<typeof discussionReplyDtoSchema>;
export type CreateDiscussionThreadInput = z.infer<
  typeof createDiscussionThreadSchema
>;
export type UpdateDiscussionThreadInput = z.infer<
  typeof updateDiscussionThreadSchema
>;
export type CreateDiscussionReplyInput = z.infer<
  typeof createDiscussionReplySchema
>;
export type ListDiscussionThreadsQueryInput = z.infer<
  typeof listDiscussionThreadsQuerySchema
>;
export type ThreadIdParamsInput = z.infer<typeof threadIdParamsSchema>;
export type ReplyIdParamsInput = z.infer<typeof replyIdParamsSchema>;

export type MeetingRoomDto = z.infer<typeof meetingRoomDtoSchema>;
export type MeetingParticipantDto = z.infer<typeof meetingParticipantDtoSchema>;
export type MeetingRecordingDto = z.infer<typeof meetingRecordingDtoSchema>;
export type MeetingScreenShareDto = z.infer<typeof meetingScreenShareDtoSchema>;
export type CreateMeetingRoomInput = z.infer<typeof createMeetingRoomSchema>;
export type UpdateMeetingRoomInput = z.infer<typeof updateMeetingRoomSchema>;
export type ListMeetingsQueryInput = z.infer<typeof listMeetingsQuerySchema>;
export type MeetingIdParamsInput = z.infer<typeof meetingIdParamsSchema>;
export type UpdateMeetingParticipantInput = z.infer<
  typeof updateMeetingParticipantSchema
>;
export type CreateMeetingRecordingInput = z.infer<
  typeof createMeetingRecordingSchema
>;
export type CreateMeetingScreenShareInput = z.infer<
  typeof createMeetingScreenShareSchema
>;

export type CommunicationAiRequestInput = z.infer<
  typeof communicationAiRequestSchema
>;
export type CommunicationAiResponseDto = z.infer<
  typeof communicationAiResponseSchema
>;
