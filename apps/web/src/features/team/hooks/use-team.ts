"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  ListAttendanceQueryInput,
  ListEmployeesQueryInput,
  ListLeavesQueryInput,
} from "@enterprise/shared";

import { teamService } from "../services/team.service";
import {
  TEAM_QUERY_KEYS,
  type ListGoalsQueryInput,
  type ListPerformanceQueryInput,
} from "../types/team.types";

export function useTeamStatistics() {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.statistics(),
    queryFn: () => teamService.getStatistics(),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.departments(),
    queryFn: () => teamService.listDepartments(),
  });
}

export function useEmployees(query: ListEmployeesQueryInput) {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.employeeList(query),
    queryFn: () => teamService.listEmployees(query),
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.employeeDetail(id ?? "none"),
    queryFn: () => teamService.getEmployee(id!),
    enabled: Boolean(id),
  });
}

export function useTeams() {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.teams(),
    queryFn: () => teamService.listTeams(),
  });
}

export function useAttendance(query: ListAttendanceQueryInput) {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.attendanceList(query),
    queryFn: () => teamService.listAttendance(query),
  });
}

export function useLeaves(query: ListLeavesQueryInput) {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.leaveList(query),
    queryFn: () => teamService.listLeaves(query),
  });
}

export function usePerformance(query: ListPerformanceQueryInput = {}) {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.performanceList(query),
    queryFn: () => teamService.listPerformance(query),
  });
}

export function useGoals(query: ListGoalsQueryInput = {}) {
  return useQuery({
    queryKey: TEAM_QUERY_KEYS.goalList(query),
    queryFn: () => teamService.listGoals(query),
  });
}
