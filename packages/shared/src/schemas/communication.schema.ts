import { z } from "zod";

import { isAttachmentUrlSchemeAllowed } from "../utils/attachment-url.js";
import { uuidSchema } from "./common.schema.js";

export const CONVERSATION_TYPES = [
  "DIRECT",
  "GROUP",
  "DEPARTMENT",
  "TEAM",
  "PROJECT",
  "CLIENT",
  "ORGANIZATION",
] as const;

export const CONVERSATION_MEMBER_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

export const MESSAGE_KINDS = ["TEXT", "SYSTEM", "VOICE"] as const;

export const MESSAGE_READ_STATUSES = ["SENT", "DELIVERED", "SEEN"] as const;

export const COMMENT_ENTITY_TYPES = [
  "PROJECT",
  "TASK",
  "INVOICE",
  "CLIENT",
  "CALENDAR",
  "FILE",
  "REPORT",
  "TEAM",
  "AI_DOCUMENT",
] as const;

export const ACTIVITY_ENTITY_TYPES = [
  "CLIENT",
  "PROJECT",
  "TASK",
  "INVOICE",
  "CALENDAR",
  "FILE",
  "AI",
  "NOTIFICATION",
  "TEAM",
  "MESSAGE",
  "COMMENT",
  "CONVERSATION",
  "USER",
  "SYSTEM",
  "ANNOUNCEMENT",
  "MEETING",
  "THREAD",
] as const;

export const conversationTypeSchema = z.enum(CONVERSATION_TYPES);
export const conversationMemberRoleSchema = z.enum(CONVERSATION_MEMBER_ROLES);
export const messageKindSchema = z.enum(MESSAGE_KINDS);
export const messageReadStatusSchema = z.enum(MESSAGE_READ_STATUSES);
export const commentEntityTypeSchema = z.enum(COMMENT_ENTITY_TYPES);
export const activityEntityTypeSchema = z.enum(ACTIVITY_ENTITY_TYPES);

export type ConversationTypeValue = z.infer<typeof conversationTypeSchema>;
export type ConversationMemberRoleValue = z.infer<typeof conversationMemberRoleSchema>;
export type MessageKindValue = z.infer<typeof messageKindSchema>;
export type MessageReadStatusValue = z.infer<typeof messageReadStatusSchema>;
export type CommentEntityTypeValue = z.infer<typeof commentEntityTypeSchema>;
export type ActivityEntityTypeValue = z.infer<typeof activityEntityTypeSchema>;

const attachmentInputSchema = z.object({
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
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  waveformJson: z.string().max(50000).optional().nullable(),
});

export const communicationUserSummarySchema = z.object({
  id: uuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable().optional(),
});

