import {
  Prisma,
  type TaskPriority,
  type TaskStatus,
  prisma,
  UserStatus,
} from "@enterprise/database";
import type {
  CreateTaskCommentInput,
  CreateTaskInput,
  ListTasksQueryInput,
  UpdateTaskInput,
} from "@enterprise/shared";

import type { ActivityWithActor, TaskWithRelations } from "./tasks.types.js";

const listInclude = {
  project: { select: { id: true, name: true } },
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  _count: {
    select: {
      comments: { where: { deletedAt: null } },
      attachments: true,
    },
  },
} satisfies Prisma.TaskInclude;

const detailInclude = {
  project: { select: { id: true, name: true } },
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  attachments: true,
  _count: {
    select: {
      comments: { where: { deletedAt: null } },
      attachments: true,
    },
  },
  comments: {
    where: { deletedAt: null },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.TaskInclude;

const SORT_FIELD_MAP = {
  title: "title",
  status: "status",
  priority: "priority",
  dueDate: "dueDate",
  progress: "progress",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const satisfies Record<
  ListTasksQueryInput["sortBy"],
  keyof Prisma.TaskOrderByWithRelationInput
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

function parseOptionalHours(
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

export interface TaskAccessScope {
  all: boolean;
  assignedUserId?: string;
  clientCompanyId?: string | null;
  unlockedProjectIds?: string[];
}

export class TasksRepository {
  async findMany(
    query: ListTasksQueryInput,
    scope: TaskAccessScope,
  ): Promise<{ items: TaskWithRelations[]; total: number }> {
    const where = this.buildWhere(query, scope);
    const sortField = SORT_FIELD_MAP[query.sortBy];
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: listInclude,
        orderBy: { [sortField]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { items: items as TaskWithRelations[], total };
  }

  async findById(
    id: string,
    scope: TaskAccessScope,
  ): Promise<TaskWithRelations | null> {
    const where: Prisma.TaskWhereInput = {
      id,
      deletedAt: null,
      ...this.scopeFilter(scope),
    };

    const task = await prisma.task.findFirst({
      where,
      include: detailInclude,
    });

    return task as TaskWithRelations | null;
  }

  async create(
    input: CreateTaskInput,
    actorId: string | null,
  ): Promise<TaskWithRelations> {
    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: emptyToNull(input.description) ?? null,
        projectId: emptyToNull(input.projectId),
        assignedToId: emptyToNull(input.assignedToId),
        status: input.status as TaskStatus,
        priority: input.priority as TaskPriority,
        labels: input.labels,
        startDate: parseOptionalDate(input.startDate) ?? null,
        dueDate: parseOptionalDate(input.dueDate) ?? null,
        progress: input.progress,
        estimatedHours: parseOptionalHours(input.estimatedHours) ?? null,
        createdById: actorId,
        updatedById: actorId,
        attachments: {
          create: input.attachments.map((attachment) => ({
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            mimeType: emptyToNull(attachment.mimeType) ?? null,
            sizeBytes: attachment.sizeBytes ?? null,
            uploadedById: actorId,
          })),
        },
        activityLogs: {
          create: {
            actorId,
            action: "task.created",
            message: `Task “${input.title}” was created`,
            metadata: {
              status: input.status,
              priority: input.priority,
            },
          },
        },
      },
      include: detailInclude,
    });

    return task as TaskWithRelations;
  }

  async update(
    id: string,
    input: UpdateTaskInput,
    actorId: string | null,
    activityMessage?: string,
  ): Promise<TaskWithRelations> {
    await prisma.$transaction(async (tx) => {
      const data: Prisma.TaskUpdateInput = {
        updatedBy: actorId ? { connect: { id: actorId } } : undefined,
      };

      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) {
        data.description = emptyToNull(input.description) ?? null;
      }
      if (input.projectId !== undefined) {
        data.project = emptyToNull(input.projectId)
          ? { connect: { id: input.projectId } }
          : { disconnect: true };
      }
      if (input.assignedToId !== undefined) {
        data.assignedTo = emptyToNull(input.assignedToId)
          ? { connect: { id: input.assignedToId } }
          : { disconnect: true };
      }
      if (input.status !== undefined) {
        data.status = input.status as TaskStatus;
      }
      if (input.priority !== undefined) {
        data.priority = input.priority as TaskPriority;
      }
      if (input.labels !== undefined) data.labels = input.labels;
      if (input.startDate !== undefined) {
        data.startDate = parseOptionalDate(input.startDate) ?? null;
      }
      if (input.dueDate !== undefined) {
        data.dueDate = parseOptionalDate(input.dueDate) ?? null;
      }
      if (input.progress !== undefined) data.progress = input.progress;
      if (input.estimatedHours !== undefined) {
        data.estimatedHours = parseOptionalHours(input.estimatedHours) ?? null;
      }

      await tx.task.update({ where: { id }, data });

      if (input.attachments) {
        await tx.taskAttachment.deleteMany({ where: { taskId: id } });
        if (input.attachments.length > 0) {
          await tx.taskAttachment.createMany({
            data: input.attachments.map((attachment) => ({
              taskId: id,
              fileName: attachment.fileName,
              fileUrl: attachment.fileUrl,
              mimeType: emptyToNull(attachment.mimeType) ?? null,
              sizeBytes: attachment.sizeBytes ?? null,
              uploadedById: actorId,
            })),
          });
        }
      }

      await tx.taskActivityLog.create({
        data: {
          taskId: id,
          actorId,
          action: "task.updated",
          message: activityMessage ?? "Task was updated",
          metadata: input as Prisma.InputJsonValue,
        },
      });
    });

    const updated = await prisma.task.findFirstOrThrow({
      where: { id },
      include: detailInclude,
    });

    return updated as TaskWithRelations;
  }

  async softDelete(id: string, actorId: string | null): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: actorId,
        },
      });

      await tx.taskActivityLog.create({
        data: {
          taskId: id,
          actorId,
          action: "task.deleted",
          message: "Task was soft-deleted",
        },
      });
    });
  }

  async addComment(
    taskId: string,
    input: CreateTaskCommentInput,
    authorId: string,
  ) {
    // Avoid interactive transactions against Supabase pooler under load
    // ("Unable to start a transaction in the given time"). Sequential writes
    // keep comment creation reliable while preserving the same side effects.
    const created = await prisma.taskComment.create({
      data: {
        taskId,
        authorId,
        body: input.body,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await prisma.taskActivityLog.create({
      data: {
        taskId,
        actorId: authorId,
        action: "task.commented",
        message: "Added a comment",
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { updatedById: authorId },
    });

    return created;
  }

  async listActivity(taskId: string): Promise<ActivityWithActor[]> {
    const entries = await prisma.taskActivityLog.findMany({
      where: { taskId },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return entries as ActivityWithActor[];
  }

  async projectExists(projectId: string): Promise<boolean> {
    const count = await prisma.project.count({
      where: { id: projectId, deletedAt: null },
    });
    return count > 0;
  }

  async assigneeExists(userId: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: {
        id: userId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: { code: { in: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] } },
      },
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

  async findAssignableProjects(scope: TaskAccessScope): Promise<
    Array<{ id: string; name: string }>
  > {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
    };

    if (!scope.all && scope.clientCompanyId) {
      const ids = scope.unlockedProjectIds ?? [];
      where.clientId = scope.clientCompanyId;
      where.id = {
        in: ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"],
      };
    }

    if (!scope.all && scope.assignedUserId) {
      where.members = { some: { userId: scope.assignedUserId } };
    }

    if (!scope.all && !scope.clientCompanyId && !scope.assignedUserId) {
      return [];
    }

    return prisma.project.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    });
  }

  async getUserCompanyId(userId: string): Promise<string | null> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { companyId: true },
    });
    return user?.companyId ?? null;
  }

  async getStats(scope: TaskAccessScope): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    completed: number;
    blocked: number;
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
      todo,
      inProgress,
      review,
      completed,
      blocked,
      overdue,
      highPriority,
    ] = await Promise.all([
      prisma.task.count({ where: base }),
      prisma.task.count({ where: { ...base, status: "TODO" } }),
      prisma.task.count({ where: { ...base, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { ...base, status: "REVIEW" } }),
      prisma.task.count({ where: { ...base, status: "COMPLETED" } }),
      prisma.task.count({ where: { ...base, status: "BLOCKED" } }),
      prisma.task.count({
        where: {
          ...base,
          dueDate: { lt: today },
          status: { in: ["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED"] },
        },
      }),
      prisma.task.count({
        where: {
          ...base,
          priority: { in: ["HIGH", "CRITICAL"] },
          status: { notIn: ["COMPLETED"] },
        },
      }),
    ]);

    return {
      total,
      todo,
      inProgress,
      review,
      completed,
      blocked,
      overdue,
      highPriority,
    };
  }

  private buildWhere(
    query: ListTasksQueryInput,
    scope: TaskAccessScope,
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...this.scopeFilter(scope),
    };

    if (query.status) {
      where.status = query.status as TaskStatus;
    }

    if (query.priority) {
      where.priority = query.priority as TaskPriority;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.search) {
      const term = query.search;
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { project: { name: { contains: term, mode: "insensitive" } } },
        {
          assignedTo: {
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          },
        },
        { labels: { has: term } },
      ];
    }

    return where;
  }

  private scopeFilter(scope: TaskAccessScope): Prisma.TaskWhereInput {
    if (scope.all) {
      return {};
    }

    if (scope.assignedUserId) {
      return { assignedToId: scope.assignedUserId };
    }

    if (scope.clientCompanyId) {
      const ids = scope.unlockedProjectIds ?? [];
      return {
        project: {
          clientId: scope.clientCompanyId,
          deletedAt: null,
          id: {
            in: ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"],
          },
        },
      };
    }

    return { id: "00000000-0000-0000-0000-000000000000" };
  }
}

export const tasksRepository = new TasksRepository();
