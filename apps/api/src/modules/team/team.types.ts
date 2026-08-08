import type {
  Attendance,
  Department,
  EmployeeGoal,
  EmployeeProfile,
  LeaveRequest,
  PerformanceReview,
  Team,
  TeamMember,
  User,
} from "@enterprise/database";
import type {
  AttendanceDto,
  DepartmentDto,
  EmployeeDtoView,
  EmployeeGoalDto,
  EmployeeProfileDto,
  LeaveRequestDto,
  PerformanceReviewDto,
  TeamDto,
  TeamMemberDto,
} from "@enterprise/shared";
import { applyEmployeeDtoFieldPolicy } from "@enterprise/shared";

import { encryptionService } from "../../shared/security/encryption.service.js";

type RoleSummary = { code: string; name: string };

type UserSummary = Pick<
  User,
  "id" | "firstName" | "lastName" | "email" | "avatarUrl"
> & {
  role?: RoleSummary | null;
};

export type EmployeeDtoSource = EmployeeProfile & {
  user?: UserSummary;
  department?: (Department & { head?: UserSummary | null }) | null;
  primaryTeam?: { id: string; name: string } | null;
  manager?: UserSummary | null;
  createdBy?: UserSummary | null;
};

export type ToEmployeeDtoOptions = {
  /** Defaults to `"public"` — never return RESTRICTED fields unless explicitly `"hr"`. */
  view?: EmployeeDtoView;
};

function toUser(user?: UserSummary | null) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    roleCode: user.role?.code,
    roleName: user.role?.name,
  };
}

function dateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function toDepartmentDto(
  department: Department & {
    head?: UserSummary | null;
    _count?: { employees?: number; teams?: number };
  },
): DepartmentDto {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    headId: department.headId,
    employeeCount: department._count?.employees,
    teamCount: department._count?.teams,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
    head: toUser(department.head),
  };
}

/**
 * Map employee row → DTO with field-level policy applied.
 * Default view is `"public"` so callers must opt into `"hr"` / `"self"`.
 */
export function toEmployeeDto(
  employee: EmployeeDtoSource,
  options?: ToEmployeeDtoOptions,
): EmployeeProfileDto {
  const view: EmployeeDtoView = options?.view ?? "public";

  const full: EmployeeProfileDto = {
    id: employee.id,
    userId: employee.userId,
    employeeCode: employee.employeeCode,
    adminCode: employee.adminCode,
    badgeNumber: employee.badgeNumber,
    qrToken: encryptionService.decryptIfNeeded(employee.qrToken) ?? null,
    departmentId: employee.departmentId,
    primaryTeamId: employee.primaryTeamId,
    designation: employee.designation,
    managerId: employee.managerId,
    status: employee.status,
    lifecycleStage: employee.lifecycleStage,
    employmentType: employee.employmentType,
    shift: employee.shift,
    gender: employee.gender,
    maritalStatus: employee.maritalStatus,
    bloodGroup: employee.bloodGroup,
    fatherName: employee.fatherName,
    dateOfBirth: dateOnly(employee.dateOfBirth),
    nationalId:
      encryptionService.decryptIfNeeded(employee.nationalId) ?? null,
    hireDate: dateOnly(employee.hireDate),
    exitDate: dateOnly(employee.exitDate),
    exitReason: employee.exitReason,
    phone: employee.phone,
    personalEmail: employee.personalEmail,
    companyEmail: employee.companyEmail,
    workLocation: employee.workLocation,
    address: employee.address,
    city: employee.city,
    country: employee.country,
    salary:
      employee.salary === null || employee.salary === undefined
        ? null
        : Number(employee.salary),
    notes: employee.notes,
    photoUrl: employee.photoUrl,
    skills: employee.skills,
    experienceYears:
      employee.experienceYears === null || employee.experienceYears === undefined
        ? null
        : Number(employee.experienceYears),
    bio: employee.bio,
    documentUrls: employee.documentUrls,
    emergencyContactName: employee.emergencyContactName,
    emergencyContactPhone: employee.emergencyContactPhone,
    emergencyContactRelation: employee.emergencyContactRelation,
    annualLeaveBalance: employee.annualLeaveBalance,
    casualLeaveBalance: employee.casualLeaveBalance,
    sickLeaveBalance: employee.sickLeaveBalance,
    medicalLeaveBalance: employee.medicalLeaveBalance,
    createdById: employee.createdById,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    user: employee.user ? toUser(employee.user) ?? undefined : undefined,
    department: employee.department
      ? toDepartmentDto(employee.department)
      : null,
    primaryTeam: employee.primaryTeam
      ? { id: employee.primaryTeam.id, name: employee.primaryTeam.name }
      : null,
    manager: toUser(employee.manager),
    createdBy: toUser(employee.createdBy),
  };

  return applyEmployeeDtoFieldPolicy(
    full as unknown as Record<string, unknown>,
    view,
  ) as EmployeeProfileDto;
}

export function toTeamMemberDto(
  member: TeamMember & { user?: UserSummary },
): TeamMemberDto {
  return {
    id: member.id,
    teamId: member.teamId,
    userId: member.userId,
    roleLabel: member.roleLabel,
    joinedAt: member.joinedAt.toISOString(),
    user: member.user ? toUser(member.user) ?? undefined : undefined,
  };
}

