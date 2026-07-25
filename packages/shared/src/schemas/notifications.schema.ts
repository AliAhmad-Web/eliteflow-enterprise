import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

export const NOTIFICATION_CATEGORIES = [
  "SYSTEM",
  "SECURITY",
  "TASK",
  "PROJECT",
  "INVOICE",
  "CALENDAR",
  "FILE",
  "TEAM",
  "AI",
  "AUTH",
] as const;

export const NOTIFICATION_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const NOTIFICATION_CHANNELS = [
  "IN_APP",
  "EMAIL",
  "PUSH",
  "SMS",
  "WHATSAPP",
] as const;

export const NOTIFICATION_QUEUE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;

export const NOTIFICATION_AUDIENCE_TYPES = [
  "INDIVIDUAL",
  "ROLE",
  "DEPARTMENT",
  "CLIENT_GROUP",
] as const;

export const notificationCategorySchema = z.enum(NOTIFICATION_CATEGORIES);
export const notificationPrioritySchema = z.enum(NOTIFICATION_PRIORITIES);
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);
export const notificationQueueStatusSchema = z.enum(NOTIFICATION_QUEUE_STATUSES);
export const notificationAudienceTypeSchema = z.enum(NOTIFICATION_AUDIENCE_TYPES);

export type NotificationCategoryValue = z.infer<typeof notificationCategorySchema>;
export type NotificationPriorityValue = z.infer<typeof notificationPrioritySchema>;
export type NotificationChannelValue = z.infer<typeof notificationChannelSchema>;
export type NotificationQueueStatusValue = z.infer<
  typeof notificationQueueStatusSchema
>;
export type NotificationAudienceTypeValue = z.infer<
  typeof notificationAudienceTypeSchema
>;

export const notificationDtoSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  title: z.string(),
  body: z.string(),
  category: notificationCategorySchema,
  priority: notificationPrioritySchema,
  channel: notificationChannelSchema,
  linkUrl: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().uuid().nullable(),
  metadata: z.unknown().nullable(),
  isRead: z.boolean(),
  readAt: z.string().datetime().nullable(),
  isArchived: z.boolean(),
  archivedAt: z.string().datetime().nullable(),
  createdById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NotificationDto = z.infer<typeof notificationDtoSchema>;

export const notificationPreferenceDtoSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  category: notificationCategorySchema,
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NotificationPreferenceDto = z.infer<
  typeof notificationPreferenceDtoSchema
>;

export const notificationTemplateDtoSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  category: notificationCategorySchema,
  subject: z.string(),
  bodyTemplate: z.string(),
  emailTemplate: z.string().nullable(),
  channels: z.array(notificationChannelSchema),
  isSystem: z.boolean(),
  createdById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NotificationTemplateDto = z.infer<typeof notificationTemplateDtoSchema>;

export const notificationQueueDtoSchema = z.object({
  id: uuidSchema,
  notificationId: z.string().uuid().nullable(),
  userId: uuidSchema,
  channel: notificationChannelSchema,
  status: notificationQueueStatusSchema,
  toAddress: z.string().nullable(),
  subject: z.string().nullable(),
  payload: z.unknown(),
  attempts: z.number().int(),
  lastError: z.string().nullable(),
  scheduledFor: z.string().datetime(),
  processedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NotificationQueueDto = z.infer<typeof notificationQueueDtoSchema>;

export const notificationAuditDtoSchema = z.object({
  id: uuidSchema,
  notificationId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable(),
  action: z.string(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationAuditDto = z.infer<typeof notificationAuditDtoSchema>;

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().max(200).optional(),
  category: notificationCategorySchema.optional(),
  priority: notificationPrioritySchema.optional(),
  isRead: z.enum(["true", "false"]).optional(),
  isArchived: z.enum(["true", "false"]).optional(),
  userId: uuidSchema.optional(),
});
export type ListNotificationsQueryInput = z.infer<
  typeof listNotificationsQuerySchema
>;

export const notificationIdParamsSchema = z.object({ id: uuidSchema });
export type NotificationIdParamsInput = z.infer<typeof notificationIdParamsSchema>;

export const createNotificationSchema = z.object({
  userId: uuidSchema.optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  category: notificationCategorySchema.optional().default("SYSTEM"),
  priority: notificationPrioritySchema.optional().default("NORMAL"),
  linkUrl: z.string().trim().max(500).optional().nullable(),
  entityType: z.string().trim().max(80).optional().nullable(),
  entityId: uuidSchema.optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  sendEmail: z.boolean().optional().default(false),
  audienceType: notificationAudienceTypeSchema.optional().default("INDIVIDUAL"),
  roleCode: z.string().trim().max(40).optional(),
  departmentId: uuidSchema.optional(),
  companyId: uuidSchema.optional(),
  scheduledFor: z.string().datetime().optional(),
});
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export const bulkNotificationIdsSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
});
export type BulkNotificationIdsInput = z.infer<typeof bulkNotificationIdsSchema>;

export const updatePreferenceSchema = z.object({
  category: notificationCategorySchema,
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
});
export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;

export const updatePreferencesBatchSchema = z.object({
  preferences: z.array(updatePreferenceSchema).min(1).max(20),
});
export type UpdatePreferencesBatchInput = z.infer<
  typeof updatePreferencesBatchSchema
>;

export const listQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: notificationQueueStatusSchema.optional(),
  channel: notificationChannelSchema.optional(),
});
export type ListQueueQueryInput = z.infer<typeof listQueueQuerySchema>;

export const listHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListHistoryQueryInput = z.infer<typeof listHistoryQuerySchema>;

export const unreadCountDtoSchema = z.object({
  count: z.number().int().min(0),
});
export type UnreadCountDto = z.infer<typeof unreadCountDtoSchema>;

export const notificationReplyDtoSchema = z.object({
  id: uuidSchema,
  notificationId: uuidSchema,
  userId: uuidSchema,
  message: z.string(),
  author: z.object({
    id: uuidSchema,
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  syncedEntityType: z.string().nullable(),
  syncedEntityId: z.string().uuid().nullable(),
  syncedCommentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NotificationReplyDto = z.infer<typeof notificationReplyDtoSchema>;

export const notificationReplyListResponseSchema = z.object({
  items: z.array(notificationReplyDtoSchema),
});
export type NotificationReplyListResponse = z.infer<
  typeof notificationReplyListResponseSchema
>;

export const createNotificationReplySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  /** When true (default), also mirror into the related entity discussion if supported. */
  syncToEntity: z.boolean().optional().default(true),
});
export type CreateNotificationReplyInput = z.infer<
  typeof createNotificationReplySchema
>;

export const notificationReplyIdParamsSchema = z.object({
  id: uuidSchema,
  replyId: uuidSchema,
});
export type NotificationReplyIdParamsInput = z.infer<
  typeof notificationReplyIdParamsSchema
>;
