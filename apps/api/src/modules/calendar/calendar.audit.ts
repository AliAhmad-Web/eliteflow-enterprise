import { prisma, Prisma } from "@enterprise/database";

interface CalendarAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logCalendarAuditEvent(
  input: CalendarAuditInput,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resource: "calendar",
        resourceId: input.resourceId ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[calendar] Failed to write audit log:", error);
  }
}

export const CALENDAR_AUDIT_ACTIONS = {
  EVENT_CREATE: "calendar.event.create",
  EVENT_UPDATE: "calendar.event.update",
  EVENT_DELETE: "calendar.event.delete",
  EVENT_DUPLICATE: "calendar.event.duplicate",
  EVENT_MOVE: "calendar.event.move",
  EVENT_RESIZE: "calendar.event.resize",
  INVITE_RESPOND: "calendar.invite.respond",
  HOLIDAY_CREATE: "calendar.holiday.create",
  HOLIDAY_DELETE: "calendar.holiday.delete",
} as const;
