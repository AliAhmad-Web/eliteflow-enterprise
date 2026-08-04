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
export const EMPLOYEE_GENDERS = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] as const;
export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
  "TEMPORARY",
] as const;
export const ADMIN_PERMISSION_PRESETS = [
  "FULL",
  "HR",
  "OPERATIONS",
  "FINANCE",
  "READ_ONLY",
] as const;
export const MARITAL_STATUSES = [
  "SINGLE",
  "MARRIED",
  "DIVORCED",
  "WIDOWED",
  "PREFER_NOT_TO_SAY",
] as const;
export const LIFECYCLE_STAGES = [
  "HIRING",
  "ONBOARDING",
  "ACTIVE",
  "PROBATION",
  "TRANSFERRED",
  "PROMOTED",
  "EXITING",
  "EXITED",
] as const;
export const DOCUMENT_TYPES = [
  "CV",
  "CONTRACT",
  "OFFER_LETTER",
  "CNIC",
  "PASSPORT",
  "CERTIFICATE",
  "DEGREE",
  "EXPERIENCE_LETTER",
  "NDA",
  "MEDICAL",
  "POLICY",
  "OTHER",
] as const;
export const WORK_SHIFTS = [
  "MORNING",
  "EVENING",
  "NIGHT",
  "FLEXIBLE",
  "REMOTE",
] as const;

export const employeeStatusSchema = z.enum(EMPLOYEE_STATUSES);
export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);
export const leaveTypeSchema = z.enum(LEAVE_TYPES);
export const leaveRequestStatusSchema = z.enum(LEAVE_REQUEST_STATUSES);
export const performanceRatingSchema = z.enum(PERFORMANCE_RATINGS);
export const goalStatusSchema = z.enum(GOAL_STATUSES);
export const employeeGenderSchema = z.enum(EMPLOYEE_GENDERS);
export const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES);
export const adminPermissionPresetSchema = z.enum(ADMIN_PERMISSION_PRESETS);
export const maritalStatusSchema = z.enum(MARITAL_STATUSES);
export const lifecycleStageSchema = z.enum(LIFECYCLE_STAGES);
export const documentTypeSchema = z.enum(DOCUMENT_TYPES);
export const workShiftSchema = z.enum(WORK_SHIFTS);

export type EmployeeStatusValue = z.infer<typeof employeeStatusSchema>;
export type AttendanceStatusValue = z.infer<typeof attendanceStatusSchema>;
export type LeaveTypeValue = z.infer<typeof leaveTypeSchema>;
export type LeaveRequestStatusValue = z.infer<typeof leaveRequestStatusSchema>;
export type PerformanceRatingValue = z.infer<typeof performanceRatingSchema>;
export type GoalStatusValue = z.infer<typeof goalStatusSchema>;
export type EmployeeGenderValue = z.infer<typeof employeeGenderSchema>;
export type EmploymentTypeValue = z.infer<typeof employmentTypeSchema>;
export type AdminPermissionPresetValue = z.infer<
  typeof adminPermissionPresetSchema
>;
export type MaritalStatusValue = z.infer<typeof maritalStatusSchema>;
export type LifecycleStageValue = z.infer<typeof lifecycleStageSchema>;
export type DocumentTypeValue = z.infer<typeof documentTypeSchema>;
export type WorkShiftValue = z.infer<typeof workShiftSchema>;

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

export const assignDepartmentEmployeesSchema = z.object({
  employeeIds: z.array(uuidSchema).min(1).max(100),
});
export type AssignDepartmentEmployeesInput = z.infer<
  typeof assignDepartmentEmployeesSchema
>;

