import {
  prisma,
  type Prisma,
} from "@enterprise/database";

const listSelect = {
  id: true,
  organizationId: true,
  workspaceId: true,
  projectId: true,
  taskId: true,
  clientId: true,
  teamId: true,
  title: true,
  canvasData: true,
  thumbnail: true,
  ownerId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WhiteboardSelect;

export class WhiteboardsRepository {
  list(where: Prisma.WhiteboardWhereInput, skip: number, take: number) {
    return prisma.whiteboard.findMany({
      where: { deletedAt: null, ...where },
      select: listSelect,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    });
  }

  count(where: Prisma.WhiteboardWhereInput) {
    return prisma.whiteboard.count({
      where: { deletedAt: null, ...where },
    });
  }

  getById(id: string) {
    return prisma.whiteboard.findFirst({
      where: { id, deletedAt: null },
      select: listSelect,
    });
  }

  create(data: Prisma.WhiteboardUncheckedCreateInput) {
    return prisma.whiteboard.create({
      data,
      select: listSelect,
    });
  }

  update(id: string, data: Prisma.WhiteboardUncheckedUpdateInput) {
    return prisma.whiteboard.update({
      where: { id },
      data,
      select: listSelect,
    });
  }

  softDelete(id: string, updatedById: string) {
    return prisma.whiteboard.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
      select: listSelect,
    });
  }

  createVersion(data: Prisma.WhiteboardVersionUncheckedCreateInput) {
    return prisma.whiteboardVersion.create({ data });
  }

  listVersions(whiteboardId: string) {
    return prisma.whiteboardVersion.findMany({
      where: { whiteboardId },
      orderBy: { version: "desc" },
      take: 50,
    });
  }

  getVersion(whiteboardId: string, version: number) {
    return prisma.whiteboardVersion.findFirst({
      where: { whiteboardId, version },
    });
  }

  createComment(data: Prisma.WhiteboardCommentUncheckedCreateInput) {
    return prisma.whiteboardComment.create({ data });
  }

  listComments(whiteboardId: string) {
    return prisma.whiteboardComment.findMany({
      where: { whiteboardId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }
}

export const whiteboardsRepository = new WhiteboardsRepository();
