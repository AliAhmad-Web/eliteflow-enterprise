import { Router } from "express";

import { PERMISSIONS, RATE_LIMIT, UserRole } from "@enterprise/shared";

import {
  authenticate,
  authorizeAnyPermission,
  authorizePermissions,
  authorizeRoles,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { teamController } from "./team.controller.js";
import {
  assignDepartmentEmployeesSchema,
  checkInSchema,
  checkOutSchema,
  createAdminSchema,
  createDepartmentSchema,
  createEmployeeDocumentSchema,
  createEmployeeGoalSchema,
  createEmployeeProfileSchema,
  createLeaveRequestSchema,
  createPerformanceReviewSchema,
  createPromotionSchema,
  createTeamSchema,
  createTransferSchema,
  departmentIdParamsSchema,
  employeeIdParamsSchema,
  goalIdParamsSchema,
  hireEmployeeSchema,
  leaveIdParamsSchema,
  listAttendanceQuerySchema,
  listEmployeesQuerySchema,
  listLeavesQuerySchema,
  performanceIdParamsSchema,
  reviewLeaveSchema,
  resetEmployeeCredentialsSchema,
  teamIdParamsSchema,
  teamMembersSchema,
  transferTeamMemberSchema,
  updateDepartmentSchema,
  updateEmployeeGoalSchema,
  updateEmployeeProfileSchema,
  updatePerformanceReviewSchema,
  updateTeamSchema,
  updatePerformanceScoringConfigSchema,
  recalculatePerformanceSchema,
  approveMonthlyReportSchema,
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

const superAdminOnly = authorizeRoles(UserRole.SUPER_ADMIN);

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
  superAdminOnly,
  manageLimit,
  validate(createDepartmentSchema),
  asyncHandler((req, res) => teamController.createDepartment(req, res)),
);
teamRouter.patch(
  "/departments/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  superAdminOnly,
  manageLimit,
  validate(departmentIdParamsSchema, "params"),
  validate(updateDepartmentSchema),
  asyncHandler((req, res) => teamController.updateDepartment(req, res)),
);
teamRouter.delete(
  "/departments/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  superAdminOnly,
  manageLimit,
  validate(departmentIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.deleteDepartment(req, res)),
);
teamRouter.post(
  "/departments/:id/assign",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(departmentIdParamsSchema, "params"),
  validate(assignDepartmentEmployeesSchema),
  asyncHandler((req, res) => teamController.assignDepartmentEmployees(req, res)),
);

teamRouter.get(
  "/employees",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(listEmployeesQuerySchema, "query"),
  asyncHandler((req, res) => teamController.listEmployees(req, res)),
);
teamRouter.get(
  "/employees/export/csv",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  readLimit,
  asyncHandler((req, res) => teamController.exportDirectoryCsv(req, res)),
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
teamRouter.post(
  "/employees/hire",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(hireEmployeeSchema),
  asyncHandler((req, res) => teamController.hireEmployee(req, res)),
);
teamRouter.post(
  "/admins",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  superAdminOnly,
  manageLimit,
  validate(createAdminSchema),
  asyncHandler((req, res) => teamController.createAdmin(req, res)),
);
teamRouter.patch(
  "/employees/:id",
  authorizeAnyPermission(PERMISSIONS.TEAM_READ, PERMISSIONS.TEAM_MANAGE),
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
teamRouter.post(
  "/employees/:id/reset-credentials",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  superAdminOnly,
  manageLimit,
  validate(employeeIdParamsSchema, "params"),
  validate(resetEmployeeCredentialsSchema),
  asyncHandler((req, res) => teamController.resetEmployeeCredentials(req, res)),
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
  superAdminOnly,
  manageLimit,
  validate(createTeamSchema),
  asyncHandler((req, res) => teamController.createTeam(req, res)),
);
teamRouter.patch(
  "/teams/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  superAdminOnly,
  manageLimit,
  validate(teamIdParamsSchema, "params"),
  validate(updateTeamSchema),
  asyncHandler((req, res) => teamController.updateTeam(req, res)),
);
teamRouter.delete(
  "/teams/:id",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  superAdminOnly,
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
teamRouter.post(
  "/teams/:id/transfer",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(teamIdParamsSchema, "params"),
  validate(transferTeamMemberSchema),
  asyncHandler((req, res) => teamController.transferMember(req, res)),
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
teamRouter.get(
  "/performance/dashboard",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) => teamController.getPerformanceDashboard(req, res)),
);
teamRouter.get(
  "/performance/config",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) => teamController.getPerformanceConfig(req, res)),
);
teamRouter.patch(
  "/performance/config",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  superAdminOnly,
  manageLimit,
  validate(updatePerformanceScoringConfigSchema),
  asyncHandler((req, res) => teamController.updatePerformanceConfig(req, res)),
);
teamRouter.post(
  "/performance/recalculate",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(recalculatePerformanceSchema),
  asyncHandler((req, res) => teamController.recalculatePerformance(req, res)),
);
teamRouter.get(
  "/performance/insights",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) => teamController.listPerformanceInsights(req, res)),
);
teamRouter.get(
  "/performance/monthly-reports",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  asyncHandler((req, res) =>
    teamController.listMonthlyPerformanceReports(req, res),
  ),
);
teamRouter.post(
  "/performance/monthly-reports/generate",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  asyncHandler((req, res) =>
    teamController.generateMonthlyPerformanceReports(req, res),
  ),
);
teamRouter.post(
  "/performance/monthly-reports/:id/approve",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(performanceIdParamsSchema, "params"),
  validate(approveMonthlyReportSchema),
  asyncHandler((req, res) =>
    teamController.approveMonthlyPerformanceReport(req, res),
  ),
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

teamRouter.get(
  "/employees/:id/documents",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(employeeIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.listDocuments(req, res)),
);
teamRouter.post(
  "/employees/:id/documents",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(employeeIdParamsSchema, "params"),
  validate(createEmployeeDocumentSchema),
  asyncHandler((req, res) => teamController.addDocument(req, res)),
);
teamRouter.delete(
  "/employees/:id/documents/:documentId",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  asyncHandler((req, res) => teamController.deleteDocument(req, res)),
);

teamRouter.get(
  "/employees/:id/timeline",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(employeeIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.listTimeline(req, res)),
);

teamRouter.get(
  "/employees/:id/promotions",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(employeeIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.listPromotions(req, res)),
);
teamRouter.post(
  "/employees/:id/promotions",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(employeeIdParamsSchema, "params"),
  validate(createPromotionSchema),
  asyncHandler((req, res) => teamController.createPromotion(req, res)),
);

teamRouter.get(
  "/employees/:id/transfers",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(employeeIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.listTransfers(req, res)),
);
teamRouter.post(
  "/employees/:id/transfers",
  authorizePermissions(PERMISSIONS.TEAM_MANAGE),
  manageLimit,
  validate(employeeIdParamsSchema, "params"),
  validate(createTransferSchema),
  asyncHandler((req, res) => teamController.createHrTransfer(req, res)),
);

teamRouter.get(
  "/employees/:id/id-card",
  authorizePermissions(PERMISSIONS.TEAM_READ),
  readLimit,
  validate(employeeIdParamsSchema, "params"),
  asyncHandler((req, res) => teamController.getIdCard(req, res)),
);

export { teamRouter };
