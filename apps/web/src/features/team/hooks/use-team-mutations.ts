import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AssignDepartmentEmployeesInput,
  CheckInInput,
  CheckOutInput,
  CreateAdminInput,
  CreateDepartmentInput,
  CreateEmployeeGoalInput,
  CreateEmployeeProfileInput,
  CreateLeaveRequestInput,
  CreatePerformanceReviewInput,
  CreateTeamInput,
  HireEmployeeInput,
  ReviewLeaveInput,
  TeamMembersInput,
  TransferTeamMemberInput,
  UpdateDepartmentInput,
  UpdateEmployeeGoalInput,
  UpdateEmployeeProfileInput,
  UpdatePerformanceReviewInput,
  UpdateTeamInput,
} from "@enterprise/shared";

import { teamService } from "../services/team.service";
import { TEAM_QUERY_KEYS } from "../types/team.types";

type QueryClient = ReturnType<typeof useQueryClient>;

function invalidateStatistics(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.statistics() });
}

function invalidateEmployees(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.employees() });
}

function invalidateDepartments(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.departments() });
}

function invalidateTeams(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.teams() });
}

function invalidateAttendance(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.attendance() });
}

function invalidateLeaves(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.leaves() });
}

function invalidatePerformance(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.performance() });
}

function invalidateGoals(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.goals() });
}

function invalidateEmployeeDirectory(queryClient: QueryClient) {
  invalidateEmployees(queryClient);
  invalidateStatistics(queryClient);
}

function invalidateOrgStructure(queryClient: QueryClient) {
  invalidateDepartments(queryClient);
  invalidateTeams(queryClient);
  invalidateStatistics(queryClient);
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) =>
      teamService.createDepartment(input),
    onSuccess: () => invalidateOrgStructure(queryClient),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDepartmentInput }) =>
      teamService.updateDepartment(id, input),
    onSuccess: () => invalidateOrgStructure(queryClient),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamService.deleteDepartment(id),
    onSuccess: () => {
      invalidateOrgStructure(queryClient);
      invalidateEmployees(queryClient);
    },
  });
}

export function useAssignDepartmentEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AssignDepartmentEmployeesInput;
    }) => teamService.assignDepartmentEmployees(id, input),
    onSuccess: () => {
      invalidateEmployeeDirectory(queryClient);
      invalidateDepartments(queryClient);
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeProfileInput) =>
      teamService.createEmployee(input),
    onSuccess: () => {
      invalidateEmployeeDirectory(queryClient);
      invalidateDepartments(queryClient);
      invalidateTeams(queryClient);
    },
  });
}

export function useHireEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HireEmployeeInput) => teamService.hireEmployee(input),
    onSuccess: () => {
      invalidateEmployeeDirectory(queryClient);
      invalidateDepartments(queryClient);
      invalidateTeams(queryClient);
    },
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminInput) => teamService.createAdmin(input),
    onSuccess: () => {
      invalidateEmployeeDirectory(queryClient);
      invalidateDepartments(queryClient);
    },
  });
}

export function useResetEmployeeCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      sendEmail,
    }: {
      id: string;
      sendEmail?: boolean;
    }) => teamService.resetEmployeeCredentials(id, { sendEmail }),
    onSuccess: () => {
      invalidateEmployeeDirectory(queryClient);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateEmployeeProfileInput;
    }) => teamService.updateEmployee(id, input),
    onSuccess: (_data, variables) => {
      invalidateEmployeeDirectory(queryClient);
      invalidateDepartments(queryClient);
      invalidateTeams(queryClient);
      void queryClient.invalidateQueries({
        queryKey: TEAM_QUERY_KEYS.employeeDetail(variables.id),
      });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamService.deleteEmployee(id),
    onSuccess: () => {
      invalidateEmployeeDirectory(queryClient);
      invalidateDepartments(queryClient);
      invalidateTeams(queryClient);
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamInput) => teamService.createTeam(input),
    onSuccess: () => {
      invalidateTeams(queryClient);
      invalidateStatistics(queryClient);
      invalidateDepartments(queryClient);
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTeamInput }) =>
      teamService.updateTeam(id, input),
    onSuccess: () => {
      invalidateTeams(queryClient);
      invalidateStatistics(queryClient);
      invalidateEmployees(queryClient);
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamService.deleteTeam(id),
    onSuccess: () => {
      invalidateTeams(queryClient);
      invalidateStatistics(queryClient);
      invalidateEmployees(queryClient);
    },
  });
}

export function useAddTeamMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamMembersInput }) =>
      teamService.addTeamMembers(id, input),
    onSuccess: () => {
      invalidateTeams(queryClient);
      invalidateEmployees(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      teamService.removeTeamMember(teamId, userId),
    onSuccess: () => {
      invalidateTeams(queryClient);
      invalidateEmployees(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useTransferTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      input,
    }: {
      teamId: string;
      input: TransferTeamMemberInput;
    }) => teamService.transferTeamMember(teamId, input),
    onSuccess: () => {
      invalidateTeams(queryClient);
      invalidateEmployees(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckInInput = {}) => teamService.checkIn(input),
    onSuccess: () => {
      invalidateAttendance(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckOutInput = {}) => teamService.checkOut(input),
    onSuccess: () => {
      invalidateAttendance(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveRequestInput) =>
      teamService.createLeave(input),
    onSuccess: () => {
      invalidateLeaves(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useReviewLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewLeaveInput }) =>
      teamService.reviewLeave(id, input),
    onSuccess: () => {
      invalidateLeaves(queryClient);
      invalidateStatistics(queryClient);
      invalidateEmployees(queryClient);
    },
  });
}

export function useCreatePerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePerformanceReviewInput) =>
      teamService.createPerformance(input),
    onSuccess: () => {
      invalidatePerformance(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useUpdatePerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePerformanceReviewInput;
    }) => teamService.updatePerformance(id, input),
    onSuccess: () => {
      invalidatePerformance(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeGoalInput) =>
      teamService.createGoal(input),
    onSuccess: () => {
      invalidateGoals(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateEmployeeGoalInput;
    }) => teamService.updateGoal(id, input),
    onSuccess: () => {
      invalidateGoals(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamService.deleteGoal(id),
    onSuccess: () => {
      invalidateGoals(queryClient);
      invalidateStatistics(queryClient);
    },
  });
}