const employeeHrFieldsSchema = z.object({
  departmentId: uuidSchema,
  primaryTeamId: uuidSchema.optional().nullable(),
  designation: z.string().trim().max(120).optional().nullable(),
  managerId: uuidSchema.optional().nullable(),
  status: employeeStatusSchema.optional().default("ACTIVE"),
  employmentType: employmentTypeSchema.optional().default("FULL_TIME"),
  gender: employeeGenderSchema.optional().nullable(),
  dateOfBirth: dateOnlySchema.optional().nullable(),
  nationalId: z.string().trim().max(40).optional().nullable(),
  hireDate: dateOnlySchema.optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  workLocation: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  salary: z.coerce.number().min(0).max(999_999_999).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  photoUrl: z.string().url().max(2048).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional().default([]),
  experienceYears: z.coerce.number().min(0).max(60).optional().nullable(),
  bio: z.string().trim().max(5000).optional().nullable(),
  documentUrls: z.array(z.string().url().max(2048)).max(20).optional().default([]),
  emergencyContactName: z.string().trim().max(120).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(40).optional().nullable(),
  emergencyContactRelation: z.string().trim().max(80).optional().nullable(),
  annualLeaveBalance: z.coerce.number().int().min(0).max(365).optional().default(20),
  sickLeaveBalance: z.coerce.number().int().min(0).max(365).optional().default(10),
  fatherName: z.string().trim().max(120).optional().nullable(),
  maritalStatus: maritalStatusSchema.optional().nullable(),
  bloodGroup: z.string().trim().max(10).optional().nullable(),
  personalEmail: z.string().trim().email().max(320).optional().nullable(),
  companyEmail: z.string().trim().email().max(320).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  shift: workShiftSchema.optional().nullable(),
  casualLeaveBalance: z.coerce.number().int().min(0).max(365).optional().default(10),
  medicalLeaveBalance: z.coerce.number().int().min(0).max(365).optional().default(15),
  badgeNumber: z.string().trim().max(40).optional().nullable(),
  qrToken: z.string().trim().max(500).optional().nullable(),
  lifecycleStage: lifecycleStageSchema.optional().default("ACTIVE"),
  exitDate: dateOnlySchema.optional().nullable(),
  exitReason: z.string().trim().max(1000).optional().nullable(),
});

/** Legacy: link an existing platform user to an employee profile. */
export const createEmployeeProfileSchema = employeeHrFieldsSchema
  .omit({ departmentId: true })
  .extend({
    userId: uuidSchema,
    employeeCode: z.string().trim().min(1).max(40).optional(),
    departmentId: uuidSchema.optional().nullable(),
  });
export type CreateEmployeeProfileInput = z.infer<
  typeof createEmployeeProfileSchema
>;

/** 
 * Hire flow: create system account + employee profile with auto EMP code.
 * Employee codes are generated server-side in format: EMP-00001 (5-digit padding).
 */
export const hireEmployeeSchema = employeeHrFieldsSchema.extend({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
});
export type HireEmployeeInput = z.infer<typeof hireEmployeeSchema>;

export const createAdminSchema = employeeHrFieldsSchema.extend({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  permissionPreset: adminPermissionPresetSchema.optional().default("FULL"),
  sendInvitation: z.boolean().optional().default(true),
  requirePasswordChange: z.boolean().optional().default(true),
  enableTwoFactor: z.boolean().optional().default(false),
});
export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const resetEmployeeCredentialsSchema = z.object({
  sendEmail: z.boolean().optional().default(true),
});
export type ResetEmployeeCredentialsInput = z.infer<
  typeof resetEmployeeCredentialsSchema
>;

export const resetEmployeeCredentialsResultSchema = z.object({
  temporaryPassword: z.string(),
  mustChangePassword: z.boolean(),
  invitationSent: z.boolean(),
});
export type ResetEmployeeCredentialsResult = z.infer<
  typeof resetEmployeeCredentialsResultSchema
>;

