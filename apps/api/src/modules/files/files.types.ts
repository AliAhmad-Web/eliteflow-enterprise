import type {
  FileActivity,
  FileShare,
  FileVersion,
  Folder,
  ManagedFile,
} from "@enterprise/database";
import type {
  FileActivityDto,
  FileShareDto,
  FileVersionDto,
  FolderDto,
  ManagedFileDto,
} from "@enterprise/shared";

import { isPreviewable } from "./files.validation-rules.js";

export function toFolderDto(
  folder: Folder & {
    _count?: { children?: number; files?: number };
  },
): FolderDto {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    projectId: folder.projectId,
    clientId: folder.clientId,
    createdById: folder.createdById,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
    childCount: folder._count?.children,
    fileCount: folder._count?.files,
  };
}

export function toManagedFileDto(file: ManagedFile): ManagedFileDto {
  return {
    id: file.id,
    folderId: file.folderId,
    name: file.name,
    originalName: file.originalName,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: Number(file.sizeBytes),
    category: file.category,
    storageProvider: file.storageProvider,
    tags: file.tags,
    isFavorite: file.isFavorite,
    version: file.version,
    projectId: file.projectId,
    clientId: file.clientId,
    createdById: file.createdById,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
    deletedAt: file.deletedAt?.toISOString() ?? null,
    previewable: isPreviewable(file.category),
  };
}

export function toFileVersionDto(version: FileVersion): FileVersionDto {
  return {
    id: version.id,
    fileId: version.fileId,
    version: version.version,
    sizeBytes: Number(version.sizeBytes),
    mimeType: version.mimeType,
    note: version.note,
    createdById: version.createdById,
    createdAt: version.createdAt.toISOString(),
  };
}

export function toFileShareDto(share: FileShare): FileShareDto {
  return {
    id: share.id,
    fileId: share.fileId,
    sharedWithUserId: share.sharedWithUserId,
    sharedWithClientId: share.sharedWithClientId,
    access: share.access,
    createdById: share.createdById,
    expiresAt: share.expiresAt?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
  };
}

export function toFileActivityDto(activity: FileActivity): FileActivityDto {
  return {
    id: activity.id,
    fileId: activity.fileId,
    actorId: activity.actorId,
    action: activity.action,
    metadata: activity.metadata ?? undefined,
    createdAt: activity.createdAt.toISOString(),
  };
}
