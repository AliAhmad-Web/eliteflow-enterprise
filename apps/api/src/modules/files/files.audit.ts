import { writeAuditLogSafe } from "../../shared/security/write-audit-log.js";

interface FilesAuditInput {
  userId?: string | null;
  action: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logFilesAuditEvent(input: FilesAuditInput): Promise<void> {
  await writeAuditLogSafe(
    {
      userId: input.userId ?? null,
      action: input.action,
      resource: "files",
      resourceId: input.resourceId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    "files",
  );
}

export const FILES_AUDIT_ACTIONS = {
  FOLDER_CREATE: "files.folder.create",
  FOLDER_UPDATE: "files.folder.update",
  FOLDER_DELETE: "files.folder.delete",
  FILE_UPLOAD: "files.upload",
  FILE_DOWNLOAD: "files.download",
  FILE_UPDATE: "files.update",
  FILE_MOVE: "files.move",
  FILE_DELETE: "files.delete",
  FILE_RESTORE: "files.restore",
  FILE_PERMANENT_DELETE: "files.permanent_delete",
  FILE_SHARE: "files.share",
  FILE_UNSHARE: "files.unshare",
} as const;
