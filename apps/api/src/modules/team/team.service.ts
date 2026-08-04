import { randomBytes } from "node:crypto";

import {
  NotificationCategory,
  NotificationPriority,
  prisma,
  UserStatus,
  Prisma,
} from "@enterprise/database";
import type {
  AssignDepartmentEmployeesInput,
  AttendanceListResponse,
  CheckInInput,
  CheckOutInput,
  CreateAdminInput,
  CreateAdminResult,
  CreateDepartmentInput,
  CreateEmployeeGoalInput,
  CreateEmployeeProfileInput,
  CreateLeaveRequestInput,
  CreatePerformanceReviewInput,
  CreateTeamInput,
  DepartmentListResponse,
  EmployeeListResponse,
  GoalListResponse,
  HireEmployeeInput,
  HireEmployeeResult,
  LeaveListResponse,
  ListAttendanceQueryInput,
  ListEmployeesQueryInput,
  ListLeavesQueryInput,
  PerformanceListResponse,
  ReviewLeaveInput,
  TeamListResponse,
  TeamMembersInput,
  TeamStatistics,
  TransferTeamMemberInput,
  UpdateDepartmentInput,
  UpdateEmployeeGoalInput,
  UpdateEmployeeProfileInput,
  UpdatePerformanceReviewInput,
  UpdateTeamInput,
  ApproveMonthlyReportInput,
  RecalculatePerformanceInput,
  UpdatePerformanceScoringConfigInput,
} from "@enterprise/shared";
import { UserRole } from "@enterprise/shared";
import { performanceEngineService } from "./performance-engine.service.js";
import { queuePerformanceRecalc } from "./performance-recalc.queue.js";
import * as argon2 from "argon2";

import { notificationDispatcher } from "../notifications/notification.dispatcher.js";
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