export const updateEmployeeProfileSchema = employeeHrFieldsSchema
  .extend({
    employeeCode: z.string().trim().min(1).max(40).optional(),
    departmentId: uuidSchema.optional().nullable(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
  })
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
  teamId: uuidSchema.optional(),
  managerId: uuidSchema.optional(),
  role: z.enum(["ADMIN", "EMPLOYEE", "SUPER_ADMIN"]).optional(),
  sortBy: z
    .enum(["employeeCode", "hireDate", "designation", "status", "createdAt"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
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

export const transferTeamMemberSchema = z.object({
  userId: uuidSchema,
  toTeamId: uuidSchema,
  roleLabel: z.string().trim().max(80).optional().nullable(),
});
export type TransferTeamMemberInput = z.infer<typeof transferTeamMemberSchema>;

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
  linkedTaskIds: z.array(uuidSchema).max(50).optional().default([]),
  autoProgress: z.boolean().optional().default(true),
});
export type CreateEmployeeGoalInput = z.infer<typeof createEmployeeGoalSchema>;

export const updateEmployeeGoalSchema = createEmployeeGoalSchema
  .omit({ employeeId: true })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
export type UpdateEmployeeGoalInput = z.infer<typeof updateEmployeeGoalSchema>;

export const PERFORMANCE_METRIC_KEYS = [
  "attendance",
  "taskCompletion",
  "deadlinePerformance",
  "productivity",
  "projectContribution",
  "teamCollaboration",
  "discipline",
  "learning",
] as const;
export type PerformanceMetricKey = (typeof PERFORMANCE_METRIC_KEYS)[number];

export const performanceWeightsSchema = z.object({
  attendance: z.coerce.number().min(0).max(100),
  taskCompletion: z.coerce.number().min(0).max(100),
  deadlinePerformance: z.coerce.number().min(0).max(100),
  productivity: z.coerce.number().min(0).max(100),
  projectContribution: z.coerce.number().min(0).max(100),
  teamCollaboration: z.coerce.number().min(0).max(100),
  discipline: z.coerce.number().min(0).max(100),
  learning: z.coerce.number().min(0).max(100),
});
export type PerformanceWeights = z.infer<typeof performanceWeightsSchema>;

export const performanceEnabledMetricsSchema = z.record(z.string(), z.boolean());
export type PerformanceEnabledMetrics = z.infer<
  typeof performanceEnabledMetricsSchema
>;

export const updatePerformanceScoringConfigSchema = z.object({
  weights: performanceWeightsSchema.optional(),
  enabledMetrics: performanceEnabledMetricsSchema.optional(),
  minScoreThreshold: z.coerce.number().int().min(0).max(100).optional(),
  alertThreshold: z.coerce.number().int().min(0).max(100).optional(),
  promotionMinScore: z.coerce.number().int().min(0).max(100).optional(),
  bonusMinScore: z.coerce.number().int().min(0).max(100).optional(),
  lookbackDays: z.coerce.number().int().min(7).max(365).optional(),
});
export type UpdatePerformanceScoringConfigInput = z.infer<
  typeof updatePerformanceScoringConfigSchema
>;

export const performanceScoringConfigDtoSchema = z.object({
  id: uuidSchema,
  key: z.string(),
  weights: performanceWeightsSchema,
  enabledMetrics: performanceEnabledMetricsSchema,
  minScoreThreshold: z.number().int(),
  alertThreshold: z.number().int(),
  promotionMinScore: z.number().int(),
  bonusMinScore: z.number().int(),
  lookbackDays: z.number().int(),
  updatedAt: z.string().datetime(),
});
export type PerformanceScoringConfigDto = z.infer<
  typeof performanceScoringConfigDtoSchema
>;

export const performanceComponentScoreSchema = z.object({
  key: z.string(),
  label: z.string(),
  score: z.number(),
  weight: z.number(),
  weighted: z.number(),
  enabled: z.boolean(),
});
export type PerformanceComponentScore = z.infer<
  typeof performanceComponentScoreSchema
>;

export const performanceInsightDtoSchema = z.object({
  id: uuidSchema.optional(),
  severity: z.enum(["info", "success", "warning", "critical"]),
  category: z.string(),
  message: z.string(),
  metricKey: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});
export type PerformanceInsightDto = z.infer<typeof performanceInsightDtoSchema>;

export const approveMonthlyReportSchema = z.object({
  managerNotes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(["APPROVED", "ADJUSTED"]).optional().default("APPROVED"),
});
export type ApproveMonthlyReportInput = z.infer<typeof approveMonthlyReportSchema>;

export const recalculatePerformanceSchema = z.object({
  employeeId: uuidSchema.optional(),
  lookbackDays: z.coerce.number().int().min(7).max(365).optional(),
});
export type RecalculatePerformanceInput = z.infer<
  typeof recalculatePerformanceSchema
>;

export const goalIdParamsSchema = z.object({ id: uuidSchema });
export type GoalIdParamsInput = z.infer<typeof goalIdParamsSchema>;

export const createEmployeeDocumentSchema = z.object({
  type: documentTypeSchema,
  title: z.string().trim().min(1).max(200),
  fileUrl: z.string().url().max(2048),
  fileName: z.string().trim().max(255).optional().nullable(),
  mimeType: z.string().trim().max(100).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});
export type CreateEmployeeDocumentInput = z.infer<typeof createEmployeeDocumentSchema>;

export const createPromotionSchema = z.object({
  effectiveDate: dateOnlySchema,
  newDesignation: z.string().trim().min(1).max(120),
  oldDesignation: z.string().trim().max(120).optional().nullable(),
  oldSalary: z.coerce.number().min(0).max(999_999_999).optional().nullable(),
  newSalary: z.coerce.number().min(0).max(999_999_999).optional().nullable(),
  reason: z.string().trim().max(1000).optional().nullable(),
});
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;

export const createTransferSchema = z.object({
  effectiveDate: dateOnlySchema,
  toDepartmentId: uuidSchema.optional().nullable(),
  toTeamId: uuidSchema.optional().nullable(),
  toManagerId: uuidSchema.optional().nullable(),
  reason: z.string().trim().max(1000).optional().nullable(),
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

const userSummarySchema = z.object({
  id: uuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable().optional(),
  roleCode: z.string().optional(),
  roleName: z.string().optional(),
});

export const departmentDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  headId: uuidSchema.nullable(),
  employeeCount: z.number().int().optional(),
  teamCount: z.number().int().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  head: userSummarySchema.nullable().optional(),
});
export type DepartmentDto = z.infer<typeof departmentDtoSchema>;

export const employeeProfileDtoSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  employeeCode: z.string(),
  adminCode: z.string().nullable().optional(),
  departmentId: uuidSchema.nullable(),
  primaryTeamId: uuidSchema.nullable().optional(),
  designation: z.string().nullable(),
  managerId: uuidSchema.nullable(),
  status: employeeStatusSchema,
  employmentType: employmentTypeSchema.optional(),
  gender: employeeGenderSchema.nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  nationalId: z.string().nullable().optional(),
  hireDate: z.string().nullable(),
  phone: z.string().nullable(),
  workLocation: z.string().nullable(),
  address: z.string().nullable().optional(),
  salary: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  skills: z.array(z.string()),
  experienceYears: z.number().nullable(),
  bio: z.string().nullable(),
  documentUrls: z.array(z.string()),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  emergencyContactRelation: z.string().nullable(),
  annualLeaveBalance: z.number().int(),
  sickLeaveBalance: z.number().int(),
  fatherName: z.string().nullable().optional(),
  maritalStatus: maritalStatusSchema.nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  personalEmail: z.string().nullable().optional(),
  companyEmail: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  shift: workShiftSchema.nullable().optional(),
  casualLeaveBalance: z.number().int().optional(),
  medicalLeaveBalance: z.number().int().optional(),
  badgeNumber: z.string().nullable().optional(),
  qrToken: z.string().nullable().optional(),
  lifecycleStage: lifecycleStageSchema.optional(),
  exitDate: z.string().nullable().optional(),
  exitReason: z.string().nullable().optional(),
  createdById: uuidSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: userSummarySchema.optional(),
  department: departmentDtoSchema.optional().nullable(),
  primaryTeam: z
    .object({
      id: uuidSchema,
      name: z.string(),
    })
    .nullable()
    .optional(),
  manager: userSummarySchema.nullable().optional(),
  createdBy: userSummarySchema.nullable().optional(),
});
export type EmployeeProfileDto = z.infer<typeof employeeProfileDtoSchema>;

