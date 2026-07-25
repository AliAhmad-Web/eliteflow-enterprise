import type {
  AttendanceStatusValue,
  EmployeeStatusValue,
  GoalStatusValue,
  LeaveRequestStatusValue,
  LeaveTypeValue,
  ListAttendanceQueryInput,
  ListEmployeesQueryInput,
  ListLeavesQueryInput,
  PerformanceRatingValue,
} from "@enterprise/shared";

export const TEAM_QUERY_KEYS = {
  all: ["team"] as const,
  statistics: () => [...TEAM_QUERY_KEYS.all, "statistics"] as const,
  departments: () => [...TEAM_QUERY_KEYS.all, "departments"] as const,
  employees: () => [...TEAM_QUERY_KEYS.all, "employees"] as const,
  employeeList: (query: ListEmployeesQueryInput) =>
    [...TEAM_QUERY_KEYS.employees(), query] as const,
  employeeDetail: (id: string) =>
    [...TEAM_QUERY_KEYS.employees(), "detail", id] as const,
  teams: () => [...TEAM_QUERY_KEYS.all, "teams"] as const,
  attendance: () => [...TEAM_QUERY_KEYS.all, "attendance"] as const,
  attendanceList: (query: ListAttendanceQueryInput) =>
    [...TEAM_QUERY_KEYS.attendance(), query] as const,
  leaves: () => [...TEAM_QUERY_KEYS.all, "leaves"] as const,
  leaveList: (query: ListLeavesQueryInput) =>
    [...TEAM_QUERY_KEYS.leaves(), query] as const,
  performance: () => [...TEAM_QUERY_KEYS.all, "performance"] as const,
  performanceList: (query: ListPerformanceQueryInput) =>
    [...TEAM_QUERY_KEYS.performance(), query] as const,
  goals: () => [...TEAM_QUERY_KEYS.all, "goals"] as const,
  goalList: (query: ListGoalsQueryInput) =>
    [...TEAM_QUERY_KEYS.goals(), query] as const,
};

export type ListPerformanceQueryInput = {
  employeeId?: string;
};

export type ListGoalsQueryInput = {
  employeeId?: string;
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatusValue, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatusValue, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  HALF_DAY: "Half day",
  REMOTE: "Remote",
  HOLIDAY: "Holiday",
};

export const LEAVE_TYPE_LABELS: Record<LeaveTypeValue, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  PERSONAL: "Personal",
  UNPAID: "Unpaid",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  OTHER: "Other",
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const PERFORMANCE_RATING_LABELS: Record<PerformanceRatingValue, string> = {
  POOR: "Poor",
  BELOW_AVERAGE: "Below average",
  AVERAGE: "Average",
  GOOD: "Good",
  EXCELLENT: "Excellent",
};

export const GOAL_STATUS_LABELS: Record<GoalStatusValue, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function formatEmployeeName(
  employee: {
    user?: { firstName: string; lastName: string };
    employeeCode?: string;
  } | null | undefined,
): string {
  if (!employee) return "Unknown";
  if (employee.user) {
    return `${employee.user.firstName} ${employee.user.lastName}`.trim();
  }
  return employee.employeeCode ?? "Employee";
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function todayDateOnly(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: fmt(from), to: fmt(to) };
}
