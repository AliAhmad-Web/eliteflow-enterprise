import type { PrismaClient } from "../../../src/generated/client";

import { TASK_SEED_DATA } from "./data/tasks.data";
import { seedLog } from "./utils/logger";

export async function seedTasks(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding tasks...");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@eliteflow.dev" },
  });

  for (const task of TASK_SEED_DATA) {
    const project = await prisma.project.findFirst({
      where: { name: task.projectName, deletedAt: null },
    });

    if (!project) {
      seedLog(`  ⚠ Project missing for task ${task.title}`);
      continue;
    }

    const assignee = task.assigneeEmail
      ? await prisma.user.findUnique({
          where: { email: task.assigneeEmail },
          select: { id: true },
        })
      : null;

    const existing = await prisma.task.findFirst({
      where: {
        title: task.title,
        projectId: project.id,
        deletedAt: null,
      },
    });

    const attachmentCreates = (task.attachments ?? []).map((attachment) => ({
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType ?? null,
      uploadedById: admin?.id ?? null,
    }));

    if (existing) {
      const commentCreates: Array<{ authorId: string; body: string }> = [];
      for (const comment of task.comments ?? []) {
        const author = await prisma.user.findUnique({
          where: { email: comment.authorEmail },
          select: { id: true },
        });
        if (!author) continue;
        commentCreates.push({ authorId: author.id, body: comment.body });
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.taskComment.deleteMany({ where: { taskId: existing.id } });
          await tx.taskAttachment.deleteMany({ where: { taskId: existing.id } });
          await tx.taskActivityLog.deleteMany({
            where: { taskId: existing.id },
          });

          await tx.task.update({
            where: { id: existing.id },
            data: {
              description: task.description ?? null,
              assignedToId: assignee?.id ?? null,
              status: task.status,
              priority: task.priority,
              labels: [...task.labels],
              startDate: task.startDate ? new Date(task.startDate) : null,
              dueDate: task.dueDate ? new Date(task.dueDate) : null,
              progress: task.progress,
              estimatedHours: task.estimatedHours ?? null,
              createdById: admin?.id ?? existing.createdById,
              updatedById: admin?.id ?? null,
              attachments: { create: attachmentCreates },
              activityLogs: {
                create: {
                  actorId: admin?.id ?? null,
                  action: "task.seeded",
                  message: "Task seed data refreshed",
                },
              },
              comments: {
                create: commentCreates,
              },
            },
          });
        },
        { timeout: 120_000, maxWait: 20_000 },
      );

      seedLog(`  ✓ Updated task ${task.title}`);
      continue;
    }

    const created = await prisma.task.create({
      data: {
        title: task.title,
        description: task.description ?? null,
        projectId: project.id,
        assignedToId: assignee?.id ?? null,
        status: task.status,
        priority: task.priority,
        labels: [...task.labels],
        startDate: task.startDate ? new Date(task.startDate) : null,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        progress: task.progress,
        estimatedHours: task.estimatedHours ?? null,
        createdById: admin?.id ?? null,
        updatedById: admin?.id ?? null,
        attachments: { create: attachmentCreates },
        activityLogs: {
          create: {
            actorId: admin?.id ?? null,
            action: "task.created",
            message: `Task “${task.title}” was created`,
          },
        },
      },
    });

    for (const comment of task.comments ?? []) {
      const author = await prisma.user.findUnique({
        where: { email: comment.authorEmail },
        select: { id: true },
      });
      if (!author) continue;
      await prisma.taskComment.create({
        data: {
          taskId: created.id,
          authorId: author.id,
          body: comment.body,
        },
      });
    }

    seedLog(`  ✓ Created task ${task.title}`);
  }
}