export const performanceScoreSnapshotDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  overallScore: z.number().int(),
  componentScores: z.array(performanceComponentScoreSchema),
  scoreBreakdown: z
    .object({
      attendance: z.number(),
      productivity: z.number(),
      discipline: z.number(),
      collaboration: z.number(),
      leadership: z.number(),
      quality: z.number(),
      communication: z.number(),
      innovation: z.number(),
      engagement: z.number(),
      consistency: z.number(),
    })
    .nullable()
    .optional(),
  metrics: z.record(z.string(), z.number()).nullable().optional(),
  predictions: z
    .object({
      burnoutRisk: z.number(),
      attritionRisk: z.number(),
      engagementScore: z.number(),
      consistencyScore: z.number(),
    })
    .nullable()
    .optional(),
  recommendations: z
    .object({
      promotionReady: z.boolean(),
      salaryReviewSuggested: z.boolean(),
      bonusSuggested: z.boolean(),
      trainingPrograms: z.array(z.string()),
      managerReviewNeeded: z.boolean(),
    })
    .nullable()
    .optional(),
  departmentRank: z.number().int().nullable().optional(),
  organizationRank: z.number().int().nullable().optional(),
  derivedRating: performanceRatingSchema,
  insights: z.array(performanceInsightDtoSchema),
  trendDelta: z.number().int(),
  source: z.enum(["MANUAL", "AUTO", "HYBRID"]),
  computedAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
});
export type PerformanceScoreSnapshotDto = z.infer<
  typeof performanceScoreSnapshotDtoSchema
