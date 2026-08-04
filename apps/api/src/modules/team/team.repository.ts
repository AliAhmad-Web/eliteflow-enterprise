import {
  prisma,
  type AttendanceStatus,
  type GoalStatus,
  type LeaveRequestStatus,
  type LeaveType,
  type PerformanceRating,
  type Prisma,
} from "@enterprise/database";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  role: { select: { code: true, name: true } },
} as const;

const employeeInclude = {
  user: { select: userSelect },
  department: true,
  primaryTeam: { select: { id: true, name: true } },
  manager: { select: userSelect },
  createdBy: { select: userSelect },
} as const;

export class TeamRepository {
  listDepartments() {
    return prisma.department.findMany({
      where: { deletedAt: null },
      include: {
        head: { select: userSelect },
        _count: {
          select: {
            employees: { where: { deletedAt: null } },
            teams: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  getDepartment(id: string) {
    return prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        head: { select: userSelect },
        _count: {
          select: {
            employees: { where: { deletedAt: null } },
            teams: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  createDepartment(data: {
    name: string;
    code: string;
    description?: string | null;
    headId?: string | null;
    createdById: string;
  }) {
    return prisma.department.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        headId: data.headId ?? null,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      include: {
        head: { select: userSelect },
        _count: {
          select: {
            employees: true,
            teams: true,
          },
        },
      },
    });
  }

  updateDepartment(
    id: string,
    data: {
      name?: string;
      code?: string;
      description?: string | null;
      headId?: string | null;
      updatedById: string;
    },
  ) {
    return prisma.department.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        headId: data.headId,
        updatedById: data.updatedById,
      },
      include: {
        head: { select: userSelect },
        _count: { select: { employees: { where: { deletedAt: null } } } },
      },
    });
  }

  softDeleteDepartment(id: string, updatedById: string) {
    return prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  async listEmployees(args: {
    where: Prisma.EmployeeProfileWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.EmployeeProfileOrderByWithRelationInput;
  }) {
    const [items, total] = await Promise.all([
      prisma.employeeProfile.findMany({
        where: args.where,
        include: employeeInclude,
        orderBy: args.orderBy ?? { employeeCode: "asc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.employeeProfile.count({ where: args.where }),
    ]);
    return { items, total };
  }

  getEmployee(id: string) {
    return prisma.employeeProfile.findFirst({
      where: { id, deletedAt: null },
      include: employeeInclude,
    });
  }

  getEmployeeByUserId(userId: string) {
    return prisma.employeeProfile.findFirst({
      where: { userId, deletedAt: null },
      include: employeeInclude,
    });
  }

  createEmployee(data: Prisma.EmployeeProfileUncheckedCreateInput) {
    return prisma.employeeProfile.create({
      data,
      include: employeeInclude,
    });
  }

  updateEmployee(id: string, data: Prisma.EmployeeProfileUncheckedUpdateInput) {
    return prisma.employeeProfile.update({
      where: { id },
      data,
      include: employeeInclude,
    });
  }

  softDeleteEmployee(id: string, updatedById: string) {
    return prisma.employeeProfile.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  listTeams() {
    return prisma.team.findMany({
      where: { deletedAt: null },
      include: {
        leader: { select: userSelect },
        department: true,
        members: { include: { user: { select: userSelect } } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  getTeam(id: string) {
    return prisma.team.findFirst({
      where: { id, deletedAt: null },
      include: {
        leader: { select: userSelect },
        department: true,
        members: { include: { user: { select: userSelect } } },
        _count: { select: { members: true } },
      },
    });
  }

  createTeam(data: {
    name: string;
    description?: string | null;
    departmentId?: string | null;
    leaderId?: string | null;
    createdById: string;
    memberUserIds: string[];
  }) {
    return prisma.team.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        departmentId: data.departmentId ?? null,
        leaderId: data.leaderId ?? null,
        createdById: data.createdById,
        updatedById: data.createdById,
        members: data.memberUserIds.length
          ? {
              create: data.memberUserIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        leader: { select: userSelect },
        members: { include: { user: { select: userSelect } } },
        _count: { select: { members: true } },
      },
    });
  }

  updateTeam(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      departmentId?: string | null;
      leaderId?: string | null;
      updatedById: string;
      memberUserIds?: string[];
    },
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.memberUserIds) {
        await tx.teamMember.deleteMany({ where: { teamId: id } });
        if (data.memberUserIds.length) {
          await tx.teamMember.createMany({
            data: data.memberUserIds.map((userId) => ({
              teamId: id,
              userId,
            })),
          });
        }
      }
      return tx.team.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          departmentId: data.departmentId,
          leaderId: data.leaderId,
          updatedById: data.updatedById,
        },
        include: {
          leader: { select: userSelect },
          members: { include: { user: { select: userSelect } } },
          _count: { select: { members: true } },
        },
      });
    });
  }

  softDeleteTeam(id: string, updatedById: string) {
    return prisma.team.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  addTeamMembers(
    teamId: string,
    userIds: string[],
    roleLabel?: string | null,
  ) {
    return prisma.teamMember.createMany({
      data: userIds.map((userId) => ({
        teamId,
        userId,
        roleLabel: roleLabel ?? null,
      })),
      skipDuplicates: true,
    });
  }

  removeTeamMember(teamId: string, userId: string) {
    return prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });
  }

  async listAttendance(args: {
    where: Prisma.AttendanceWhereInput;
    skip: number;
    take: number;
  }) {
    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where: args.where,
        include: { employee: { include: employeeInclude } },
        orderBy: [{ date: "desc" }, { checkInAt: "desc" }],
        skip: args.skip,
        take: args.take,
      }),
      prisma.attendance.count({ where: args.where }),
    ]);
    return { items, total };
  }

