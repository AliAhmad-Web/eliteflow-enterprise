import type { PrismaClient } from "../../../src/generated/client";

import {
  CLIENT_PORTAL_LINKS,
  PROJECT_SEED_DATA,
} from "./data/projects.data";
import { seedLog } from "./utils/logger";

export async function seedProjects(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding projects & portal company links...");

  for (const link of CLIENT_PORTAL_LINKS) {
    const client = await prisma.client.findFirst({
      where: { email: link.clientEmail, deletedAt: null },
    });
    const user = await prisma.user.findUnique({
      where: { email: link.userEmail },
    });

    if (!client || !user) {
      seedLog(
        `  ⚠ Skipped portal link ${link.userEmail} → ${link.clientEmail}`,
      );
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: client.id },
    });
    seedLog(`  ✓ Linked ${link.userEmail} to ${client.companyName}`);
  }

  const admin = await prisma.user.findUnique({
    where: { email: "admin@eliteflow.dev" },
  });

  for (const project of PROJECT_SEED_DATA) {
    const client = await prisma.client.findFirst({
      where: { email: project.clientEmail, deletedAt: null },
    });

    if (!client) {
      seedLog(`  ⚠ Client missing for project ${project.name}`);
      continue;
    }

    const memberUsers = await prisma.user.findMany({
      where: { email: { in: project.memberEmails } },
      select: { id: true, email: true },
    });

    const existing = await prisma.project.findFirst({
      where: {
        name: project.name,
        clientId: client.id,
        deletedAt: null,
      },
    });

    const memberCreates = memberUsers.map((user) => ({ userId: user.id }));
    const milestoneCreates = project.milestones.map((milestone) => ({
      title: milestone.title,
      description: milestone.description ?? null,
      dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
      status: milestone.status,
      sortOrder: milestone.sortOrder,
    }));
    const attachmentCreates = (project.attachments ?? []).map(
      (attachment) => ({
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        mimeType: attachment.mimeType ?? null,
        uploadedById: admin?.id ?? null,
      }),
    );

    if (existing) {
      await prisma.$transaction(
        async (tx) => {
          await tx.projectMember.deleteMany({
            where: { projectId: existing.id },
          });
          await tx.projectMilestone.deleteMany({
            where: { projectId: existing.id },
          });
          await tx.projectAttachment.deleteMany({
            where: { projectId: existing.id },
          });

          await tx.project.update({
            where: { id: existing.id },
            data: {
              description: project.description ?? null,
              status: project.status,
              priority: project.priority,
              startDate: project.startDate
                ? new Date(project.startDate)
                : null,
              dueDate: project.dueDate ? new Date(project.dueDate) : null,
              progress: project.progress,
              budget: project.budget ?? null,
              createdById: admin?.id ?? existing.createdById,
              members: { create: memberCreates },
              milestones: { create: milestoneCreates },
              attachments: { create: attachmentCreates },
            },
          });
        },
        { timeout: 120_000, maxWait: 20_000 },
      );
      seedLog(`  ✓ Updated project ${project.name}`);
      continue;
    }

    await prisma.project.create({
      data: {
        name: project.name,
        description: project.description ?? null,
        clientId: client.id,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate ? new Date(project.startDate) : null,
        dueDate: project.dueDate ? new Date(project.dueDate) : null,
        progress: project.progress,
        budget: project.budget ?? null,
        createdById: admin?.id ?? null,
        members: { create: memberCreates },
        milestones: { create: milestoneCreates },
        attachments: { create: attachmentCreates },
      },
    });
    seedLog(`  ✓ Created project ${project.name}`);
  }
}