>;

export const performanceDashboardDtoSchema = z.object({
  overallAverage: z.number(),
  scoredEmployees: z.number().int(),
  weeklyTrend: z.array(z.object({ label: z.string(), value: z.number() })),
  monthlyTrend: z.array(z.object({ label: z.string(), value: z.number() })),
  productivityTrend: z.array(z.object({ label: z.string(), value: z.number() })),
  attendanceTrend: z.array(z.object({ label: z.string(), value: z.number() })),
  goalProgressAverage: z.number(),
  kpiCompletionRate: z.number(),
  pillarAverages: z
    .object({
      attendance: z.number(),
      productivity: z.number(),
      discipline: z.number(),
      collaboration: z.number(),
      leadership: z.number(),
    })
    .optional(),
  topPerformers: z.array(
    z.object({
      employeeId: uuidSchema,
      name: z.string(),
      score: z.number(),
      department: z.string().nullable(),
    }),
  ),
  needsAttention: z.array(
    z.object({
      employeeId: uuidSchema,
      name: z.string(),
      score: z.number(),
      reason: z.string(),
    }),
  ),
  burnoutRisks: z
    .array(
      z.object({
        employeeId: uuidSchema,
        name: z.string(),
        risk: z.number(),
      }),
    )
    .optional(),
  attritionRisks: z
    .array(
      z.object({
        employeeId: uuidSchema,
        name: z.string(),
        risk: z.number(),
      }),
    )
    .optional(),
  departmentRankings: z.array(
    z.object({ department: z.string(), averageScore: z.number(), count: z.number() }),
  ),
  teamRankings: z.array(
    z.object({ team: z.string(), averageScore: z.number(), count: z.number() }),
  ),
  recentInsights: z.array(performanceInsightDtoSchema),
  snapshots: z.array(performanceScoreSnapshotDtoSchema),
});
export type PerformanceDashboardDto = z.infer<typeof performanceDashboardDtoSchema>;

export const performanceMonthlyReportDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  year: z.number().int(),
  month: z.number().int(),
  overallScore: z.number().int(),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  improvements: z.array(z.string()),
  aiRecommendations: z.array(z.string()),
  promotionReady: z.boolean(),
  salaryReviewSuggested: z.boolean(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "ADJUSTED"]),
  managerNotes: z.string().nullable(),
  componentScores: z.array(performanceComponentScoreSchema),
  createdAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
});
export type PerformanceMonthlyReportDto = z.infer<
  typeof performanceMonthlyReportDtoSchema
>;

export const hireEmployeeResultSchema = z.object({
  employee: employeeProfileDtoSchema,
  temporaryPassword: z.string(),
  invitationSent: z.boolean(),
  qrToken: z.string().optional().nullable(),
  companyEmail: z.string().optional().nullable(),
  badgeNumber: z.string().optional().nullable(),
  mustChangePassword: z.boolean().optional(),
});
export type HireEmployeeResult = z.infer<typeof hireEmployeeResultSchema>;