  getAttendanceByEmployeeDate(employeeId: string, date: Date) {
    return prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } },
      include: { employee: { include: employeeInclude } },
    });
  }

  createAttendance(data: {
    employeeId: string;
    date: Date;
    checkInAt: Date;
    status: AttendanceStatus;
    isLate: boolean;
    notes?: string | null;
    createdById: string;
  }) {
    return prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        date: data.date,
        checkInAt: data.checkInAt,
        status: data.status,
        isLate: data.isLate,
        notes: data.notes ?? null,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      include: { employee: { include: employeeInclude } },
    });
  }

  updateAttendance(
    id: string,
    data: {
      checkOutAt?: Date;
      workingMinutes?: number;
      overtimeMinutes?: number;
      status?: AttendanceStatus;
      notes?: string | null;
      updatedById: string;
    },
  ) {
    return prisma.attendance.update({
      where: { id },
      data,
      include: { employee: { include: employeeInclude } },
    });
  }

  async listLeaves(args: {
    where: Prisma.LeaveRequestWhereInput;
    skip: number;
    take: number;
  }) {
    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: args.where,
        include: { employee: { include: employeeInclude } },
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.leaveRequest.count({ where: args.where }),
    ]);
    return { items, total };
  }

  getLeave(id: string) {
    return prisma.leaveRequest.findFirst({
      where: { id, deletedAt: null },
      include: { employee: { include: employeeInclude } },
    });
  }

  createLeave(data: {
    employeeId: string;
    type: LeaveType;
    startDate: Date;
    endDate: Date;
    days: number;
    reason?: string | null;
    createdById: string;
  }) {
    return prisma.leaveRequest.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        days: data.days,
        reason: data.reason ?? null,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      include: { employee: { include: employeeInclude } },
    });
  }

  reviewLeave(
    id: string,
    data: {
      status: LeaveRequestStatus;
      reviewNote?: string | null;
      reviewedById: string;
    },
  ) {
    return prisma.leaveRequest.update({
      where: { id },
      data: {
        status: data.status,
        reviewNote: data.reviewNote ?? null,
        reviewedById: data.reviewedById,
        reviewedAt: new Date(),
        updatedById: data.reviewedById,
      },
      include: { employee: { include: employeeInclude } },
    });
  }

  listPerformance(where: Prisma.PerformanceReviewWhereInput) {
    return prisma.performanceReview.findMany({
      where,
      include: {
        employee: { include: employeeInclude },
        reviewer: { select: userSelect },
      },
      orderBy: { periodEnd: "desc" },
    });
  }

  createPerformance(data: {
    employeeId: string;
    reviewerId: string;
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
    rating: PerformanceRating;
    productivityScore: number;
    kpiSummary?: string | null;
    notes?: string | null;
    createdById: string;
  }) {
    return prisma.performanceReview.create({
      data: {
        ...data,
        kpiSummary: data.kpiSummary ?? null,
        notes: data.notes ?? null,
        updatedById: data.createdById,
      },
      include: {
        employee: { include: employeeInclude },
        reviewer: { select: userSelect },
      },
    });
  }

  updatePerformance(
    id: string,
    data: Prisma.PerformanceReviewUncheckedUpdateInput,
  ) {
    return prisma.performanceReview.update({
      where: { id },
      data,
      include: {
        employee: { include: employeeInclude },
        reviewer: { select: userSelect },
      },
    });
  }

  getPerformance(id: string) {
    return prisma.performanceReview.findFirst({
      where: { id, deletedAt: null },
      include: {
        employee: { include: employeeInclude },
        reviewer: { select: userSelect },
      },
    });
  }

  listGoals(where: Prisma.EmployeeGoalWhereInput) {
    return prisma.employeeGoal.findMany({
      where,
      include: { employee: { include: employeeInclude } },
      orderBy: { createdAt: "desc" },
    });
  }

  getGoal(id: string) {
    return prisma.employeeGoal.findFirst({
      where: { id, deletedAt: null },
      include: { employee: { include: employeeInclude } },
    });
  }

  createGoal(data: {
    employeeId: string;
    title: string;
    description?: string | null;
    kpiMetric?: string | null;
    targetValue?: string | null;
    progress: number;
    status: GoalStatus;
    dueDate?: Date | null;
    linkedTaskIds?: string[];
    autoProgress?: boolean;
    createdById: string;
  }) {
    return prisma.employeeGoal.create({
      data: {
        employeeId: data.employeeId,
        title: data.title,
        description: data.description ?? null,
        kpiMetric: data.kpiMetric ?? null,
        targetValue: data.targetValue ?? null,
        progress: data.progress,
        status: data.status,
        dueDate: data.dueDate ?? null,
        linkedTaskIds: data.linkedTaskIds ?? [],
        autoProgress: data.autoProgress ?? true,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      include: { employee: { include: employeeInclude } },
    });
  }

  updateGoal(id: string, data: Prisma.EmployeeGoalUncheckedUpdateInput) {
    return prisma.employeeGoal.update({
      where: { id },
      data,
      include: { employee: { include: employeeInclude } },
    });
  }

  softDeleteGoal(id: string, updatedById: string) {
    return prisma.employeeGoal.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  countEmployees(where: Prisma.EmployeeProfileWhereInput = {}) {
    return prisma.employeeProfile.count({
      where: { deletedAt: null, ...where },
    });
  }

  countDepartments() {
    return prisma.department.count({ where: { deletedAt: null } });
  }

  countTeams() {
    return prisma.team.count({ where: { deletedAt: null } });
  }

  countAttendance(where: Prisma.AttendanceWhereInput) {
    return prisma.attendance.count({ where });
  }

  countLeaves(where: Prisma.LeaveRequestWhereInput) {
    return prisma.leaveRequest.count({ where });
  }

  averageProductivity() {
    return prisma.performanceReview.aggregate({
      where: { deletedAt: null },
      _avg: { productivityScore: true },
    });
  }

  async nextCode(prefix: "EMP" | "ADM", pad: number): Promise<string> {
    const latest = await prisma.employeeProfile.findFirst({
      where:
        prefix === "ADM"
          ? { adminCode: { startsWith: `${prefix}-` } }
          : { employeeCode: { startsWith: `${prefix}-` } },
      orderBy:
        prefix === "ADM"
          ? { adminCode: "desc" }
          : { employeeCode: "desc" },
      select: { employeeCode: true, adminCode: true },
    });
    const raw =
      prefix === "ADM" ? latest?.adminCode ?? null : latest?.employeeCode ?? null;
    let next = 1;
    if (raw) {
      const match = raw.match(/(\d+)$/);
      if (match) next = Number(match[1]) + 1;
    }
    return `${prefix}-${String(next).padStart(pad, "0")}`;
  }

  findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
      select: { id: true, email: true },
    });
  }

  findRoleByCode(code: string) {
    return prisma.role.findUnique({ where: { code } });
  }

  assignEmployeesToDepartment(
    departmentId: string,
    employeeIds: string[],
    updatedById: string,
  ) {
    return prisma.employeeProfile.updateMany({
      where: { id: { in: employeeIds }, deletedAt: null },
      data: { departmentId, updatedById },
    });
  }

  transferTeamMember(input: {
    fromTeamId: string;
    toTeamId: string;
    userId: string;
    roleLabel?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.teamMember.deleteMany({
        where: { teamId: input.fromTeamId, userId: input.userId },
      });
      await tx.teamMember.create({
        data: {
          teamId: input.toTeamId,
          userId: input.userId,
          roleLabel: input.roleLabel ?? null,
        },
      });
      await tx.employeeProfile.updateMany({
        where: { userId: input.userId, deletedAt: null },
        data: { primaryTeamId: input.toTeamId },
      });
      return tx.team.findFirst({
        where: { id: input.toTeamId, deletedAt: null },
        include: {
          leader: { select: userSelect },
          department: true,
          members: { include: { user: { select: userSelect } } },
          _count: { select: { members: true } },
        },
      });
    });
  }

  countAdmins() {
    return prisma.user.count({
      where: {
        deletedAt: null,
        role: { code: "ADMIN" },
      },
    });
  }
}

export const teamRepository = new TeamRepository();
