import {
  TEAM_API_PREFIX,
  type Attendance,
  type AttendanceListResponse,
  type CheckInInput,
  type CheckOutInput,
  type CreateDepartmentInput,
  type CreateEmployeeGoalInput,
  type CreateEmployeeProfileInput,
  type CreateLeaveRequestInput,
  type CreatePerformanceReviewInput,
  type CreateTeamInput,
  type Department,
  type DepartmentListResponse,
  type EmployeeGoal,
  type EmployeeListResponse,
  type EmployeeProfile,
  type GoalListResponse,
  type LeaveListResponse,
  type LeaveRequest,
  type ListAttendanceQueryInput,
  type ListEmployeesQueryInput,
  type ListLeavesQueryInput,
  type PerformanceListResponse,
  type PerformanceReview,
  type ReviewLeaveInput,
  type Team,
  type TeamListResponse,
  type TeamMembersInput,
  type TeamStatistics,
  type UpdateDepartmentInput,
  type UpdateEmployeeGoalInput,
  type UpdateEmployeeProfileInput,
  type UpdatePerformanceReviewInput,
  type UpdateTeamInput,
} from "@enterprise/shared";

import { apiRequest } from "@/services/api/api-client";

import type {
  ListGoalsQueryInput,
  ListPerformanceQueryInput,
} from "../types/team.types";

function toEmployeesQuery(query: ListEmployeesQueryInput): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.departmentId) params.set("departmentId", query.departmentId);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  return `?${params.toString()}`;
}

function toAttendanceQuery(query: ListAttendanceQueryInput): string {
  const params = new URLSearchParams();
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  return `?${params.toString()}`;
}

function toLeavesQuery(query: ListLeavesQueryInput): string {
  const params = new URLSearchParams();
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  return `?${params.toString()}`;
}

function toOptionalQuery(
  query: ListPerformanceQueryInput | ListGoalsQueryInput,
): string {
  const params = new URLSearchParams();
  if (query.employeeId) params.set("employeeId", query.employeeId);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export const teamService = {
  getStatistics() {
    return apiRequest<TeamStatistics>(`${TEAM_API_PREFIX}/statistics`, {
      auth: true,
    });
  },

  listDepartments() {
    return apiRequest<DepartmentListResponse>(`${TEAM_API_PREFIX}/departments`, {
      auth: true,
    });
  },

  createDepartment(input: CreateDepartmentInput) {
    return apiRequest<Department>(`${TEAM_API_PREFIX}/departments`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateDepartment(id: string, input: UpdateDepartmentInput) {
    return apiRequest<Department>(`${TEAM_API_PREFIX}/departments/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteDepartment(id: string) {
    return apiRequest<{ id: string }>(`${TEAM_API_PREFIX}/departments/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  listEmployees(query: ListEmployeesQueryInput) {
    return apiRequest<EmployeeListResponse>(
      `${TEAM_API_PREFIX}/employees${toEmployeesQuery(query)}`,
      { auth: true },
    );
  },

  getEmployee(id: string) {
    return apiRequest<EmployeeProfile>(`${TEAM_API_PREFIX}/employees/${id}`, {
      auth: true,
    });
  },

  createEmployee(input: CreateEmployeeProfileInput) {
    return apiRequest<EmployeeProfile>(`${TEAM_API_PREFIX}/employees`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateEmployee(id: string, input: UpdateEmployeeProfileInput) {
    return apiRequest<EmployeeProfile>(`${TEAM_API_PREFIX}/employees/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteEmployee(id: string) {
    return apiRequest<{ id: string }>(`${TEAM_API_PREFIX}/employees/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  listTeams() {
    return apiRequest<TeamListResponse>(`${TEAM_API_PREFIX}/teams`, {
      auth: true,
    });
  },

  createTeam(input: CreateTeamInput) {
    return apiRequest<Team>(`${TEAM_API_PREFIX}/teams`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateTeam(id: string, input: UpdateTeamInput) {
    return apiRequest<Team>(`${TEAM_API_PREFIX}/teams/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteTeam(id: string) {
    return apiRequest<{ id: string }>(`${TEAM_API_PREFIX}/teams/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  addTeamMembers(id: string, input: TeamMembersInput) {
    return apiRequest<Team>(`${TEAM_API_PREFIX}/teams/${id}/members`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  removeTeamMember(teamId: string, userId: string) {
    return apiRequest<{ teamId: string; userId: string }>(
      `${TEAM_API_PREFIX}/teams/${teamId}/members/${userId}`,
      { method: "DELETE", auth: true },
    );
  },

  listAttendance(query: ListAttendanceQueryInput) {
    return apiRequest<AttendanceListResponse>(
      `${TEAM_API_PREFIX}/attendance${toAttendanceQuery(query)}`,
      { auth: true },
    );
  },

  checkIn(input: CheckInInput = {}) {
    return apiRequest<Attendance>(`${TEAM_API_PREFIX}/attendance/check-in`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  checkOut(input: CheckOutInput = {}) {
    return apiRequest<Attendance>(`${TEAM_API_PREFIX}/attendance/check-out`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  listLeaves(query: ListLeavesQueryInput) {
    return apiRequest<LeaveListResponse>(
      `${TEAM_API_PREFIX}/leaves${toLeavesQuery(query)}`,
      { auth: true },
    );
  },

  createLeave(input: CreateLeaveRequestInput) {
    return apiRequest<LeaveRequest>(`${TEAM_API_PREFIX}/leaves`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  reviewLeave(id: string, input: ReviewLeaveInput) {
    return apiRequest<LeaveRequest>(`${TEAM_API_PREFIX}/leaves/${id}/review`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  listPerformance(query: ListPerformanceQueryInput = {}) {
    return apiRequest<PerformanceListResponse>(
      `${TEAM_API_PREFIX}/performance${toOptionalQuery(query)}`,
      { auth: true },
    );
  },

  createPerformance(input: CreatePerformanceReviewInput) {
    return apiRequest<PerformanceReview>(`${TEAM_API_PREFIX}/performance`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updatePerformance(id: string, input: UpdatePerformanceReviewInput) {
    return apiRequest<PerformanceReview>(
      `${TEAM_API_PREFIX}/performance/${id}`,
      {
        method: "PATCH",
        body: input,
        auth: true,
      },
    );
  },

  listGoals(query: ListGoalsQueryInput = {}) {
    return apiRequest<GoalListResponse>(
      `${TEAM_API_PREFIX}/goals${toOptionalQuery(query)}`,
      { auth: true },
    );
  },

  createGoal(input: CreateEmployeeGoalInput) {
    return apiRequest<EmployeeGoal>(`${TEAM_API_PREFIX}/goals`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateGoal(id: string, input: UpdateEmployeeGoalInput) {
    return apiRequest<EmployeeGoal>(`${TEAM_API_PREFIX}/goals/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteGoal(id: string) {
    return apiRequest<{ id: string }>(`${TEAM_API_PREFIX}/goals/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
