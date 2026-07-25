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
import { teamController } from "./team.controller.js";
import {
  checkInSchema,
  checkOutSchema,
  createDepartmentSchema,
  createEmployeeGoalSchema,
  createEmployeeProfileSchema,
  createLeaveRequestSchema,
  createPerformanceReviewSchema,
  createTeamSchema,
  departmentIdParamsSchema,
  employeeIdParamsSchema,
  goalIdParamsSchema,
  leaveIdParamsSchema,
  listAttendanceQuerySchema,
  listEmployeesQuerySchema,
  listLeavesQuerySchema,
  performanceIdParamsSchema,
  reviewLeaveSchema,
  teamIdParamsSchema,
  teamMembersSchema,
  updateDepartmentSchema,
  updateEmployeeGoalSchema,
  updateEmployeeProfileSchema,
  updatePerformanceReviewSchema,
  updateTeamSchema,
} from "./team.validation.js";

const teamRouter = Router();
teamRouter.use(authenticate);

const readLimit = rateLimit({
  name: "team.read",
  ...RATE_LIMIT.GLOBAL_API,
  keyGenerator: rateLimitByUser,
});

const manageLimit = rateLimit({
  name: "team.manage",
  max: 60,
  windowMs: 15 * 60 * 1000,
  keyGenerator: rateLimitByUser,
});

teamRouter.get(
  "/statistics",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) => teamController.statistics(req, res)),
);

teamRouter.get(
  "/departments",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) => teamController.listDepartments(req, res)),
);
teamRouter.post(
  "/departments",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(createDepartmentSchema),
  asyncHandler((req, res) => teamController.createDepartment(req, res)),
);
teamRouter.patch(
  "/departments/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(departmentIdParamsSchema, "params"),
  validate(updateDepartmentSchema),
  asyncHandler((req, res) => teamController.updateDepartment(req, res)),
);
teamRouter.delete(
  "/departments/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(departmentIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.deleteDepartment(req, res)),
);

teamRouter.get(
  "/employees",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(listEmployeesQuerySchema, "query"),
  asyncHandler((req, res) => teamController.listEmployees(req, res)),
);
teamRouter.get(
  "/employees/:id",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(employeeIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.getEmployee(req, res)),
);
teamRouter.post(
  "/employees",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(createEmployeeProfileSchema),
  asyncHandler((req, res) => teamController.createEmployee(req, res)),
);
teamRouter.patch(
  "/employees/:id",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  manageLimit,
  validate(employeeIdParamsSchema, "params"),
  validate(updateEmployeeProfileSchema),
  asyncHandler((req, res) => teamController.updateEmployee(req, res)),
);
teamRouter.delete(
  "/employees/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(employeeIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.deleteEmployee(req, res)),
);

teamRouter.get(
  "/teams",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) => teamController.listTeams(req, res)),
);
teamRouter.post(
  "/teams",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(createTeamSchema),
  asyncHandler((req, res) => teamController.createTeam(req, res)),
);
teamRouter.patch(
  "/teams/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(teamIdParamsSchema, "params"),
  validate(updateTeamSchema),
  asyncHandler((req, res) => teamController.updateTeam(req, res)),
);
teamRouter.delete(
  "/teams/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(teamIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.deleteTeam(req, res)),
);
teamRouter.post(
  "/teams/:id/members",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(teamIdParamsSchema, "params"),
  validate(teamMembersSchema),
  asyncHandler((req, res) => teamController.addMembers(req, res)),
);
teamRouter.delete(
  "/teams/:id/members/:userId",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  asyncHandler((req, res) => teamController.removeMember(req, res)),
);

teamRouter.get(
  "/attendance",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(listAttendanceQuerySchema, "query"),
  asyncHandler((req, res) => teamController.listAttendance(req, res)),
);
teamRouter.post(
  "/attendance/check-in",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  manageLimit,
  validate(checkInSchema),
  asyncHandler((req, res) => teamController.checkIn(req, res)),
);
teamRouter.post(
  "/attendance/check-out",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  manageLimit,
  validate(checkOutSchema),
  asyncHandler((req, res) => teamController.checkOut(req, res)),
);

teamRouter.get(
  "/leaves",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(listLeavesQuerySchema, "query"),
  asyncHandler((req, res) => teamController.listLeaves(req, res)),
);
teamRouter.post(
  "/leaves",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  manageLimit,
  validate(createLeaveRequestSchema),
  asyncHandler((req, res) => teamController.applyLeave(req, res)),
);
teamRouter.post(
  "/leaves/:id/review",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(leaveIdParamsSchema, "params"),
  validate(reviewLeaveSchema),
  asyncHandler((req, res) => teamController.reviewLeave(req, res)),
);

teamRouter.get(
  "/performance",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) => teamController.listPerformance(req, res)),
);
teamRouter.post(
  "/performance",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(createPerformanceReviewSchema),
  asyncHandler((req, res) => teamController.createPerformance(req, res)),
);
teamRouter.patch(
  "/performance/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(performanceIdParamsSchema, "params"),
  validate(updatePerformanceReviewSchema),
  asyncHandler((req, res) => teamController.updatePerformance(req, res)),
);

teamRouter.get(
  "/goals",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) => teamController.listGoals(req, res)),
);
teamRouter.post(
  "/goals",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(createEmployeeGoalSchema),
  asyncHandler((req, res) => teamController.createGoal(req, res)),
);
teamRouter.patch(
  "/goals/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(goalIdParamsSchema, "params"),
  validate(updateEmployeeGoalSchema),
  asyncHandler((req, res) => teamController.updateGoal(req, res)),
);
teamRouter.delete(
  "/goals/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(goalIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.deleteGoal(req, res)),
);

export { teamRouter };
