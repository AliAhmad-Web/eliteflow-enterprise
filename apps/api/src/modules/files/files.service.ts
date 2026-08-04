import type { Prisma } from "@enterprise/database";
import type {
  CreateFolderInput,
  FolderDto,
  FolderListResponse,
  ListFilesQueryInput,
  ListFoldersQueryInput,
  ManagedFileDto,
  ManagedFileListResponse,
  MoveFileInput,
  ShareFileInput,
  UpdateFileInput,
  UpdateFolderInput,
  FileActivityDto,
  FileShareDto,
  FileVersionDto,
} from "@enterprise/shared";
import { UserRole } from "@enterprise/shared";

import { FILES_AUDIT_ACTIONS, logFilesAuditEvent } from "./files.audit.js";
import { FILES_ERROR_CODES, FilesError } from "./files.errors.js";
import { filesRepository } from "./files.repository.js";
import {
  toFileActivityDto,
  toFileShareDto,
  toFileVersionDto,
  toFolderDto,
  toManagedFileDto,
} from "./files.types.js";
import { queuePerformanceRecalcForUser } from "../team/performance-recalc.queue.js";
import {
  uniqueFileName,
  validateUploadFile,
} from "./files.validation-rules.js";
import {
  runVirusScanHook,
  storageProvider,
} from "./storage/storage.provider.js";

