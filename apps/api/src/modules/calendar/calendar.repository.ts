import {
  prisma,
  type Prisma,
  type CalendarEventCategory,
  type CalendarEventStatus,
  type CalendarEventType,
  type EventAttendeeStatus,
  type RecurrenceFrequency,
  type ReminderChannel,
} from "@enterprise/database";

const eventInclude = {
  attendees: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
  reminders: true,
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export class CalendarRepository {
  listEvents(args: {
    where: Prisma.CalendarEventWhereInput;
    skip?: number;
    take?: number;
  }) {
    return prisma.calendarEvent.findMany({
      where: args.where,
      include: eventInclude,
      orderBy: { startsAt: "asc" },
      skip: args.skip,
      take: args.take,
    });
  }

  countEvents(where: Prisma.CalendarEventWhereInput) {
    return prisma.calendarEvent.count({ where });
  }

  getEvent(id: string, includeDeleted = false) {
    return prisma.calendarEvent.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: eventInclude,
    });
  }

  createEvent(data: {
    title: string;
    description?: string | null;
    notes?: string | null;
    location?: string | null;
    type: CalendarEventType;
    status: CalendarEventStatus;
    category: CalendarEventCategory;
    color: string;
    startsAt: Date;
    endsAt: Date;
    allDay: boolean;
    isPrivate: boolean;
    recurrenceFrequency: RecurrenceFrequency;
    recurrenceInterval: number;
    recurrenceUntil?: Date | null;
    recurrenceCount?: number | null;
    attachmentUrls: string[];
    projectId?: string | null;
    taskId?: string | null;
    clientId?: string | null;
    createdById: string;
    attendees?: { userId: string; isOptional?: boolean }[];
    reminders?: { channel: ReminderChannel; minutesBefore: number }[];
  }) {
    return prisma.calendarEvent.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        notes: data.notes ?? null,
        location: data.location ?? null,
        type: data.type,
        status: data.status,
        category: data.category,
        color: data.color,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        allDay: data.allDay,
        isPrivate: data.isPrivate,
        recurrenceFrequency: data.recurrenceFrequency,
        recurrenceInterval: data.recurrenceInterval,
        recurrenceUntil: data.recurrenceUntil ?? null,
        recurrenceCount: data.recurrenceCount ?? null,
        attachmentUrls: data.attachmentUrls,
        projectId: data.projectId ?? null,
        taskId: data.taskId ?? null,
        clientId: data.clientId ?? null,
        createdById: data.createdById,
        updatedById: data.createdById,
        attendees: data.attendees?.length
          ? {
              create: data.attendees.map((a) => ({
                userId: a.userId,
                isOptional: a.isOptional ?? false,
              })),
            }
          : undefined,
        reminders: data.reminders?.length
          ? {
              create: data.reminders.map((r) => ({
                channel: r.channel,
                minutesBefore: r.minutesBefore,
                createdById: data.createdById,
              })),
            }
          : undefined,
      },
      include: eventInclude,
    });
  }

  async updateEvent(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      notes?: string | null;
      location?: string | null;
      type?: CalendarEventType;
      status?: CalendarEventStatus;
      category?: CalendarEventCategory;
      color?: string;
      startsAt?: Date;
      endsAt?: Date;
      allDay?: boolean;
      isPrivate?: boolean;
      recurrenceFrequency?: RecurrenceFrequency;
      recurrenceInterval?: number;
      recurrenceUntil?: Date | null;
      recurrenceCount?: number | null;
      attachmentUrls?: string[];
      projectId?: string | null;
      taskId?: string | null;
      clientId?: string | null;
      replaceAttendees?: { userId: string; isOptional?: boolean }[];
      replaceReminders?: { channel: ReminderChannel; minutesBefore: number }[];
      actorId: string;
    },
  ) {
    const { replaceAttendees, replaceReminders, actorId, ...fields } = data;

    return prisma.$transaction(async (tx) => {
      if (replaceAttendees) {
        await tx.eventAttendee.deleteMany({ where: { eventId: id } });
        if (replaceAttendees.length) {
          await tx.eventAttendee.createMany({
            data: replaceAttendees.map((a) => ({
              eventId: id,
              userId: a.userId,
              isOptional: a.isOptional ?? false,
            })),
          });
        }
      }

      if (replaceReminders) {
        await tx.eventReminder.deleteMany({ where: { eventId: id } });
        if (replaceReminders.length) {
          await tx.eventReminder.createMany({
            data: replaceReminders.map((r) => ({
              eventId: id,
              channel: r.channel,
              minutesBefore: r.minutesBefore,
              createdById: actorId,
            })),
          });
        }
      }

      return tx.calendarEvent.update({
        where: { id },
        data: {
          ...fields,
          updatedById: actorId,
        },
        include: eventInclude,
      });
    });
  }

  softDeleteEvent(id: string, updatedById: string) {
    return prisma.calendarEvent.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
      include: eventInclude,
    });
  }

  respondInvitation(
    eventId: string,
    userId: string,
    status: EventAttendeeStatus,
  ) {
    return prisma.eventAttendee.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status, respondedAt: new Date() },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  listHolidays(from?: Date, to?: Date) {
    return prisma.holiday.findMany({
      where: {
        deletedAt: null,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: "asc" },
    });
  }

  createHoliday(data: {
    name: string;
    date: Date;
    description?: string | null;
    isCompanyWide: boolean;
    createdById: string;
  }) {
    return prisma.holiday.create({
      data: {
        name: data.name,
        date: data.date,
        description: data.description ?? null,
        isCompanyWide: data.isCompanyWide,
        createdById: data.createdById,
      },
    });
  }

  softDeleteHoliday(id: string) {
    return prisma.holiday.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  getHoliday(id: string) {
    return prisma.holiday.findFirst({
      where: { id, deletedAt: null },
    });
  }
}

export const calendarRepository = new CalendarRepository();
