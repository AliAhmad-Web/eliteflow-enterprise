import {
  TEAM_API_PREFIX,
  type AssignDepartmentEmployeesInput,
  type Attendance,
  type AttendanceListResponse,
  type CheckInInput,
  type CheckOutInput,
  type CreateAdminInput,
  type CreateAdminResult,
  type CreateDepartmentInput,
  type CreateEmployeeDocumentInput,
  type CreateEmployeeGoalInput,
  type CreateEmployeeProfileInput,
  type CreateLeaveRequestInput,
  type CreatePerformanceReviewInput,
  type CreatePromotionInput,
  type CreateTeamInput,
  type CreateTransferInput,
  type Department,
  type DepartmentListResponse,
  type EmployeeDocumentDto,
  type EmployeeGoal,
  type EmployeeIdCardDto,
  type EmployeeListResponse,
  type EmployeeProfile,
  type EmployeePromotionDto,
  type EmployeeTimelineEventDto,
  type EmployeeTransferDto,
  type GoalListResponse,
  type HireEmployeeInput,
  type HireEmployeeResult,
  type LeaveListResponse,
  type LeaveRequest,
  type ListAttendanceQueryInput,
  type ListEmployeesQueryInput,
  type ListLeavesQueryInput,
  type PerformanceListResponse,
  type PerformanceReview,
  type PerformanceDashboardDto,
  type PerformanceScoringConfigDto,
  type PerformanceMonthlyReportDto,
  type RecalculatePerformanceInput,
  type UpdatePerformanceScoringConfigInput,
  type ApproveMonthlyReportInput,
  type ReviewLeaveInput,
  type Team,
  type TeamListResponse,
  type TeamMembersInput,
  type TeamStatistics,
  type TransferTeamMemberInput,
  type UpdateDepartmentInput,
  type UpdateEmployeeGoalInput,
  type UpdateEmployeeProfileInput,
  type UpdatePerformanceReviewInput,
  type UpdateTeamInput,
} from "@enterprise/shared";

import { apiRequest, authenticatedFetch } from "@/services/api/api-client";
import { ApiClientError } from "@/services/api/api-error";

import type {
  ListGoalsQueryInput,
  ListPerformanceQueryInput,
} from "../types/team.types";

function toEmployeesQuery(query: ListEmployeesQueryInput): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.departmentId) params.set("departmentId", query.departmentId);
  if (query.teamId) params.set("teamId", query.teamId);
  if (query.managerId) params.set("managerId", query.managerId);
  if (query.role) params.set("role", query.role);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
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

  hireEmployee(input: HireEmployeeInput) {
    return apiRequest<HireEmployeeResult>(`${TEAM_API_PREFIX}/employees/hire`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  createAdmin(input: CreateAdminInput) {
    return apiRequest<CreateAdminResult>(`${TEAM_API_PREFIX}/admins`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  resetEmployeeCredentials(
    id: string,
    input: { sendEmail?: boolean } = {},
  ) {
    return apiRequest<{
      passwordSetupRequired: true;
      passwordSetupUrl?: string;
      expiresAt: string;
      mustChangePassword: boolean;
      invitationSent: boolean;
    }>(`${TEAM_API_PREFIX}/employees/${id}/reset-credentials`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  assignDepartmentEmployees(
    id: string,
    input: AssignDepartmentEmployeesInput,
  ) {
    return apiRequest<Department>(`${TEAM_API_PREFIX}/departments/${id}/assign`, {
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

  transferTeamMember(teamId: string, input: TransferTeamMemberInput) {
    return apiRequest<Team>(`${TEAM_API_PREFIX}/teams/${teamId}/transfer`, {
      method: "POST",
      body: input,
      auth: true,
    });
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

  getPerformanceDashboard() {
    return apiRequest<PerformanceDashboardDto>(
      `${TEAM_API_PREFIX}/performance/dashboard`,
      { auth: true },
    );
  },

  getPerformanceConfig() {
    return apiRequest<PerformanceScoringConfigDto>(
      `${TEAM_API_PREFIX}/performance/config`,
      { auth: true },
    );
  },

  updatePerformanceConfig(input: UpdatePerformanceScoringConfigInput) {
    return apiRequest<PerformanceScoringConfigDto>(
      `${TEAM_API_PREFIX}/performance/config`,
      { method: "PATCH", body: input, auth: true },
    );
  },

  recalculatePerformance(input: RecalculatePerformanceInput = {}) {
    return apiRequest<{ processed: number; alerts: number }>(
      `${TEAM_API_PREFIX}/performance/recalculate`,
      { method: "POST", body: input, auth: true },
    );
  },

  listMonthlyPerformanceReports(employeeId?: string) {
    return apiRequest<{ items: PerformanceMonthlyReportDto[] }>(
      `${TEAM_API_PREFIX}/performance/monthly-reports${
        employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""
      }`,
      { auth: true },
    );
  },

  generateMonthlyReports() {
    return apiRequest<{ count: number }>(
      `${TEAM_API_PREFIX}/performance/monthly-reports/generate`,
      { method: "POST", body: {}, auth: true },
    );
  },

  approveMonthlyReport(id: string, input: ApproveMonthlyReportInput) {
    return apiRequest<PerformanceMonthlyReportDto>(
      `${TEAM_API_PREFIX}/performance/monthly-reports/${id}/approve`,
      { method: "POST", body: input, auth: true },
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

  listDocuments(employeeId: string) {
    return apiRequest<{ items: EmployeeDocumentDto[] }>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/documents`,
      { auth: true },
    );
  },

  addDocument(employeeId: string, input: CreateEmployeeDocumentInput) {
    return apiRequest<EmployeeDocumentDto>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/documents`,
      { method: "POST", body: input, auth: true },
    );
  },

  deleteDocument(employeeId: string, documentId: string) {
    return apiRequest<{ id: string }>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/documents/${documentId}`,
      { method: "DELETE", auth: true },
    );
  },

  listTimeline(employeeId: string) {
    return apiRequest<{ items: EmployeeTimelineEventDto[] }>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/timeline`,
      { auth: true },
    );
  },

  listPromotions(employeeId: string) {
    return apiRequest<EmployeePromotionDto[]>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/promotions`,
      { auth: true },
    );
  },

  createPromotion(employeeId: string, input: CreatePromotionInput) {
    return apiRequest<EmployeePromotionDto>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/promotions`,
      { method: "POST", body: input, auth: true },
    );
  },

  listTransfers(employeeId: string) {
    return apiRequest<EmployeeTransferDto[]>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/transfers`,
      { auth: true },
    );
  },

  createHrTransfer(employeeId: string, input: CreateTransferInput) {
    return apiRequest<EmployeeTransferDto>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/transfers`,
      { method: "POST", body: input, auth: true },
    );
  },

  getIdCard(employeeId: string) {
    return apiRequest<EmployeeIdCardDto>(
      `${TEAM_API_PREFIX}/employees/${employeeId}/id-card`,
      { auth: true },
    );
  },

  async exportDirectoryCsv(): Promise<{ blob: Blob; filename: string }> {
    const response = await authenticatedFetch(
      `${TEAM_API_PREFIX}/employees/export/csv`,
      { method: "GET" },
    );

    if (!response.ok) {
      throw new ApiClientError(
        "Failed to export employee directory",
        "TEAM_EXPORT_CSV_ERROR",
        response.status,
      );
    }

    const disposition = response.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] ?? "employees.csv";
    const blob = await response.blob();
    return { blob, filename };
  },
};