export interface FilesActor {
  userId: string;
  role: string;
  email: string;
  companyId?: string | null;
  permissions: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

function isAdmin(actor: FilesActor): boolean {
  return actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN;
}

function isClient(actor: FilesActor): boolean {
  return actor.role === UserRole.CLIENT;
}

function hasPermission(actor: FilesActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

export class FilesService {
  private async fileScope(
    actor: FilesActor,
  ): Promise<Prisma.ManagedFileWhereInput> {
    if (isAdmin(actor)) return {};

    if (isClient(actor)) {
      if (!actor.companyId) {
        return { id: "__none__" };
      }
      return {
        OR: [
          { clientId: actor.companyId },
          {
            shares: {
              some: {
                sharedWithClientId: actor.companyId,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
            },
          },
        ],
      };
    }

    // Employee — own files, assigned projects, or shared with them
    const memberships = await filesRepository.listProjectIdsForUser(
      actor.userId,
    );
    const projectIds = memberships.map((item) => item.projectId);

    return {
      OR: [
        { createdById: actor.userId },
        ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
        {
          shares: {
            some: {
              sharedWithUserId: actor.userId,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      ],
    };
  }

  private async assertCanReadFile(actor: FilesActor, fileId: string) {
    const file = await filesRepository.getFile(fileId, true);
    if (!file) {
      throw new FilesError("File not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    if (isAdmin(actor)) return file;

    const scope = await this.fileScope(actor);
    const allowed = await filesRepository.listFiles({
      query: {
        search: "",
        view: file.deletedAt ? "trash" : "all",
        sortBy: "updatedAt",
        sortOrder: "desc",
        page: 1,
        limit: 1,
      },
      scope: { AND: [scope, { id: fileId }] },
    });

    if (allowed.total === 0) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    return file;
  }

  async listFolders(
    query: ListFoldersQueryInput,
    actor: FilesActor,
  ): Promise<FolderListResponse> {
    if (isClient(actor) && !hasPermission(actor, "files:read")) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const parentId =
      !query.parentId || query.parentId === "root" ? null : query.parentId;
    const items = await filesRepository.listFolders(parentId, query.search);
    return { items: items.map(toFolderDto) };
  }

  async createFolder(
    input: CreateFolderInput,
    actor: FilesActor,
  ): Promise<FolderDto> {
    if (!hasPermission(actor, "files:upload") || isClient(actor)) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    if (input.parentId) {
      const parent = await filesRepository.getFolder(input.parentId);
      if (!parent) {
        throw new FilesError("Parent folder not found", 404, FILES_ERROR_CODES.NOT_FOUND);
      }
    }

    const folder = await filesRepository.createFolder({
      name: input.name,
      parentId: input.parentId ?? null,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      createdById: actor.userId,
    });

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FOLDER_CREATE,
      resourceId: folder.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toFolderDto(folder);
  }

  async updateFolder(
    id: string,
    input: UpdateFolderInput,
    actor: FilesActor,
  ): Promise<FolderDto> {
    if (!hasPermission(actor, "files:upload") || isClient(actor)) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const existing = await filesRepository.getFolder(id);
    if (!existing) {
      throw new FilesError("Folder not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    const updated = await filesRepository.updateFolder(id, {
      name: input.name,
      parentId: input.parentId,
      updatedById: actor.userId,
    });

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FOLDER_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toFolderDto(updated);
  }

  async deleteFolder(id: string, actor: FilesActor): Promise<{ id: string }> {
    if (!hasPermission(actor, "files:delete") && !isAdmin(actor)) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const existing = await filesRepository.getFolder(id);
    if (!existing) {
      throw new FilesError("Folder not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    await filesRepository.softDeleteFolder(id, actor.userId);
    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FOLDER_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async listFiles(
    query: ListFilesQueryInput,
    actor: FilesActor,
  ): Promise<ManagedFileListResponse> {
    if (query.view === "shared") {
      const scope: Prisma.ManagedFileWhereInput = isClient(actor)
        ? {
            shares: {
              some: {
                sharedWithClientId: actor.companyId ?? "__none__",
              },
            },
          }
        : isAdmin(actor)
          ? { shares: { some: {} } }
          : {
              shares: {
                some: { sharedWithUserId: actor.userId },
              },
            };

      const { items, total } = await filesRepository.listFiles({
        query: { ...query, view: "all" },
        scope,
      });
      const totalPages = Math.max(1, Math.ceil(total / query.limit));
      return {
        items: items.map(toManagedFileDto),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (query.view === "trash" && !isAdmin(actor) && !hasPermission(actor, "files:delete")) {
      // Employees without delete can still see own trash
    }

    const scope = await this.fileScope(actor);
    const { items, total } = await filesRepository.listFiles({ query, scope });
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toManagedFileDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getFile(id: string, actor: FilesActor): Promise<ManagedFileDto> {
    const file = await this.assertCanReadFile(actor, id);
    return toManagedFileDto(file);
  }

  async uploadFiles(
    files: Array<{
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    }>,
    meta: {
      folderId?: string | null;
      projectId?: string | null;
      clientId?: string | null;
      tags?: string[];
    },
    actor: FilesActor,
  ): Promise<ManagedFileDto[]> {
    if (!hasPermission(actor, "files:upload") || isClient(actor)) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const folderId = meta.folderId ?? null;
    if (folderId) {
      const folder = await filesRepository.getFolder(folderId);
      if (!folder) {
        throw new FilesError("Folder not found", 404, FILES_ERROR_CODES.NOT_FOUND);
      }
    }

    const existing = await filesRepository.listNamesInFolder(folderId);
    const existingNames = existing.map((item) => item.name);
    const created: ManagedFileDto[] = [];

    for (const file of files) {
      const validated = validateUploadFile({
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        buffer: file.buffer,
      });

      const scan = await runVirusScanHook({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
      if (!scan.clean) {
        throw new FilesError(
          "File failed virus scan",
          400,
          FILES_ERROR_CODES.VALIDATION,
        );
      }

      const name = uniqueFileName(file.originalname, existingNames);
      existingNames.push(name);

      let uploaded;
      try {
        uploaded = await storageProvider.upload({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          folderKey: folderId ?? "root",
        });
      } catch (error) {
        throw new FilesError(
          error instanceof Error ? error.message : "Storage upload failed",
          502,
          FILES_ERROR_CODES.STORAGE,
        );
      }

      const record = await filesRepository.createFile({
        folderId,
        name,
        originalName: file.originalname,
        mimeType: file.mimetype,
        extension: validated.extension,
        sizeBytes: BigInt(uploaded.sizeBytes),
        category: validated.category,
        storageKey: uploaded.key,
        storageProvider: uploaded.provider,
        checksum: uploaded.checksum,
        tags: meta.tags ?? [],
        projectId: meta.projectId ?? null,
        clientId: meta.clientId ?? null,
        createdById: actor.userId,
      });

      await logFilesAuditEvent({
        userId: actor.userId,
        action: FILES_AUDIT_ACTIONS.FILE_UPLOAD,
        resourceId: record.id,
        metadata: { name: record.name, sizeBytes: uploaded.sizeBytes },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      created.push(toManagedFileDto(record));
    }

    queuePerformanceRecalcForUser(actor.userId);
    return created;
  }

  async updateFile(
    id: string,
    input: UpdateFileInput,
    actor: FilesActor,
  ): Promise<ManagedFileDto> {
    const file = await this.assertCanReadFile(actor, id);

    if (isClient(actor)) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    if (
      !isAdmin(actor) &&
      file.createdById !== actor.userId &&
      !hasPermission(actor, "files:upload")
    ) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const updated = await filesRepository.updateFile(id, {
      name: input.name,
      tags: input.tags,
      isFavorite: input.isFavorite,
      updatedBy: { connect: { id: actor.userId } },
    });

    if (input.isFavorite !== undefined) {
      await filesRepository.addActivity({
        fileId: id,
        actorId: actor.userId,
        action: input.isFavorite ? "FAVORITED" : "UNFAVORITED",
      });
    } else {
      await filesRepository.addActivity({
        fileId: id,
        actorId: actor.userId,
        action: input.name ? "RENAMED" : "UPDATED",
        metadata: input as Prisma.InputJsonValue,
      });
    }

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FILE_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toManagedFileDto(updated);
  }

  async moveFile(
    id: string,
    input: MoveFileInput,
    actor: FilesActor,
  ): Promise<ManagedFileDto> {
    if (isClient(actor) || !hasPermission(actor, "files:upload")) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    await this.assertCanReadFile(actor, id);

    if (input.folderId) {
      const folder = await filesRepository.getFolder(input.folderId);
      if (!folder) {
        throw new FilesError("Folder not found", 404, FILES_ERROR_CODES.NOT_FOUND);
      }
    }

    const updated = await filesRepository.updateFile(id, {
      folder:
        input.folderId === null
          ? { disconnect: true }
          : { connect: { id: input.folderId } },
      updatedBy: { connect: { id: actor.userId } },
    });

    await filesRepository.addActivity({
      fileId: id,
      actorId: actor.userId,
      action: "MOVED",
      metadata: { folderId: input.folderId },
    });

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FILE_MOVE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toManagedFileDto(updated);
  }

  async deleteFile(id: string, actor: FilesActor): Promise<{ id: string }> {
    const file = await this.assertCanReadFile(actor, id);

    const canDelete =
      isAdmin(actor) ||
      (hasPermission(actor, "files:delete") && file.createdById === actor.userId) ||
      (hasPermission(actor, "files:upload") &&
        file.createdById === actor.userId &&
        !isClient(actor));

    if (!canDelete) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    await filesRepository.softDeleteFile(id, actor.userId);
    await filesRepository.addActivity({
      fileId: id,
      actorId: actor.userId,
      action: "DELETED",
    });

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FILE_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async restoreFile(id: string, actor: FilesActor): Promise<ManagedFileDto> {
    if (!isAdmin(actor) && !hasPermission(actor, "files:delete") && !hasPermission(actor, "files:upload")) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const file = await filesRepository.getFile(id, true);
    if (!file || !file.deletedAt) {
      throw new FilesError("File not found in trash", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    if (!isAdmin(actor) && file.createdById !== actor.userId) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const restored = await filesRepository.restoreFile(id, actor.userId);
    await filesRepository.addActivity({
      fileId: id,
      actorId: actor.userId,
      action: "RESTORED",
    });

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FILE_RESTORE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toManagedFileDto(restored);
  }

  async permanentDelete(id: string, actor: FilesActor): Promise<{ id: string }> {
    if (!isAdmin(actor) && !hasPermission(actor, "files:delete")) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const file = await filesRepository.getFile(id, true);
    if (!file) {
      throw new FilesError("File not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    try {
      await storageProvider.delete(file.storageKey);
      const versions = await filesRepository.listVersions(file.id);
      for (const version of versions) {
        if (version.storageKey !== file.storageKey) {
          await storageProvider.delete(version.storageKey);
        }
      }
    } catch (error) {
      console.error("[files] storage delete failed:", error);
    }

    await filesRepository.permanentDeleteFile(id);
    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FILE_PERMANENT_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async download(id: string, actor: FilesActor) {
    const file = await this.assertCanReadFile(actor, id);
    if (file.deletedAt && !isAdmin(actor)) {
      throw new FilesError("File not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    await filesRepository.addActivity({
      fileId: id,
      actorId: actor.userId,
      action: "DOWNLOADED",
    });

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FILE_DOWNLOAD,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    const payload = await storageProvider.download(file.storageKey);
    return {
      file,
      stream: payload.stream,
      sizeBytes: payload.sizeBytes,
      signedUrl: storageProvider.getSignedUrl
        ? await storageProvider.getSignedUrl(file.storageKey)
        : null,
    };
  }

  async listVersions(id: string, actor: FilesActor): Promise<FileVersionDto[]> {
    await this.assertCanReadFile(actor, id);
    const versions = await filesRepository.listVersions(id);
    return versions.map(toFileVersionDto);
  }

  async listActivities(
    id: string,
    actor: FilesActor,
  ): Promise<FileActivityDto[]> {
    await this.assertCanReadFile(actor, id);
    const activities = await filesRepository.listActivities(id);
    return activities.map(toFileActivityDto);
  }

  async listShares(id: string, actor: FilesActor): Promise<FileShareDto[]> {
    await this.assertCanReadFile(actor, id);
    if (isClient(actor)) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }
    const shares = await filesRepository.listShares(id);
    return shares.map(toFileShareDto);
  }

  async shareFile(
    id: string,
    input: ShareFileInput,
    actor: FilesActor,
  ): Promise<FileShareDto> {
    if (isClient(actor) || !hasPermission(actor, "files:upload")) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    await this.assertCanReadFile(actor, id);

    const share = await filesRepository.createShare({
      fileId: id,
      sharedWithUserId: input.sharedWithUserId ?? null,
      sharedWithClientId: input.sharedWithClientId ?? null,
      access: input.access,
      createdById: actor.userId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });

    await filesRepository.addActivity({
      fileId: id,
      actorId: actor.userId,
      action: "SHARED",
      metadata: {
        sharedWithUserId: input.sharedWithUserId,
        sharedWithClientId: input.sharedWithClientId,
      },
    });

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FILE_SHARE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toFileShareDto(share);
  }

  async unshare(shareId: string, actor: FilesActor): Promise<{ id: string }> {
    if (isClient(actor) || !hasPermission(actor, "files:upload")) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const share = await filesRepository.getShare(shareId);
    if (!share) {
      throw new FilesError("Share not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    await this.assertCanReadFile(actor, share.fileId);
    await filesRepository.deleteShare(shareId);
    await filesRepository.addActivity({
      fileId: share.fileId,
      actorId: actor.userId,
      action: "UNSHARED",
      metadata: { shareId },
    });

    await logFilesAuditEvent({
      userId: actor.userId,
      action: FILES_AUDIT_ACTIONS.FILE_UNSHARE,
      resourceId: share.fileId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id: shareId };
  }
}

export const filesService = new FilesService();
