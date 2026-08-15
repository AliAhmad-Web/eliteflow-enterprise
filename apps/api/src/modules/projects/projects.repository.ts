import {
  type MilestoneStatus,
  Prisma,
  type ProjectPriority,
  type ProjectStatus,
  prisma,
  UserStatus,
} from "@enterprise/database";
import type {
  CreateProjectInput,
  ListProjectsQueryInput,
  UpdateProjectInput,
} from "@enterprise/shared";

import type { ProjectWithRelations } from "./projects.types.js";

const projectInclude = {
  client: { select: { id: true, companyName: true } },
  members: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
  milestones: true,
  attachments: true,
} satisfies Prisma.ProjectInclude;

/** List endpoints omit heavy nested collections (loaded on detail). */
const projectListInclude = {
  client: { select: { id: true, companyName: true } },
  members: {
    take: 12,
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

const SORT_FIELD_MAP = {
  name: "name",
  status: "status",
  priority: "priority",
  dueDate: "dueDate",
  progress: "progress",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const satisfies Record<
  ListProjectsQueryInput["sortBy"],
  keyof Prisma.ProjectOrderByWithRelationInput
>;

function emptyToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.trim().length === 0 ? null : value.trim();
}

function parseOptionalDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value.trim().length === 0) {
    return null;
  }

  return new Date(value);
}

function parseOptionalBudget(
  value: string | undefined,
): Prisma.Decimal | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value.trim().length === 0) {
    return null;
  }

  return new Prisma.Decimal(value);
}

export interface ProjectAccessScope {
  /** Unrestricted for Admin / Super Admin */
  all: boolean;
  /** Employee: only projects where they are a member */
  memberUserId?: string;
  /** Client portal: only unlocked company projects (advance verified). */
  clientCompanyId?: string | null;
  unlockedProjectIds?: string[];
}

export class ProjectsRepository {
  async findMany(
    query: ListProjectsQueryInput,
    scope: ProjectAccessScope,
  ): Promise<{ items: ProjectWithRelations[]; total: number }> {
    const where = this.buildWhere(query, scope);
    const sortField = SORT_FIELD_MAP[query.sortBy];
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: projectListInclude,
        orderBy: { [sortField]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.project.count({ where }),
    ]);

