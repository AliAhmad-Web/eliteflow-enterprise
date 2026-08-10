import {
  CALENDAR_API_PREFIX,
  type CalendarEvent,
  type CalendarEventListResponse,
  type CreateCalendarEventInput,
  type ListCalendarEventsQueryInput,
  type UpcomingEventsResponse,
  type UpdateCalendarEventInput,
} from "@enterprise/shared";

import { apiRequest } from "./api-client";
import { toQueryString } from "@/lib/utils";

export const calendarService = {
  listEvents(query: ListCalendarEventsQueryInput) {
    return apiRequest<CalendarEventListResponse>(
      `${CALENDAR_API_PREFIX}/events${toQueryString({
        view: query.view,
        from: query.from,
        to: query.to,
        search: query.search || undefined,
        type: query.type,
        status: query.status,
        category: query.category,
        projectId: query.projectId,
        clientId: query.clientId,
        team: query.team,
        page: query.page,
        limit: query.limit,
      })}`,
      { auth: true },
    );
  },

  upcoming() {
    return apiRequest<UpcomingEventsResponse>(
      `${CALENDAR_API_PREFIX}/upcoming`,
      { auth: true },
    );
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
};
