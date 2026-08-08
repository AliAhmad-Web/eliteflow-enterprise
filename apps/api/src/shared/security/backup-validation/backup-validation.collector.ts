/**
 * Collect backup metadata for validation — never loads secrets or credentials.
 */

import { prisma } from "@enterprise/database";

import { logger } from "../logger.js";
import {
  BACKUP_TARGET_CATEGORIES,
  type BackupMetadataItem,
  type BackupTargetCategory,
} from "./backup-validation.types.js";

function mapRecordCategory(message: string | null, storageKey: string | null): BackupTargetCategory {
  const hay = `${message ?? ""} ${storageKey ?? ""}`.toLowerCase();
  if (hay.includes("database") || hay.includes("db") || hay.includes("prisma")) {
    return "DATABASE";
  }
  if (hay.includes("document") || hay.includes("docs")) {
    return "DOCUMENTS";
  }
  if (hay.includes("ai") || hay.includes("config")) {
    return "AI_CONFIG";
  }
  if (hay.includes("secret") || hay.includes("credential") || hay.includes("key")) {
    return "SECRETS";
  }
  if (hay.includes("upload")) {
    return "UPLOADS";
  }
  if (hay.includes("file") || hay.includes("storage")) {
    return "FILE_STORAGE";
  }
  return "APPLICATION";
}

/**
 * Load BackupRecord rows as sanitized metadata.
 * Does not create backups or expose credentials.
 */
export async function collectBackupRecords(
  take = 200,
): Promise<BackupMetadataItem[]> {
  try {
    const rows = await prisma.backupRecord.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        type: true,
        status: true,
        storageKey: true,
        sizeBytes: true,
        checksum: true,
        message: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      category: mapRecordCategory(row.message, row.storageKey),
      type: row.type,
      status: row.status,
      storageKey: row.storageKey,
      sizeBytes: row.sizeBytes != null ? row.sizeBytes.toString() : null,
      checksum: row.checksum,
      message: row.message
        ? row.message.slice(0, 200)
        : null,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (error) {
    logger.error("[backup-validation] Failed to collect BackupRecord metadata:", error);
    return [];
  }
}

export interface CategoryEvidence {
  category: BackupTargetCategory;
  present: boolean;
  count: number;
  detail: string;
}

/**
 * Lightweight presence evidence per target category (no secret values).
 */
export async function collectCategoryEvidence(): Promise<CategoryEvidence[]> {
  const evidence: CategoryEvidence[] = [];

  try {
    const backupCount = await prisma.backupRecord.count();
    evidence.push({
      category: "APPLICATION",
      present: backupCount > 0,
      count: backupCount,
      detail: backupCount > 0 ? "Backup records present" : "No backup records",
    });
    evidence.push({
      category: "DATABASE",
      present: backupCount > 0,
      count: backupCount,
      detail:
        backupCount > 0
          ? "Database backup metadata available via BackupRecord"
          : "No database backup metadata",
    });
  } catch {
    evidence.push({
      category: "APPLICATION",
      present: false,
      count: 0,
      detail: "Unable to query backup records",
    });
    evidence.push({
      category: "DATABASE",
      present: false,
      count: 0,
      detail: "Unable to query backup records",
    });
  }

  try {
    const fileCount = await prisma.managedFile.count({
      where: { deletedAt: null },
    });
    evidence.push({
      category: "FILE_STORAGE",
      present: fileCount > 0,
      count: fileCount,
      detail: fileCount > 0 ? "Managed files present" : "No managed files",
    });
    evidence.push({
      category: "UPLOADS",
      present: fileCount > 0,
      count: fileCount,
      detail: fileCount > 0 ? "Uploads present" : "No uploads",
    });
  } catch {
    for (const category of ["FILE_STORAGE", "UPLOADS"] as const) {
      evidence.push({
        category,
        present: false,
        count: 0,
        detail: "Unable to query managed files",
      });
    }
  }

  try {
    const docCount = await prisma.aiDocument.count({
      where: { deletedAt: null },
    });
    evidence.push({
      category: "DOCUMENTS",
      present: docCount > 0,
      count: docCount,
      detail: docCount > 0 ? "AI/document records present" : "No documents",
    });
  } catch {
    evidence.push({
      category: "DOCUMENTS",
      present: false,
      count: 0,
      detail: "Unable to query documents",
    });
  }

  try {
    const org = await prisma.organizationSettings.findFirst({
      select: { id: true, storageProvider: true, updatedAt: true },
    });
    evidence.push({
      category: "AI_CONFIG",
      present: Boolean(org),
      count: org ? 1 : 0,
      detail: org
        ? "Organization settings present (AI/app config surface)"
        : "Organization settings missing",
    });
  } catch {
    evidence.push({
      category: "AI_CONFIG",
      present: false,
      count: 0,
      detail: "Unable to query organization settings",
    });
  }

  try {
    const secretCount = await prisma.integrationCredential.count({
      where: { deletedAt: null, isActive: true },
    });
    evidence.push({
      category: "SECRETS",
      present: secretCount > 0,
      count: secretCount,
      detail:
        secretCount > 0
          ? "Encrypted integration credentials present (values not exposed)"
          : "No active integration credentials",
    });
  } catch {
    evidence.push({
      category: "SECRETS",
      present: false,
      count: 0,
      detail: "Unable to query integration credentials",
    });
  }

  // Ensure all categories represented
  for (const category of BACKUP_TARGET_CATEGORIES) {
    if (!evidence.some((e) => e.category === category)) {
      evidence.push({
        category,
        present: false,
        count: 0,
        detail: "No evidence collected",
      });
    }
  }

  return evidence;
}
