import type { Prisma } from "@enterprise/database";
import type {
  AttendanceListResponse,
  CheckInInput,
  CheckOutInput,
  CreateDepartmentInput,
  CreateEmployeeGoalInput,
  CreateEmployeeProfileInput,
  CreateLeaveRequestInput,
  CreatePerformanceReviewInput,
  CreateTeamInput,
  DepartmentListResponse,
  EmployeeListResponse,
  GoalListResponse,
  LeaveListResponse,
  ListAttendanceQueryInput,
  ListEmployeesQueryInput,
  ListLeavesQueryInput,
  PerformanceListResponse,
  ReviewLeaveInput,
  TeamListResponse,
  TeamMembersInput,
  TeamStatistics,
  UpdateDepartmentInput,
  UpdateEmployeeGoalInput,
  UpdateEmployeeProfileInput,
  UpdatePerformanceReviewInput,
  UpdateTeamInput,
} from "@enterprise/shared";
import { UserRole } from "@enterprise/shared";

import { TEAM_AUDIT_ACTIONS, logTeamAuditEvent } from "./team.audit.js";
import { TEAM_ERROR_CODES, TeamError } from "./team.errors.js";
import { teamRepository } from "./team.repository.js";
import {
  toAttendanceDto,
  toDepartmentDto,
  toEmployeeDto,
  toGoalDto,
  toLeaveDto,
  toPerformanceDto,
  toTeamDto,
} from "./team.types.js";

