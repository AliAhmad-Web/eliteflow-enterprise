import type {
  AttendanceDto,
  DepartmentDto,
  EmployeeGoalDto,
  EmployeeProfileDto,
  LeaveRequestDto,
  PerformanceReviewDto,
  TeamDto,
  TeamStatisticsDto,
} from "../schemas/team.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type Department = DepartmentDto;
export type EmployeeProfile = EmployeeProfileDto;
export type Team = TeamDto;
export type Attendance = AttendanceDto;
export type LeaveRequest = LeaveRequestDto;
export type PerformanceReview = PerformanceReviewDto;
export type EmployeeGoal = EmployeeGoalDto;
export type TeamStatistics = TeamStatisticsDto;

export type DepartmentListResponse = { items: Department[] };
export type EmployeeListResponse = PaginatedResponse<EmployeeProfile>;
export type TeamListResponse = { items: Team[] };
export type AttendanceListResponse = PaginatedResponse<Attendance>;
export type LeaveListResponse = PaginatedResponse<LeaveRequest>;
export type PerformanceListResponse = { items: PerformanceReview[] };
export type GoalListResponse = { items: EmployeeGoal[] };
