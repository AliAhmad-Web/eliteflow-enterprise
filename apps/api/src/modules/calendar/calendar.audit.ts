import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

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
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "calendar",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "calendar",
  );
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
