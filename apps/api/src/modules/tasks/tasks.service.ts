import { UserRole } from "@enterprise/shared";
import type {
  CreateTaskCommentInput,
  CreateTaskInput,
  EmployeeUpdateTaskInput,
  ListTasksQueryInput,
  TaskActivityDto,
  TaskCommentDto,
  TaskDto,
  TaskListResponse,
  TaskStats,
  UpdateTaskInput,
} from "@enterprise/shared";

import {
  logTaskAuditEvent,
  TASK_AUDIT_ACTIONS,
} from "./tasks.audit.js";
import { TASKS_ERROR_CODES, TasksError } from "./tasks.errors.js";
import {
  tasksRepository,
  type TaskAccessScope,
} from "./tasks.repository.js";
import {
  toTaskActivityDto,
  toTaskCommentDto,
  toTaskDto,
} from "./tasks.types.js";

export interface TaskActor {
  userId: string;
  role: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class TasksService {
  async list(
    query: ListTasksQueryInput,
    actor: TaskActor,
  ): Promise<TaskListResponse> {
    const scope = await this.resolveScope(actor);
    const { items, total } = await tasksRepository.findMany(query, scope);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toTaskDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getById(id: string, actor: TaskActor): Promise<TaskDto> {
    const scope = await this.resolveScope(actor);
    const task = await tasksRepository.findById(id, scope);

    if (!task) {
      throw new TasksError(
        "Task not found",
        404,
        TASKS_ERROR_CODES.NOT_FOUND,
      );
    }

    return toTaskDto(task);
  }

  async create(input: CreateTaskInput, actor: TaskActor): Promise<TaskDto> {
    this.assertIsAdmin(actor);
    await this.assertProjectAndAssignee(input.projectId, input.assignedToId);

    const created = await tasksRepository.create(input, actor.userId);

    await logTaskAuditEvent({
      userId: actor.userId,
      action: TASK_AUDIT_ACTIONS.CREATE,
      resourceId: created.id,
      metadata: {
        title: created.title,
        projectId: created.projectId,
        assignedToId: created.assignedToId,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toTaskDto(created);
  }

  async update(
    id: string,
    input: UpdateTaskInput | EmployeeUpdateTaskInput,
    actor: TaskActor,
  ): Promise<TaskDto> {
    const existing = await tasksRepository.findById(id, { all: true });
    if (!existing) {
      throw new TasksError(
        "Task not found",
        404,
        TASKS_ERROR_CODES.NOT_FOUND,
      );
    }

    if (this.isAdmin(actor)) {
      const fullInput = input as UpdateTaskInput;
      if (fullInput.projectId !== undefined || fullInput.assignedToId !== undefined) {
        await this.assertProjectAndAssignee(
          fullInput.projectId,
          fullInput.assignedToId,
        );
      }

      const updated = await tasksRepository.update(
        id,
        fullInput,
        actor.userId,
        "Task details were updated",
      );

      await logTaskAuditEvent({
        userId: actor.userId,
        action: TASK_AUDIT_ACTIONS.UPDATE,
        resourceId: id,
        metadata: { title: updated.title },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      return toTaskDto(updated);
    }

    if (actor.role === UserRole.EMPLOYEE) {
      if (existing.assignedToId !== actor.userId) {
        throw new TasksError(
          "You can only update tasks assigned to you",
          403,
          TASKS_ERROR_CODES.FORBIDDEN,
        );
      }

      const employeeInput = input as EmployeeUpdateTaskInput;
      const allowed: UpdateTaskInput = {};
      if (employeeInput.status !== undefined) {
        allowed.status = employeeInput.status;
      }
      if (employeeInput.progress !== undefined) {
        allowed.progress = employeeInput.progress;
      }

      if (Object.keys(allowed).length === 0) {
        throw new TasksError(
          "Employees may only update status and progress",
          403,
          TASKS_ERROR_CODES.FORBIDDEN,
        );
      }

      const updated = await tasksRepository.update(
        id,
        allowed,
        actor.userId,
        "Progress or status was updated",
      );

      await logTaskAuditEvent({
        userId: actor.userId,
        action: TASK_AUDIT_ACTIONS.UPDATE,
        resourceId: id,
        metadata: { title: updated.title, employeeSelfService: true },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      return toTaskDto(updated);
    }

    throw new TasksError(
      "You do not have permission to update tasks",
      403,
      TASKS_ERROR_CODES.FORBIDDEN,
    );
  }

  async remove(id: string, actor: TaskActor): Promise<{ id: string }> {
    this.assertIsAdmin(actor);

    const existing = await tasksRepository.findById(id, { all: true });
    if (!existing) {
      throw new TasksError(
        "Task not found",
        404,
        TASKS_ERROR_CODES.NOT_FOUND,
      );
    }

    await tasksRepository.softDelete(id, actor.userId);

    await logTaskAuditEvent({
      userId: actor.userId,
      action: TASK_AUDIT_ACTIONS.DELETE,
      resourceId: id,
      metadata: { title: existing.title },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async addComment(
    id: string,
    input: CreateTaskCommentInput,
    actor: TaskActor,
  ): Promise<TaskCommentDto> {
    if (actor.role === UserRole.CLIENT) {
      throw new TasksError(
        "Clients cannot comment on tasks",
        403,
        TASKS_ERROR_CODES.FORBIDDEN,
      );
    }

    const scope = await this.resolveScope(actor);
    const task = await tasksRepository.findById(id, scope);
    if (!task) {
      throw new TasksError(
        "Task not found",
        404,
        TASKS_ERROR_CODES.NOT_FOUND,
      );
    }

    if (
      actor.role === UserRole.EMPLOYEE &&
      task.assignedToId !== actor.userId
    ) {
      throw new TasksError(
        "You can only comment on tasks assigned to you",
        403,
        TASKS_ERROR_CODES.FORBIDDEN,
      );
    }

    const comment = await tasksRepository.addComment(id, input, actor.userId);

    await logTaskAuditEvent({
      userId: actor.userId,
      action: TASK_AUDIT_ACTIONS.COMMENT,
      resourceId: id,
      metadata: { commentId: comment.id },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toTaskCommentDto(comment);
  }

  async listActivity(
    id: string,
    actor: TaskActor,
  ): Promise<TaskActivityDto[]> {
    const scope = await this.resolveScope(actor);
    const task = await tasksRepository.findById(id, scope);
    if (!task) {
      throw new TasksError(
        "Task not found",
        404,
        TASKS_ERROR_CODES.NOT_FOUND,
      );
    }

    const entries = await tasksRepository.listActivity(id);
    return entries.map(toTaskActivityDto);
  }

  async getStats(actor: TaskActor): Promise<TaskStats> {
    const scope = await this.resolveScope(actor);
    return tasksRepository.getStats(scope);
  }

  async listAssignees(actor: TaskActor) {
    this.assertIsAdmin(actor);
    return tasksRepository.findAssignableUsers();
  }

  async listProjects(actor: TaskActor) {
    if (actor.role === UserRole.CLIENT) {
      throw new TasksError(
        "You do not have permission to manage task assignments",
        403,
        TASKS_ERROR_CODES.FORBIDDEN,
      );
    }

    const scope = await this.resolveScope(actor);
    // Admins get all projects; employees get their member projects for context
    if (this.isAdmin(actor)) {
      return tasksRepository.findAssignableProjects({ all: true });
    }

    return tasksRepository.findAssignableProjects(scope);
  }

  private async assertProjectAndAssignee(
    projectId: string | undefined,
    assignedToId: string | undefined,
  ): Promise<void> {
    if (projectId && projectId.trim().length > 0) {
      const exists = await tasksRepository.projectExists(projectId);
      if (!exists) {
        throw new TasksError(
          "Assigned project was not found",
          400,
          TASKS_ERROR_CODES.PROJECT_NOT_FOUND,
          [{ field: "projectId", message: "Assigned project was not found" }],
        );
      }
    }

    if (assignedToId && assignedToId.trim().length > 0) {
      const exists = await tasksRepository.assigneeExists(assignedToId);
      if (!exists) {
        throw new TasksError(
          "Assigned user was not found",
          400,
          TASKS_ERROR_CODES.ASSIGNEE_NOT_FOUND,
          [{ field: "assignedToId", message: "Assigned user was not found" }],
        );
      }
    }
  }

  private isAdmin(actor: TaskActor): boolean {
    return (
      actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN
    );
  }

  private assertIsAdmin(actor: TaskActor): void {
    if (!this.isAdmin(actor)) {
      throw new TasksError(
        "You do not have permission to perform this action",
        403,
        TASKS_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private async resolveScope(actor: TaskActor): Promise<TaskAccessScope> {
    if (this.isAdmin(actor)) {
      return { all: true };
    }

    if (actor.role === UserRole.EMPLOYEE) {
      return { all: false, assignedUserId: actor.userId };
    }

    if (actor.role === UserRole.CLIENT) {
      const companyId = await tasksRepository.getUserCompanyId(actor.userId);
      return { all: false, clientCompanyId: companyId };
    }

    return { all: false };
  }
}

export const tasksService = new TasksService();
