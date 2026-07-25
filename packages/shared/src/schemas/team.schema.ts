import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

export const EMPLOYEE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
  "TERMINATED",
] as const;
export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "REMOTE",
  "HOLIDAY",
] as const;
export const LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "PERSONAL",
  "UNPAID",
  "MATERNITY",
  "PATERNITY",
  "OTHER",
] as const;
export const LEAVE_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export const PERFORMANCE_RATINGS = [
  "POOR",
  "BELOW_AVERAGE",
  "AVERAGE",
  "GOOD",
  "EXCELLENT",
] as const;
export const GOAL_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const employeeStatusSchema = z.enum(EMPLOYEE_STATUSES);
export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);
export const leaveTypeSchema = z.enum(LEAVE_TYPES);
export const leaveRequestStatusSchema = z.enum(LEAVE_REQUEST_STATUSES);
export const performanceRatingSchema = z.enum(PERFORMANCE_RATINGS);
export const goalStatusSchema = z.enum(GOAL_STATUSES);

export type EmployeeStatusValue = z.infer<typeof employeeStatusSchema>;
export type AttendanceStatusValue = z.infer<typeof attendanceStatusSchema>;
export type LeaveTypeValue = z.infer<typeof leaveTypeSchema>;
export type LeaveRequestStatusValue = z.infer<typeof leaveRequestStatusSchema>;
export type PerformanceRatingValue = z.infer<typeof performanceRatingSchema>;
export type GoalStatusValue = z.infer<typeof goalStatusSchema>;

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(40).toUpperCase(),
  description: z.string().trim().max(500).optional().nullable(),
  headId: uuidSchema.optional().nullable(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const departmentIdParamsSchema = z.object({ id: uuidSchema });
export type DepartmentIdParamsInput = z.infer<typeof departmentIdParamsSchema>;

export const createEmployeeProfileSchema = z.object({
  userId: uuidSchema,
  employeeCode: z.string().trim().min(1).max(40),
  departmentId: uuidSchema.optional().nullable(),
  designation: z.string().trim().max(120).optional().nullable(),
  managerId: uuidSchema.optional().nullable(),
  status: employeeStatusSchema.optional().default("ACTIVE"),
  hireDate: dateOnlySchema.optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  workLocation: z.string().trim().max(120).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional().default([]),
  experienceYears: z.coerce.number().min(0).max(60).optional().nullable(),
  bio: z.string().trim().max(5000).optional().nullable(),
  documentUrls: z.array(z.string().url().max(2048)).max(20).optional().default([]),
  emergencyContactName: z.string().trim().max(120).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(40).optional().nullable(),
  emergencyContactRelation: z.string().trim().max(80).optional().nullable(),
  annualLeaveBalance: z.coerce.number().int().min(0).max(365).optional().default(20),
  sickLeaveBalance: z.coerce.number().int().min(0).max(365).optional().default(10),
});
export type CreateEmployeeProfileInput = z.infer<
  typeof createEmployeeProfileSchema
>;

export const updateEmployeeProfileSchema = createEmployeeProfileSchema
  .omit({ userId: true })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
export type UpdateEmployeeProfileInput = z.infer<
  typeof updateEmployeeProfileSchema
>;

export const employeeIdParamsSchema = z.object({ id: uuidSchema });
export type EmployeeIdParamsInput = z.infer<typeof employeeIdParamsSchema>;

export const listEmployeesQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: employeeStatusSchema.optional(),
  departmentId: uuidSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListEmployeesQueryInput = z.infer<typeof listEmployeesQuerySchema>;

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  departmentId: uuidSchema.optional().nullable(),
  leaderId: uuidSchema.optional().nullable(),
  memberUserIds: z.array(uuidSchema).max(100).optional().default([]),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = createTeamSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const teamIdParamsSchema = z.object({ id: uuidSchema });
export type TeamIdParamsInput = z.infer<typeof teamIdParamsSchema>;

export const teamMembersSchema = z.object({
  userIds: z.array(uuidSchema).min(1).max(100),
  roleLabel: z.string().trim().max(80).optional().nullable(),
});
export type TeamMembersInput = z.infer<typeof teamMembersSchema>;

export const checkInSchema = z.object({
  notes: z.string().trim().max(500).optional().nullable(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export const checkOutSchema = z.object({
  notes: z.string().trim().max(500).optional().nullable(),
});
export type CheckOutInput = z.infer<typeof checkOutSchema>;

export const listAttendanceQuerySchema = z.object({
  employeeId: uuidSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(31),
});
export type ListAttendanceQueryInput = z.infer<typeof listAttendanceQuerySchema>;

export const createLeaveRequestSchema = z
  .object({
    type: leaveTypeSchema,
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    reason: z.string().trim().max(1000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be on or after startDate",
        path: ["endDate"],
      });
    }
  });
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(1000).optional().nullable(),
});
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;

export const leaveIdParamsSchema = z.object({ id: uuidSchema });
export type LeaveIdParamsInput = z.infer<typeof leaveIdParamsSchema>;

