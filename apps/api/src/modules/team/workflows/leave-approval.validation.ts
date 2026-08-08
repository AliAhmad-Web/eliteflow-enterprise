/**
 * Leave balance + conflict validation helpers for the approval workflow.
 */

import { prisma, type LeaveType } from "@enterprise/database";

import { getLeaveApprovalConfig } from "./leave-approval.config.js";
import {
  PRISMA_TO_ENTERPRISE_LEAVE,
  type EnterpriseLeaveType,
  type LeaveBalanceValidationResult,
  type LeaveConflict,
  type LeaveConflictDetectionResult,
} from "./leave-approval.types.js";

function utcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function eachUtcDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = utcDay(start);
  const last = utcDay(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return days;
}

export function resolveEnterpriseLeaveType(
  type: LeaveType,
  reason?: string | null,
): EnterpriseLeaveType {
  const base = PRISMA_TO_ENTERPRISE_LEAVE[type];
  if (type !== "OTHER" && type !== "PERSONAL") return base;

  const text = (reason ?? "").toLowerCase();
  if (/\b(wfh|work\s*from\s*home|remote\s*work)\b/.test(text)) {
    return "WORK_FROM_HOME";
  }
  if (/\b(emergency|urgent)\b/.test(text)) return "EMERGENCY";
  if (/\b(comp(ensatory)?|toff|time\s*off\s*in\s*lieu|toil)\b/.test(text)) {
    return "COMPENSATORY";
  }
  if (type === "PERSONAL" || /\b(casual)\b/.test(text)) return "CASUAL";
  return "CUSTOM";
}

export function countBillableLeaveDays(
  start: Date,
  end: Date,
  holidayDates: Set<string>,
  countWeekends: boolean,
): { billableDays: number; holidayOverlapDays: number; weekendDays: number } {
  let billableDays = 0;
  let holidayOverlapDays = 0;
  let weekendDays = 0;

  for (const day of eachUtcDay(start, end)) {
    const key = day.toISOString().slice(0, 10);
    const weekend = isWeekend(day);
    if (weekend) weekendDays += 1;
    if (holidayDates.has(key)) {
      holidayOverlapDays += 1;
      continue;
    }
    if (!countWeekends && weekend) continue;
    billableDays += 1;
  }

  return { billableDays, holidayOverlapDays, weekendDays };
}

function remainingBalanceFor(
  enterpriseType: EnterpriseLeaveType,
  balances: {
    annualLeaveBalance: number;
    casualLeaveBalance: number;
    sickLeaveBalance: number;
    medicalLeaveBalance: number;
  },
): number | null {
  switch (enterpriseType) {
    case "ANNUAL":
      return balances.annualLeaveBalance;
    case "SICK":
      return balances.sickLeaveBalance;
    case "CASUAL":
    case "EMERGENCY":
      return balances.casualLeaveBalance;
    case "COMPENSATORY":
      return balances.medicalLeaveBalance;
    case "UNPAID":
    case "MATERNITY":
    case "PATERNITY":
    case "WORK_FROM_HOME":
    case "CUSTOM":
      return null;
    default: {
      const _exhaustive: never = enterpriseType;
      return _exhaustive;
    }
  }
}

export function validateLeaveBalance(input: {
  type: LeaveType;
  reason?: string | null;
  start: Date;
  end: Date;
  holidayDates: Set<string>;
  balances: {
    annualLeaveBalance: number;
    casualLeaveBalance: number;
    sickLeaveBalance: number;
    medicalLeaveBalance: number;
  };
}): LeaveBalanceValidationResult {
  const config = getLeaveApprovalConfig();
  const enterpriseType = resolveEnterpriseLeaveType(input.type, input.reason);
  const { billableDays, holidayOverlapDays } = countBillableLeaveDays(
    input.start,
    input.end,
    input.holidayDates,
    config.countWeekends,
  );
  const calendarDays =
    Math.floor(
      (utcDay(input.end).getTime() - utcDay(input.start).getTime()) /
        86_400_000,
    ) + 1;

  const errors: string[] = [];
  if (billableDays < 1) {
    errors.push(
      config.blockHolidayOnlyRanges && holidayOverlapDays > 0
        ? "Leave range falls entirely on holidays/weekends"
        : "Leave must include at least one billable day",
    );
  }

  const maxDays =
    config.maxConsecutiveDays[enterpriseType] ??
    config.maxConsecutiveDays.CUSTOM ??
    14;
  if (calendarDays > maxDays) {
    errors.push(
      `Leave exceeds policy maximum of ${maxDays} consecutive calendar day(s) for ${enterpriseType}`,
    );
  }

  const remaining = remainingBalanceFor(enterpriseType, input.balances);
  if (remaining !== null && billableDays > remaining) {
    errors.push(
      `Insufficient leave balance (${remaining} remaining, ${billableDays} requested)`,
    );
  }

  return {
    ok: errors.length === 0,
    enterpriseType,
    requestedDays: calendarDays,
    billableDays: Math.max(billableDays, 0),
    remainingBalance: remaining,
    errors,
  };
}

