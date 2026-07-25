import type { Request, Response } from "express";

import type {
  CheckInInput,
  CheckOutInput,
  CreateDepartmentInput,
  CreateEmployeeGoalInput,
  CreateEmployeeProfileInput,
  CreateLeaveRequestInput,
  CreatePerformanceReviewInput,
  CreateTeamInput,
  DepartmentIdParamsInput,
  EmployeeIdParamsInput,
  GoalIdParamsInput,
  LeaveIdParamsInput,
  ListAttendanceQueryInput,
  ListEmployeesQueryInput,
  ListLeavesQueryInput,
  PerformanceIdParamsInput,
  ReviewLeaveInput,
  TeamIdParamsInput,
  TeamMembersInput,
  UpdateDepartmentInput,
  UpdateEmployeeGoalInput,
  UpdateEmployeeProfileInput,
  UpdatePerformanceReviewInput,
  UpdateTeamInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { TEAM_ERROR_CODES, TeamError } from "./team.errors.js";
import { teamService, type TeamActor } from "./team.service.js";

function getActor(req: Request): TeamActor {
  if (!req.auth) {
    throw new TeamError(
      "Authentication required",
      401,
      TEAM_ERROR_CODES.FORBIDDEN,
    );
  }
  const context = extractRequestContext(req);
  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    permissions: req.auth.permissions,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export class TeamController {
  async statistics(req: Request, res: Response) {
    const result = await teamService.statistics(getActor(req));
    res.json(successResponse(result, "Team statistics retrieved"));
  }

  async listDepartments(req: Request, res: Response) {
    const result = await teamService.listDepartments(getActor(req));
    res.json(successResponse(result, "Departments retrieved"));
  }

  async createDepartment(req: Request, res: Response) {
    const result = await teamService.createDepartment(
      req.body as CreateDepartmentInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Department created"));
  }

  async updateDepartment(req: Request, res: Response) {
    const params = req.params as unknown as DepartmentIdParamsInput;
    const result = await teamService.updateDepartment(
      params.id,
      req.body as UpdateDepartmentInput,
      getActor(req),
    );
    res.json(successResponse(result, "Department updated"));
  }

  async deleteDepartment(req: Request, res: Response) {
    const params = req.params as unknown as DepartmentIdParamsInput;
    const result = await teamService.deleteDepartment(params.id, getActor(req));
    res.json(successResponse(result, "Department deleted"));
  }

  async listEmployees(req: Request, res: Response) {
    const result = await teamService.listEmployees(
      req.query as unknown as ListEmployeesQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Employees retrieved"));
  }

  async getEmployee(req: Request, res: Response) {
    const params = req.params as unknown as EmployeeIdParamsInput;
    const result = await teamService.getEmployee(params.id, getActor(req));
    res.json(successResponse(result, "Employee retrieved"));
  }

  async createEmployee(req: Request, res: Response) {
    const result = await teamService.createEmployee(
      req.body as CreateEmployeeProfileInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Employee created"));
  }

  async updateEmployee(req: Request, res: Response) {
    const params = req.params as unknown as EmployeeIdParamsInput;
    const result = await teamService.updateEmployee(
      params.id,
      req.body as UpdateEmployeeProfileInput,
      getActor(req),
    );
    res.json(successResponse(result, "Employee updated"));
  }

  async deleteEmployee(req: Request, res: Response) {
    const params = req.params as unknown as EmployeeIdParamsInput;
    const result = await teamService.deleteEmployee(params.id, getActor(req));
    res.json(successResponse(result, "Employee deleted"));
  }

  async listTeams(req: Request, res: Response) {
    const result = await teamService.listTeams(getActor(req));
    res.json(successResponse(result, "Teams retrieved"));
  }

  async createTeam(req: Request, res: Response) {
    const result = await teamService.createTeam(
      req.body as CreateTeamInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Team created"));
  }

  async updateTeam(req: Request, res: Response) {
    const params = req.params as unknown as TeamIdParamsInput;
    const result = await teamService.updateTeam(
      params.id,
      req.body as UpdateTeamInput,
      getActor(req),
    );
    res.json(successResponse(result, "Team updated"));
  }

  async deleteTeam(req: Request, res: Response) {
    const params = req.params as unknown as TeamIdParamsInput;
    const result = await teamService.deleteTeam(params.id, getActor(req));
    res.json(successResponse(result, "Team deleted"));
  }

  async addMembers(req: Request, res: Response) {
    const params = req.params as unknown as TeamIdParamsInput;
    const result = await teamService.addMembers(
      params.id,
      req.body as TeamMembersInput,
      getActor(req),
    );
    res.json(successResponse(result, "Members added"));
  }

  async removeMember(req: Request, res: Response) {
    const params = req.params as { id: string; userId: string };
    const result = await teamService.removeMember(
      params.id,
      params.userId,
      getActor(req),
    );
    res.json(successResponse(result, "Member removed"));
  }

  async listAttendance(req: Request, res: Response) {
    const result = await teamService.listAttendance(
      req.query as unknown as ListAttendanceQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Attendance retrieved"));
  }

  async checkIn(req: Request, res: Response) {
    const result = await teamService.checkIn(
      req.body as CheckInInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Checked in"));
  }

  async checkOut(req: Request, res: Response) {
    const result = await teamService.checkOut(
      req.body as CheckOutInput,
      getActor(req),
    );
    res.json(successResponse(result, "Checked out"));
  }

  async listLeaves(req: Request, res: Response) {
    const result = await teamService.listLeaves(
      req.query as unknown as ListLeavesQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Leaves retrieved"));
  }

  async applyLeave(req: Request, res: Response) {
    const result = await teamService.applyLeave(
      req.body as CreateLeaveRequestInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Leave applied"));
  }

  async reviewLeave(req: Request, res: Response) {
    const params = req.params as unknown as LeaveIdParamsInput;
    const result = await teamService.reviewLeave(
      params.id,
      req.body as ReviewLeaveInput,
      getActor(req),
    );
    res.json(successResponse(result, "Leave reviewed"));
  }

  async listPerformance(req: Request, res: Response) {
    const result = await teamService.listPerformance(getActor(req));
    res.json(successResponse(result, "Performance reviews retrieved"));
  }

  async createPerformance(req: Request, res: Response) {
    const result = await teamService.createPerformance(
      req.body as CreatePerformanceReviewInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Performance review created"));
  }

  async updatePerformance(req: Request, res: Response) {
    const params = req.params as unknown as PerformanceIdParamsInput;
    const result = await teamService.updatePerformance(
      params.id,
      req.body as UpdatePerformanceReviewInput,
      getActor(req),
    );
    res.json(successResponse(result, "Performance review updated"));
  }

  async listGoals(req: Request, res: Response) {
    const result = await teamService.listGoals(getActor(req));
    res.json(successResponse(result, "Goals retrieved"));
  }

  async createGoal(req: Request, res: Response) {
    const result = await teamService.createGoal(
      req.body as CreateEmployeeGoalInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Goal created"));
  }

  async updateGoal(req: Request, res: Response) {
    const params = req.params as unknown as GoalIdParamsInput;
    const result = await teamService.updateGoal(
      params.id,
      req.body as UpdateEmployeeGoalInput,
      getActor(req),
    );
    res.json(successResponse(result, "Goal updated"));
  }

  async deleteGoal(req: Request, res: Response) {
    const params = req.params as unknown as GoalIdParamsInput;
    const result = await teamService.deleteGoal(params.id, getActor(req));
    res.json(successResponse(result, "Goal deleted"));
  }
}

export const teamController = new TeamController();
