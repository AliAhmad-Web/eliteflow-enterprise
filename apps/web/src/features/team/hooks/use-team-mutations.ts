"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CheckInInput,
  CheckOutInput,
  CreateDepartmentInput,
  CreateEmployeeGoalInput,
  CreateEmployeeProfileInput,
  CreateLeaveRequestInput,
  CreatePerformanceReviewInput,
  CreateTeamInput,
  ReviewLeaveInput,
  TeamMembersInput,
  UpdateDepartmentInput,
  UpdateEmployeeGoalInput,
  UpdateEmployeeProfileInput,
  UpdatePerformanceReviewInput,
  UpdateTeamInput,
} from "@enterprise/shared";

import { teamService } from "../services/team.service";
import { TEAM_QUERY_KEYS } from "../types/team.types";

function invalidateTeam(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEYS.all });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) =>
      teamService.createDepartment(input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDepartmentInput }) =>
      teamService.updateDepartment(id, input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamService.deleteDepartment(id),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeProfileInput) =>
      teamService.createEmployee(input),
    onSuccess: () => invalidateTeam(queryClient),
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
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamService.deleteEmployee(id),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamInput) => teamService.createTeam(input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTeamInput }) =>
      teamService.updateTeam(id, input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamService.deleteTeam(id),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useAddTeamMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamMembersInput }) =>
      teamService.addTeamMembers(id, input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      teamService.removeTeamMember(teamId, userId),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckInInput = {}) => teamService.checkIn(input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckOutInput = {}) => teamService.checkOut(input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveRequestInput) =>
      teamService.createLeave(input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useReviewLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewLeaveInput }) =>
      teamService.reviewLeave(id, input),
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useCreatePerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePerformanceReviewInput) =>
      teamService.createPerformance(input),
    onSuccess: () => invalidateTeam(queryClient),
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
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeGoalInput) =>
      teamService.createGoal(input),
    onSuccess: () => invalidateTeam(queryClient),
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
    onSuccess: () => invalidateTeam(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamService.deleteGoal(id),
    onSuccess: () => invalidateTeam(queryClient),
  });
}