export async function loadHolidayDateKeys(
  start: Date,
  end: Date,
): Promise<Set<string>> {
  const holidays = await prisma.holiday.findMany({
    where: {
      deletedAt: null,
      date: { gte: utcDay(start), lte: utcDay(end) },
    },
    select: { date: true },
  });
  return new Set(
    holidays.map((h) => utcDay(h.date).toISOString().slice(0, 10)),
  );
}

export async function detectLeaveConflicts(input: {
  employeeId: string;
  subjectUserId: string;
  start: Date;
  end: Date;
  excludeLeaveId?: string;
  employeeShift?: string | null;
  enterpriseType: EnterpriseLeaveType;
  holidayDates: Set<string>;
}): Promise<LeaveConflictDetectionResult> {
  const conflicts: LeaveConflict[] = [];
  const start = utcDay(input.start);
  const end = utcDay(input.end);

  const overlappingLeaves = await prisma.leaveRequest.findMany({
    where: {
      deletedAt: null,
      employeeId: input.employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      ...(input.excludeLeaveId ? { id: { not: input.excludeLeaveId } } : {}),
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { id: true, type: true, status: true, startDate: true, endDate: true },
  });

  for (const leave of overlappingLeaves) {
    const sameRange =
      utcDay(leave.startDate).getTime() === start.getTime() &&
      utcDay(leave.endDate).getTime() === end.getTime();
    conflicts.push({
      kind: sameRange ? "DUPLICATE_LEAVE" : "EXISTING_LEAVE_OVERLAP",
      message: sameRange
        ? "Duplicate leave request for the same date range"
        : "Overlaps an existing leave request",
      details: {
        leaveId: leave.id,
        type: leave.type,
        status: leave.status,
      },
    });
  }

  const attendance = await prisma.attendance.findMany({
    where: {
      deletedAt: null,
      employeeId: input.employeeId,
      date: { gte: start, lte: end },
      OR: [
        { checkInAt: { not: null } },
        { status: { in: ["PRESENT", "LATE", "HALF_DAY"] } },
      ],
    },
    select: { id: true, date: true, status: true, checkInAt: true },
  });

  for (const row of attendance) {
    conflicts.push({
      kind: "ATTENDANCE_CONFLICT",
      message: "Attendance already recorded on a requested leave day",
      details: {
        attendanceId: row.id,
        date: utcDay(row.date).toISOString().slice(0, 10),
        status: row.status,
      },
    });
  }

  if (
    input.enterpriseType === "WORK_FROM_HOME" &&
    input.employeeShift &&
    input.employeeShift !== "REMOTE" &&
    input.employeeShift !== "FLEXIBLE"
  ) {
    conflicts.push({
      kind: "SHIFT_CONFLICT",
      message: `Work-from-home leave conflicts with assigned ${input.employeeShift} shift`,
      details: { shift: input.employeeShift },
    });
  }

  const calendarHits = await prisma.eventAttendee.findMany({
    where: {
      userId: input.subjectUserId,
      status: { in: ["ACCEPTED", "PENDING"] },
      event: {
        deletedAt: null,
        status: { not: "CANCELLED" },
        startsAt: { lte: new Date(end.getTime() + 86_400_000 - 1) },
        endsAt: { gte: start },
      },
    },
    select: {
      eventId: true,
      event: { select: { id: true, title: true, startsAt: true, endsAt: true } },
    },
    take: 20,
  });

  for (const hit of calendarHits) {
    conflicts.push({
      kind: "CALENDAR_CONFLICT",
      message: "Calendar event overlaps requested leave dates",
      details: {
        eventId: hit.event.id,
        title: hit.event.title,
      },
    });
  }

  if (input.holidayDates.size > 0) {
    const billable = countBillableLeaveDays(
      start,
      end,
      input.holidayDates,
      getLeaveApprovalConfig().countWeekends,
    );
    if (billable.holidayOverlapDays > 0 && billable.billableDays === 0) {
      conflicts.push({
        kind: "HOLIDAY_OVERLAP",
        message: "Leave range overlaps only company holidays",
        details: { holidayDays: billable.holidayOverlapDays },
      });
    }
  }

  return { ok: conflicts.length === 0, conflicts };
}

export function balanceFieldsForDeduction(
  enterpriseType: EnterpriseLeaveType,
  days: number,
  balances: {
    annualLeaveBalance: number;
    casualLeaveBalance: number;
    sickLeaveBalance: number;
    medicalLeaveBalance: number;
  },
): Partial<{
  annualLeaveBalance: number;
  casualLeaveBalance: number;
  sickLeaveBalance: number;
  medicalLeaveBalance: number;
}> {
  const deduct = (current: number) => Math.max(0, current - days);
  switch (enterpriseType) {
    case "ANNUAL":
      return { annualLeaveBalance: deduct(balances.annualLeaveBalance) };
    case "SICK":
      return { sickLeaveBalance: deduct(balances.sickLeaveBalance) };
    case "CASUAL":
    case "EMERGENCY":
      return { casualLeaveBalance: deduct(balances.casualLeaveBalance) };
    case "COMPENSATORY":
      return { medicalLeaveBalance: deduct(balances.medicalLeaveBalance) };
    case "UNPAID":
    case "MATERNITY":
    case "PATERNITY":
    case "WORK_FROM_HOME":
    case "CUSTOM":
      return {};
    default: {
      const _exhaustive: never = enterpriseType;
      return _exhaustive;
    }
  }
}
