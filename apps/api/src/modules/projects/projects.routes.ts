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
import { projectsController } from "./projects.controller.js";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from "./projects.validation.js";

const projectsRouter = Router();

projectsRouter.use(authenticate);

projectsRouter.get(
  "/",
  authorizePermissions(PERMISSIONS.PROJECTS_READ),
  rateLimit({
    name: "projects.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listProjectsQuerySchema, "query"),
  asyncHandler((req, res) => projectsController.list(req, res)),
);

projectsRouter.get(
  "/stats",
  authorizePermissions(PERMISSIONS.PROJECTS_READ),
  rateLimit({
    name: "projects.stats",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => projectsController.stats(req, res)),
);

projectsRouter.get(
  "/assignees",
  authorizePermissions(PERMISSIONS.PROJECTS_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "projects.assignees",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  asyncHandler((req, res) => projectsController.assignees(req, res)),
);

projectsRouter.get(
  "/:id",
  authorizePermissions(PERMISSIONS.PROJECTS_READ),
  rateLimit({
    name: "projects.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(projectIdParamsSchema, "params"),
  asyncHandler((req, res) => projectsController.getById(req, res)),
);

projectsRouter.post(
  "/",
  authorizePermissions(PERMISSIONS.PROJECTS_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "projects.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createProjectSchema),
  asyncHandler((req, res) => projectsController.create(req, res)),
);

projectsRouter.patch(
  "/:id",
  authorizePermissions(PERMISSIONS.PROJECTS_WRITE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "projects.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(projectIdParamsSchema, "params"),
  validate(updateProjectSchema),
  asyncHandler((req, res) => projectsController.update(req, res)),
);

projectsRouter.delete(
  "/:id",
  authorizePermissions(PERMISSIONS.PROJECTS_DELETE),
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  rateLimit({
    name: "projects.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(projectIdParamsSchema, "params"),
  asyncHandler((req, res) => projectsController.remove(req, res)),
);

export { projectsRouter };