export const messageAttachmentDtoSchema = attachmentInputSchema.extend({
  id: uuidSchema,
  messageId: uuidSchema,
  createdAt: z.string(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  waveformJson: z.string().nullable().optional(),
});

export const messageReactionDtoSchema = z.object({
  id: uuidSchema,
  messageId: uuidSchema,
  userId: uuidSchema,
  emoji: z.string().min(1).max(32),
  createdAt: z.string(),
  user: communicationUserSummarySchema.optional(),
});

export const messageReadDtoSchema = z.object({
  id: uuidSchema,
  messageId: uuidSchema,
  userId: uuidSchema,
  status: messageReadStatusSchema,
  deliveredAt: z.string().nullable().optional(),
  seenAt: z.string().nullable().optional(),
});

export const messageDtoSchema = z.object({
  id: uuidSchema,
  conversationId: uuidSchema,
  senderId: uuidSchema,
  body: z.string(),
  kind: messageKindSchema,
  parentId: uuidSchema.nullable().optional(),
  forwardedFromId: uuidSchema.nullable().optional(),
  isPinned: z.boolean(),
  isEdited: z.boolean(),
  editedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sender: communicationUserSummarySchema.optional(),
  parent: z
    .object({
      id: uuidSchema,
      body: z.string(),
      senderId: uuidSchema,
      sender: communicationUserSummarySchema.optional(),
    })
    .nullable()
    .optional(),
  attachments: z.array(messageAttachmentDtoSchema).optional(),
  reactions: z.array(messageReactionDtoSchema).optional(),
  reads: z.array(messageReadDtoSchema).optional(),
  mentionUserIds: z.array(uuidSchema).optional(),
});

export const conversationMemberDtoSchema = z.object({
  id: uuidSchema,
  conversationId: uuidSchema,
  userId: uuidSchema,
  role: conversationMemberRoleSchema,
  lastReadAt: z.string().nullable().optional(),
  mutedUntil: z.string().nullable().optional(),
  joinedAt: z.string(),
  user: communicationUserSummarySchema.optional(),
  isOnline: z.boolean().optional(),
  lastSeenAt: z.string().nullable().optional(),
});

export const conversationDtoSchema = z.object({
  id: uuidSchema,
  type: conversationTypeSchema,
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  teamId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  clientId: uuidSchema.nullable().optional(),
  lastMessageAt: z.string().nullable().optional(),
  lastMessagePreview: z.string().nullable().optional(),
  archivedAt: z.string().nullable().optional(),
  unreadCount: z.number().int().nonnegative().optional(),
  memberCount: z.number().int().nonnegative().optional(),
  members: z.array(conversationMemberDtoSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const commentAttachmentDtoSchema = attachmentInputSchema.extend({
  id: uuidSchema,
  commentId: uuidSchema,
  createdAt: z.string(),
});

export const commentDtoSchema: z.ZodType<{
  id: string;
  entityType: CommentEntityTypeValue;
  entityId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: z.infer<typeof communicationUserSummarySchema>;
  attachments?: z.infer<typeof commentAttachmentDtoSchema>[];
  replies?: unknown[];
}> = z.lazy(() =>
  z.object({
    id: uuidSchema,
    entityType: commentEntityTypeSchema,
    entityId: uuidSchema,
    authorId: uuidSchema,
    body: z.string(),
    parentId: uuidSchema.nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    author: communicationUserSummarySchema.optional(),
    attachments: z.array(commentAttachmentDtoSchema).optional(),
    replies: z.array(commentDtoSchema).optional(),
  }),
);

export const activityAttachmentDtoSchema = attachmentInputSchema.extend({
  id: uuidSchema,
  activityId: uuidSchema,
  createdAt: z.string(),
});

export const activityDtoSchema = z.object({
  id: uuidSchema,
  actorId: uuidSchema.nullable().optional(),
  action: z.string(),
  title: z.string(),
  body: z.string().nullable().optional(),
  entityType: activityEntityTypeSchema,
  entityId: uuidSchema.nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  metadata: z.unknown().optional(),
  createdAt: z.string(),
  actor: communicationUserSummarySchema.nullable().optional(),
  attachments: z.array(activityAttachmentDtoSchema).optional(),
});

export const userPresenceDtoSchema = z.object({
  userId: uuidSchema,
  isOnline: z.boolean(),
  lastSeenAt: z.string().nullable().optional(),
  typingConversationId: uuidSchema.nullable().optional(),
  typingUpdatedAt: z.string().nullable().optional(),
});

export const conversationIdParamsSchema = z.object({
  id: uuidSchema,
});

export const messageIdParamsSchema = z.object({
  id: uuidSchema,
});

export const commentIdParamsSchema = z.object({
  id: uuidSchema,
});

export const createConversationSchema = z
  .object({
    type: conversationTypeSchema,
    name: z.string().trim().min(1).max(200).optional().nullable(),
    description: z.string().trim().max(1000).optional().nullable(),
    avatarUrl: z.string().trim().url().max(2048).optional().nullable(),
    departmentId: uuidSchema.optional().nullable(),
    teamId: uuidSchema.optional().nullable(),
    projectId: uuidSchema.optional().nullable(),
    clientId: uuidSchema.optional().nullable(),
    memberIds: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Member is required")
          .max(320)
          .refine(
            (value) =>
              uuidSchema.safeParse(value).success ||
              z.string().email().safeParse(value).success,
            {
              message: "Each member must be a valid user ID or email",
            },
          ),
      )
      .min(1, "Add at least one member")
      .max(100),
  })
  .superRefine((value, ctx) => {
    if (value.type === "DIRECT" && value.memberIds.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct conversations require exactly one other member",
        path: ["memberIds"],
      });
    }
    if (value.type !== "DIRECT" && !value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name is required for non-direct conversations",
        path: ["name"],
      });
    }
  });

export const updateConversationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  avatarUrl: z.string().trim().url().max(2048).optional().nullable(),
});

export const addConversationMembersSchema = z.object({
  memberIds: z.array(uuidSchema).min(1).max(50),
  role: conversationMemberRoleSchema.optional(),
});

export const conversationMemberParamsSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
});

export const updateConversationMemberSchema = z.object({
  role: conversationMemberRoleSchema,
});

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().trim().max(200).optional(),
  type: conversationTypeSchema.optional(),
  includeArchived: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true";
    }),
  archivedOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true";
    }),
});

export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  kind: messageKindSchema.optional().default("TEXT"),
  parentId: uuidSchema.optional().nullable(),
  mentionUserIds: z.array(uuidSchema).max(50).optional(),
  attachments: z.array(attachmentInputSchema).max(20).optional(),
});

