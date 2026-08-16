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
import { findClientUnlockedProjectIds } from "../quotes/commercial-access.js";
import { readFile, unlink } from "node:fs/promises";

import { FILES_AUDIT_ACTIONS, logFilesAuditEvent } from "./files.audit.js";
import { FILES_ERROR_CODES, FilesError } from "./files.errors.js";
import { filesRepository } from "./files.repository.js";
import { emptyUuidIdScope } from "../../shared/utils/prisma-empty-scope.js";
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
import { runVirusScanHook } from "./antivirus/index.js";
import { storageProvider } from "./storage/storage.provider.js";
import { securityMonitoringService } from "../../shared/security/monitoring/index.js";

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
  const role = String(actor.role ?? "").toUpperCase();
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

function isClient(actor: FilesActor): boolean {
  return String(actor.role ?? "").toUpperCase() === UserRole.CLIENT;
}

function hasPermission(actor: FilesActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

export class FilesService {
  /** Active (non-expired) share predicate — used in every share-scoped query. */
  private activeShareWhere(): Prisma.FileShareWhereInput {
    return {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
  }

  private async fileScope(
    actor: FilesActor,
  ): Promise<Prisma.ManagedFileWhereInput> {
    if (isAdmin(actor)) return {};

    const activeShare = this.activeShareWhere();

    if (isClient(actor)) {
      if (!actor.companyId) {
        return {
          OR: [{ createdById: actor.userId }],
        };
      }
      const unlockedProjectIds = await findClientUnlockedProjectIds(
        actor.companyId,
      );
      return {
        OR: [
          { createdById: actor.userId },
          ...(unlockedProjectIds.length
            ? [{ projectId: { in: unlockedProjectIds } }]
            : []),
          {
            shares: {
              some: {
                sharedWithClientId: actor.companyId,
                ...activeShare,
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
              ...activeShare,
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
      void securityMonitoringService.reportAclDenial({
        userId: actor.userId,
        resource: "files",
        resourceId: fileId,
        message: "File ACL denial",
        metadata: { action: "read" },
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      });
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    return file;
  }

  /**
   * Download ACL (FS-07): VIEW shares never grant download.
   * Owners, admins, project members, and company-linked clients may download.
   * Share recipients need an active DOWNLOAD share.
   */
  private async assertCanDownloadFile(actor: FilesActor, fileId: string) {
    const file = await this.assertCanReadFile(actor, fileId);

    if (isAdmin(actor) || file.createdById === actor.userId) {
      return file;
    }

    if (file.projectId && !isClient(actor)) {
      const membership = await filesRepository.findProjectMembership(
        actor.userId,
        file.projectId,
      );
      if (membership) return file;
    }

    if (isClient(actor) && actor.companyId && file.clientId === actor.companyId) {
      return file;
    }

    if (isClient(actor) && actor.companyId) {
      const share = await filesRepository.findActiveShareForClient(
        fileId,
        actor.companyId,
        "DOWNLOAD",
      );
      if (share) return file;
    } else if (!isClient(actor)) {
      const share = await filesRepository.findActiveShareForUser(
        fileId,
        actor.userId,
        "DOWNLOAD",
      );
      if (share) return file;
    }

    throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
  }

  /**
   * Share target validation (FS-10).
   */
  private async assertShareTarget(
    actor: FilesActor,
    input: { sharedWithUserId?: string; sharedWithClientId?: string },
  ): Promise<void> {
    if (input.sharedWithUserId) {
      if (input.sharedWithUserId === actor.userId) {
        throw new FilesError(
          "Permission denied",
          403,
          FILES_ERROR_CODES.FORBIDDEN,
        );
      }

      const user = await filesRepository.findShareTargetUser(
        input.sharedWithUserId,
      );
      if (!user || user.deletedAt) {
        throw new FilesError("User not found", 404, FILES_ERROR_CODES.NOT_FOUND);
      }
      if (user.status === "LOCKED" || user.status === "DEACTIVATED") {
        throw new FilesError(
          "Permission denied",
          403,
          FILES_ERROR_CODES.FORBIDDEN,
        );
      }
    }

    if (input.sharedWithClientId) {
      const client = await filesRepository.findShareTargetClient(
        input.sharedWithClientId,
      );
      if (!client || client.deletedAt) {
        throw new FilesError(
          "Client not found",
          404,
          FILES_ERROR_CODES.NOT_FOUND,
        );
      }
      if (client.status === "INACTIVE") {
        throw new FilesError(
          "Permission denied",
          403,
          FILES_ERROR_CODES.FORBIDDEN,
        );
      }
    }
  }

  /**
   * Folder visibility scope (FS-01).
   * Admin: all folders.
   * Client: folders linked to their company (clientId).
   * Employee: folders they own or folders linked to projects they belong to.
   * Folder shares are not modeled in the schema — no share branch.
   */
  private async folderScope(
    actor: FilesActor,
  ): Promise<Prisma.FolderWhereInput> {
    if (isAdmin(actor)) return {};

    if (isClient(actor)) {
      if (!actor.companyId) {
        // Fresh self-signup clients may have no CRM company link yet.
        // Never use a non-UUID sentinel — Prisma @db.Uuid rejects "__none__".
        return emptyUuidIdScope();
      }
      return { clientId: actor.companyId };
    }

    const memberships = await filesRepository.listProjectIdsForUser(
      actor.userId,
    );
    const projectIds = memberships.map((item) => item.projectId);

    return {
      OR: [
        { createdById: actor.userId },
        ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
      ],
    };
  }

  private async assertCanReadFolder(actor: FilesActor, folderId: string) {
    const folder = await filesRepository.getFolder(folderId);
    if (!folder) {
      throw new FilesError("Folder not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    if (isAdmin(actor)) return folder;

    const scope = await this.folderScope(actor);
    const allowed = await filesRepository.listFolders(folder.parentId, "", {
      AND: [scope, { id: folderId }],
    });

    if (allowed.length === 0) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    return folder;
  }

  /** Mutate/delete: folder owner or administrator only. */
  private async assertCanManageFolder(actor: FilesActor, folderId: string) {
    const folder = await filesRepository.getFolder(folderId);
    if (!folder) {
      throw new FilesError("Folder not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    if (isAdmin(actor) || folder.createdById === actor.userId) {
      return folder;
    }

    throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
  }

  /**
   * File write ACL (FS-02): owner or administrator only.
   * Read access, shares, and files:upload must never grant write.
   */
  private async assertCanManageFile(actor: FilesActor, fileId: string) {
    const file = await filesRepository.getFile(fileId, true);
    if (!file) {
      throw new FilesError("File not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    if (isAdmin(actor) || file.createdById === actor.userId) {
      return file;
    }

    throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
  }

  /**
   * Upload association validation (FS-06).
   * Never trust client-supplied folderId / projectId / clientId.
   * CLIENT uploads are forced to authenticated companyId and may only
   * target projects owned by that company.
   */
  private async assertUploadAssociations(
    actor: FilesActor,
    meta: {
      folderId?: string | null;
      projectId?: string | null;
      clientId?: string | null;
    },
  ): Promise<{
    folderId: string | null;
    projectId: string | null;
    clientId: string | null;
  }> {
    const folderId = meta.folderId ?? null;
    let projectId = meta.projectId ?? null;
    let clientId = meta.clientId ?? null;

    if (isClient(actor)) {
      if (!actor.companyId) {
        throw new FilesError(
          "Link your company account before uploading files",
          403,
          FILES_ERROR_CODES.FORBIDDEN,
        );
      }

      // Never trust client-supplied company/client association.
      if (clientId && clientId !== actor.companyId) {
        throw new FilesError(
          "Permission denied",
          403,
          FILES_ERROR_CODES.FORBIDDEN,
        );
      }
      clientId = actor.companyId;

      if (projectId) {
        const project = await filesRepository.findProjectId(projectId);
        if (!project || project.clientId !== actor.companyId) {
          throw new FilesError(
            "Permission denied",
            403,
            FILES_ERROR_CODES.FORBIDDEN,
          );
        }
      }

      if (folderId) {
        await this.assertCanReadFolder(actor, folderId);
      }

      return { folderId, projectId, clientId };
    }

    if (folderId) {
      await this.assertCanReadFolder(actor, folderId);
    }

    if (projectId) {
      const project = await filesRepository.findProjectId(projectId);
      if (!project) {
        throw new FilesError("Project not found", 404, FILES_ERROR_CODES.NOT_FOUND);
      }

      if (!isAdmin(actor)) {
        const membership = await filesRepository.findProjectMembership(
          actor.userId,
          projectId,
        );
        if (!membership) {
          throw new FilesError(
            "Permission denied",
            403,
            FILES_ERROR_CODES.FORBIDDEN,
          );
        }
      }
    }

    if (clientId) {
      const client = await filesRepository.findClientId(clientId);
      if (!client) {
        throw new FilesError("Client not found", 404, FILES_ERROR_CODES.NOT_FOUND);
      }

      if (!isAdmin(actor)) {
        const canAssociate =
          hasPermission(actor, "clients:write") ||
          hasPermission(actor, "clients:read");
        if (!canAssociate) {
          throw new FilesError(
            "Permission denied",
            403,
            FILES_ERROR_CODES.FORBIDDEN,
          );
        }
      }
    }

    return { folderId, projectId, clientId };
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

    if (parentId) {
      await this.assertCanReadFolder(actor, parentId);
    }

    const scope = await this.folderScope(actor);
    const items = await filesRepository.listFolders(
      parentId,
      query.search,
      scope,
    );
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
      await this.assertCanReadFolder(actor, input.parentId);
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

    await this.assertCanManageFolder(actor, id);

    if (input.parentId) {
      await this.assertCanReadFolder(actor, input.parentId);
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
    await this.assertCanManageFolder(actor, id);

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
      const activeShare = this.activeShareWhere();
      const scope: Prisma.ManagedFileWhereInput = isClient(actor)
        ? actor.companyId
          ? {
              shares: {
                some: {
                  sharedWithClientId: actor.companyId,
                  ...activeShare,
                },
              },
            }
          : emptyUuidIdScope()
        : isAdmin(actor)
          ? { shares: { some: { ...activeShare } } }
          : {
              shares: {
                some: {
                  sharedWithUserId: actor.userId,
                  ...activeShare,
                },
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
      size: number;
      /** Preferred: disk temp path from multer diskStorage (F-06). */
      tempPath?: string;
      /** Optional in-memory buffer (tests / legacy). */
      buffer?: Buffer;
    }>,
    meta: {
      folderId?: string | null;
      projectId?: string | null;
      clientId?: string | null;
      tags?: string[];
    },
    actor: FilesActor,
  ): Promise<ManagedFileDto[]> {
    if (!hasPermission(actor, "files:upload")) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    const associations = await this.assertUploadAssociations(actor, {
      folderId: meta.folderId ?? null,
      projectId: meta.projectId ?? null,
      clientId: meta.clientId ?? null,
    });
    const folderId = associations.folderId;
    const projectId = associations.projectId;
    const clientId = associations.clientId;

    const existing = await filesRepository.listNamesInFolder(folderId);
    const existingNames = existing.map((item) => item.name);
    const created: ManagedFileDto[] = [];

    for (const file of files) {
      // Load one file at a time to keep peak heap near a single max-sized upload.
      let buffer: Buffer | undefined;
      try {
        if (file.buffer && file.buffer.length > 0) {
          buffer = file.buffer;
        } else if (file.tempPath) {
          buffer = await readFile(file.tempPath);
        } else {
          throw new FilesError(
            "Upload content is missing",
            400,
            FILES_ERROR_CODES.VALIDATION,
          );
        }

        const validated = await validateUploadFile({
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size || buffer.byteLength,
          buffer,
        }).catch((error) => {
          void securityMonitoringService.reportUploadValidationFailure({
            userId: actor.userId,
            resource: "files",
            message: "Upload validation failed",
            metadata: {
              originalName: file.originalname,
              mimeType: file.mimetype,
            },
            ipAddress: actor.ipAddress ?? null,
            userAgent: actor.userAgent ?? null,
          });
          throw error;
        });

        const scan = await runVirusScanHook({
          buffer,
          mimeType: validated.mimeType,
          originalName: file.originalname,
        });
        if (!scan.clean) {
          void securityMonitoringService.reportMalware({
            userId: actor.userId,
            resource: "files",
            message: "Malware detected in upload",
            metadata: {
              threatName: scan.threatName ?? null,
              originalName: file.originalname,
            },
            ipAddress: actor.ipAddress ?? null,
            userAgent: actor.userAgent ?? null,
          });
          throw new FilesError(
            scan.threatName
              ? `File failed virus scan (${scan.threatName})`
              : "File failed virus scan",
            400,
            FILES_ERROR_CODES.VIRUS_INFECTED,
          );
        }

        const name = uniqueFileName(validated.displayName, existingNames);
        existingNames.push(name);

        let uploaded;
        try {
          uploaded = await storageProvider.upload({
            buffer,
            originalName: file.originalname,
            mimeType: validated.mimeType,
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
          originalName: file.originalname.normalize("NFC"),
          mimeType: validated.mimeType,
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
      } finally {
        // Drop buffer reference each iteration; unlink temp ASAP.
        buffer = undefined;
        if (file.tempPath) {
          try {
            await unlink(file.tempPath);
          } catch {
            // Already removed by controller finally, or never written.
          }
        }
      }
    }

    queuePerformanceRecalcForUser(actor.userId);
    return created;
  }

  async updateFile(
    id: string,
    input: UpdateFileInput,
    actor: FilesActor,
  ): Promise<ManagedFileDto> {
    if (isClient(actor)) {
      throw new FilesError("Permission denied", 403, FILES_ERROR_CODES.FORBIDDEN);
    }

    await this.assertCanManageFile(actor, id);

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

    await this.assertCanManageFile(actor, id);

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
    const file = await this.assertCanManageFile(actor, id);

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

  /**
   * Attachment Security (F-15): managed file must exist, not be deleted,
   * and the actor must have download access.
   */
  async assertManagedFileForAttachment(actor: FilesActor, fileId: string) {
    const file = await filesRepository.getFile(fileId, true);
    if (!file || file.deletedAt) {
      throw new FilesError("File not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }
    return this.assertCanDownloadFile(actor, fileId);
  }

  async download(id: string, actor: FilesActor) {
    const file = await this.assertCanDownloadFile(actor, id);
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

  /** Preview allows VIEW shares (FS-07); does not require DOWNLOAD access. */
  async preview(id: string, actor: FilesActor) {
    const file = await this.assertCanReadFile(actor, id);
    if (file.deletedAt && !isAdmin(actor)) {
      throw new FilesError("File not found", 404, FILES_ERROR_CODES.NOT_FOUND);
    }

    // FS-08: SVG must never be rendered inline (stored XSS via script/event handlers).
    const extension = file.extension.toLowerCase();
    const mime = file.mimeType.toLowerCase();
    if (extension === "svg" || mime === "image/svg+xml") {
      throw new FilesError(
        "SVG preview is not allowed; use download instead",
        403,
        FILES_ERROR_CODES.FORBIDDEN,
      );
    }

    const payload = await storageProvider.download(file.storageKey);
    return {
      file,
      stream: payload.stream,
      sizeBytes: payload.sizeBytes,
      signedUrl: null as string | null,
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

    await this.assertCanManageFile(actor, id);
    await this.assertShareTarget(actor, {
      sharedWithUserId: input.sharedWithUserId,
      sharedWithClientId: input.sharedWithClientId,
    });

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

    await this.assertCanManageFile(actor, share.fileId);
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
