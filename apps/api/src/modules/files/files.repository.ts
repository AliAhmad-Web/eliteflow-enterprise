import {
  type FileActivityAction,
  type FileCategory,
  type FileShareAccess,
  prisma,
  type Prisma,
} from "@enterprise/database";
import type { ListFilesQueryInput } from "@enterprise/shared";

export class FilesRepository {
  listFolders(parentId: string | null, search: string) {
    return prisma.folder.findMany({
      where: {
        deletedAt: null,
        parentId,
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      include: {
        _count: {
          select: {
            children: { where: { deletedAt: null } },
            files: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  getFolder(id: string) {
    return prisma.folder.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            children: { where: { deletedAt: null } },
            files: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  createFolder(data: {
    name: string;
    parentId?: string | null;
    projectId?: string | null;
    clientId?: string | null;
    createdById: string;
  }) {
    return prisma.folder.create({
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        projectId: data.projectId ?? null,
        clientId: data.clientId ?? null,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      include: {
        _count: {
          select: {
            children: true,
            files: true,
          },
        },
      },
    });
  }

  updateFolder(
    id: string,
    data: { name?: string; parentId?: string | null; updatedById: string },
  ) {
    return prisma.folder.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId,
        updatedById: data.updatedById,
      },
      include: {
        _count: {
          select: {
            children: { where: { deletedAt: null } },
            files: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  softDeleteFolder(id: string, updatedById: string) {
    return prisma.folder.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  async listFiles(args: {
    query: ListFilesQueryInput;
    scope: Prisma.ManagedFileWhereInput;
  }) {
    const { query, scope } = args;
    const where: Prisma.ManagedFileWhereInput = {
      AND: [
        scope,
        query.view === "trash"
          ? { deletedAt: { not: null } }
          : { deletedAt: null },
        query.view === "favorites" ? { isFavorite: true } : {},
        query.folderId === "root"
          ? { folderId: null }
          : query.folderId
            ? { folderId: query.folderId }
            : {},
        query.category ? { category: query.category } : {},
        query.tag ? { tags: { has: query.tag } } : {},
        query.favorite === undefined
          ? {}
          : { isFavorite: query.favorite === "true" },
        query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: "insensitive" } },
                { originalName: { contains: query.search, mode: "insensitive" } },
                { tags: { has: query.search } },
              ],
            }
          : {},
      ],
    };

    const orderBy: Prisma.ManagedFileOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.managedFile.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
      }),
      prisma.managedFile.count({ where }),
    ]);

    return { items, total };
  }

  getFile(id: string, includeDeleted = false) {
    return prisma.managedFile.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  listNamesInFolder(folderId: string | null) {
    return prisma.managedFile.findMany({
      where: { folderId, deletedAt: null },
      select: { name: true },
    });
  }

  createFile(data: {
    folderId: string | null;
    name: string;
    originalName: string;
    mimeType: string;
    extension: string;
    sizeBytes: bigint;
    category: FileCategory;
    storageKey: string;
    storageProvider: string;
    checksum: string;
    tags?: string[];
    projectId?: string | null;
    clientId?: string | null;
    createdById: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const file = await tx.managedFile.create({
        data: {
          folderId: data.folderId,
          name: data.name,
          originalName: data.originalName,
          mimeType: data.mimeType,
          extension: data.extension,
          sizeBytes: data.sizeBytes,
          category: data.category,
          storageKey: data.storageKey,
          storageProvider: data.storageProvider,
          checksum: data.checksum,
          tags: data.tags ?? [],
          projectId: data.projectId ?? null,
          clientId: data.clientId ?? null,
          createdById: data.createdById,
          updatedById: data.createdById,
          version: 1,
        },
      });

      await tx.fileVersion.create({
        data: {
          fileId: file.id,
          version: 1,
          storageKey: data.storageKey,
          sizeBytes: data.sizeBytes,
          mimeType: data.mimeType,
          createdById: data.createdById,
          note: "Initial upload",
        },
      });

      await tx.fileActivity.create({
        data: {
          fileId: file.id,
          actorId: data.createdById,
          action: "UPLOADED",
        },
      });

      return file;
    });
  }

  updateFile(
    id: string,
    data: Prisma.ManagedFileUpdateInput,
  ) {
    return prisma.managedFile.update({ where: { id }, data });
  }

  softDeleteFile(id: string, updatedById: string) {
    return prisma.managedFile.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  restoreFile(id: string, updatedById: string) {
    return prisma.managedFile.update({
      where: { id },
      data: { deletedAt: null, updatedById },
    });
  }

  async permanentDeleteFile(id: string) {
    return prisma.managedFile.delete({ where: { id } });
  }

  listVersions(fileId: string) {
    return prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { version: "desc" },
    });
  }

  listShares(fileId: string) {
    return prisma.fileShare.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });
  }

  createShare(data: {
    fileId: string;
    sharedWithUserId?: string | null;
    sharedWithClientId?: string | null;
    access: FileShareAccess;
    createdById: string;
    expiresAt?: Date | null;
  }) {
    return prisma.fileShare.create({
      data: {
        fileId: data.fileId,
        sharedWithUserId: data.sharedWithUserId ?? null,
        sharedWithClientId: data.sharedWithClientId ?? null,
        access: data.access,
        createdById: data.createdById,
        expiresAt: data.expiresAt ?? null,
      },
    });
  }

  getShare(id: string) {
    return prisma.fileShare.findUnique({ where: { id } });
  }

  deleteShare(id: string) {
    return prisma.fileShare.delete({ where: { id } });
  }

  listActivities(fileId: string) {
    return prisma.fileActivity.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  addActivity(data: {
    fileId: string;
    actorId: string;
    action: FileActivityAction;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.fileActivity.create({ data });
  }

  listProjectIdsForUser(userId: string) {
    return prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
  }
}

export const filesRepository = new FilesRepository();
