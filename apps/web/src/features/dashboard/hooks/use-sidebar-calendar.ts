"use client";

import type { CalendarEvent, ListCalendarEventsQueryInput } from "@enterprise/shared";
import { PERMISSIONS } from "@enterprise/shared";
import { useMemo, useState } from "react";

import { useCalendarEvents } from "@/features/calendar/hooks/use-calendar";
import {
  addDays,
  endOfMonth,
  sameDay,
  startOfMonth,
} from "@/features/calendar/types/calendar.types";
import { useHasPermission } from "@/features/rbac/hooks/use-permissions";

/** Sunday-first month grid to match the sidebar weekday headers. */
function buildSundayMonthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  gridStart.setHours(0, 0, 0, 0);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function eventsForDay(events: CalendarEvent[], day: Date) {
  return events.filter((event) => sameDay(new Date(event.startsAt), day));
}

export function useSidebarCalendar() {
  const canRead = useHasPermission(PERMISSIONS.CALENDAR_READ);
  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const range = useMemo(() => {
    const from = startOfMonth(anchor);
    from.setDate(from.getDate() - from.getDay());
    from.setHours(0, 0, 0, 0);
    const to = endOfMonth(anchor);
    const gridEnd = addDays(to, 6 - to.getDay());
    gridEnd.setHours(23, 59, 59, 999);
    return { from, to: gridEnd };
  }, [anchor]);

  const query = useMemo<ListCalendarEventsQueryInput>(
    () => ({
      view: "month",
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      search: "",
      page: 1,
      limit: 200,
    }),
    [range],
  );

  const eventsQuery = useCalendarEvents(query, { enabled: canRead });
  const events = useMemo(
    () => eventsQuery.data?.items ?? [],
    [eventsQuery.data?.items],
  );
  const days = useMemo(() => buildSundayMonthGrid(anchor), [anchor]);
  const today = useMemo(() => new Date(), []);

  const monthLabel = anchor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const dayCells = useMemo(
    () =>
      days.map((day) => {
        const dayEvents = eventsForDay(events, day);
        return {
          date: day.getDate(),
          fullDate: day,
          isCurrentMonth: day.getMonth() === anchor.getMonth(),
          isToday: sameDay(day, today),
          isSelected: sameDay(day, selectedDay),
          hasEvent: dayEvents.length > 0,
          events: dayEvents,
        };
      }),
    [days, events, anchor, today, selectedDay],
  );

  const selectedEvents = useMemo(
    () => eventsForDay(events, selectedDay),
    [events, selectedDay],
  );

  return {
    canRead,
    monthLabel,
    dayCells,
    selectedDay,
    selectedEvents,
    setSelectedDay,
    goPrevMonth: () =>
      setAnchor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)),
    goNextMonth: () =>
      setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)),
    isLoading: eventsQuery.isLoading,
    isFetching: eventsQuery.isFetching,
    isError: eventsQuery.isError,
    error: eventsQuery.error,
    refetch: eventsQuery.refetch,
  };
}