export interface TeamActor {
  userId: string;
  role: string;
  email: string;
  permissions: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

function isAdmin(actor: TeamActor): boolean {
  return actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN;
}

function isClient(actor: TeamActor): boolean {
  return actor.role === UserRole.CLIENT;
}

function hasPermission(actor: TeamActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function assertTeamAccess(actor: TeamActor): void {
  if (isClient(actor) || !hasPermission(actor, "team:read")) {
    throw new TeamError("Permission denied", 403, TEAM_ERROR_CODES.FORBIDDEN);
  }
}

function assertManage(actor: TeamActor): void {
  assertTeamAccess(actor);
  if (!hasPermission(actor, "team:manage") && !isAdmin(actor)) {
    throw new TeamError("Permission denied", 403, TEAM_ERROR_CODES.FORBIDDEN);
  }
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function countLeaveDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function expectedCheckInHour(): number {
  return 9;
}

export class TeamService {
  async statistics(actor: TeamActor): Promise<TeamStatistics> {
    assertTeamAccess(actor);
    const today = utcToday();
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      departments,
      teams,
      presentToday,
      lateToday,
      pendingLeaves,
      avg,
    ] = await Promise.all([
      teamRepository.countEmployees(),
      teamRepository.countEmployees({ status: "ACTIVE" }),
      teamRepository.countEmployees({ status: { not: "ACTIVE" } }),
      teamRepository.countDepartments(),
      teamRepository.countTeams(),
      teamRepository.countAttendance({
        deletedAt: null,
        date: today,
        status: { in: ["PRESENT", "REMOTE", "LATE", "HALF_DAY"] },
      }),
      teamRepository.countAttendance({
        deletedAt: null,
        date: today,
        isLate: true,
      }),
      teamRepository.countLeaves({
        deletedAt: null,
        status: "PENDING",
      }),
      teamRepository.averageProductivity(),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      departments,
      teams,
      presentToday,
      lateToday,
      pendingLeaves,
      averageProductivity: Number(avg._avg.productivityScore ?? 0),
    };
  }

  async listDepartments(actor: TeamActor): Promise<DepartmentListResponse> {
    assertTeamAccess(actor);
    const items = await teamRepository.listDepartments();
    return { items: items.map(toDepartmentDto) };
  }

  async createDepartment(input: CreateDepartmentInput, actor: TeamActor) {
    assertManage(actor);
    const department = await teamRepository.createDepartment({
      ...input,
      createdById: actor.userId,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.DEPARTMENT_CREATE,
      resourceId: department.id,
      metadata: { name: department.name },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toDepartmentDto(department);
  }

  async updateDepartment(
    id: string,
    input: UpdateDepartmentInput,
    actor: TeamActor,
  ) {
    assertManage(actor);
    const existing = await teamRepository.getDepartment(id);
    if (!existing) {
      throw new TeamError("Department not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    const department = await teamRepository.updateDepartment(id, {
      ...input,
      updatedById: actor.userId,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.DEPARTMENT_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toDepartmentDto(department);
  }

  async deleteDepartment(id: string, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getDepartment(id);
    if (!existing) {
      throw new TeamError("Department not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await teamRepository.softDeleteDepartment(id, actor.userId);
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.DEPARTMENT_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return { id };
  }

  async listEmployees(
    query: ListEmployeesQueryInput,
    actor: TeamActor,
  ): Promise<EmployeeListResponse> {
    assertTeamAccess(actor);

    const where: Prisma.EmployeeProfileWhereInput = {
      deletedAt: null,
      ...(isAdmin(actor) || hasPermission(actor, "team:manage")
        ? {}
        : { userId: actor.userId }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.search
        ? {
            OR: [
              { employeeCode: { contains: query.search, mode: "insensitive" } },
              { designation: { contains: query.search, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { firstName: { contains: query.search, mode: "insensitive" } },
                    { lastName: { contains: query.search, mode: "insensitive" } },
                    { email: { contains: query.search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const { items, total } = await teamRepository.listEmployees({
      where,
      skip,
      take: query.limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toEmployeeDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getEmployee(id: string, actor: TeamActor) {
    assertTeamAccess(actor);
    const employee = await teamRepository.getEmployee(id);
    if (!employee) {
      throw new TeamError("Employee not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    if (
      !isAdmin(actor) &&
      !hasPermission(actor, "team:manage") &&
      employee.userId !== actor.userId
    ) {
      throw new TeamError("Permission denied", 403, TEAM_ERROR_CODES.FORBIDDEN);
    }
    return toEmployeeDto(employee);
  }

  async createEmployee(input: CreateEmployeeProfileInput, actor: TeamActor) {
    assertManage(actor);
    const employee = await teamRepository.createEmployee({
      userId: input.userId,
      employeeCode: input.employeeCode,
      departmentId: input.departmentId ?? null,
      designation: input.designation ?? null,
      managerId: input.managerId ?? null,
      status: input.status,
      hireDate: input.hireDate ? parseDateOnly(input.hireDate) : null,
      phone: input.phone ?? null,
      workLocation: input.workLocation ?? null,
      skills: input.skills,
      experienceYears: input.experienceYears ?? null,
      bio: input.bio ?? null,
      documentUrls: input.documentUrls,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelation: input.emergencyContactRelation ?? null,
      annualLeaveBalance: input.annualLeaveBalance,
      sickLeaveBalance: input.sickLeaveBalance,
      createdById: actor.userId,
      updatedById: actor.userId,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_CREATE,
      resourceId: employee.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toEmployeeDto(employee);
  }

  async updateEmployee(
    id: string,
    input: UpdateEmployeeProfileInput,
    actor: TeamActor,
  ) {
    assertTeamAccess(actor);
    const existing = await teamRepository.getEmployee(id);
    if (!existing) {
      throw new TeamError("Employee not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }

    const canManage = isAdmin(actor) || hasPermission(actor, "team:manage");
    const isSelf = existing.userId === actor.userId;
    if (!canManage && !isSelf) {
      throw new TeamError("Permission denied", 403, TEAM_ERROR_CODES.FORBIDDEN);
    }

    // Employees may only update limited personal fields
    const data = canManage
      ? {
          ...(input.employeeCode !== undefined
            ? { employeeCode: input.employeeCode }
            : {}),
          ...(input.departmentId !== undefined
            ? { departmentId: input.departmentId }
            : {}),
          ...(input.designation !== undefined
            ? { designation: input.designation }
            : {}),
          ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.hireDate !== undefined
            ? { hireDate: input.hireDate ? parseDateOnly(input.hireDate) : null }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.workLocation !== undefined
            ? { workLocation: input.workLocation }
            : {}),
          ...(input.skills !== undefined ? { skills: input.skills } : {}),
          ...(input.experienceYears !== undefined
            ? { experienceYears: input.experienceYears }
            : {}),
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.documentUrls !== undefined
            ? { documentUrls: input.documentUrls }
            : {}),
          ...(input.emergencyContactName !== undefined
            ? { emergencyContactName: input.emergencyContactName }
            : {}),
          ...(input.emergencyContactPhone !== undefined
            ? { emergencyContactPhone: input.emergencyContactPhone }
            : {}),
          ...(input.emergencyContactRelation !== undefined
            ? { emergencyContactRelation: input.emergencyContactRelation }
            : {}),
          ...(input.annualLeaveBalance !== undefined
            ? { annualLeaveBalance: input.annualLeaveBalance }
            : {}),
          ...(input.sickLeaveBalance !== undefined
            ? { sickLeaveBalance: input.sickLeaveBalance }
            : {}),
          updatedById: actor.userId,
        }
      : {
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.skills !== undefined ? { skills: input.skills } : {}),
          ...(input.emergencyContactName !== undefined
            ? { emergencyContactName: input.emergencyContactName }
            : {}),
          ...(input.emergencyContactPhone !== undefined
            ? { emergencyContactPhone: input.emergencyContactPhone }
            : {}),
          ...(input.emergencyContactRelation !== undefined
            ? { emergencyContactRelation: input.emergencyContactRelation }
            : {}),
          updatedById: actor.userId,
        };

    const employee = await teamRepository.updateEmployee(id, data);
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toEmployeeDto(employee);
  }

  async deleteEmployee(id: string, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getEmployee(id);
    if (!existing) {
      throw new TeamError("Employee not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await teamRepository.softDeleteEmployee(id, actor.userId);
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return { id };
  }

  async listTeams(actor: TeamActor): Promise<TeamListResponse> {
    assertTeamAccess(actor);
    const items = await teamRepository.listTeams();
    return { items: items.map(toTeamDto) };
  }

  async createTeam(input: CreateTeamInput, actor: TeamActor) {
    assertManage(actor);
    const team = await teamRepository.createTeam({
      name: input.name,
      description: input.description,
      departmentId: input.departmentId,
      leaderId: input.leaderId,
      createdById: actor.userId,
      memberUserIds: input.memberUserIds,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.TEAM_CREATE,
      resourceId: team.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toTeamDto(team);
  }

  async updateTeam(id: string, input: UpdateTeamInput, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getTeam(id);
    if (!existing) {
      throw new TeamError("Team not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    const team = await teamRepository.updateTeam(id, {
      name: input.name,
      description: input.description,
      departmentId: input.departmentId,
      leaderId: input.leaderId,
      memberUserIds: input.memberUserIds,
      updatedById: actor.userId,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.TEAM_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toTeamDto(team);
  }

  async deleteTeam(id: string, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getTeam(id);
    if (!existing) {
      throw new TeamError("Team not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await teamRepository.softDeleteTeam(id, actor.userId);
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.TEAM_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return { id };
  }

  async addMembers(id: string, input: TeamMembersInput, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getTeam(id);
    if (!existing) {
      throw new TeamError("Team not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await teamRepository.addTeamMembers(id, input.userIds, input.roleLabel);
    const team = await teamRepository.getTeam(id);
    return toTeamDto(team!);
  }

  async removeMember(id: string, userId: string, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getTeam(id);
    if (!existing) {
      throw new TeamError("Team not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await teamRepository.removeTeamMember(id, userId);
    const team = await teamRepository.getTeam(id);
    return toTeamDto(team!);
  }

  private async requireOwnProfile(actor: TeamActor) {
    const profile = await teamRepository.getEmployeeByUserId(actor.userId);
    if (!profile) {
      throw new TeamError(
        "Employee profile not found",
        404,
        TEAM_ERROR_CODES.NOT_FOUND,
      );
    }
    return profile;
  }

  async listAttendance(
    query: ListAttendanceQueryInput,
    actor: TeamActor,
  ): Promise<AttendanceListResponse> {
    assertTeamAccess(actor);
    const canManage = isAdmin(actor) || hasPermission(actor, "team:manage");
    let employeeId = query.employeeId;
    if (!canManage) {
      const profile = await this.requireOwnProfile(actor);
      employeeId = profile.id;
    }

    const where: Prisma.AttendanceWhereInput = {
      deletedAt: null,
      ...(employeeId ? { employeeId } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
              ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const { items, total } = await teamRepository.listAttendance({
      where,
      skip,
      take: query.limit,
    });
    return {
      items: items.map(toAttendanceDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        timestamp: new Date().toISOString(),
      },
    };
  }

  async checkIn(input: CheckInInput, actor: TeamActor) {
    assertTeamAccess(actor);
    const profile = await this.requireOwnProfile(actor);
    const today = utcToday();
    const existing = await teamRepository.getAttendanceByEmployeeDate(
      profile.id,
      today,
    );
    if (existing?.checkInAt) {
      throw new TeamError(
        "Already checked in today",
        409,
        TEAM_ERROR_CODES.CONFLICT,
      );
    }

    const now = new Date();
    const isLate =
      now.getUTCHours() > expectedCheckInHour() ||
      (now.getUTCHours() === expectedCheckInHour() && now.getUTCMinutes() > 0);

    const result = await teamRepository.createAttendance({
      employeeId: profile.id,
      date: today,
      checkInAt: now,
      status: isLate ? "LATE" : "PRESENT",
      isLate,
      notes: input.notes,
      createdById: actor.userId,
    });

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.ATTENDANCE_CHECK_IN,
      resourceId: result.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toAttendanceDto(result);
  }

  async checkOut(input: CheckOutInput, actor: TeamActor) {
    assertTeamAccess(actor);
    const profile = await this.requireOwnProfile(actor);
    const today = utcToday();
    const existing = await teamRepository.getAttendanceByEmployeeDate(
      profile.id,
      today,
    );
    if (!existing?.checkInAt) {
      throw new TeamError(
        "Check in required before check out",
        400,
        TEAM_ERROR_CODES.VALIDATION,
      );
    }
    if (existing.checkOutAt) {
      throw new TeamError(
        "Already checked out today",
        409,
        TEAM_ERROR_CODES.CONFLICT,
      );
    }

    const now = new Date();
    const workingMinutes = Math.max(
      0,
      Math.round((now.getTime() - existing.checkInAt.getTime()) / 60000),
    );
    const standard = 8 * 60;
    const overtimeMinutes = Math.max(0, workingMinutes - standard);

    const record = await teamRepository.updateAttendance(existing.id, {
      checkOutAt: now,
      workingMinutes,
      overtimeMinutes,
      notes: input.notes ?? existing.notes,
      updatedById: actor.userId,
    });

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.ATTENDANCE_CHECK_OUT,
      resourceId: record.id,
      metadata: { workingMinutes, overtimeMinutes },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toAttendanceDto(record);
  }

  async listLeaves(
    query: ListLeavesQueryInput,
    actor: TeamActor,
  ): Promise<LeaveListResponse> {
    assertTeamAccess(actor);
    const canManage = isAdmin(actor) || hasPermission(actor, "team:manage");
    let employeeId = query.employeeId;
    if (!canManage) {
      const profile = await this.requireOwnProfile(actor);
      employeeId = profile.id;
    }

    const where: Prisma.LeaveRequestWhereInput = {
      deletedAt: null,
      ...(employeeId ? { employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            startDate: {
              ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
              ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const { items, total } = await teamRepository.listLeaves({
      where,
      skip,
      take: query.limit,
    });
    return {
      items: items.map(toLeaveDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        timestamp: new Date().toISOString(),
      },
    };
  }

  async applyLeave(input: CreateLeaveRequestInput, actor: TeamActor) {
    assertTeamAccess(actor);
    const profile = await this.requireOwnProfile(actor);
    const start = parseDateOnly(input.startDate);
    const end = parseDateOnly(input.endDate);
    const days = countLeaveDays(start, end);

    const leave = await teamRepository.createLeave({
      employeeId: profile.id,
      type: input.type,
      startDate: start,
      endDate: end,
      days,
      reason: input.reason,
      createdById: actor.userId,
    });

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.LEAVE_APPLY,
      resourceId: leave.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toLeaveDto(leave);
  }

  async reviewLeave(id: string, input: ReviewLeaveInput, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getLeave(id);
    if (!existing) {
      throw new TeamError("Leave request not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    if (existing.status !== "PENDING") {
      throw new TeamError(
        "Leave request already reviewed",
        409,
        TEAM_ERROR_CODES.CONFLICT,
      );
    }

    const leave = await teamRepository.reviewLeave(id, {
      status: input.status,
      reviewNote: input.reviewNote,
      reviewedById: actor.userId,
    });

    if (input.status === "APPROVED") {
      const employee = existing.employee;
      if (employee) {
        if (existing.type === "ANNUAL") {
          await teamRepository.updateEmployee(employee.id, {
            annualLeaveBalance: Math.max(
              0,
              employee.annualLeaveBalance - existing.days,
            ),
            updatedById: actor.userId,
          });
        } else if (existing.type === "SICK") {
          await teamRepository.updateEmployee(employee.id, {
            sickLeaveBalance: Math.max(
              0,
              employee.sickLeaveBalance - existing.days,
            ),
            updatedById: actor.userId,
          });
        }
      }
    }

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.LEAVE_REVIEW,
      resourceId: id,
      metadata: { status: input.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toLeaveDto(leave);
  }

  async listPerformance(actor: TeamActor): Promise<PerformanceListResponse> {
    assertTeamAccess(actor);
    const canManage = isAdmin(actor) || hasPermission(actor, "team:manage");
    const where: Prisma.PerformanceReviewWhereInput = {
      deletedAt: null,
      ...(canManage
        ? {}
        : {
            employee: { userId: actor.userId, deletedAt: null },
          }),
    };
    const items = await teamRepository.listPerformance(where);
    return { items: items.map(toPerformanceDto) };
  }

  async createPerformance(
    input: CreatePerformanceReviewInput,
    actor: TeamActor,
  ) {
    assertManage(actor);
    const review = await teamRepository.createPerformance({
      employeeId: input.employeeId,
      reviewerId: actor.userId,
      periodLabel: input.periodLabel,
      periodStart: parseDateOnly(input.periodStart),
      periodEnd: parseDateOnly(input.periodEnd),
      rating: input.rating,
      productivityScore: input.productivityScore,
      kpiSummary: input.kpiSummary,
      notes: input.notes,
      createdById: actor.userId,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.PERFORMANCE_CREATE,
      resourceId: review.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toPerformanceDto(review);
  }

  async updatePerformance(
    id: string,
    input: UpdatePerformanceReviewInput,
    actor: TeamActor,
  ) {
    assertManage(actor);
    const existing = await teamRepository.getPerformance(id);
    if (!existing) {
      throw new TeamError(
        "Performance review not found",
        404,
        TEAM_ERROR_CODES.NOT_FOUND,
      );
    }
    const review = await teamRepository.updatePerformance(id, {
      ...(input.periodLabel !== undefined
        ? { periodLabel: input.periodLabel }
        : {}),
      ...(input.periodStart !== undefined
        ? { periodStart: parseDateOnly(input.periodStart) }
        : {}),
      ...(input.periodEnd !== undefined
        ? { periodEnd: parseDateOnly(input.periodEnd) }
        : {}),
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.productivityScore !== undefined
        ? { productivityScore: input.productivityScore }
        : {}),
      ...(input.kpiSummary !== undefined ? { kpiSummary: input.kpiSummary } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedById: actor.userId,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.PERFORMANCE_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toPerformanceDto(review);
  }

  async listGoals(actor: TeamActor): Promise<GoalListResponse> {
    assertTeamAccess(actor);
    const canManage = isAdmin(actor) || hasPermission(actor, "team:manage");
    const where: Prisma.EmployeeGoalWhereInput = {
      deletedAt: null,
      ...(canManage
        ? {}
        : { employee: { userId: actor.userId, deletedAt: null } }),
    };
    const items = await teamRepository.listGoals(where);
    return { items: items.map(toGoalDto) };
  }

  async createGoal(input: CreateEmployeeGoalInput, actor: TeamActor) {
    assertManage(actor);
    const goal = await teamRepository.createGoal({
      employeeId: input.employeeId,
      title: input.title,
      description: input.description,
      kpiMetric: input.kpiMetric,
      targetValue: input.targetValue,
      progress: input.progress,
      status: input.status,
      dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null,
      createdById: actor.userId,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.GOAL_CREATE,
      resourceId: goal.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toGoalDto(goal);
  }

  async updateGoal(id: string, input: UpdateEmployeeGoalInput, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getGoal(id);
    if (!existing) {
      throw new TeamError("Goal not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    const goal = await teamRepository.updateGoal(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.kpiMetric !== undefined ? { kpiMetric: input.kpiMetric } : {}),
      ...(input.targetValue !== undefined
        ? { targetValue: input.targetValue }
        : {}),
      ...(input.progress !== undefined ? { progress: input.progress } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null }
        : {}),
      updatedById: actor.userId,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.GOAL_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toGoalDto(goal);
  }

  async deleteGoal(id: string, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getGoal(id);
    if (!existing) {
      throw new TeamError("Goal not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await teamRepository.softDeleteGoal(id, actor.userId);
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.GOAL_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return { id };
  }
}

export const teamService = new TeamService();
