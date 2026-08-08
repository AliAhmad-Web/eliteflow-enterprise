/**
 * Leave approval workflow environment configuration.
 * LEAVE_MANAGER_APPROVAL_REQUIRED | LEAVE_HR_APPROVAL_REQUIRED | LEAVE_AUTO_EXPIRE_DAYS
 */

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim().length === 0) return defaultValue;
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}

function parsePositiveInt(
  value: string | undefined,
  defaultValue: number,
): number {
  if (value === undefined || value.trim().length === 0) return defaultValue;
  const n = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return defaultValue;
  return n;
}

export type LeaveApprovalConfig = {
  managerApprovalRequired: boolean;
  hrApprovalRequired: boolean;
  autoExpireDays: number;
  /** Count Saturdays/Sundays toward leave days (default false = exclude). */
  countWeekends: boolean;
  /** Block submission when all selected days are company holidays. */
  blockHolidayOnlyRanges: boolean;
  maxConsecutiveDays: Record<string, number>;
};

const DEFAULT_MAX_CONSECUTIVE: Record<string, number> = {
  ANNUAL: 30,
  SICK: 14,
  EMERGENCY: 5,
  CASUAL: 5,
  MATERNITY: 120,
  PATERNITY: 30,
  UNPAID: 60,
  COMPENSATORY: 10,
  WORK_FROM_HOME: 30,
  CUSTOM: 14,
};

export function getLeaveApprovalConfig(): LeaveApprovalConfig {
  return {
    managerApprovalRequired: parseBool(
      process.env.LEAVE_MANAGER_APPROVAL_REQUIRED,
      true,
    ),
    hrApprovalRequired: parseBool(
      process.env.LEAVE_HR_APPROVAL_REQUIRED,
      true,
    ),
    autoExpireDays: parsePositiveInt(process.env.LEAVE_AUTO_EXPIRE_DAYS, 30),
    countWeekends: parseBool(process.env.LEAVE_COUNT_WEEKENDS, false),
    blockHolidayOnlyRanges: parseBool(
      process.env.LEAVE_BLOCK_HOLIDAY_ONLY,
      true,
    ),
    maxConsecutiveDays: { ...DEFAULT_MAX_CONSECUTIVE },
  };
}

export function isLeaveManagerApprovalRequired(): boolean {
  return getLeaveApprovalConfig().managerApprovalRequired;
}

export function isLeaveHrApprovalRequired(): boolean {
  return getLeaveApprovalConfig().hrApprovalRequired;
}

export function getLeaveAutoExpireDays(): number {
  return getLeaveApprovalConfig().autoExpireDays;
}
