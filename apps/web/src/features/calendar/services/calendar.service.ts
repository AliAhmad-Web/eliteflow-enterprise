import {
  CALENDAR_API_PREFIX,
  type CalendarEvent,
  type CalendarEventListResponse,
  type CreateCalendarEventInput,
  type CreateHolidayInput,
  type HolidayListResponse,
  type ListCalendarEventsQueryInput,
  type ListHolidaysQueryInput,
  type MoveCalendarEventInput,
  type ResizeCalendarEventInput,
  type RespondInvitationInput,
  type UpcomingEventsResponse,
  type UpdateCalendarEventInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

function toEventsQuery(query: ListCalendarEventsQueryInput): string {
  const params = new URLSearchParams();
  if (query.view) params.set("view", query.view);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.search) params.set("search", query.search);
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  if (query.projectId) params.set("projectId", query.projectId);
  if (query.clientId) params.set("clientId", query.clientId);
  if (query.team) params.set("team", query.team);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  return `?${params.toString()}`;
}

function toHolidaysQuery(query: ListHolidaysQueryInput): string {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const calendarService = {
  listEvents(query: ListCalendarEventsQueryInput) {
    return apiRequest<CalendarEventListResponse>(
      `${CALENDAR_API_PREFIX}/events${toEventsQuery(query)}`,
      { auth: true },
    );
  },

  upcoming() {
    return apiRequest<UpcomingEventsResponse>(`${CALENDAR_API_PREFIX}/upcoming`, {
      auth: true,
    });
  },

  getEvent(id: string) {
    return apiRequest<CalendarEvent>(`${CALENDAR_API_PREFIX}/events/${id}`, {
      auth: true,
    });
  },

  createEvent(input: CreateCalendarEventInput) {
    return apiRequest<CalendarEvent>(`${CALENDAR_API_PREFIX}/events`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateEvent(id: string, input: UpdateCalendarEventInput) {
    return apiRequest<CalendarEvent>(`${CALENDAR_API_PREFIX}/events/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteEvent(id: string) {
    return apiRequest<{ id: string }>(`${CALENDAR_API_PREFIX}/events/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  duplicateEvent(id: string) {
    return apiRequest<CalendarEvent>(
      `${CALENDAR_API_PREFIX}/events/${id}/duplicate`,
      { method: "POST", auth: true },
    );
  },

  moveEvent(id: string, input: MoveCalendarEventInput) {
    return apiRequest<CalendarEvent>(
      `${CALENDAR_API_PREFIX}/events/${id}/move`,
      { method: "POST", body: input, auth: true },
    );
  },

  resizeEvent(id: string, input: ResizeCalendarEventInput) {
    return apiRequest<CalendarEvent>(
      `${CALENDAR_API_PREFIX}/events/${id}/resize`,
      { method: "POST", body: input, auth: true },
    );
  },

  respondInvitation(id: string, input: RespondInvitationInput) {
    return apiRequest(`${CALENDAR_API_PREFIX}/events/${id}/respond`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  listHolidays(query: ListHolidaysQueryInput = {}) {
    return apiRequest<HolidayListResponse>(
      `${CALENDAR_API_PREFIX}/holidays${toHolidaysQuery(query)}`,
      { auth: true },
    );
  },

  createHoliday(input: CreateHolidayInput) {
    return apiRequest(`${CALENDAR_API_PREFIX}/holidays`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  deleteHoliday(id: string) {
    return apiRequest<{ id: string }>(`${CALENDAR_API_PREFIX}/holidays/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
