import { UserRole } from "@enterprise/shared";
import type {
  CreateProjectInput,
  ListProjectsQueryInput,
  ProjectDto,
  ProjectListResponse,
  ProjectStats,
  UpdateProjectInput,
} from "@enterprise/shared";

import {
  logProjectAuditEvent,
  PROJECT_AUDIT_ACTIONS,
} from "./projects.audit.js";
import { PROJECTS_ERROR_CODES, ProjectsError } from "./projects.errors.js";
import {
  projectsRepository,
  type ProjectAccessScope,
} from "./projects.repository.js";
import { toProjectDto } from "./projects.types.js";
import { attachmentSecurityService } from "../files/attachment-security.service.js";

export interface ProjectActor {
  userId: string;
  role: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class ProjectsService {
  async list(
    query: ListProjectsQueryInput,
    actor: ProjectActor,
  ): Promise<ProjectListResponse> {
    const scope = await this.resolveScope(actor);
    const { items, total } = await projectsRepository.findMany(query, scope);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toProjectDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getById(id: string, actor: ProjectActor): Promise<ProjectDto> {
    const scope = await this.resolveScope(actor);
    const project = await projectsRepository.findById(id, scope);

    if (!project) {
      throw new ProjectsError(
        "Project not found",
        404,
        PROJECTS_ERROR_CODES.NOT_FOUND,
      );
    }

    return toProjectDto(project);
  }

  async create(
    input: CreateProjectInput,
    actor: ProjectActor,
  ): Promise<ProjectDto> {
    this.assertCanMutate(actor);

    if (input.clientId) {
      const exists = await projectsRepository.clientExists(input.clientId);
      if (!exists) {
        throw new ProjectsError(
          "Assigned client was not found",
          400,
          PROJECTS_ERROR_CODES.CLIENT_NOT_FOUND,
          [{ field: "clientId", message: "Assigned client was not found" }],
        );
      }
    }

    const attachments = input.attachments?.length
      ? await attachmentSecurityService.secureAttachments(
          input.attachments,
          actor,
        )
      : input.attachments;

    const created = await projectsRepository.create(
      { ...input, attachments: attachments ?? [] },
      actor.userId,
    );

    await logProjectAuditEvent({
      userId: actor.userId,
      action: PROJECT_AUDIT_ACTIONS.CREATE,
      resourceId: created.id,
      metadata: { name: created.name, clientId: created.clientId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toProjectDto(created);
  }

  async update(
    id: string,
    input: UpdateProjectInput,
    actor: ProjectActor,
  ): Promise<ProjectDto> {
    this.assertCanMutate(actor);

    const existing = await projectsRepository.findById(id, { all: true });
    if (!existing) {
      throw new ProjectsError(
        "Project not found",
        404,
        PROJECTS_ERROR_CODES.NOT_FOUND,
      );
    }

    if (input.clientId) {
      const exists = await projectsRepository.clientExists(input.clientId);
      if (!exists) {
        throw new ProjectsError(
          "Assigned client was not found",
          400,
          PROJECTS_ERROR_CODES.CLIENT_NOT_FOUND,
          [{ field: "clientId", message: "Assigned client was not found" }],
        );
      }
    }

    const securedInput =
      input.attachments !== undefined
        ? {
            ...input,
            attachments: await attachmentSecurityService.secureAttachments(
              input.attachments,
              actor,
            ),
          }
        : input;

    const updated = await projectsRepository.update(
      id,
      securedInput,
      actor.userId,
    );

    await logProjectAuditEvent({
      userId: actor.userId,
      action: PROJECT_AUDIT_ACTIONS.UPDATE,
      resourceId: id,
      metadata: { name: updated.name },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toProjectDto(updated);
  }

  async remove(id: string, actor: ProjectActor): Promise<{ id: string }> {
    this.assertCanMutate(actor);

    const existing = await projectsRepository.findById(id, { all: true });
    if (!existing) {
      throw new ProjectsError(
        "Project not found",
        404,
        PROJECTS_ERROR_CODES.NOT_FOUND,
      );
    }

    await projectsRepository.softDelete(id);

    await logProjectAuditEvent({
      userId: actor.userId,
      action: PROJECT_AUDIT_ACTIONS.DELETE,
      resourceId: id,
      metadata: { name: existing.name },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async getStats(actor: ProjectActor): Promise<ProjectStats> {
    const scope = await this.resolveScope(actor);
    return projectsRepository.getStats(scope);
  }

  async listAssignees(actor: ProjectActor) {
    this.assertCanMutate(actor);
    return projectsRepository.findAssignableUsers();
  }

  private assertCanMutate(actor: ProjectActor): void {
    if (
      actor.role !== UserRole.ADMIN &&
      actor.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ProjectsError(
        "You do not have permission to modify projects",
        403,
        PROJECTS_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private async resolveScope(actor: ProjectActor): Promise<ProjectAccessScope> {
    if (
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.SUPER_ADMIN
    ) {
      return { all: true };
    }

    if (actor.role === UserRole.EMPLOYEE) {
      return { all: false, memberUserId: actor.userId };
    }

    if (actor.role === UserRole.CLIENT) {
      const companyId = await projectsRepository.getUserCompanyId(actor.userId);
      return { all: false, clientCompanyId: companyId };
    }

    return { all: false };
  }
}

export const projectsService = new ProjectsService();