export const listLeavesQuerySchema = z.object({
  employeeId: uuidSchema.optional(),
  status: leaveRequestStatusSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListLeavesQueryInput = z.infer<typeof listLeavesQuerySchema>;

export const createPerformanceReviewSchema = z.object({
  employeeId: uuidSchema,
  periodLabel: z.string().trim().min(1).max(40),
  periodStart: dateOnlySchema,
  periodEnd: dateOnlySchema,
  rating: performanceRatingSchema.optional().default("AVERAGE"),
  productivityScore: z.coerce.number().int().min(0).max(100).optional().default(70),
  kpiSummary: z.string().trim().max(5000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});
export type CreatePerformanceReviewInput = z.infer<
  typeof createPerformanceReviewSchema
>;

export const updatePerformanceReviewSchema = createPerformanceReviewSchema
  .omit({ employeeId: true })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
export type UpdatePerformanceReviewInput = z.infer<
  typeof updatePerformanceReviewSchema
>;

export const performanceIdParamsSchema = z.object({ id: uuidSchema });
export type PerformanceIdParamsInput = z.infer<typeof performanceIdParamsSchema>;

export const createEmployeeGoalSchema = z.object({
  employeeId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  kpiMetric: z.string().trim().max(120).optional().nullable(),
  targetValue: z.string().trim().max(80).optional().nullable(),
  progress: z.coerce.number().int().min(0).max(100).optional().default(0),
  status: goalStatusSchema.optional().default("NOT_STARTED"),
  dueDate: dateOnlySchema.optional().nullable(),
});
export type CreateEmployeeGoalInput = z.infer<typeof createEmployeeGoalSchema>;

export const updateEmployeeGoalSchema = createEmployeeGoalSchema
  .omit({ employeeId: true })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
export type UpdateEmployeeGoalInput = z.infer<typeof updateEmployeeGoalSchema>;

export const goalIdParamsSchema = z.object({ id: uuidSchema });
export type GoalIdParamsInput = z.infer<typeof goalIdParamsSchema>;

const userSummarySchema = z.object({
  id: uuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable().optional(),
});

export const departmentDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  headId: uuidSchema.nullable(),
  employeeCount: z.number().int().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  head: userSummarySchema.nullable().optional(),
});
export type DepartmentDto = z.infer<typeof departmentDtoSchema>;

export const employeeProfileDtoSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  employeeCode: z.string(),
  departmentId: uuidSchema.nullable(),
  designation: z.string().nullable(),
  managerId: uuidSchema.nullable(),
  status: employeeStatusSchema,
  hireDate: z.string().nullable(),
  phone: z.string().nullable(),
  workLocation: z.string().nullable(),
  skills: z.array(z.string()),
  experienceYears: z.number().nullable(),
  bio: z.string().nullable(),
  documentUrls: z.array(z.string()),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  emergencyContactRelation: z.string().nullable(),
  annualLeaveBalance: z.number().int(),
  sickLeaveBalance: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: userSummarySchema.optional(),
  department: departmentDtoSchema.optional().nullable(),
  manager: userSummarySchema.nullable().optional(),
});
export type EmployeeProfileDto = z.infer<typeof employeeProfileDtoSchema>;

export const teamMemberDtoSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  userId: uuidSchema,
  roleLabel: z.string().nullable(),
  joinedAt: z.string().datetime(),
  user: userSummarySchema.optional(),
});
export type TeamMemberDto = z.infer<typeof teamMemberDtoSchema>;

export const teamDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  departmentId: uuidSchema.nullable(),
  leaderId: uuidSchema.nullable(),
  memberCount: z.number().int().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  leader: userSummarySchema.nullable().optional(),
  members: z.array(teamMemberDtoSchema).optional(),
});
export type TeamDto = z.infer<typeof teamDtoSchema>;

export const attendanceDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  date: z.string(),
  checkInAt: z.string().datetime().nullable(),
  checkOutAt: z.string().datetime().nullable(),
  status: attendanceStatusSchema,
  workingMinutes: z.number().int(),
  overtimeMinutes: z.number().int(),
  isLate: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
});
export type AttendanceDto = z.infer<typeof attendanceDtoSchema>;

export const leaveRequestDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  type: leaveTypeSchema,
  status: leaveRequestStatusSchema,
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().int(),
  reason: z.string().nullable(),
  reviewNote: z.string().nullable(),
  reviewedById: uuidSchema.nullable(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
});
export type LeaveRequestDto = z.infer<typeof leaveRequestDtoSchema>;

export const performanceReviewDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  reviewerId: uuidSchema.nullable(),
  periodLabel: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  rating: performanceRatingSchema,
  productivityScore: z.number().int(),
  kpiSummary: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
  reviewer: userSummarySchema.nullable().optional(),
});
export type PerformanceReviewDto = z.infer<typeof performanceReviewDtoSchema>;

export const employeeGoalDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  kpiMetric: z.string().nullable(),
  targetValue: z.string().nullable(),
  progress: z.number().int(),
  status: goalStatusSchema,
  dueDate: z.string().nullable(),
  createdAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
});
export type EmployeeGoalDto = z.infer<typeof employeeGoalDtoSchema>;

export const teamStatisticsDtoSchema = z.object({
  totalEmployees: z.number().int(),
  activeEmployees: z.number().int(),
  inactiveEmployees: z.number().int(),
  departments: z.number().int(),
  teams: z.number().int(),
  presentToday: z.number().int(),
  lateToday: z.number().int(),
  pendingLeaves: z.number().int(),
  averageProductivity: z.number(),
});
export type TeamStatisticsDto = z.infer<typeof teamStatisticsDtoSchema>;