export function toTeamDto(
  team: Team & {
    leader?: UserSummary | null;
    members?: (TeamMember & { user?: UserSummary })[];
    department?: (Department & { head?: UserSummary | null }) | null;
    _count?: { members?: number };
  },
): TeamDto {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    departmentId: team.departmentId,
    leaderId: team.leaderId,
    memberCount: team._count?.members ?? team.members?.length,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    leader: toUser(team.leader),
    members: team.members?.map(toTeamMemberDto),
    department: team.department ? toDepartmentDto(team.department) : null,
  };
}

export function toAttendanceDto(
  record: Attendance & {
    employee?: EmployeeDtoSource;
  },
): AttendanceDto {
  return {
    id: record.id,
    employeeId: record.employeeId,
    date: dateOnly(record.date)!,
    checkInAt: record.checkInAt?.toISOString() ?? null,
    checkOutAt: record.checkOutAt?.toISOString() ?? null,
    status: record.status,
    workingMinutes: record.workingMinutes,
    overtimeMinutes: record.overtimeMinutes,
    isLate: record.isLate,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    employee: record.employee
      ? toEmployeeDto(record.employee, { view: "public" })
      : undefined,
  };
}

export function toLeaveDto(
  leave: LeaveRequest & {
    employee?: EmployeeDtoSource;
  },
): LeaveRequestDto {
  return {
    id: leave.id,
    employeeId: leave.employeeId,
    type: leave.type,
    status: leave.status,
    startDate: dateOnly(leave.startDate)!,
    endDate: dateOnly(leave.endDate)!,
    days: leave.days,
    reason: leave.reason,
    reviewNote: leave.reviewNote,
    reviewedById: leave.reviewedById,
    reviewedAt: leave.reviewedAt?.toISOString() ?? null,
    createdAt: leave.createdAt.toISOString(),
    employee: leave.employee
      ? toEmployeeDto(leave.employee, { view: "public" })
      : undefined,
    workflowState: null,
    workflow: null,
  };
}

export function withLeaveWorkflow(
  dto: LeaveRequestDto,
  stage: {
    state: NonNullable<LeaveRequestDto["workflowState"]>;
    submittedAt: string;
    expiresAt: string;
    managerApproverId?: string | null;
    managerApprovedAt?: string | null;
    hrApproverId?: string | null;
    hrApprovedAt?: string | null;
    finalApproverId?: string | null;
    finalApprovedAt?: string | null;
    overrideById?: string | null;
    overrideAt?: string | null;
    overrideAction?: "APPROVE" | "REJECT" | null;
  } | null,
): LeaveRequestDto {
  if (!stage) return dto;
  return {
    ...dto,
    workflowState: stage.state,
    workflow: {
      state: stage.state,
      submittedAt: stage.submittedAt,
      expiresAt: stage.expiresAt,
      managerApproverId: stage.managerApproverId ?? null,
      managerApprovedAt: stage.managerApprovedAt ?? null,
      hrApproverId: stage.hrApproverId ?? null,
      hrApprovedAt: stage.hrApprovedAt ?? null,
      finalApproverId: stage.finalApproverId ?? null,
      finalApprovedAt: stage.finalApprovedAt ?? null,
      overrideById: stage.overrideById ?? null,
      overrideAt: stage.overrideAt ?? null,
      overrideAction: stage.overrideAction ?? null,
    },
  };
}

export function toPerformanceDto(
  review: PerformanceReview & {
    employee?: EmployeeDtoSource;
    reviewer?: UserSummary | null;
  },
): PerformanceReviewDto {
  return {
    id: review.id,
    employeeId: review.employeeId,
    reviewerId: review.reviewerId,
    periodLabel: review.periodLabel,
    periodStart: dateOnly(review.periodStart)!,
    periodEnd: dateOnly(review.periodEnd)!,
    rating: review.rating,
    productivityScore: review.productivityScore,
    autoScore: review.autoScore ?? null,
    source: review.source ?? "MANUAL",
    componentScores: Array.isArray(review.componentScores)
      ? (review.componentScores as PerformanceReviewDto["componentScores"])
      : null,
    insights: Array.isArray(review.insights)
      ? (review.insights as PerformanceReviewDto["insights"])
      : null,
    managerAdjustment: review.managerAdjustment ?? null,
    managerComment: review.managerComment ?? null,
    kpiSummary: review.kpiSummary,
    notes: review.notes,
    createdAt: review.createdAt.toISOString(),
    employee: review.employee
      ? toEmployeeDto(review.employee, { view: "public" })
      : undefined,
    reviewer: toUser(review.reviewer),
  };
}

export function toGoalDto(
  goal: EmployeeGoal & {
    employee?: EmployeeDtoSource;
  },
): EmployeeGoalDto {
  return {
    id: goal.id,
    employeeId: goal.employeeId,
    title: goal.title,
    description: goal.description,
    kpiMetric: goal.kpiMetric,
    targetValue: goal.targetValue,
    progress: goal.progress,
    status: goal.status,
    dueDate: dateOnly(goal.dueDate),
    linkedTaskIds: goal.linkedTaskIds ?? [],
    autoProgress: goal.autoProgress ?? true,
    createdAt: goal.createdAt.toISOString(),
    employee: goal.employee
      ? toEmployeeDto(goal.employee, { view: "public" })
      : undefined,
  };
}