    return { items: items as ProjectWithRelations[], total };
  }

  async findById(
    id: string,
    scope: ProjectAccessScope,
  ): Promise<ProjectWithRelations | null> {
    const where: Prisma.ProjectWhereInput = {
      id,
      deletedAt: null,
      ...this.scopeFilter(scope),
    };

    const project = await prisma.project.findFirst({
      where,
      include: projectInclude,
    });

    return project as ProjectWithRelations | null;
  }

  async create(
    input: CreateProjectInput,
    createdById: string | null,
  ): Promise<ProjectWithRelations> {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: emptyToNull(input.description) ?? null,
        clientId: emptyToNull(input.clientId),
        status: input.status as ProjectStatus,
        priority: input.priority as ProjectPriority,
        startDate: parseOptionalDate(input.startDate) ?? null,
        dueDate: parseOptionalDate(input.dueDate) ?? null,
        progress: input.progress,
        budget: parseOptionalBudget(input.budget) ?? null,
        createdById,
        members: {
          create: input.memberIds.map((userId) => ({ userId })),
        },
        milestones: {
          create: input.milestones.map((milestone, index) => ({
            title: milestone.title,
            description: emptyToNull(milestone.description) ?? null,
            dueDate: parseOptionalDate(milestone.dueDate) ?? null,
            status: milestone.status as MilestoneStatus,
            sortOrder: milestone.sortOrder ?? index,
          })),
        },
        attachments: {
          create: input.attachments.map((attachment) => ({
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            mimeType: emptyToNull(attachment.mimeType) ?? null,
            sizeBytes: attachment.sizeBytes ?? null,
            uploadedById: createdById,
          })),
        },
      },
      include: projectInclude,
    });

    return project as ProjectWithRelations;
  }

  async update(
    id: string,
    input: UpdateProjectInput,
    uploadedById: string | null,
  ): Promise<ProjectWithRelations> {
    await prisma.$transaction(async (tx) => {
      const data: Prisma.ProjectUpdateInput = {};

      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) {
        data.description = emptyToNull(input.description) ?? null;
      }
      if (input.clientId !== undefined) {
        data.client = emptyToNull(input.clientId)
          ? { connect: { id: input.clientId } }
          : { disconnect: true };
      }
      if (input.status !== undefined) {
        data.status = input.status as ProjectStatus;
      }
      if (input.priority !== undefined) {
        data.priority = input.priority as ProjectPriority;
      }
      if (input.startDate !== undefined) {
        data.startDate = parseOptionalDate(input.startDate) ?? null;
      }
      if (input.dueDate !== undefined) {
        data.dueDate = parseOptionalDate(input.dueDate) ?? null;
      }
      if (input.progress !== undefined) data.progress = input.progress;
      if (input.budget !== undefined) {
        data.budget = parseOptionalBudget(input.budget) ?? null;
      }

      await tx.project.update({ where: { id }, data });

      if (input.memberIds) {
        await tx.projectMember.deleteMany({ where: { projectId: id } });
        if (input.memberIds.length > 0) {
          await tx.projectMember.createMany({
            data: input.memberIds.map((userId) => ({
              projectId: id,
              userId,
            })),
          });
        }
      }

      if (input.milestones) {
        await tx.projectMilestone.deleteMany({ where: { projectId: id } });
        if (input.milestones.length > 0) {
          await tx.projectMilestone.createMany({
            data: input.milestones.map((milestone, index) => ({
              projectId: id,
              title: milestone.title,
              description: emptyToNull(milestone.description) ?? null,
              dueDate: parseOptionalDate(milestone.dueDate) ?? null,
              status: milestone.status as MilestoneStatus,
              sortOrder: milestone.sortOrder ?? index,
            })),
          });
        }
      }

      if (input.attachments) {
        await tx.projectAttachment.deleteMany({ where: { projectId: id } });
        if (input.attachments.length > 0) {
          await tx.projectAttachment.createMany({
            data: input.attachments.map((attachment) => ({
              projectId: id,
              fileName: attachment.fileName,
              fileUrl: attachment.fileUrl,
              mimeType: emptyToNull(attachment.mimeType) ?? null,
              sizeBytes: attachment.sizeBytes ?? null,
              uploadedById,
            })),
          });
        }
      }
    });

    const updated = await prisma.project.findFirstOrThrow({
      where: { id },
      include: projectInclude,
    });

    return updated as ProjectWithRelations;
  }

  async softDelete(id: string): Promise<void> {
    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async clientExists(clientId: string): Promise<boolean> {
    const count = await prisma.client.count({
      where: { id: clientId, deletedAt: null },
    });
    return count > 0;
  }

  async findAssignableUsers(): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      roleCode: string;
    }>
  > {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: {
          code: { in: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { code: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleCode: user.role.code,
    }));
  }

  async getUserCompanyId(userId: string): Promise<string | null> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { companyId: true },
    });
    return user?.companyId ?? null;
  }

  async getStats(scope: ProjectAccessScope): Promise<{
    total: number;
    notStarted: number;
    inProgress: number;
    onHold: number;
    completed: number;
    cancelled: number;
    overdue: number;
    highPriority: number;
  }> {
    const base = {
      deletedAt: null as Date | null,
      ...this.scopeFilter(scope),
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total,
      notStarted,
      inProgress,
      onHold,
      completed,
      cancelled,
      overdue,
      highPriority,
    ] = await Promise.all([
      prisma.project.count({ where: base }),
      prisma.project.count({
        where: { ...base, status: "NOT_STARTED" },
      }),
      prisma.project.count({
        where: { ...base, status: "IN_PROGRESS" },
      }),
      prisma.project.count({ where: { ...base, status: "ON_HOLD" } }),
      prisma.project.count({
        where: { ...base, status: "COMPLETED" },
      }),
      prisma.project.count({
        where: { ...base, status: "CANCELLED" },
      }),
      prisma.project.count({
        where: {
          ...base,
          dueDate: { lt: today },
          status: { in: ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD"] },
        },
      }),
      prisma.project.count({
        where: {
          ...base,
          priority: { in: ["HIGH", "URGENT"] },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
    ]);

    return {
      total,
      notStarted,
      inProgress,
      onHold,
      completed,
      cancelled,
      overdue,
      highPriority,
    };
  }

  private buildWhere(
    query: ListProjectsQueryInput,
    scope: ProjectAccessScope,
  ): Prisma.ProjectWhereInput {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...this.scopeFilter(scope),
    };

    if (query.status) {
      where.status = query.status as ProjectStatus;
    }

    if (query.priority) {
      where.priority = query.priority as ProjectPriority;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.search) {
      const term = query.search;
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { client: { companyName: { contains: term, mode: "insensitive" } } },
      ];
    }

    return where;
  }

  private scopeFilter(scope: ProjectAccessScope): Prisma.ProjectWhereInput {
    if (scope.all) {
      return {};
    }

    if (scope.memberUserId) {
      return {
        members: { some: { userId: scope.memberUserId } },
      };
    }

    if (scope.clientCompanyId) {
      const ids = scope.unlockedProjectIds ?? [];
      return {
        clientId: scope.clientCompanyId,
        id: {
          in: ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"],
        },
      };
    }

    // No access scope resolved — return nothing
    return { id: "00000000-0000-0000-0000-000000000000" };
  }
}

export const projectsRepository = new ProjectsRepository();
