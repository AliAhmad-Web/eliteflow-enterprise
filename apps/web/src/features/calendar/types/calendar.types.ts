import type {
  CalendarEventCategoryValue,
  CalendarEventTypeValue,
  ListCalendarEventsQueryInput,
} from "@enterprise/shared";

export const CALENDAR_QUERY_KEYS = {
  all: ["calendar"] as const,
  list: (query: ListCalendarEventsQueryInput) =>
    ["calendar", "events", query] as const,
  upcoming: ["calendar", "upcoming"] as const,
  detail: (id: string) => ["calendar", "event", id] as const,
  holidays: (from?: string, to?: string) =>
    ["calendar", "holidays", from ?? "", to ?? ""] as const,
};

export const EVENT_TYPE_LABELS: Record<CalendarEventTypeValue, string> = {
  MEETING: "Meeting",
  EVENT: "Event",
  PROJECT_DEADLINE: "Project deadline",
  TASK_DUE: "Task due",
  REMINDER: "Reminder",
  HOLIDAY: "Holiday",
};

export const EVENT_CATEGORY_LABELS: Record<CalendarEventCategoryValue, string> = {
  WORK: "Work",
  PERSONAL: "Personal",
  CLIENT: "Client",
  PROJECT: "Project",
  TEAM: "Team",
  HOLIDAY: "Holiday",
  OTHER: "Other",
};

export const EVENT_COLORS = [
  "#2563eb",
  "#0f766e",
  "#7c3aed",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#0891b2",
  "#4b5563",
] as const;

export function formatEventTime(iso: string, allDay?: boolean): string {
  const date = new Date(iso);
  if (allDay) return "All day";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatEventRange(startsAt: string, endsAt: string, allDay?: boolean): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (allDay) return `${day} · All day`;
  return `${day} · ${formatEventTime(startsAt)} – ${formatEventTime(endsAt)}`;
}

export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function buildMonthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}
