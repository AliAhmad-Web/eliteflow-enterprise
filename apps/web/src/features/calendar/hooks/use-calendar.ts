"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListCalendarEventsQueryInput } from "@enterprise/shared";

import { calendarService } from "../services/calendar.service";
import { CALENDAR_QUERY_KEYS } from "../types/calendar.types";

export function useCalendarEvents(query: ListCalendarEventsQueryInput) {
  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.list(query),
    queryFn: () => calendarService.listEvents(query),
  });
}

export function useUpcomingEvents() {
  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.upcoming,
    queryFn: () => calendarService.upcoming(),
  });
}

export function useCalendarEvent(id: string | null) {
  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.detail(id ?? "none"),
    queryFn: () => calendarService.getEvent(id!),
    enabled: Boolean(id),
  });
}

export function useHolidays(from?: string, to?: string) {
  return useQuery({
    queryKey: CALENDAR_QUERY_KEYS.holidays(from, to),
    queryFn: () => calendarService.listHolidays({ from, to }),
  });
}