function isSuperAdmin(actor: TeamActor): boolean {
  return actor.role === UserRole.SUPER_ADMIN;
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

/** Admin + Super Admin — employee CRUD and operational HR. */
function assertManage(actor: TeamActor): void {
  assertTeamAccess(actor);
  if (!hasPermission(actor, "team:manage") && !isAdmin(actor)) {
    throw new TeamError("Permission denied", 403, TEAM_ERROR_CODES.FORBIDDEN);
  }
}

/** Super Admin only — departments, teams structure, create admins. */
function assertOrgStructure(actor: TeamActor): void {
  assertTeamAccess(actor);
  if (!isSuperAdmin(actor)) {
    throw new TeamError(
      "Only Super Admin can manage organization structure",
      403,
      TEAM_ERROR_CODES.FORBIDDEN,
    );
  }
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function utcToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function countLeaveDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function expectedCheckInHour(): number {
  return 9;
}

function generateTemporaryPassword(): string {
  const raw = randomBytes(9).toString("base64url");
  return `Ef!${raw.slice(0, 10)}`;
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

function isTransactionTimeout(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2028"
  );
}

function isUniqueConflict(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function conflictFromPrisma(
  error: Prisma.PrismaClientKnownRequestError,
): TeamError {
  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target.map(String)
    : target
      ? [String(target)]
      : [];
  const joined = fields.join(" ").toLowerCase();
  if (joined.includes("email")) {
    return new TeamError(
      "An account with this email already exists",
      409,
      TEAM_ERROR_CODES.CONFLICT,
      [{ field: "email", message: "Email is already registered" }],
    );
  }
  if (joined.includes("employee_code") || joined.includes("employeecode")) {
    return new TeamError(
      "Employee ID already exists",
      409,
      TEAM_ERROR_CODES.CONFLICT,
      [{ field: "employeeCode", message: "Employee ID already exists" }],
    );
  }
  if (joined.includes("admin_code") || joined.includes("admincode")) {
    return new TeamError(
      "Admin ID already exists",
      409,
      TEAM_ERROR_CODES.CONFLICT,
      [{ field: "adminCode", message: "Admin ID already exists" }],
    );
  }
  if (joined.includes("phone")) {
    return new TeamError(
      "Phone number is already registered",
      409,
      TEAM_ERROR_CODES.CONFLICT,
      [{ field: "phone", message: "Phone number is already registered" }],
    );
  }
  return new TeamError(
    "A conflicting record already exists",
    409,
    TEAM_ERROR_CODES.CONFLICT,
  );
}

function normalizePhone(phone: string | null | undefined): string | null {
  const value = phone?.trim();
  return value ? value : null;
}

async function assertPhoneAvailable(
  phone: string | null | undefined,
  excludeUserId?: string,
): Promise<void> {
  const normalized = normalizePhone(phone);
  if (!normalized) return;

  const [userMatch, profileMatch] = await Promise.all([
    prisma.user.findFirst({
      where: {
        phone: normalized,
        deletedAt: null,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    }),
    prisma.employeeProfile.findFirst({
      where: {
        phone: normalized,
        deletedAt: null,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    }),
  ]);

  if (userMatch || profileMatch) {
    throw new TeamError(
      "Phone number is already registered",
      409,
      TEAM_ERROR_CODES.CONFLICT,
      [{ field: "phone", message: "Phone number is already registered" }],
    );
  }
}

async function assertEmployeeCodeAvailable(
  employeeCode: string,
  excludeEmployeeId?: string,
): Promise<void> {
  const existing = await prisma.employeeProfile.findFirst({
    where: {
      employeeCode,
      deletedAt: null,
      ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new TeamError(
      "Employee ID already exists",
      409,
      TEAM_ERROR_CODES.CONFLICT,
      [{ field: "employeeCode", message: "Employee ID already exists" }],
    );
  }
}

async function sendHireInvitation(input: {
  userId: string;
  email: string;
  firstName: string;
  temporaryPassword: string;
  employeeCode: string;
  createdById: string;
  isAdmin: boolean;
}): Promise<boolean> {
  const appUrl = (process.env.APP_URL ?? process.env.WEB_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  const loginUrl = appUrl ? `${appUrl}/login` : "/login";
  const activationHint =
    "On first login you will be required to change your temporary password.";
  try {
    await notificationDispatcher.notify({
      title: input.isAdmin
        ? "Your EliteFlow admin account is ready"
        : "Welcome to EliteFlow — complete your onboarding",
      body: input.isAdmin
        ? `Hi ${input.firstName}, your admin account (${input.employeeCode}) has been created. Login: ${loginUrl}. Temporary password: ${input.temporaryPassword}. ${activationHint}`
        : `Hi ${input.firstName}, welcome aboard. Your employee account (${input.employeeCode}) is ready. Login: ${loginUrl}. Temporary password: ${input.temporaryPassword}. ${activationHint} Policy documents and the employee handbook are available after sign-in.`,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.HIGH,
      linkUrl: loginUrl,
      entityType: "EmployeeProfile",
      entityId: input.userId,
      audience: { type: "INDIVIDUAL", userId: input.userId },
      createdById: input.createdById,
      sendEmail: true,
      metadata: {
        temporaryPassword: input.temporaryPassword,
        employeeCode: input.employeeCode,
        email: input.email,
        loginUrl,
        template: input.isAdmin ? "admin_welcome" : "employee_welcome",
        includeHandbook: !input.isAdmin,
      },
    });
    return true;
  } catch (error) {
    console.error("[team] Failed to send hire invitation:", error);
    return false;
  }
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
      admins,
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
      teamRepository.countAdmins(),
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
      admins,
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
    assertOrgStructure(actor);
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
    assertOrgStructure(actor);
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
    assertOrgStructure(actor);
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

  async assignDepartmentEmployees(
    id: string,
    input: AssignDepartmentEmployeesInput,
    actor: TeamActor,
  ) {
    assertManage(actor);
    const existing = await teamRepository.getDepartment(id);
    if (!existing) {
      throw new TeamError("Department not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await teamRepository.assignEmployeesToDepartment(
      id,
      input.employeeIds,
      actor.userId,
    );
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.DEPARTMENT_ASSIGN,
      resourceId: id,
      metadata: { employeeIds: input.employeeIds },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return teamRepository.getDepartment(id).then((d) => toDepartmentDto(d!));
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
      ...(query.managerId ? { managerId: query.managerId } : {}),
      ...(query.teamId
        ? {
            OR: [
              { primaryTeamId: query.teamId },
              {
                user: {
                  hrTeamMemberships: { some: { teamId: query.teamId } },
                },
              },
            ],
          }
        : {}),
      ...(query.role
        ? { user: { role: { code: query.role } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { employeeCode: { contains: query.search, mode: "insensitive" } },
              { adminCode: { contains: query.search, mode: "insensitive" } },
              { designation: { contains: query.search, mode: "insensitive" } },
              { nationalId: { contains: query.search, mode: "insensitive" } },
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
    const sortBy = query.sortBy ?? "employeeCode";
    const sortDir = query.sortDir ?? "asc";
    const { items, total } = await teamRepository.listEmployees({
      where,
      skip,
      take: query.limit,
      orderBy: { [sortBy]: sortDir },
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
    if (!input.departmentId) {
      throw new TeamError(
        "Department assignment is required",
        400,
        TEAM_ERROR_CODES.VALIDATION,
      );
    }
    const employeeCode =
      input.employeeCode?.trim() || (await teamRepository.nextCode("EMP", 4));
    const employee = await teamRepository.createEmployee({
      userId: input.userId,
      employeeCode,
      departmentId: input.departmentId,
      primaryTeamId: input.primaryTeamId ?? null,
      designation: input.designation ?? null,
      managerId: input.managerId ?? null,
      status: input.status,
      employmentType: input.employmentType,
      gender: input.gender ?? null,
      dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null,
      nationalId: input.nationalId ?? null,
      hireDate: input.hireDate ? parseDateOnly(input.hireDate) : null,
      phone: input.phone ?? null,
      workLocation: input.workLocation ?? null,
      address: input.address ?? null,
      salary: input.salary ?? null,
      notes: input.notes ?? null,
      photoUrl: input.photoUrl ?? null,
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
    if (input.primaryTeamId) {
      await teamRepository.addTeamMembers(
        input.primaryTeamId,
        [input.userId],
        null,
      );
    }
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_CREATE,
      resourceId: employee.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toEmployeeDto(employee);
  }

  async hireEmployee(
    input: HireEmployeeInput,
    actor: TeamActor,
  ): Promise<HireEmployeeResult> {
    assertManage(actor);

    const existingUser = await teamRepository.findUserByEmail(input.email);
    if (existingUser) {
      throw new TeamError(
        "An account with this email already exists",
        409,
        TEAM_ERROR_CODES.CONFLICT,
        [{ field: "email", message: "Email is already registered" }],
      );
    }

    await assertPhoneAvailable(input.phone);

    const role = await teamRepository.findRoleByCode(UserRole.EMPLOYEE);
    if (!role) {
      throw new TeamError(
        "Employee role is not configured",
        500,
        TEAM_ERROR_CODES.VALIDATION,
      );
    }

    const department = await teamRepository.getDepartment(input.departmentId);
    if (!department) {
      throw new TeamError(
        "Department not found",
        404,
        TEAM_ERROR_CODES.NOT_FOUND,
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const qrToken = randomBytes(16).toString("hex");
    const companyEmail =
      input.companyEmail?.trim().toLowerCase() ||
      input.email.toLowerCase().trim();

    let employeeCode = "";
    let badgeNumber = "";
    let employee: Awaited<ReturnType<typeof teamRepository.getEmployee>> = null;
    let lastError: unknown;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      employeeCode = await teamRepository.nextCode("EMP", 5);
      badgeNumber = `BDG-${employeeCode.replace("EMP-", "")}`;
      try {
        const created = await prisma.$transaction(
          async (tx) => {
            const emailTaken = await tx.user.findFirst({
              where: {
                email: input.email.toLowerCase().trim(),
                deletedAt: null,
              },
              select: { id: true },
            });
            if (emailTaken) {
              throw new TeamError(
                "An account with this email already exists",
                409,
                TEAM_ERROR_CODES.CONFLICT,
                [{ field: "email", message: "Email is already registered" }],
              );
            }

            const user = await tx.user.create({
              data: {
                email: input.email.toLowerCase().trim(),
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                phone: normalizePhone(input.phone),
                avatarUrl: input.photoUrl ?? null,
                designation: input.designation ?? null,
                passwordHash,
                roleId: role.id,
                status: UserStatus.ACTIVE,
                emailVerified: true,
                emailVerifiedAt: new Date(),
                passwordChangedAt: null,
                mustChangePassword: true,
              },
              select: { id: true },
            });

            const profile = await tx.employeeProfile.create({
              data: {
                userId: user.id,
                employeeCode,
                badgeNumber,
                qrToken,
                departmentId: input.departmentId,
                primaryTeamId: input.primaryTeamId ?? null,
                designation: input.designation ?? null,
                managerId: input.managerId ?? null,
                status: input.status,
                lifecycleStage: "ONBOARDING",
                employmentType: input.employmentType,
                shift: input.shift ?? "MORNING",
                gender: input.gender ?? null,
                maritalStatus: input.maritalStatus ?? null,
                bloodGroup: input.bloodGroup ?? null,
                fatherName: input.fatherName ?? null,
                dateOfBirth: input.dateOfBirth
                  ? parseDateOnly(input.dateOfBirth)
                  : null,
                nationalId: input.nationalId ?? null,
                hireDate: input.hireDate
                  ? parseDateOnly(input.hireDate)
                  : utcToday(),
                phone: normalizePhone(input.phone),
                personalEmail: input.personalEmail ?? null,
                companyEmail,
                workLocation: input.workLocation ?? null,
                address: input.address ?? null,
                city: input.city ?? null,
                country: input.country ?? null,
                salary: input.salary ?? null,
                notes: input.notes ?? null,
                photoUrl: input.photoUrl ?? null,
                skills: input.skills,
                experienceYears: input.experienceYears ?? null,
                bio: input.bio ?? null,
                documentUrls: input.documentUrls,
                emergencyContactName: input.emergencyContactName ?? null,
                emergencyContactPhone: input.emergencyContactPhone ?? null,
                emergencyContactRelation:
                  input.emergencyContactRelation ?? null,
                annualLeaveBalance: input.annualLeaveBalance,
                casualLeaveBalance: input.casualLeaveBalance ?? 10,
                sickLeaveBalance: input.sickLeaveBalance,
                medicalLeaveBalance: input.medicalLeaveBalance ?? 10,
                createdById: actor.userId,
                updatedById: actor.userId,
              },
              select: { id: true, userId: true },
            });

            if (input.primaryTeamId) {
              await tx.teamMember.create({
                data: {
                  teamId: input.primaryTeamId,
                  userId: user.id,
                },
              });
            }

            await tx.employeeTimelineEvent.createMany({
              data: [
                {
                  employeeId: profile.id,
                  eventType: "EMPLOYEE_CREATED",
                  title: "Employee created",
                  description: `Profile ${employeeCode} provisioned in EliteFlow HRMS.`,
                  actedById: actor.userId,
                  metadata: { employeeCode, badgeNumber },
                },
                {
                  employeeId: profile.id,
                  eventType: "ACCOUNT_GENERATED",
                  title: "System account generated",
                  description: `Login account created for ${companyEmail}.`,
                  actedById: actor.userId,
                },
                {
                  employeeId: profile.id,
                  eventType: "INVITATION_QUEUED",
                  title: "Invitation queued",
                  description:
                    "Welcome email and temporary credentials prepared.",
                  actedById: actor.userId,
                },
              ],
            });

            return profile;
          },
          {
            maxWait: 15_000,
            timeout: 30_000,
          },
        );

        employee = await teamRepository.getEmployee(created.id);
        if (!employee) {
          throw new TeamError(
            "Employee was created but could not be loaded",
            500,
            TEAM_ERROR_CODES.VALIDATION,
          );
        }
        break;
      } catch (error) {
        lastError = error;
        if (error instanceof TeamError) throw error;
        if (isTransactionTimeout(error)) {
          throw new TeamError(
            "Creating the employee took too long due to a slow database connection. Please try again.",
            503,
            TEAM_ERROR_CODES.VALIDATION,
          );
        }
        if (isUniqueConflict(error)) {
          const target = error.meta?.target;
          const fields = Array.isArray(target)
            ? target.map(String).join(" ").toLowerCase()
            : String(target ?? "").toLowerCase();
          if (
            fields.includes("employee_code") ||
            fields.includes("employeecode")
          ) {
            continue;
          }
          throw conflictFromPrisma(error);
        }
        throw error;
      }
    }

    if (!employee) {
      if (isUniqueConflict(lastError)) throw conflictFromPrisma(lastError);
      if (isTransactionTimeout(lastError)) {
        throw new TeamError(
          "Creating the employee took too long due to a slow database connection. Please try again.",
          503,
          TEAM_ERROR_CODES.VALIDATION,
        );
      }
      throw (
        lastError ??
        new TeamError(
          "Unable to allocate a unique employee ID",
          409,
          TEAM_ERROR_CODES.CONFLICT,
        )
      );
    }

    const invitationSent = await sendHireInvitation({
      userId: employee.userId,
      email: input.email,
      firstName: input.firstName,
      temporaryPassword,
      employeeCode,
      createdById: actor.userId,
      isAdmin: false,
    });

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_HIRE,
      resourceId: employee.id,
      metadata: { employeeCode, email: input.email },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      employee: toEmployeeDto(employee),
      temporaryPassword,
      invitationSent,
      qrToken,
      companyEmail,
      badgeNumber,
      mustChangePassword: true,
    };
  }

  async createAdmin(
    input: CreateAdminInput,
    actor: TeamActor,
  ): Promise<CreateAdminResult> {
    assertOrgStructure(actor);

    const existingUser = await teamRepository.findUserByEmail(input.email);
    if (existingUser) {
      throw new TeamError(
        "An account with this email already exists",
        409,
        TEAM_ERROR_CODES.CONFLICT,
        [{ field: "email", message: "Email is already registered" }],
      );
    }

    await assertPhoneAvailable(input.phone);

    const role = await teamRepository.findRoleByCode(UserRole.ADMIN);
    if (!role) {
      throw new TeamError(
        "Admin role is not configured",
        500,
        TEAM_ERROR_CODES.VALIDATION,
      );
    }

    const department = await teamRepository.getDepartment(input.departmentId);
    if (!department) {
      throw new TeamError(
        "Department not found",
        404,
        TEAM_ERROR_CODES.NOT_FOUND,
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const qrToken = randomBytes(16).toString("hex");
    const companyEmail =
      input.companyEmail?.trim().toLowerCase() ||
      input.email.toLowerCase().trim();
    const requirePasswordChange = input.requirePasswordChange !== false;
    const sendInvitation = input.sendInvitation !== false;

    const [employeeCode, adminCode] = await Promise.all([
      teamRepository.nextCode("EMP", 4),
      teamRepository.nextCode("ADM", 4),
    ]);
    const badgeNumber = `BDG-${adminCode.replace("ADM-", "")}`;

    const presetNote = `Permission preset: ${input.permissionPreset}`;
    const notes = input.notes
      ? `${input.notes}\n\n${presetNote}`
      : presetNote;

    const employee = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email.toLowerCase().trim(),
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            phone: normalizePhone(input.phone),
            avatarUrl: input.photoUrl ?? null,
            designation: input.designation ?? "Administrator",
            passwordHash,
            roleId: role.id,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            passwordChangedAt: null,
            mustChangePassword: requirePasswordChange,
          },
          select: { id: true },
        });

        return tx.employeeProfile.create({
          data: {
            userId: user.id,
            employeeCode,
            adminCode,
            badgeNumber,
            qrToken,
            departmentId: input.departmentId,
            primaryTeamId: input.primaryTeamId ?? null,
            designation: input.designation ?? "Administrator",
            managerId: input.managerId ?? null,
            status: input.status ?? "ACTIVE",
            lifecycleStage: input.lifecycleStage ?? "ONBOARDING",
            employmentType: input.employmentType ?? "FULL_TIME",
            shift: input.shift ?? "MORNING",
            gender: input.gender ?? null,
            maritalStatus: input.maritalStatus ?? null,
            bloodGroup: input.bloodGroup ?? null,
            fatherName: input.fatherName ?? null,
            dateOfBirth: input.dateOfBirth
              ? parseDateOnly(input.dateOfBirth)
              : null,
            nationalId: input.nationalId ?? null,
            hireDate: input.hireDate
              ? parseDateOnly(input.hireDate)
              : utcToday(),
            phone: normalizePhone(input.phone),
            personalEmail: input.personalEmail ?? null,
            companyEmail,
            workLocation: input.workLocation ?? null,
            address: input.address ?? null,
            city: input.city ?? null,
            country: input.country ?? null,
            salary: input.salary ?? null,
            notes,
            photoUrl: input.photoUrl ?? null,
            skills: input.skills ?? [],
            experienceYears: input.experienceYears ?? null,
            bio: input.bio ?? null,
            documentUrls: input.documentUrls ?? [],
            emergencyContactName: input.emergencyContactName ?? null,
            emergencyContactPhone: input.emergencyContactPhone ?? null,
            emergencyContactRelation: input.emergencyContactRelation ?? null,
            annualLeaveBalance: input.annualLeaveBalance ?? 20,
            sickLeaveBalance: input.sickLeaveBalance ?? 10,
            casualLeaveBalance: input.casualLeaveBalance ?? 10,
            medicalLeaveBalance: input.medicalLeaveBalance ?? 15,
            createdById: actor.userId,
            updatedById: actor.userId,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
            department: true,
            primaryTeam: { select: { id: true, name: true } },
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
          },
        });
      },
      { maxWait: 15_000, timeout: 30_000 },
    );

    const invitationSent = sendInvitation
      ? await sendHireInvitation({
          userId: employee.userId,
          email: input.email,
          firstName: input.firstName,
          temporaryPassword,
          employeeCode: adminCode,
          createdById: actor.userId,
          isAdmin: true,
        })
      : false;

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.ADMIN_CREATE,
      resourceId: employee.id,
      metadata: {
        adminCode,
        employeeCode,
        email: input.email,
        permissionPreset: input.permissionPreset,
        sendInvitation,
        enableTwoFactor: Boolean(input.enableTwoFactor),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      employee: toEmployeeDto(employee),
      temporaryPassword,
      invitationSent,
      qrToken,
      companyEmail,
      badgeNumber,
      mustChangePassword: requirePasswordChange,
    };
  }

  async resetEmployeeCredentials(
    employeeId: string,
    input: { sendEmail?: boolean },
    actor: TeamActor,
  ): Promise<{
    temporaryPassword: string;
    mustChangePassword: boolean;
    invitationSent: boolean;
  }> {
    assertOrgStructure(actor);

    const employee = await teamRepository.getEmployee(employeeId);
    if (!employee || !employee.user) {
      throw new TeamError(
        "Employee not found",
        404,
        TEAM_ERROR_CODES.NOT_FOUND,
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    await prisma.user.update({
      where: { id: employee.userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
    });

    const sendEmail = input.sendEmail !== false;
    const invitationSent = sendEmail
      ? await sendHireInvitation({
          userId: employee.userId,
          email: employee.user.email,
          firstName: employee.user.firstName,
          temporaryPassword,
          employeeCode: employee.adminCode ?? employee.employeeCode,
          createdById: actor.userId,
          isAdmin: Boolean(employee.adminCode),
        })
      : false;

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_RESET_CREDENTIALS,
      resourceId: employee.id,
      metadata: {
        targetUserId: employee.userId,
        adminCode: employee.adminCode,
        invitationSent,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      temporaryPassword,
      mustChangePassword: true,
      invitationSent,
    };
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

    if (input.phone !== undefined) {
      await assertPhoneAvailable(input.phone, existing.userId);
    }
    if (canManage && input.employeeCode && input.employeeCode !== existing.employeeCode) {
      await assertEmployeeCodeAvailable(input.employeeCode, id);
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
          ...(input.primaryTeamId !== undefined
            ? { primaryTeamId: input.primaryTeamId }
            : {}),
          ...(input.designation !== undefined
            ? { designation: input.designation }
            : {}),
          ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.employmentType !== undefined
            ? { employmentType: input.employmentType }
            : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.dateOfBirth !== undefined
            ? {
                dateOfBirth: input.dateOfBirth
                  ? parseDateOnly(input.dateOfBirth)
                  : null,
              }
            : {}),
          ...(input.nationalId !== undefined
            ? { nationalId: input.nationalId }
            : {}),
          ...(input.hireDate !== undefined
            ? { hireDate: input.hireDate ? parseDateOnly(input.hireDate) : null }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.workLocation !== undefined
            ? { workLocation: input.workLocation }
            : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.salary !== undefined ? { salary: input.salary } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
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
          ...(input.fatherName !== undefined
            ? { fatherName: input.fatherName }
            : {}),
          ...(input.maritalStatus !== undefined
            ? { maritalStatus: input.maritalStatus }
            : {}),
          ...(input.bloodGroup !== undefined
            ? { bloodGroup: input.bloodGroup }
            : {}),
          ...(input.personalEmail !== undefined
            ? { personalEmail: input.personalEmail }
            : {}),
          ...(input.companyEmail !== undefined
            ? { companyEmail: input.companyEmail }
            : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.shift !== undefined ? { shift: input.shift } : {}),
          ...(input.casualLeaveBalance !== undefined
            ? { casualLeaveBalance: input.casualLeaveBalance }
            : {}),
          ...(input.medicalLeaveBalance !== undefined
            ? { medicalLeaveBalance: input.medicalLeaveBalance }
            : {}),
          ...(input.lifecycleStage !== undefined
            ? { lifecycleStage: input.lifecycleStage }
            : {}),
          ...(input.exitDate !== undefined
            ? {
                exitDate: input.exitDate
                  ? parseDateOnly(input.exitDate)
                  : null,
              }
            : {}),
          ...(input.exitReason !== undefined
            ? { exitReason: input.exitReason }
            : {}),
          updatedById: actor.userId,
        }
      : {
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.personalEmail !== undefined
            ? { personalEmail: input.personalEmail }
            : {}),
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

    const employee = await teamRepository.updateEmployee(
      id,
      data as Prisma.EmployeeProfileUncheckedUpdateInput,
    );

    if (
      canManage &&
      (input.firstName !== undefined ||
        input.lastName !== undefined ||
        input.photoUrl !== undefined)
    ) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: {
          ...(input.firstName !== undefined
            ? { firstName: input.firstName }
            : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.photoUrl !== undefined
            ? { avatarUrl: input.photoUrl }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.designation !== undefined
            ? { designation: input.designation }
            : {}),
        },
      });
    }

    await prisma.employeeTimelineEvent.create({
      data: {
        employeeId: id,
        eventType: "PROFILE_UPDATED",
        title: "Profile updated",
        description: canManage
          ? "Employee profile fields were updated by HR/Admin."
          : "Employee updated their personal profile.",
        actedById: actor.userId,
      },
    });

    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toEmployeeDto(
      (await teamRepository.getEmployee(id)) ?? employee,
    );
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
    assertOrgStructure(actor);
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
    assertOrgStructure(actor);
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
    assertOrgStructure(actor);
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
    await prisma.employeeProfile.updateMany({
      where: { userId: { in: input.userIds }, deletedAt: null },
      data: { primaryTeamId: id, updatedById: actor.userId },
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.TEAM_MEMBER_ADD,
      resourceId: id,
      metadata: { userIds: input.userIds },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
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
    await prisma.employeeProfile.updateMany({
      where: { userId, primaryTeamId: id, deletedAt: null },
      data: { primaryTeamId: null, updatedById: actor.userId },
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.TEAM_MEMBER_REMOVE,
      resourceId: id,
      metadata: { userId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    const team = await teamRepository.getTeam(id);
    return toTeamDto(team!);
  }

  async transferMember(
    id: string,
    input: TransferTeamMemberInput,
    actor: TeamActor,
  ) {
    assertManage(actor);
    const fromTeam = await teamRepository.getTeam(id);
    if (!fromTeam) {
      throw new TeamError("Team not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    const toTeam = await teamRepository.getTeam(input.toTeamId);
    if (!toTeam) {
      throw new TeamError(
        "Destination team not found",
        404,
        TEAM_ERROR_CODES.NOT_FOUND,
      );
    }
    const team = await teamRepository.transferTeamMember({
      fromTeamId: id,
      toTeamId: input.toTeamId,
      userId: input.userId,
      roleLabel: input.roleLabel,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.TEAM_MEMBER_TRANSFER,
      resourceId: id,
      metadata: {
        userId: input.userId,
        toTeamId: input.toTeamId,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
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
    queuePerformanceRecalc(profile.id);
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
    queuePerformanceRecalc(profile.id);
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
        await prisma.employeeTimelineEvent.create({
          data: {
            employeeId: employee.id,
            eventType: "LEAVE_APPROVED",
            title: "Leave approved",
            description: `${existing.type} leave · ${existing.days} day(s)`,
            actedById: actor.userId,
          },
        });
        queuePerformanceRecalc(employee.id);
        try {
          await notificationDispatcher.notify({
            title: "Leave approved",
            body: `Your ${existing.type.toLowerCase()} leave request was approved.`,
            category: NotificationCategory.SYSTEM,
            priority: NotificationPriority.NORMAL,
            linkUrl: "/team",
            entityType: "LeaveRequest",
            entityId: id,
            audience: { type: "INDIVIDUAL", userId: employee.userId },
            createdById: actor.userId,
            sendEmail: true,
          });
        } catch (error) {
          console.error("[team] Failed to notify leave approval:", error);
        }
      }
    } else if (input.status === "REJECTED" && existing.employee) {
      await prisma.employeeTimelineEvent.create({
        data: {
          employeeId: existing.employee.id,
          eventType: "LEAVE_REJECTED",
          title: "Leave rejected",
          description: existing.type,
          actedById: actor.userId,
        },
      });
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

  async getPerformanceDashboard(actor: TeamActor) {
    assertTeamAccess(actor);
    const manageAll = isAdmin(actor) || hasPermission(actor, "team:manage");
    return performanceEngineService.getDashboard({
      manageAll,
      employeeUserId: manageAll ? undefined : actor.userId,
    });
  }

  async getPerformanceConfig(actor: TeamActor) {
    assertTeamAccess(actor);
    return performanceEngineService.getOrCreateConfig();
  }

  async updatePerformanceConfig(
    input: UpdatePerformanceScoringConfigInput,
    actor: TeamActor,
  ) {
    assertOrgStructure(actor);
    const config = await performanceEngineService.updateConfig(
      input,
      actor.userId,
    );
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.PERFORMANCE_CONFIG_UPDATE,
      resourceId: config.id,
      metadata: { weights: input.weights },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return config;
  }

  async recalculatePerformance(
    input: RecalculatePerformanceInput,
    actor: TeamActor,
  ) {
    assertManage(actor);
    const result = await performanceEngineService.recalculateAll({
      employeeId: input.employeeId,
      lookbackDays: input.lookbackDays,
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.PERFORMANCE_RECALCULATE,
      metadata: result,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return result;
  }

  async listPerformanceInsights(actor: TeamActor, employeeId?: string) {
    assertTeamAccess(actor);
    const manageAll = isAdmin(actor) || hasPermission(actor, "team:manage");
    if (!manageAll) {
      const self = await prisma.employeeProfile.findFirst({
        where: { userId: actor.userId, deletedAt: null },
        select: { id: true },
      });
      return performanceEngineService.listInsights(self?.id);
    }
    return performanceEngineService.listInsights(employeeId);
  }

  async listMonthlyPerformanceReports(actor: TeamActor, employeeId?: string) {
    assertTeamAccess(actor);
    const manageAll = isAdmin(actor) || hasPermission(actor, "team:manage");
    const rows = await performanceEngineService.listMonthlyReports(
      manageAll
        ? employeeId
        : (
            await prisma.employeeProfile.findFirst({
              where: { userId: actor.userId, deletedAt: null },
              select: { id: true },
            })
          )?.id,
    );
    return {
      items: rows.map((r) => performanceEngineService.toMonthlyDto(r)),
    };
  }

  async generateMonthlyPerformanceReports(actor: TeamActor) {
    assertManage(actor);
    const count = await performanceEngineService.generateMonthlyReports();
    const weekly = await performanceEngineService.generatePeriodReports("WEEKLY");
    const monthly = await performanceEngineService.generatePeriodReports("MONTHLY");
    const quarterly = await performanceEngineService.generatePeriodReports(
      "QUARTERLY",
    );
    const annual = await performanceEngineService.generatePeriodReports("ANNUAL");
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.PERFORMANCE_MONTHLY_GENERATE,
      metadata: { count, weekly, monthly, quarterly, annual },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return { count, weekly, monthly, quarterly, annual };
  }

  async approveMonthlyPerformanceReport(
    id: string,
    input: ApproveMonthlyReportInput,
    actor: TeamActor,
  ) {
    assertManage(actor);
    const report = await performanceEngineService.approveMonthlyReport(
      id,
      input,
      actor.userId,
    );
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.PERFORMANCE_MONTHLY_APPROVE,
      resourceId: id,
      metadata: { status: input.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return report;
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
      progress: input.autoProgress ? 0 : input.progress,
      status: input.status,
      dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null,
      linkedTaskIds: input.linkedTaskIds,
      autoProgress: input.autoProgress,
      createdById: actor.userId,
    });
    const employee = await teamRepository.getEmployee(input.employeeId);
    if (employee && goal.autoProgress) {
      await performanceEngineService.syncGoalProgress(
        employee.id,
        employee.userId,
      );
    }
    const refreshed = await teamRepository.getGoal(goal.id);
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.GOAL_CREATE,
      resourceId: goal.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toGoalDto(refreshed ?? goal);
  }

  async updateGoal(id: string, input: UpdateEmployeeGoalInput, actor: TeamActor) {
    assertManage(actor);
    const existing = await teamRepository.getGoal(id);
    if (!existing) {
      throw new TeamError("Goal not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    const autoProgress = input.autoProgress ?? existing.autoProgress;
    const goal = await teamRepository.updateGoal(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.kpiMetric !== undefined ? { kpiMetric: input.kpiMetric } : {}),
      ...(input.targetValue !== undefined
        ? { targetValue: input.targetValue }
        : {}),
      ...(input.progress !== undefined && !autoProgress
        ? { progress: input.progress }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null }
        : {}),
      ...(input.linkedTaskIds !== undefined
        ? { linkedTaskIds: input.linkedTaskIds }
        : {}),
      ...(input.autoProgress !== undefined
        ? { autoProgress: input.autoProgress }
        : {}),
      updatedById: actor.userId,
    });
    if (autoProgress) {
      await performanceEngineService.syncGoalProgress(
        existing.employeeId,
        existing.employee.userId,
      );
    }
    const refreshed = await teamRepository.getGoal(id);
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.GOAL_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toGoalDto(refreshed ?? goal);
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

  async listDocuments(employeeId: string, actor: TeamActor) {
    assertTeamAccess(actor);
    await this.assertCanViewEmployee(employeeId, actor);
    const items = await prisma.employeeDocument.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return {
      items: items.map((doc) => ({
        id: doc.id,
        employeeId: doc.employeeId,
        type: doc.type,
        title: doc.title,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        notes: doc.notes,
        uploadedById: doc.uploadedById,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      })),
    };
  }

  async addDocument(
    employeeId: string,
    input: {
      type: string;
      title: string;
      fileUrl: string;
      fileName?: string | null;
      mimeType?: string | null;
      fileSize?: number | null;
      notes?: string | null;
    },
    actor: TeamActor,
  ) {
    assertManage(actor);
    await this.assertCanViewEmployee(employeeId, actor);

    if (input.mimeType && !ALLOWED_DOCUMENT_MIME_TYPES.has(input.mimeType)) {
      throw new TeamError(
        "Unsupported document type. Use PDF, Word, or image files.",
        400,
        TEAM_ERROR_CODES.VALIDATION,
        [{ field: "mimeType", message: "Unsupported file type" }],
      );
    }
    if (input.fileSize != null && input.fileSize > MAX_DOCUMENT_BYTES) {
      throw new TeamError(
        "Document exceeds the 15 MB size limit",
        400,
        TEAM_ERROR_CODES.VALIDATION,
        [{ field: "fileSize", message: "File too large (max 15 MB)" }],
      );
    }
    // Future-ready virus scan hook — no-op until scanner is wired.
    void input.fileUrl;

    const doc = await prisma.employeeDocument.create({
      data: {
        employeeId,
        type: input.type as never,
        title: input.title,
        fileUrl: input.fileUrl,
        fileName: input.fileName ?? null,
        mimeType: input.mimeType ?? null,
        fileSize: input.fileSize ?? null,
        notes: input.notes ?? null,
        uploadedById: actor.userId,
      },
    });
    await prisma.employeeTimelineEvent.create({
      data: {
        employeeId,
        eventType: "DOCUMENT_UPLOADED",
        title: "Document uploaded",
        description: `${input.title} (${input.type})`,
        actedById: actor.userId,
      },
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.DOCUMENT_UPLOAD,
      resourceId: doc.id,
      metadata: { employeeId, type: input.type },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return doc;
  }

  async deleteDocument(documentId: string, actor: TeamActor) {
    assertManage(actor);
    const doc = await prisma.employeeDocument.findFirst({
      where: { id: documentId, deletedAt: null },
    });
    if (!doc) {
      throw new TeamError("Document not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await prisma.employeeDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
    await prisma.employeeTimelineEvent.create({
      data: {
        employeeId: doc.employeeId,
        eventType: "DOCUMENT_DELETED",
        title: "Document deleted",
        description: doc.title,
        actedById: actor.userId,
      },
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.DOCUMENT_DELETE,
      resourceId: documentId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return { id: documentId };
  }

  async listTimeline(employeeId: string, actor: TeamActor) {
    assertTeamAccess(actor);
    await this.assertCanViewEmployee(employeeId, actor);
    const items = await prisma.employeeTimelineEvent.findMany({
      where: { employeeId },
      include: {
        actedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            role: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      items: items.map((event) => ({
        id: event.id,
        employeeId: event.employeeId,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        metadata: event.metadata,
        actedById: event.actedById,
        createdAt: event.createdAt.toISOString(),
        actedBy: event.actedBy
          ? {
              id: event.actedBy.id,
              firstName: event.actedBy.firstName,
              lastName: event.actedBy.lastName,
              email: event.actedBy.email,
              avatarUrl: event.actedBy.avatarUrl,
              roleCode: event.actedBy.role?.code,
              roleName: event.actedBy.role?.name,
            }
          : null,
      })),
    };
  }

  async createPromotion(
    employeeId: string,
    input: {
      effectiveDate: string;
      newDesignation: string;
      oldDesignation?: string | null;
      oldSalary?: number | null;
      newSalary?: number | null;
      reason?: string | null;
    },
    actor: TeamActor,
  ) {
    assertManage(actor);
    const employee = await teamRepository.getEmployee(employeeId);
    if (!employee) {
      throw new TeamError("Employee not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    const promotion = await prisma.$transaction(async (tx) => {
      const row = await tx.employeePromotion.create({
        data: {
          employeeId,
          effectiveDate: parseDateOnly(input.effectiveDate),
          oldDesignation: input.oldDesignation ?? employee.designation,
          newDesignation: input.newDesignation,
          oldSalary: input.oldSalary ?? employee.salary,
          newSalary: input.newSalary ?? null,
          reason: input.reason ?? null,
          actedById: actor.userId,
        },
      });
      await tx.employeeProfile.update({
        where: { id: employeeId },
        data: {
          designation: input.newDesignation,
          salary: input.newSalary ?? undefined,
          lifecycleStage: "PROMOTED",
          updatedById: actor.userId,
        },
      });
      await tx.employeeTimelineEvent.create({
        data: {
          employeeId,
          eventType: "PROMOTION",
          title: "Promotion recorded",
          description: `${input.oldDesignation ?? employee.designation ?? "—"} → ${input.newDesignation}`,
          actedById: actor.userId,
        },
      });
      return row;
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_PROMOTION,
      resourceId: promotion.id,
      metadata: { employeeId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return promotion;
  }

  async createHrTransfer(
    employeeId: string,
    input: {
      effectiveDate: string;
      toDepartmentId?: string | null;
      toTeamId?: string | null;
      toManagerId?: string | null;
      reason?: string | null;
    },
    actor: TeamActor,
  ) {
    assertManage(actor);
    const employee = await teamRepository.getEmployee(employeeId);
    if (!employee) {
      throw new TeamError("Employee not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    const transfer = await prisma.$transaction(async (tx) => {
      const row = await tx.employeeTransfer.create({
        data: {
          employeeId,
          effectiveDate: parseDateOnly(input.effectiveDate),
          fromDepartmentId: employee.departmentId,
          toDepartmentId: input.toDepartmentId ?? employee.departmentId,
          fromTeamId: employee.primaryTeamId,
          toTeamId: input.toTeamId ?? employee.primaryTeamId,
          fromManagerId: employee.managerId,
          toManagerId: input.toManagerId ?? employee.managerId,
          reason: input.reason ?? null,
          actedById: actor.userId,
        },
      });
      await tx.employeeProfile.update({
        where: { id: employeeId },
        data: {
          departmentId: input.toDepartmentId ?? employee.departmentId,
          primaryTeamId: input.toTeamId ?? employee.primaryTeamId,
          managerId: input.toManagerId ?? employee.managerId,
          lifecycleStage: "TRANSFERRED",
          updatedById: actor.userId,
        },
      });
      if (input.toTeamId && input.toTeamId !== employee.primaryTeamId) {
        if (employee.primaryTeamId) {
          await tx.teamMember.deleteMany({
            where: {
              teamId: employee.primaryTeamId,
              userId: employee.userId,
            },
          });
        }
        await tx.teamMember.create({
          data: { teamId: input.toTeamId, userId: employee.userId },
        });
      }
      await tx.employeeTimelineEvent.create({
        data: {
          employeeId,
          eventType: "TRANSFER",
          title: "Transfer recorded",
          description: input.reason ?? "Department/team/manager transfer applied.",
          actedById: actor.userId,
        },
      });
      return row;
    });
    await logTeamAuditEvent({
      userId: actor.userId,
      action: TEAM_AUDIT_ACTIONS.EMPLOYEE_HR_TRANSFER,
      resourceId: transfer.id,
      metadata: { employeeId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return transfer;
  }

  async listPromotions(employeeId: string, actor: TeamActor) {
    assertTeamAccess(actor);
    await this.assertCanViewEmployee(employeeId, actor);
    return prisma.employeePromotion.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { effectiveDate: "desc" },
    });
  }

  async listTransfers(employeeId: string, actor: TeamActor) {
    assertTeamAccess(actor);
    await this.assertCanViewEmployee(employeeId, actor);
    return prisma.employeeTransfer.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { effectiveDate: "desc" },
    });
  }

  async getIdCard(employeeId: string, actor: TeamActor) {
    assertTeamAccess(actor);
    const employee = await teamRepository.getEmployee(employeeId);
    if (!employee) {
      throw new TeamError("Employee not found", 404, TEAM_ERROR_CODES.NOT_FOUND);
    }
    await this.assertCanViewEmployee(employeeId, actor);
    const qrPayload = `/team?employee=${employee.id}&token=${employee.qrToken ?? employee.id}`;
    const dto = toEmployeeDto(employee);
    const name = `${employee.user?.firstName ?? ""} ${employee.user?.lastName ?? ""}`.trim();
    const frontHtml = `<!DOCTYPE html><html><head><title>ID Card - ${employee.employeeCode}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;background:#0b1220;color:#e8eefc;margin:0;padding:24px}
.card{width:360px;border-radius:18px;background:linear-gradient(145deg,#152238,#0f172a);border:1px solid #334155;padding:20px;box-shadow:0 20px 40px rgba(0,0,0,.35)}
.row{display:flex;gap:14px;align-items:center}.photo{width:84px;height:84px;border-radius:14px;background:#1e293b;object-fit:cover}
.meta{font-size:12px;color:#94a3b8}.code{font-size:18px;font-weight:700;letter-spacing:.04em}
</style></head><body><div class="card"><div class="row">
${employee.photoUrl ? `<img class="photo" src="${employee.photoUrl}" />` : `<div class="photo"></div>`}
<div><div class="code">${employee.employeeCode}</div><div style="font-size:16px;font-weight:600;margin-top:4px">${name}</div>
<div class="meta">${employee.designation ?? "Employee"} · ${employee.department?.name ?? "—"}</div>
<div class="meta">Badge ${employee.badgeNumber ?? "—"}</div></div></div>
<div style="margin-top:16px;font-size:12px;color:#94a3b8">EliteFlow HRMS · Scan QR on reverse</div></div>
<script>window.print()</script></body></html>`;
    const backHtml = `<!DOCTYPE html><html><head><title>ID Card Back - ${employee.employeeCode}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;background:#0b1220;color:#e8eefc;margin:0;padding:24px}
.card{width:360px;border-radius:18px;background:#111827;border:1px solid #334155;padding:20px}
.qr{width:140px;height:140px;background:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#111;font-size:10px;word-break:break-all;padding:8px;text-align:center}
</style></head><body><div class="card"><div style="font-weight:700;margin-bottom:12px">Employee ID Card</div>
<div class="qr">${qrPayload}</div>
<div style="margin-top:14px;font-size:12px;color:#94a3b8">Emergency: ${employee.emergencyContactName ?? "—"} ${employee.emergencyContactPhone ?? ""}</div>
<div style="font-size:12px;color:#94a3b8;margin-top:6px">If found, return to EliteFlow HR.</div></div>
<script>window.print()</script></body></html>`;
    return {
      employee: dto,
      qrPayload,
      frontHtml,
      backHtml,
    };
  }

  async exportDirectoryCsv(actor: TeamActor) {
    assertManage(actor);
    const { items } = await teamRepository.listEmployees({
      where: { deletedAt: null },
      skip: 0,
      take: 5000,
    });
    const header = [
      "EmployeeCode",
      "Name",
      "Email",
      "Department",
      "Team",
      "Designation",
      "Status",
      "Manager",
      "Phone",
    ];
    const rows = items.map((e) => [
      e.employeeCode,
      `${e.user?.firstName ?? ""} ${e.user?.lastName ?? ""}`.trim(),
      e.user?.email ?? e.companyEmail ?? "",
      e.department?.name ?? "",
      e.primaryTeam?.name ?? "",
      e.designation ?? "",
      e.status,
      e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : "",
      e.phone ?? "",
    ]);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escape(String(cell))).join(","))
      .join("\n");
    return { csv: `\uFEFF${csv}`, filename: `employees-${utcToday().toISOString().slice(0, 10)}.csv` };
  }

  private async assertCanViewEmployee(employeeId: string, actor: TeamActor) {
    const employee = await teamRepository.getEmployee(employeeId);
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
    return employee;
  }
}

export const teamService = new TeamService();
