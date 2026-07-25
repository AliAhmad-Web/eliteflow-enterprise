import type {
  CalendarEvent,
  EventAttendee,
  EventReminder,
  Holiday,
  User,
} from "@enterprise/database";
import type {
  CalendarEventDto,
  EventAttendeeDto,
  EventReminderDto,
  HolidayDto,
} from "@enterprise/shared";

type AttendeeWithUser = EventAttendee & {
  user?: Pick<User, "id" | "firstName" | "lastName" | "email" | "avatarUrl">;
};

type EventWithRelations = CalendarEvent & {
  attendees?: AttendeeWithUser[];
  reminders?: EventReminder[];
  createdBy?: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
};

export function toAttendeeDto(attendee: AttendeeWithUser): EventAttendeeDto {
  return {
    id: attendee.id,
    eventId: attendee.eventId,
    userId: attendee.userId,
    status: attendee.status,
    isOptional: attendee.isOptional,
    respondedAt: attendee.respondedAt?.toISOString() ?? null,
    createdAt: attendee.createdAt.toISOString(),
    user: attendee.user
      ? {
          id: attendee.user.id,
          firstName: attendee.user.firstName,
          lastName: attendee.user.lastName,
          email: attendee.user.email,
          avatarUrl: attendee.user.avatarUrl,
        }
      : undefined,
  };
}

export function toReminderDto(reminder: EventReminder): EventReminderDto {
  return {
    id: reminder.id,
    eventId: reminder.eventId,
    channel: reminder.channel,
    minutesBefore: reminder.minutesBefore,
    sentAt: reminder.sentAt?.toISOString() ?? null,
    createdAt: reminder.createdAt.toISOString(),
  };
}

export function toCalendarEventDto(
  event: EventWithRelations,
  overrides?: Partial<Pick<CalendarEventDto, "startsAt" | "endsAt" | "occurrenceId" | "isOccurrence">>,
): CalendarEventDto {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    notes: event.notes,
    location: event.location,
    type: event.type,
    status: event.status,
    category: event.category,
    color: event.color,
    startsAt: overrides?.startsAt ?? event.startsAt.toISOString(),
    endsAt: overrides?.endsAt ?? event.endsAt.toISOString(),
    allDay: event.allDay,
    isPrivate: event.isPrivate,
    recurrenceFrequency: event.recurrenceFrequency,
    recurrenceInterval: event.recurrenceInterval,
    recurrenceUntil: event.recurrenceUntil?.toISOString() ?? null,
    recurrenceCount: event.recurrenceCount,
    attachmentUrls: event.attachmentUrls,
    projectId: event.projectId,
    taskId: event.taskId,
    clientId: event.clientId,
    createdById: event.createdById,
    updatedById: event.updatedById,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    occurrenceId: overrides?.occurrenceId,
    isOccurrence: overrides?.isOccurrence,
    attendees: event.attendees?.map(toAttendeeDto),
    reminders: event.reminders?.map(toReminderDto),
    createdBy: event.createdBy
      ? {
          id: event.createdBy.id,
          firstName: event.createdBy.firstName,
          lastName: event.createdBy.lastName,
          email: event.createdBy.email,
        }
      : null,
  };
}

export function toHolidayDto(holiday: Holiday): HolidayDto {
  return {
    id: holiday.id,
    name: holiday.name,
    date: holiday.date.toISOString().slice(0, 10),
    description: holiday.description,
    isCompanyWide: holiday.isCompanyWide,
    createdById: holiday.createdById,
    createdAt: holiday.createdAt.toISOString(),
    updatedAt: holiday.updatedAt.toISOString(),
  };
}
