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
  EmployeeGoalDto,
  EmployeeProfileDto,
  LeaveRequestDto,
  PerformanceReviewDto,
  TeamDto,
  TeamMemberDto,
} from "@enterprise/shared";

type UserSummary = Pick<
  User,
  "id" | "firstName" | "lastName" | "email" | "avatarUrl"
>;

function toUser(user?: UserSummary | null) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

function dateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function toDepartmentDto(
  department: Department & {
    head?: UserSummary | null;
    _count?: { employees?: number };
  },
): DepartmentDto {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    headId: department.headId,
    employeeCount: department._count?.employees,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
    head: toUser(department.head),
  };
}

export function toEmployeeDto(
  employee: EmployeeProfile & {
    user?: UserSummary;
    department?: (Department & { head?: UserSummary | null }) | null;
    manager?: UserSummary | null;
  },
): EmployeeProfileDto {
  return {
    id: employee.id,
    userId: employee.userId,
    employeeCode: employee.employeeCode,
    departmentId: employee.departmentId,
    designation: employee.designation,
    managerId: employee.managerId,
    status: employee.status,
    hireDate: dateOnly(employee.hireDate),
    phone: employee.phone,
    workLocation: employee.workLocation,
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
    sickLeaveBalance: employee.sickLeaveBalance,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    user: employee.user ? toUser(employee.user) ?? undefined : undefined,
    department: employee.department
      ? toDepartmentDto(employee.department)
      : null,
    manager: toUser(employee.manager),
  };
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
  };
}

export function toAttendanceDto(
  record: Attendance & {
    employee?: EmployeeProfile & { user?: UserSummary };
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
    employee: record.employee ? toEmployeeDto(record.employee) : undefined,
  };
}

export function toLeaveDto(
  leave: LeaveRequest & {
    employee?: EmployeeProfile & { user?: UserSummary };
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
    employee: leave.employee ? toEmployeeDto(leave.employee) : undefined,
  };
}

export function toPerformanceDto(
  review: PerformanceReview & {
    employee?: EmployeeProfile & { user?: UserSummary };
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
    kpiSummary: review.kpiSummary,
    notes: review.notes,
    createdAt: review.createdAt.toISOString(),
    employee: review.employee ? toEmployeeDto(review.employee) : undefined,
    reviewer: toUser(review.reviewer),
  };
}

export function toGoalDto(
  goal: EmployeeGoal & {
    employee?: EmployeeProfile & { user?: UserSummary };
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
    createdAt: goal.createdAt.toISOString(),
    employee: goal.employee ? toEmployeeDto(goal.employee) : undefined,
  };
}
