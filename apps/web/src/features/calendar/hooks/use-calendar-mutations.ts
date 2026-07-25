"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCalendarEventInput,
  MoveCalendarEventInput,
  ResizeCalendarEventInput,
  RespondInvitationInput,
  UpdateCalendarEventInput,
} from "@enterprise/shared";

import { calendarService } from "../services/calendar.service";
import { CALENDAR_QUERY_KEYS } from "../types/calendar.types";

function invalidateCalendar(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEYS.all });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) =>
      calendarService.createEvent(input),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCalendarEventInput }) =>
      calendarService.updateEvent(id, input),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calendarService.deleteEvent(id),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}

export function useDuplicateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calendarService.duplicateEvent(id),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}

export function useMoveEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveCalendarEventInput }) =>
      calendarService.moveEvent(id, input),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}

export function useResizeEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ResizeCalendarEventInput;
    }) => calendarService.resizeEvent(id, input),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}

export function useRespondInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RespondInvitationInput;
    }) => calendarService.respondInvitation(id, input),
    onSuccess: () => invalidateCalendar(queryClient),
  });
}