export const updateMessageSchema = z.object({
  body: z.string().trim().min(1).max(10000),
});

export const forwardMessageSchema = z.object({
  targetConversationId: uuidSchema,
});

export const reactToMessageSchema = z.object({
  emoji: z.string().trim().min(1).max(32),
});

export const markMessagesReadSchema = z.object({
  messageIds: z.array(uuidSchema).min(1).max(200).optional(),
  upToMessageId: uuidSchema.optional(),
});

export const typingSchema = z.object({
  isTyping: z.boolean(),
});

export const createCommentSchema = z.object({
  entityType: commentEntityTypeSchema,
  entityId: uuidSchema,
  body: z.string().trim().min(1).max(10000),
  parentId: uuidSchema.optional().nullable(),
  mentionUserIds: z.array(uuidSchema).max(50).optional(),
  attachments: z.array(attachmentInputSchema).max(10).optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().trim().min(1).max(10000),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  before: z.string().datetime().optional(),
  search: z.string().trim().max(200).optional(),
});

export const listCommentsQuerySchema = z.object({
  entityType: commentEntityTypeSchema,
  entityId: uuidSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export const listActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().trim().max(200).optional(),
  entityType: activityEntityTypeSchema.optional(),
  entityId: uuidSchema.optional(),
  action: z.string().trim().max(100).optional(),
});

export const communicationSearchQuerySchema = z
  .object({
    q: z.string().trim().max(200).default(""),
    scope: z
      .enum([
        "all",
        "conversations",
        "messages",
        "attachments",
        "users",
        "projects",
        "clients",
      ])
      .default("all"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    /** Filter messages by sender */
    userId: uuidSchema.optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    hasAttachment: z
      .union([z.literal("true"), z.literal("false"), z.boolean()])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (typeof value === "boolean") return value;
        return value === "true";
      }),
    hasMention: z
      .union([z.literal("true"), z.literal("false"), z.boolean()])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (typeof value === "boolean") return value;
        return value === "true";
      }),
    isPinned: z
      .union([z.literal("true"), z.literal("false"), z.boolean()])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (typeof value === "boolean") return value;
        return value === "true";
      }),
  })
  .superRefine((value, ctx) => {
    const hasFilter =
      Boolean(value.userId) ||
      Boolean(value.fromDate) ||
      Boolean(value.toDate) ||
      value.hasAttachment === true ||
      value.hasMention === true ||
      value.isPinned === true;
    if (!value.q && !hasFilter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a search query or at least one filter",
        path: ["q"],
      });
    }
  });

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AddConversationMembersInput = z.infer<typeof addConversationMembersSchema>;
export type ConversationMemberParamsInput = z.infer<
  typeof conversationMemberParamsSchema
>;
export type UpdateConversationMemberInput = z.infer<
  typeof updateConversationMemberSchema
>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type ForwardMessageInput = z.infer<typeof forwardMessageSchema>;
export type ReactToMessageInput = z.infer<typeof reactToMessageSchema>;
export type MarkMessagesReadInput = z.infer<typeof markMessagesReadSchema>;
export type TypingInput = z.infer<typeof typingSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ListConversationsQueryInput = z.infer<typeof listConversationsQuerySchema>;
export type ListMessagesQueryInput = z.infer<typeof listMessagesQuerySchema>;
export type ListCommentsQueryInput = z.infer<typeof listCommentsQuerySchema>;
export type ListActivitiesQueryInput = z.infer<typeof listActivitiesQuerySchema>;
export type CommunicationSearchQueryInput = z.infer<typeof communicationSearchQuerySchema>;
export type ConversationIdParamsInput = z.infer<typeof conversationIdParamsSchema>;
export type MessageIdParamsInput = z.infer<typeof messageIdParamsSchema>;
export type CommentIdParamsInput = z.infer<typeof commentIdParamsSchema>;
export type ConversationDto = z.infer<typeof conversationDtoSchema>;
export type ConversationMemberDto = z.infer<typeof conversationMemberDtoSchema>;
export type MessageDto = z.infer<typeof messageDtoSchema>;
export type MessageAttachmentDto = z.infer<typeof messageAttachmentDtoSchema>;
export type MessageReactionDto = z.infer<typeof messageReactionDtoSchema>;
export type MessageReadDto = z.infer<typeof messageReadDtoSchema>;
export type CommentDto = z.infer<typeof commentDtoSchema>;
export type CommentAttachmentDto = z.infer<typeof commentAttachmentDtoSchema>;
export type ActivityDto = z.infer<typeof activityDtoSchema>;
export type ActivityAttachmentDto = z.infer<typeof activityAttachmentDtoSchema>;
export type UserPresenceDto = z.infer<typeof userPresenceDtoSchema>;
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;
