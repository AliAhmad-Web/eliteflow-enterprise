import { Router } from "express";

import { PERMISSIONS, RATE_LIMIT, UserRole } from "@enterprise/shared";

import {
  authenticate,
  authorizePermissions,
  authorizeRoles,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { tasksController } from "./tasks.controller.js";
import {
  createTaskCommentSchema,
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from "./tasks.validation.js";

const tasksRouter = Router();

tasksRouter.use(authenticate);

tasksRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.TASKS_READ),
  rateLimit({
    name: "tasks.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listTasksQuerySchema, "query"),
  asyncHandler((req, res) => tasksController.list(req, res)),
);

tasksRouter.get(
  "/stats",
  authorizePermissions(PERMISSIONS.TASKS_READ),
  rateLimit({
    name: "tasks.stats",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => tasksController.stats(req, res)),
);

tasksRouter.get(
  "/assignees",
  authorizePermissions(PERMISSIONS.TASKS_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "tasks.assignees",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => tasksController.assignees(req, res)),
);

tasksRouter.get(
  "/projects",
  authorizePermissions(PERMISSIONS.TASKS_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EMPLOYEE),
  rateLimit({
    name: "tasks.projects",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => tasksController.projects(req, res)),
);

tasksRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.TASKS_READ),
  rateLimit({
    name: "tasks.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(taskIdParamsSchema, "params"),
  asyncHandler((req, res) => tasksController.getById(req, res)),
);

tasksRouter.post(
  "/",
  authorizePermissions(PERMISSIONS.TASKS_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "tasks.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createTaskSchema),
  asyncHandler((req, res) => tasksController.create(req, res)),
);

tasksRouter.patch(
  "/:id",
  authorizePermissions(PERMISSIONS.TASKS_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EMPLOYEE),
  rateLimit({
    name: "tasks.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(taskIdParamsSchema, "params"),
  validate(updateTaskSchema),
  asyncHandler((req, res) => tasksController.update(req, res)),
);

tasksRouter.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.TASKS_DELETE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "tasks.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(taskIdParamsSchema, "params"),
  asyncHandler((req, res) => tasksController.remove(req, res)),
);

tasksRouter.post(
  "/:id/comments",
  // CLIENT has tasks:read only — comments/feedback reuse the read-scoped
  // surface; write/create/delete of tasks remain staff-gated above.
  // Service enforces company isolation for CLIENT and assignee rules for EMPLOYEE.
  authorizePermissions(PERMISSIONS.TASKS_READ),
  authorizeRoles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.EMPLOYEE,
    UserRole.CLIENT,
  ),
  rateLimit({
    name: "tasks.comments",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(taskIdParamsSchema, "params"),
  validate(createTaskCommentSchema),
  asyncHandler((req, res) => tasksController.addComment(req, res)),
);

tasksRouter.get(
  "/:id/activity",
  authorizePermissions(PERMISSIONS.TASKS_READ),
  rateLimit({
    name: "tasks.activity",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(taskIdParamsSchema, "params"),
  asyncHandler((req, res) => tasksController.activity(req, res)),
);

export { tasksRouter };