export const createAdminResultSchema = z.object({
  employee: employeeProfileDtoSchema,
  temporaryPassword: z.string(),
  invitationSent: z.boolean(),
  qrToken: z.string().optional().nullable(),
  companyEmail: z.string().optional().nullable(),
  badgeNumber: z.string().optional().nullable(),
  mustChangePassword: z.boolean().optional(),
});
export type CreateAdminResult = z.infer<typeof createAdminResultSchema>;

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
  department: departmentDtoSchema.optional().nullable(),
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
  autoScore: z.number().int().nullable().optional(),
  source: z.enum(["MANUAL", "AUTO", "HYBRID"]).optional(),
  componentScores: z.array(performanceComponentScoreSchema).optional().nullable(),
  insights: z.array(performanceInsightDtoSchema).optional().nullable(),
  managerAdjustment: z.number().int().nullable().optional(),
  managerComment: z.string().nullable().optional(),
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
  linkedTaskIds: z.array(z.string()).optional().default([]),
  autoProgress: z.boolean().optional().default(true),
  createdAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
});
export type EmployeeGoalDto = z.infer<typeof employeeGoalDtoSchema>;

export const employeeDocumentDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  type: documentTypeSchema,
  title: z.string(),
  fileUrl: z.string(),
  fileName: z.string().nullable(),
  mimeType: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  notes: z.string().nullable(),
  uploadedById: uuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  uploadedBy: userSummarySchema.nullable().optional(),
});
export type EmployeeDocumentDto = z.infer<typeof employeeDocumentDtoSchema>;

export const employeePromotionDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  effectiveDate: z.string(),
  newDesignation: z.string(),
  oldDesignation: z.string().nullable(),
  oldSalary: z.number().nullable(),
  newSalary: z.number().nullable(),
  reason: z.string().nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
  createdBy: userSummarySchema.nullable().optional(),
});
export type EmployeePromotionDto = z.infer<typeof employeePromotionDtoSchema>;

export const employeeTransferDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  effectiveDate: z.string(),
  fromDepartmentId: uuidSchema.nullable(),
  toDepartmentId: uuidSchema.nullable(),
  fromTeamId: uuidSchema.nullable(),
  toTeamId: uuidSchema.nullable(),
  fromManagerId: uuidSchema.nullable(),
  toManagerId: uuidSchema.nullable(),
  reason: z.string().nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
  fromDepartment: departmentDtoSchema.nullable().optional(),
  toDepartment: departmentDtoSchema.nullable().optional(),
  createdBy: userSummarySchema.nullable().optional(),
});
export type EmployeeTransferDto = z.infer<typeof employeeTransferDtoSchema>;

export const employeeTimelineEventDtoSchema = z.object({
  id: uuidSchema,
  employeeId: uuidSchema,
  eventType: z.string(),
  eventDate: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string().datetime(),
  employee: employeeProfileDtoSchema.optional(),
  createdBy: userSummarySchema.nullable().optional(),
});
export type EmployeeTimelineEventDto = z.infer<typeof employeeTimelineEventDtoSchema>;

export const employeeIdCardDtoSchema = z.object({
  employee: employeeProfileDtoSchema,
  qrPayload: z.string(),
  qrDataUrl: z.string().optional().nullable(),
  frontHtml: z.string().optional().nullable(),
  backHtml: z.string().optional().nullable(),
});
export type EmployeeIdCardDto = z.infer<typeof employeeIdCardDtoSchema>;

export const teamStatisticsDtoSchema = z.object({
  totalEmployees: z.number().int(),
  activeEmployees: z.number().int(),
  inactiveEmployees: z.number().int(),
  departments: z.number().int(),
  teams: z.number().int(),
  admins: z.number().int().optional(),
  presentToday: z.number().int(),
  lateToday: z.number().int(),
  pendingLeaves: z.number().int(),
  averageProductivity: z.number(),
});
export type TeamStatisticsDto = z.infer<typeof teamStatisticsDtoSchema>;
