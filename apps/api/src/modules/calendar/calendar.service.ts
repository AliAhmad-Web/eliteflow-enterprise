import type { Prisma } from "@enterprise/database";
import type {
  CalendarEventDto,
  CalendarEventListResponse,
  CreateCalendarEventInput,
  CreateHolidayInput,
  HolidayListResponse,
  ListCalendarEventsQueryInput,
  ListHolidaysQueryInput,
  MoveCalendarEventInput,
  ResizeCalendarEventInput,
  RespondInvitationInput,
  UpcomingEventsResponse,
  UpdateCalendarEventInput,
  RecurrenceFrequencyValue,
} from "@enterprise/shared";
import { UserRole } from "@enterprise/shared";
import {
  NotificationCategory,
  NotificationPriority,
} from "@enterprise/database";

import { CALENDAR_AUDIT_ACTIONS, logCalendarAuditEvent } from "./calendar.audit.js";
import { CALENDAR_ERROR_CODES, CalendarError } from "./calendar.errors.js";
import { calendarRepository } from "./calendar.repository.js";
import { toCalendarEventDto, toHolidayDto } from "./calendar.types.js";
import { attachmentSecurityService } from "../files/attachment-security.service.js";
import { notificationDispatcher } from "../notifications/index.js";

type StoredEvent = NonNullable<
  Awaited<ReturnType<typeof calendarRepository.getEvent>>
>;

export interface CalendarActor {
  userId: string;
  role: string;
  email: string;
  companyId?: string | null;
  permissions: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

function isAdmin(actor: CalendarActor): boolean {
  return actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN;
}

function isClient(actor: CalendarActor): boolean {
  return actor.role === UserRole.CLIENT;
}

function hasPermission(actor: CalendarActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

function resolveRange(
  query: ListCalendarEventsQueryInput,
): { from: Date; to: Date } {
  if (query.from && query.to) {
    return { from: new Date(query.from), to: new Date(query.to) };
  }

  const now = new Date();
  if (query.view === "day") {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (query.view === "week") {
    const day = now.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return { from: startOfDay(monday), to: endOfDay(sunday) };
  }
  if (query.view === "agenda") {
    const to = new Date(now);
    to.setUTCDate(now.getUTCDate() + 30);
    return { from: startOfDay(now), to: endOfDay(to) };
  }

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const from = new Date(monthStart);
  from.setUTCDate(from.getUTCDate() - 7);
  const to = new Date(monthEnd);
  to.setUTCDate(to.getUTCDate() + 7);
  return { from: startOfDay(from), to: endOfDay(to) };
}

function addInterval(
  date: Date,
  frequency: RecurrenceFrequencyValue,
  interval: number,
): Date {
  const next = new Date(date);
  switch (frequency) {
    case "DAILY":
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7 * interval);
      break;
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + interval);
      break;
    case "YEARLY":
      next.setUTCFullYear(next.getUTCFullYear() + interval);
      break;
    case "NONE":
      break;
    default: {
      const _exhaustive: never = frequency;
      void _exhaustive;
      break;
    }
  }
  return next;
}

function expandOccurrences(
  event: StoredEvent,
  rangeFrom: Date,
  rangeTo: Date,
): CalendarEventDto[] {
  const duration = event.endsAt.getTime() - event.startsAt.getTime();
  const base = toCalendarEventDto(event);

  if (event.recurrenceFrequency === "NONE") {
    if (event.endsAt < rangeFrom || event.startsAt > rangeTo) return [];
    return [base];
  }

  const results: CalendarEventDto[] = [];
  let cursor = new Date(event.startsAt);
  let count = 0;
  const maxCount = event.recurrenceCount ?? 365;
  const until = event.recurrenceUntil ?? rangeTo;

  while (count < maxCount && cursor <= until && results.length < 200) {
    const occEnd = new Date(cursor.getTime() + duration);
    if (occEnd >= rangeFrom && cursor <= rangeTo) {
      results.push(
        toCalendarEventDto(event, {
          startsAt: cursor.toISOString(),
          endsAt: occEnd.toISOString(),
          occurrenceId: `${event.id}:${cursor.toISOString()}`,
          isOccurrence: count > 0,
        }),
      );
    }
    cursor = addInterval(cursor, event.recurrenceFrequency, event.recurrenceInterval);
    count += 1;
    if (cursor > rangeTo && cursor > until) break;
  }

  return results;
}

function mergeAttendees(input: CreateCalendarEventInput | UpdateCalendarEventInput) {
  const fromList =
    input.attendees?.map((a) => ({
      userId: a.userId,
      isOptional: a.isOptional ?? false,
    })) ?? [];
  const fromIds =
    input.attendeeUserIds?.map((userId) => ({
      userId,
      isOptional: false,
    })) ?? [];
  const map = new Map<string, { userId: string; isOptional: boolean }>();
  for (const item of [...fromList, ...fromIds]) {
    map.set(item.userId, item);
  }
  return [...map.values()];
}

export class CalendarService {
  private eventScope(actor: CalendarActor): Prisma.CalendarEventWhereInput {
    if (isAdmin(actor)) return {};

    if (isClient(actor)) {
      // Fresh self-signup clients often have no linked Client CRM row yet
      // (`user.companyId` is null). Never use a non-UUID sentinel like "__none__"
      // — Prisma @db.Uuid rejects it and the dashboard Calendar crashes with 500.
      const invited: Prisma.CalendarEventWhereInput = {
        attendees: { some: { userId: actor.userId } },
      };
      const linkedToCompany: Prisma.CalendarEventWhereInput | null =
        actor.companyId
          ? { clientId: actor.companyId }
          : null;

      return {
        AND: [
          { isPrivate: false },
          linkedToCompany
            ? { OR: [linkedToCompany, invited] }
            : invited,
        ],
      };
    }

    // Employee: own events, invited meetings, non-private team schedule
    return {
      OR: [
        { createdById: actor.userId },
        { attendees: { some: { userId: actor.userId } } },
        { isPrivate: false, type: { in: ["MEETING", "EVENT", "PROJECT_DEADLINE", "HOLIDAY"] } },
      ],
    };
  }

