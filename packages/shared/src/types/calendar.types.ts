import type { CalendarEventDto, HolidayDto } from "../schemas/calendar.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type CalendarEvent = CalendarEventDto;
export type Holiday = HolidayDto;

export type CalendarEventListResponse = PaginatedResponse<CalendarEvent> & {
  view: "day" | "week" | "month" | "agenda";
  from: string;
  to: string;
};

export type HolidayListResponse = {
  items: Holiday[];
};

export type UpcomingEventsResponse = {
  today: CalendarEvent[];
  upcoming: CalendarEvent[];
};
