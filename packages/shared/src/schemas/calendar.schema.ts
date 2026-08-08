import { z } from "zod";

import { isAttachmentUrlSchemeAllowed } from "../utils/attachment-url.js";
import { uuidSchema } from "./common.schema.js";

export const CALENDAR_EVENT_TYPES = [
  "MEETING",
  "EVENT",
  "PROJECT_DEADLINE",
  "TASK_DUE",
  "REMINDER",
  "HOLIDAY",
] as const;

export const CALENDAR_EVENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
] as const;

export const CALENDAR_EVENT_CATEGORIES = [
  "WORK",
  "PERSONAL",
  "CLIENT",
  "PROJECT",
  "TEAM",
  "HOLIDAY",
  "OTHER",
] as const;

export const EVENT_ATTENDEE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "TENTATIVE",
] as const;

export const REMINDER_CHANNELS = ["EMAIL", "IN_APP"] as const;

export const RECURRENCE_FREQUENCIES = [
  "NONE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
] as const;

export const CALENDAR_VIEWS = ["day", "week", "month", "agenda"] as const;

export const calendarEventTypeSchema = z.enum(CALENDAR_EVENT_TYPES);
export const calendarEventStatusSchema = z.enum(CALENDAR_EVENT_STATUSES);
export const calendarEventCategorySchema = z.enum(CALENDAR_EVENT_CATEGORIES);
export const eventAttendeeStatusSchema = z.enum(EVENT_ATTENDEE_STATUSES);
export const reminderChannelSchema = z.enum(REMINDER_CHANNELS);
export const recurrenceFrequencySchema = z.enum(RECURRENCE_FREQUENCIES);
export const calendarViewSchema = z.enum(CALENDAR_VIEWS);

export type CalendarEventTypeValue = z.infer<typeof calendarEventTypeSchema>;
export type CalendarEventStatusValue = z.infer<typeof calendarEventStatusSchema>;
export type CalendarEventCategoryValue = z.infer<
  typeof calendarEventCategorySchema
>;
export type EventAttendeeStatusValue = z.infer<typeof eventAttendeeStatusSchema>;
export type ReminderChannelValue = z.infer<typeof reminderChannelSchema>;
export type RecurrenceFrequencyValue = z.infer<typeof recurrenceFrequencySchema>;
export type CalendarViewValue = z.infer<typeof calendarViewSchema>;

const colorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color hex");

const reminderInputSchema = z.object({
  channel: reminderChannelSchema.optional().default("IN_APP"),
  minutesBefore: z.coerce.number().int().min(0).max(10080),
});

const attendeeInputSchema = z.object({
  userId: uuidSchema,
  isOptional: z.boolean().optional().default(false),
});

export const createCalendarEventSchema = z
  .object({
    title: z
      .string({ required_error: "Title is required" })
      .trim()
      .min(1, "Title is required")
      .max(200),
    description: z.string().trim().max(5000).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    location: z.string().trim().max(255).optional().nullable(),
    type: calendarEventTypeSchema.optional().default("EVENT"),
    status: calendarEventStatusSchema.optional().default("SCHEDULED"),
    category: calendarEventCategorySchema.optional().default("WORK"),
    color: colorSchema.optional().default("#2563eb"),
    startsAt: z.string().datetime({ message: "startsAt must be ISO datetime" }),
    endsAt: z.string().datetime({ message: "endsAt must be ISO datetime" }),
    allDay: z.boolean().optional().default(false),
    isPrivate: z.boolean().optional().default(false),
    recurrenceFrequency: recurrenceFrequencySchema.optional().default("NONE"),
    recurrenceInterval: z.coerce.number().int().min(1).max(365).optional().default(1),
    recurrenceUntil: z.string().datetime().optional().nullable(),
    recurrenceCount: z.coerce.number().int().min(1).max(365).optional().nullable(),
    attachmentUrls: z
      .array(
        z
          .string()
          .trim()
          .max(2048)
          .refine(
            isAttachmentUrlSchemeAllowed,
            "Forbidden attachment URL scheme. Use a File Manager file.",
          ),
      )
      .max(20)
      .optional()
      .default([]),
    projectId: uuidSchema.optional().nullable(),
    taskId: uuidSchema.optional().nullable(),
    clientId: uuidSchema.optional().nullable(),
    attendeeUserIds: z.array(uuidSchema).max(50).optional().default([]),
    attendees: z.array(attendeeInputSchema).max(50).optional().default([]),
    reminders: z.array(reminderInputSchema).max(10).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endsAt).getTime() <= new Date(data.startsAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endsAt must be after startsAt",
        path: ["endsAt"],
      });
    }
  });

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    location: z.string().trim().max(255).optional().nullable(),
    type: calendarEventTypeSchema.optional(),
    status: calendarEventStatusSchema.optional(),
    category: calendarEventCategorySchema.optional(),
    color: colorSchema.optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    allDay: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
    recurrenceFrequency: recurrenceFrequencySchema.optional(),
    recurrenceInterval: z.coerce.number().int().min(1).max(365).optional(),
    recurrenceUntil: z.string().datetime().optional().nullable(),
    recurrenceCount: z.coerce.number().int().min(1).max(365).optional().nullable(),
    attachmentUrls: z
      .array(
        z
          .string()
          .trim()
          .max(2048)
          .refine(
            isAttachmentUrlSchemeAllowed,
            "Forbidden attachment URL scheme. Use a File Manager file.",
          ),
      )
      .max(20)
      .optional(),
    projectId: uuidSchema.optional().nullable(),
    taskId: uuidSchema.optional().nullable(),
    clientId: uuidSchema.optional().nullable(),
    attendeeUserIds: z.array(uuidSchema).max(50).optional(),
    attendees: z.array(attendeeInputSchema).max(50).optional(),
    reminders: z.array(reminderInputSchema).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt) {
      if (new Date(data.endsAt).getTime() <= new Date(data.startsAt).getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endsAt must be after startsAt",
          path: ["endsAt"],
        });
      }
    }
  });

