import type {
  Project,
  ProjectAttachment,
  ProjectMember,
  ProjectMilestone,
  User,
} from "@enterprise/database";
import type { ProjectDto } from "@enterprise/shared";
import { Prisma } from "@enterprise/database";

type ProjectWithRelations = Project & {
  client: { id: string; companyName: string } | null;
  members: (ProjectMember & {
    user: Pick<User, "id" | "firstName" | "lastName" | "email">;
  })[];
  milestones?: ProjectMilestone[];
  attachments?: ProjectAttachment[];
};

function toDateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

function toBudgetNumber(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}

export function toProjectDto(project: ProjectWithRelations): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    clientId: project.clientId,
    clientName: project.client?.companyName ?? null,
    status: project.status,
    priority: project.priority,
    startDate: toDateOnly(project.startDate),
    dueDate: toDateOnly(project.dueDate),
    progress: project.progress,
    budget: toBudgetNumber(project.budget),
    createdById: project.createdById,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    members: project.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      roleLabel: member.roleLabel,
      assignedAt: member.assignedAt.toISOString(),
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
    })),
    milestones: (project.milestones ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        dueDate: toDateOnly(milestone.dueDate),
        status: milestone.status,
        sortOrder: milestone.sortOrder,
        createdAt: milestone.createdAt.toISOString(),
        updatedAt: milestone.updatedAt.toISOString(),
      })),
    attachments: (project.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedById: attachment.uploadedById,
      createdAt: attachment.createdAt.toISOString(),
    })),
  };
}

export type { ProjectWithRelations };