  private assertCanWrite(actor: CalendarActor): void {
    if (!hasPermission(actor, "calendar:write")) {
      throw new CalendarError(
        "Permission denied",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private async assertCanManageEvent(
    actor: CalendarActor,
    eventId: string,
  ) {
    const event = await calendarRepository.getEvent(eventId);
    if (!event) {
      throw new CalendarError(
        "Event not found",
        404,
        CALENDAR_ERROR_CODES.NOT_FOUND,
      );
    }

    if (isAdmin(actor)) return event;

    if (isClient(actor)) {
      throw new CalendarError(
        "Permission denied",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    const isOwner = event.createdById === actor.userId;
    const isAttendee = event.attendees?.some((a) => a.userId === actor.userId);
    if (!isOwner && !isAttendee) {
      throw new CalendarError(
        "Permission denied",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    // Employees may only edit own events (or invited meetings they own)
    if (!isOwner) {
      throw new CalendarError(
        "Permission denied",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    return event;
  }

  private async assertCanReadEvent(actor: CalendarActor, eventId: string) {
    const event = await calendarRepository.getEvent(eventId);
    if (!event) {
      throw new CalendarError(
        "Event not found",
        404,
        CALENDAR_ERROR_CODES.NOT_FOUND,
      );
    }

    if (isAdmin(actor)) return event;

    if (isClient(actor)) {
      const invited = event.attendees?.some((a) => a.userId === actor.userId);
      const shared = Boolean(
        actor.companyId && event.clientId === actor.companyId && !event.isPrivate,
      );
      if (!invited && !shared) {
        throw new CalendarError(
          "Permission denied",
          403,
          CALENDAR_ERROR_CODES.FORBIDDEN,
        );
      }
      return event;
    }

    const scope = this.eventScope(actor);
    const allowed = await calendarRepository.countEvents({
      AND: [scope, { id: eventId, deletedAt: null }],
    });
    if (!allowed) {
      throw new CalendarError(
        "Permission denied",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }
    return event;
  }

  async listEvents(
    query: ListCalendarEventsQueryInput,
    actor: CalendarActor,
  ): Promise<CalendarEventListResponse> {
    if (!hasPermission(actor, "calendar:read")) {
      throw new CalendarError(
        "Permission denied",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    const { from, to } = resolveRange(query);
    const scope = this.eventScope(actor);

    const where: Prisma.CalendarEventWhereInput = {
      AND: [
        scope,
        { deletedAt: null },
        {
          OR: [
            {
              startsAt: { lte: to },
              endsAt: { gte: from },
              recurrenceFrequency: "NONE",
            },
            {
              recurrenceFrequency: { not: "NONE" },
              startsAt: { lte: to },
              OR: [
                { recurrenceUntil: null },
                { recurrenceUntil: { gte: from } },
              ],
            },
          ],
        },
        query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: "insensitive" } },
                { description: { contains: query.search, mode: "insensitive" } },
                { location: { contains: query.search, mode: "insensitive" } },
                { notes: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {},
        query.type ? { type: query.type } : {},
        query.status ? { status: query.status } : {},
        query.category ? { category: query.category } : {},
        query.projectId ? { projectId: query.projectId } : {},
        query.clientId ? { clientId: query.clientId } : {},
        query.team === "true"
          ? { category: { in: ["TEAM", "WORK", "PROJECT"] }, isPrivate: false }
          : {},
      ],
    };

    const events = await calendarRepository.listEvents({
      where,
      take: Math.min(query.limit * 3, 500),
    });

    const expanded = events
      .flatMap((event) => expandOccurrences(event, from, to))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );

    const start = (query.page - 1) * query.limit;
    const items = expanded.slice(start, start + query.limit);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: expanded.length,
        totalPages: Math.max(1, Math.ceil(expanded.length / query.limit)),
        timestamp: new Date().toISOString(),
      },
      view: query.view,
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  async getEvent(id: string, actor: CalendarActor): Promise<CalendarEventDto> {
    const event = await this.assertCanReadEvent(actor, id);
    return toCalendarEventDto(event);
  }

  async createEvent(
    input: CreateCalendarEventInput,
    actor: CalendarActor,
  ): Promise<CalendarEventDto> {
    this.assertCanWrite(actor);
    if (isClient(actor)) {
      throw new CalendarError(
        "Permission denied",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    const attendees = mergeAttendees(input);
    // Ensure creator is always an attendee for meetings
    if (
      (input.type === "MEETING" || attendees.length > 0) &&
      !attendees.some((a) => a.userId === actor.userId)
    ) {
      attendees.unshift({ userId: actor.userId, isOptional: false });
    }

    const attachmentUrls = await attachmentSecurityService.secureAttachmentUrls(
      input.attachmentUrls,
      actor,
    );

    const event = await calendarRepository.createEvent({
      title: input.title,
      description: input.description,
      notes: input.notes,
      location: input.location,
      type: input.type,
      status: input.status,
      category: input.category,
      color: input.color,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      allDay: input.allDay,
      isPrivate: input.isPrivate,
      recurrenceFrequency: input.recurrenceFrequency,
      recurrenceInterval: input.recurrenceInterval,
      recurrenceUntil: input.recurrenceUntil
        ? new Date(input.recurrenceUntil)
        : null,
      recurrenceCount: input.recurrenceCount ?? null,
      attachmentUrls,
      projectId: input.projectId,
      taskId: input.taskId,
      clientId: input.clientId,
      createdById: actor.userId,
      attendees,
      reminders: input.reminders?.map((r) => ({
        channel: r.channel,
        minutesBefore: r.minutesBefore,
      })),
    });

    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.EVENT_CREATE,
      resourceId: event.id,
      metadata: { title: event.title, type: event.type },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    this.notifyAttendeesInvited({
      eventId: event.id,
      title: event.title,
      startsAt: event.startsAt,
      actorUserId: actor.userId,
      attendeeUserIds: attendees.map((a) => a.userId),
    });

    return toCalendarEventDto(event);
  }

  async updateEvent(
    id: string,
    input: UpdateCalendarEventInput,
    actor: CalendarActor,
  ): Promise<CalendarEventDto> {
    this.assertCanWrite(actor);
    await this.assertCanManageEvent(actor, id);

    const replaceAttendees =
      input.attendees !== undefined || input.attendeeUserIds !== undefined
        ? mergeAttendees(input)
        : undefined;

    const event = await calendarRepository.updateEvent(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.startsAt !== undefined
        ? { startsAt: new Date(input.startsAt) }
        : {}),
      ...(input.endsAt !== undefined ? { endsAt: new Date(input.endsAt) } : {}),
      ...(input.allDay !== undefined ? { allDay: input.allDay } : {}),
      ...(input.isPrivate !== undefined ? { isPrivate: input.isPrivate } : {}),
      ...(input.recurrenceFrequency !== undefined
        ? { recurrenceFrequency: input.recurrenceFrequency }
        : {}),
      ...(input.recurrenceInterval !== undefined
        ? { recurrenceInterval: input.recurrenceInterval }
        : {}),
      ...(input.recurrenceUntil !== undefined
        ? {
            recurrenceUntil: input.recurrenceUntil
              ? new Date(input.recurrenceUntil)
              : null,
          }
        : {}),
      ...(input.recurrenceCount !== undefined
        ? { recurrenceCount: input.recurrenceCount }
        : {}),
      ...(input.attachmentUrls !== undefined
        ? {
            attachmentUrls:
              await attachmentSecurityService.secureAttachmentUrls(
                input.attachmentUrls,
                actor,
              ),
          }
        : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      replaceAttendees,
      replaceReminders: input.reminders?.map((r) => ({
        channel: r.channel,
        minutesBefore: r.minutesBefore,
      })),
      actorId: actor.userId,
    });

    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.EVENT_UPDATE,
      resourceId: id,
      metadata: { fields: Object.keys(input) },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    if (replaceAttendees?.length) {
      this.notifyAttendeesInvited({
        eventId: event.id,
        title: event.title,
        startsAt: event.startsAt,
        actorUserId: actor.userId,
        attendeeUserIds: replaceAttendees.map((a) => a.userId),
      });
    }

    return toCalendarEventDto(event);
  }

  async deleteEvent(id: string, actor: CalendarActor): Promise<{ id: string }> {
    this.assertCanWrite(actor);
    await this.assertCanManageEvent(actor, id);
    await calendarRepository.softDeleteEvent(id, actor.userId);

    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.EVENT_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async duplicateEvent(
    id: string,
    actor: CalendarActor,
  ): Promise<CalendarEventDto> {
    this.assertCanWrite(actor);
    const source = await this.assertCanManageEvent(actor, id);

    const event = await calendarRepository.createEvent({
      title: `${source.title} (Copy)`,
      description: source.description,
      notes: source.notes,
      location: source.location,
      type: source.type,
      status: "SCHEDULED",
      category: source.category,
      color: source.color,
      startsAt: source.startsAt,
      endsAt: source.endsAt,
      allDay: source.allDay,
      isPrivate: source.isPrivate,
      recurrenceFrequency: source.recurrenceFrequency,
      recurrenceInterval: source.recurrenceInterval,
      recurrenceUntil: source.recurrenceUntil,
      recurrenceCount: source.recurrenceCount,
      attachmentUrls: source.attachmentUrls,
      projectId: source.projectId,
      taskId: source.taskId,
      clientId: source.clientId,
      createdById: actor.userId,
      attendees: source.attendees?.map((a) => ({
        userId: a.userId,
        isOptional: a.isOptional,
      })),
      reminders: source.reminders?.map((r) => ({
        channel: r.channel,
        minutesBefore: r.minutesBefore,
      })),
    });

    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.EVENT_DUPLICATE,
      resourceId: event.id,
      metadata: { sourceId: id },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toCalendarEventDto(event);
  }

  async moveEvent(
    id: string,
    input: MoveCalendarEventInput,
    actor: CalendarActor,
  ): Promise<CalendarEventDto> {
    this.assertCanWrite(actor);
    await this.assertCanManageEvent(actor, id);

    const event = await calendarRepository.updateEvent(id, {
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      actorId: actor.userId,
    });

    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.EVENT_MOVE,
      resourceId: id,
      metadata: { startsAt: input.startsAt, endsAt: input.endsAt },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toCalendarEventDto(event);
  }

  async resizeEvent(
    id: string,
    input: ResizeCalendarEventInput,
    actor: CalendarActor,
  ): Promise<CalendarEventDto> {
    this.assertCanWrite(actor);
    await this.assertCanManageEvent(actor, id);

    const event = await calendarRepository.updateEvent(id, {
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      actorId: actor.userId,
    });

    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.EVENT_RESIZE,
      resourceId: id,
      metadata: { startsAt: input.startsAt, endsAt: input.endsAt },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toCalendarEventDto(event);
  }

  async respondInvitation(
    id: string,
    input: RespondInvitationInput,
    actor: CalendarActor,
  ) {
    const event = await this.assertCanReadEvent(actor, id);
    const attendee = event.attendees?.find((a) => a.userId === actor.userId);
    if (!attendee) {
      throw new CalendarError(
        "You are not invited to this event",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    const updated = await calendarRepository.respondInvitation(
      id,
      actor.userId,
      input.status,
    );

    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.INVITE_RESPOND,
      resourceId: id,
      metadata: { status: input.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async upcoming(actor: CalendarActor): Promise<UpcomingEventsResponse> {
    const now = new Date();
    const todayEnd = endOfDay(now);
    const upcomingEnd = new Date(now);
    upcomingEnd.setUTCDate(now.getUTCDate() + 14);

    const result = await this.listEvents(
      {
        view: "agenda",
        from: startOfDay(now).toISOString(),
        to: endOfDay(upcomingEnd).toISOString(),
        search: "",
        page: 1,
        limit: 50,
      },
      actor,
    );

    const today = result.items.filter(
      (e) => new Date(e.startsAt) <= todayEnd && new Date(e.endsAt) >= startOfDay(now),
    );
    const upcoming = result.items.filter(
      (e) => new Date(e.startsAt) > todayEnd,
    );

    return { today, upcoming };
  }

  async listHolidays(
    query: ListHolidaysQueryInput,
    actor: CalendarActor,
  ): Promise<HolidayListResponse> {
    if (!hasPermission(actor, "calendar:read")) {
      throw new CalendarError(
        "Permission denied",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
    const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : undefined;
    const items = await calendarRepository.listHolidays(from, to);
    return { items: items.map(toHolidayDto) };
  }

  async createHoliday(input: CreateHolidayInput, actor: CalendarActor) {
    this.assertCanWrite(actor);
    if (!isAdmin(actor)) {
      throw new CalendarError(
        "Only admins can manage company holidays",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    const holiday = await calendarRepository.createHoliday({
      name: input.name,
      date: new Date(`${input.date}T00:00:00.000Z`),
      description: input.description,
      isCompanyWide: input.isCompanyWide,
      createdById: actor.userId,
    });

    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.HOLIDAY_CREATE,
      resourceId: holiday.id,
      metadata: { name: holiday.name, date: input.date },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toHolidayDto(holiday);
  }

  async deleteHoliday(id: string, actor: CalendarActor) {
    this.assertCanWrite(actor);
    if (!isAdmin(actor)) {
      throw new CalendarError(
        "Only admins can manage company holidays",
        403,
        CALENDAR_ERROR_CODES.FORBIDDEN,
      );
    }

    const holiday = await calendarRepository.getHoliday(id);
    if (!holiday) {
      throw new CalendarError(
        "Holiday not found",
        404,
        CALENDAR_ERROR_CODES.NOT_FOUND,
      );
    }

    await calendarRepository.softDeleteHoliday(id);
    await logCalendarAuditEvent({
      userId: actor.userId,
      action: CALENDAR_AUDIT_ACTIONS.HOLIDAY_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  /** Best-effort invite notifications — never blocks calendar mutations. */
  private notifyAttendeesInvited(input: {
    eventId: string;
    title: string;
    startsAt: Date;
    actorUserId: string;
    attendeeUserIds: string[];
  }): void {
    const unique = [...new Set(input.attendeeUserIds)].filter(
      (id) => id !== input.actorUserId,
    );
    if (unique.length === 0) return;

    const when = input.startsAt.toISOString();
    for (const userId of unique) {
      void notificationDispatcher.notify({
        title: "Calendar invitation",
        body: `You were invited to "${input.title}" (${when}).`,
        category: NotificationCategory.CALENDAR,
        priority: NotificationPriority.NORMAL,
        linkUrl: `/calendar?event=${input.eventId}`,
        entityType: "CalendarEvent",
        entityId: input.eventId,
        audience: { type: "INDIVIDUAL", userId },
        createdById: input.actorUserId,
      });
    }
  }
}

export const calendarService = new CalendarService();