export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

export const moveCalendarEventSchema = z
  .object({
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endsAt).getTime() <= new Date(data.startsAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endsAt must be after startsAt",
        path: ["endsAt"],
      });
    }
  });

export type MoveCalendarEventInput = z.infer<typeof moveCalendarEventSchema>;

export const resizeCalendarEventSchema = moveCalendarEventSchema;
export type ResizeCalendarEventInput = z.infer<typeof resizeCalendarEventSchema>;

export const calendarEventIdParamsSchema = z.object({ id: uuidSchema });
export type CalendarEventIdParamsInput = z.infer<
  typeof calendarEventIdParamsSchema
>;

export const listCalendarEventsQuerySchema = z.object({
  view: calendarViewSchema.optional().default("month"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().trim().max(200).optional().default(""),
  type: calendarEventTypeSchema.optional(),
  status: calendarEventStatusSchema.optional(),
  category: calendarEventCategorySchema.optional(),
  projectId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  team: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export type ListCalendarEventsQueryInput = z.infer<
  typeof listCalendarEventsQuerySchema
>;

export const respondInvitationSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "TENTATIVE"]),
});

export type RespondInvitationInput = z.infer<typeof respondInvitationSchema>;

export const createHolidaySchema = z.object({
  name: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  description: z.string().trim().max(500).optional().nullable(),
  isCompanyWide: z.boolean().optional().default(true),
});

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const holidayIdParamsSchema = z.object({ id: uuidSchema });
export type HolidayIdParamsInput = z.infer<typeof holidayIdParamsSchema>;

export const listHolidaysQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type ListHolidaysQueryInput = z.infer<typeof listHolidaysQuerySchema>;

export const eventAttendeeDtoSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  userId: uuidSchema,
  status: eventAttendeeStatusSchema,
  isOptional: z.boolean(),
  respondedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  user: z
    .object({
      id: uuidSchema,
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
});

export type EventAttendeeDto = z.infer<typeof eventAttendeeDtoSchema>;

export const eventReminderDtoSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  channel: reminderChannelSchema,
  minutesBefore: z.number().int(),
  sentAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type EventReminderDto = z.infer<typeof eventReminderDtoSchema>;

export const calendarEventDtoSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  location: z.string().nullable(),
  type: calendarEventTypeSchema,
  status: calendarEventStatusSchema,
  category: calendarEventCategorySchema,
  color: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean(),
  isPrivate: z.boolean(),
  recurrenceFrequency: recurrenceFrequencySchema,
  recurrenceInterval: z.number().int(),
  recurrenceUntil: z.string().datetime().nullable(),
  recurrenceCount: z.number().int().nullable(),
  attachmentUrls: z.array(z.string()),
  projectId: uuidSchema.nullable(),
  taskId: uuidSchema.nullable(),
  clientId: uuidSchema.nullable(),
  createdById: uuidSchema.nullable(),
  updatedById: uuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  occurrenceId: z.string().optional(),
  isOccurrence: z.boolean().optional(),
  attendees: z.array(eventAttendeeDtoSchema).optional(),
  reminders: z.array(eventReminderDtoSchema).optional(),
  createdBy: z
    .object({
      id: uuidSchema,
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
    })
    .nullable()
    .optional(),
});

export type CalendarEventDto = z.infer<typeof calendarEventDtoSchema>;

export const holidayDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  date: z.string(),
  description: z.string().nullable(),
  isCompanyWide: z.boolean(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type HolidayDto = z.infer<typeof holidayDtoSchema>;
