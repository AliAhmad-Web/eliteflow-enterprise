import type { RetentionEntityType } from "@enterprise/database";
import { prisma, Prisma } from "@enterprise/database";

import type { RetentionCandidate } from "./retention.types.js";
import { RETENTION_BATCH_SIZE } from "./retention.policies.js";

export const SECURE_DELETE_MARKER = "[SECURELY_DELETED]";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Load archive/delete candidates that are still active (not soft-deleted)
 * and not already secure-deleted in retention lifecycle.
 */
export async function findRetentionCandidates(
  entityType: RetentionEntityType,
  olderThanDays: number,
  excludeIds: Set<string>,
): Promise<RetentionCandidate[]> {
  const cutoff = daysAgo(olderThanDays);
  const take = RETENTION_BATCH_SIZE;

  switch (entityType) {
    case "AUDIT_LOGS": {
      const rows = await prisma.auditLog.findMany({
        where: { createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return rows
        .filter((r) => !excludeIds.has(r.id))
        .map((r) => ({
          entityType,
          entityId: r.id,
          createdAt: r.createdAt,
        }));
    }
    case "AI_MEMORY": {
      const rows = await prisma.aiMemoryRecord.findMany({
        where: {
          deletedAt: null,
          createdAt: { lte: cutoff },
        },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    case "AI_DOCUMENTS": {
      const rows = await prisma.aiDocument.findMany({
        where: { deletedAt: null, createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    case "FILES": {
      const rows = await prisma.managedFile.findMany({
        where: { deletedAt: null, createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    case "COMMUNICATIONS": {
      const rows = await prisma.conversation.findMany({
        where: { deletedAt: null, createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    case "PROJECTS": {
      const rows = await prisma.project.findMany({
        where: { deletedAt: null, createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    case "TASKS": {
      const rows = await prisma.task.findMany({
        where: { deletedAt: null, createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    case "HR_DOCUMENTS": {
      const rows = await prisma.employeeDocument.findMany({
        where: { deletedAt: null, createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    case "NOTIFICATIONS": {
      const rows = await prisma.notification.findMany({
        where: { deletedAt: null, createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    case "REPORTS": {
      const rows = await prisma.savedReport.findMany({
        where: { deletedAt: null, createdAt: { lte: cutoff } },
        orderBy: { createdAt: "asc" },
        take,
        select: { id: true, createdAt: true },
      });
      return filterMap(rows, entityType, excludeIds);
    }
    default: {
      const _exhaustive: never = entityType;
      return _exhaustive;
    }
  }
}

function filterMap(
  rows: Array<{ id: string; createdAt: Date }>,
  entityType: RetentionEntityType,
  excludeIds: Set<string>,
): RetentionCandidate[] {
  return rows
    .filter((r) => !excludeIds.has(r.id))
    .map((r) => ({
      entityType,
      entityId: r.id,
      createdAt: r.createdAt,
    }));
}

/** Domain archive (where supported) + no business data wipe. */
export async function archiveEntity(
  entityType: RetentionEntityType,
  entityId: string,
  now: Date,
): Promise<void> {
  switch (entityType) {
    case "AUDIT_LOGS":
      // Audit rows are never mutated; lifecycle record alone marks archive.
      return;
    case "AI_MEMORY":
    case "AI_DOCUMENTS":
    case "FILES":
    case "PROJECTS":
    case "TASKS":
    case "HR_DOCUMENTS":
    case "REPORTS":
      return;
    case "COMMUNICATIONS":
      await prisma.conversation.updateMany({
        where: { id: entityId, deletedAt: null, archivedAt: null },
        data: { archivedAt: now },
      });
      return;
    case "NOTIFICATIONS":
      await prisma.notification.updateMany({
        where: { id: entityId, deletedAt: null, isArchived: false },
        data: { isArchived: true, archivedAt: now },
      });
      return;
    default: {
      const _exhaustive: never = entityType;
      return _exhaustive;
    }
  }
}

/**
 * Secure deletion: soft-delete business rows, scrub sensitive fields,
 * clear file references. Never physically deletes audit logs.
 */
export async function secureDeleteEntity(
  entityType: RetentionEntityType,
  entityId: string,
  now: Date,
): Promise<void> {
  switch (entityType) {
    case "AUDIT_LOGS":
      throw new Error("Secure deletion of audit logs is prohibited");
    case "AI_MEMORY":
      await prisma.aiMemoryRecord.updateMany({
        where: { id: entityId, deletedAt: null },
        data: {
          deletedAt: now,
          summary: SECURE_DELETE_MARKER,
          tagsJson: "[]",
          permissionKeysJson: "[]",
          source: SECURE_DELETE_MARKER,
          memoryKey: `deleted_${entityId}`.slice(0, 128),
        },
      });
      return;
    case "AI_DOCUMENTS":
      await prisma.aiDocument.updateMany({
        where: { id: entityId, deletedAt: null },
        data: {
          deletedAt: now,
          title: SECURE_DELETE_MARKER,
          prompt: SECURE_DELETE_MARKER,
          content: SECURE_DELETE_MARKER,
        },
      });
      return;
    case "FILES": {
      await prisma.$transaction(async (tx) => {
        await tx.managedFile.updateMany({
          where: { id: entityId, deletedAt: null },
          data: {
            deletedAt: now,
            name: SECURE_DELETE_MARKER,
            originalName: SECURE_DELETE_MARKER,
            storageKey: `secure-deleted/${entityId}`,
            checksum: null,
            tags: [],
          },
        });
        await tx.fileShare.deleteMany({ where: { fileId: entityId } });
        await tx.fileVersion.updateMany({
          where: { fileId: entityId },
          data: { storageKey: `secure-deleted/${entityId}` },
        });
      });
      return;
    }
    case "COMMUNICATIONS":
      await prisma.$transaction(async (tx) => {
        const messages = await tx.message.findMany({
          where: { conversationId: entityId },
          select: { id: true },
        });
        const messageIds = messages.map((m) => m.id);
        if (messageIds.length > 0) {
          await tx.messageAttachment.updateMany({
            where: { messageId: { in: messageIds }, deletedAt: null },
            data: {
              deletedAt: now,
              fileName: SECURE_DELETE_MARKER,
              fileUrl: SECURE_DELETE_MARKER,
              managedFileId: null,
              waveformJson: null,
            },
          });
          await tx.message.updateMany({
            where: { conversationId: entityId, deletedAt: null },
            data: {
              deletedAt: now,
              body: SECURE_DELETE_MARKER,
            },
          });
        }
        await tx.conversation.updateMany({
          where: { id: entityId, deletedAt: null },
          data: {
            deletedAt: now,
            name: SECURE_DELETE_MARKER,
            description: null,
            lastMessagePreview: SECURE_DELETE_MARKER,
          },
        });
      });
      return;
    case "PROJECTS":
      await prisma.project.updateMany({
        where: { id: entityId, deletedAt: null },
        data: { deletedAt: now },
      });
      return;
    case "TASKS":
      await prisma.task.updateMany({
        where: { id: entityId, deletedAt: null },
        data: { deletedAt: now },
      });
      return;
    case "HR_DOCUMENTS":
      await prisma.employeeDocument.updateMany({
        where: { id: entityId, deletedAt: null },
        data: {
          deletedAt: now,
          title: SECURE_DELETE_MARKER,
          fileUrl: SECURE_DELETE_MARKER,
          fileName: SECURE_DELETE_MARKER,
          notes: null,
        },
      });
      return;
    case "NOTIFICATIONS":
      await prisma.notification.updateMany({
        where: { id: entityId, deletedAt: null },
        data: {
          deletedAt: now,
          title: SECURE_DELETE_MARKER,
          body: SECURE_DELETE_MARKER,
          metadata: Prisma.DbNull,
          linkUrl: null,
        },
      });
      return;
    case "REPORTS":
      await prisma.savedReport.updateMany({
        where: { id: entityId, deletedAt: null },
        data: {
          deletedAt: now,
          name: SECURE_DELETE_MARKER,
          description: null,
          filters: {},
        },
      });
      return;
    default: {
      const _exhaustive: never = entityType;
      return _exhaustive;
    }
  }
}
