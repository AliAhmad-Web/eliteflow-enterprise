import { Router } from "express";

import { PERMISSIONS, RATE_LIMIT } from "@enterprise/shared";

import {
  authenticate,
  authorizePermissions,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { calendarController } from "./calendar.controller.js";
import {
  calendarEventIdParamsSchema,
  createCalendarEventSchema,
  createHolidaySchema,
  holidayIdParamsSchema,
  listCalendarEventsQuerySchema,
  listHolidaysQuerySchema,
  moveCalendarEventSchema,
  resizeCalendarEventSchema,
  respondInvitationSchema,
  updateCalendarEventSchema,
} from "./calendar.validation.js";

const calendarRouter = Router();

calendarRouter.use(authenticate);

calendarRouter.get(
  "/events",
  authorizePermissions(PERMISSIONS.CALENDAR_READ),
  rateLimit({
    name: "calendar.events.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listCalendarEventsQuerySchema, "query"),
  asyncHandler((req, res) => calendarController.listEvents(req, res)),
);

calendarRouter.get(
  "/upcoming",
  authorizePermissions(PERMISSIONS.CALENDAR_READ),
  rateLimit({
    name: "calendar.upcoming",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => calendarController.upcoming(req, res)),
);

calendarRouter.get(
  "/holidays",
  authorizePermissions(PERMISSIONS.CALENDAR_READ),
  rateLimit({
    name: "calendar.holidays.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listHolidaysQuerySchema, "query"),
  asyncHandler((req, res) => calendarController.listHolidays(req, res)),
);

calendarRouter.post(
  "/holidays",
  authorizePermissions(PERMISSIONS.CALENDAR_WRITE),
  rateLimit({
    name: "calendar.holidays.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createHolidaySchema),
  asyncHandler((req, res) => calendarController.createHoliday(req, res)),
);

calendarRouter.delete(
  "/holidays/:id",
  authorizePermissions(PERMISSIONS.CALENDAR_WRITE),
  rateLimit({
    name: "calendar.holidays.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(holidayIdParamsSchema, "params"),
  asyncHandler((req, res) => calendarController.deleteHoliday(req, res)),
);

calendarRouter.post(
  "/events",
  authorizePermissions(PERMISSIONS.CALENDAR_WRITE),
  rateLimit({
    name: "calendar.events.create",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createCalendarEventSchema),
  asyncHandler((req, res) => calendarController.createEvent(req, res)),
);

calendarRouter.get(
  "/events/:id",
  authorizePermissions(PERMISSIONS.CALENDAR_READ),
  rateLimit({
    name: "calendar.events.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(calendarEventIdParamsSchema, "params"),
  asyncHandler((req, res) => calendarController.getEvent(req, res)),
);

calendarRouter.patch(
  "/events/:id",
  authorizePermissions(PERMISSIONS.CALENDAR_WRITE),
  rateLimit({
    name: "calendar.events.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(calendarEventIdParamsSchema, "params"),
  validate(updateCalendarEventSchema),
  asyncHandler((req, res) => calendarController.updateEvent(req, res)),
);

calendarRouter.delete(
  "/events/:id",
  authorizePermissions(PERMISSIONS.CALENDAR_WRITE),
  rateLimit({
    name: "calendar.events.delete",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(calendarEventIdParamsSchema, "params"),
  asyncHandler((req, res) => calendarController.deleteEvent(req, res)),
);

calendarRouter.post(
  "/events/:id/duplicate",
  authorizePermissions(PERMISSIONS.CALENDAR_WRITE),
  rateLimit({
    name: "calendar.events.duplicate",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(calendarEventIdParamsSchema, "params"),
  asyncHandler((req, res) => calendarController.duplicateEvent(req, res)),
);

calendarRouter.post(
  "/events/:id/move",
  authorizePermissions(PERMISSIONS.CALENDAR_WRITE),
  rateLimit({
    name: "calendar.events.move",
    max: 120,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(calendarEventIdParamsSchema, "params"),
  validate(moveCalendarEventSchema),
  asyncHandler((req, res) => calendarController.moveEvent(req, res)),
);

calendarRouter.post(
  "/events/:id/resize",
  authorizePermissions(PERMISSIONS.CALENDAR_WRITE),
  rateLimit({
    name: "calendar.events.resize",
    max: 120,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(calendarEventIdParamsSchema, "params"),
  validate(resizeCalendarEventSchema),
  asyncHandler((req, res) => calendarController.resizeEvent(req, res)),
);

calendarRouter.post(
  "/events/:id/respond",
  authorizePermissions(PERMISSIONS.CALENDAR_READ),
  rateLimit({
    name: "calendar.events.respond",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(calendarEventIdParamsSchema, "params"),
  validate(respondInvitationSchema),
  asyncHandler((req, res) => calendarController.respondInvitation(req, res)),
);

export { calendarRouter };
