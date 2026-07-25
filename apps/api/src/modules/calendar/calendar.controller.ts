import type { Request, Response } from "express";

import type {
  CalendarEventIdParamsInput,
  CreateCalendarEventInput,
  CreateHolidayInput,
  HolidayIdParamsInput,
  ListCalendarEventsQueryInput,
  ListHolidaysQueryInput,
  MoveCalendarEventInput,
  ResizeCalendarEventInput,
  RespondInvitationInput,
  UpdateCalendarEventInput,
} from "@enterprise/shared";
import { prisma } from "@enterprise/database";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { CALENDAR_ERROR_CODES, CalendarError } from "./calendar.errors.js";
import { calendarService, type CalendarActor } from "./calendar.service.js";

async function getActor(req: Request): Promise<CalendarActor> {
  if (!req.auth) {
    throw new CalendarError(
      "Authentication required",
      401,
      CALENDAR_ERROR_CODES.FORBIDDEN,
    );
  }

  const context = extractRequestContext(req);
  let companyId: string | null = null;

  if (req.auth.role === "CLIENT") {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { companyId: true },
    });
    companyId = user?.companyId ?? null;
  }

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    companyId,
    permissions: req.auth.permissions,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export class CalendarController {
  async listEvents(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListCalendarEventsQueryInput;
    const result = await calendarService.listEvents(query, await getActor(req));
    res.json(successResponse(result, "Calendar events retrieved successfully"));
  }

  async upcoming(req: Request, res: Response): Promise<void> {
    const result = await calendarService.upcoming(await getActor(req));
    res.json(successResponse(result, "Upcoming events retrieved successfully"));
  }

  async getEvent(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CalendarEventIdParamsInput;
    const result = await calendarService.getEvent(params.id, await getActor(req));
    res.json(successResponse(result, "Event retrieved successfully"));
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateCalendarEventInput;
    const result = await calendarService.createEvent(body, await getActor(req));
    res.status(201).json(successResponse(result, "Event created successfully"));
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CalendarEventIdParamsInput;
    const body = req.body as UpdateCalendarEventInput;
    const result = await calendarService.updateEvent(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Event updated successfully"));
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CalendarEventIdParamsInput;
    const result = await calendarService.deleteEvent(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Event deleted successfully"));
  }

  async duplicateEvent(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CalendarEventIdParamsInput;
    const result = await calendarService.duplicateEvent(
      params.id,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "Event duplicated successfully"));
  }

  async moveEvent(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CalendarEventIdParamsInput;
    const body = req.body as MoveCalendarEventInput;
    const result = await calendarService.moveEvent(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Event moved successfully"));
  }

  async resizeEvent(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CalendarEventIdParamsInput;
    const body = req.body as ResizeCalendarEventInput;
    const result = await calendarService.resizeEvent(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Event resized successfully"));
  }

  async respondInvitation(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as CalendarEventIdParamsInput;
    const body = req.body as RespondInvitationInput;
    const result = await calendarService.respondInvitation(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Invitation response saved"));
  }

  async listHolidays(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListHolidaysQueryInput;
    const result = await calendarService.listHolidays(query, await getActor(req));
    res.json(successResponse(result, "Holidays retrieved successfully"));
  }

  async createHoliday(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateHolidayInput;
    const result = await calendarService.createHoliday(body, await getActor(req));
    res.status(201).json(successResponse(result, "Holiday created successfully"));
  }

  async deleteHoliday(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as HolidayIdParamsInput;
    const result = await calendarService.deleteHoliday(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Holiday deleted successfully"));
  }
}

export const calendarController = new CalendarController();
