import type {
  Task,
  TaskAttachment,
  TaskComment,
  User,
} from "@enterprise/database";
import type { TaskActivityDto, TaskCommentDto, TaskDto } from "@enterprise/shared";
import { Prisma } from "@enterprise/database";

type TaskWithRelations = Task & {
  project: { id: string; name: string } | null;
  assignedTo: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
  attachments?: TaskAttachment[];
  comments?: (TaskComment & {
    author: Pick<User, "id" | "firstName" | "lastName" | "email">;
  })[];
  _count?: { comments: number; attachments?: number };
};

type ActivityWithActor = {
  id: string;
  action: string;
  message: string;
  actorId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  actor: Pick<User, "id" | "firstName" | "lastName"> | null;
};

function toDateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

function toHoursNumber(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}

export function toTaskCommentDto(
  comment: TaskComment & {
    author: Pick<User, "id" | "firstName" | "lastName" | "email">;
  },
): TaskCommentDto {
  return {
    id: comment.id,
    body: comment.body,
    authorId: comment.authorId,
    authorFirstName: comment.author.firstName,
    authorLastName: comment.author.lastName,
    authorEmail: comment.author.email,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export function toTaskActivityDto(entry: ActivityWithActor): TaskActivityDto {
  return {
    id: entry.id,
    action: entry.action,
    message: entry.message,
    actorId: entry.actorId,
    actorFirstName: entry.actor?.firstName ?? null,
    actorLastName: entry.actor?.lastName ?? null,
    metadata:
      entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
        ? (entry.metadata as Record<string, unknown>)
        : null,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function toTaskDto(task: TaskWithRelations): TaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    projectId: task.projectId,
    projectName: task.project?.name ?? null,
    assignedToId: task.assignedToId,
    assignedTo: task.assignedTo
      ? {
          id: task.assignedTo.id,
          firstName: task.assignedTo.firstName,
          lastName: task.assignedTo.lastName,
          email: task.assignedTo.email,
        }
      : null,
    status: task.status,
    priority: task.priority,
    labels: task.labels,
    startDate: toDateOnly(task.startDate),
    dueDate: toDateOnly(task.dueDate),
    progress: task.progress,
    estimatedHours: toHoursNumber(task.estimatedHours),
    createdById: task.createdById,
    updatedById: task.updatedById,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    attachments: (task.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedById: attachment.uploadedById,
      createdAt: attachment.createdAt.toISOString(),
    })),
    comments: task.comments?.map(toTaskCommentDto),
    commentCount: task._count?.comments ?? task.comments?.length,
  };
}

export type { TaskWithRelations, ActivityWithActor };
