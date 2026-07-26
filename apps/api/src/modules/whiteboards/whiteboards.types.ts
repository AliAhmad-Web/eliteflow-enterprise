import type {
  WhiteboardDto,
  WhiteboardListItem,
  WhiteboardVersionDto,
} from "@enterprise/shared";

type WhiteboardRow = {
  id: string;
  organizationId: string | null;
  workspaceId: string | null;
  projectId: string | null;
  taskId: string | null;
  clientId: string | null;
  teamId: string | null;
  title: string;
  canvasData: unknown;
  thumbnail: string | null;
  ownerId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type VersionRow = {
  id: string;
  whiteboardId: string;
  version: number;
  title: string;
  thumbnail: string | null;
  label: string | null;
  createdById: string | null;
  createdAt: Date;
};

export function toWhiteboardDto(row: WhiteboardRow): WhiteboardDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    taskId: row.taskId,
    clientId: row.clientId,
    teamId: row.teamId,
    title: row.title,
    canvasData: row.canvasData,
    thumbnail: row.thumbnail,
    ownerId: row.ownerId,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toWhiteboardListItem(row: WhiteboardRow): WhiteboardListItem {
  const { canvasData: _canvasData, ...rest } = toWhiteboardDto(row);
  return rest;
}

export function toVersionDto(row: VersionRow): WhiteboardVersionDto {
  return {
    id: row.id,
    whiteboardId: row.whiteboardId,
    version: row.version,
    title: row.title,
    thumbnail: row.thumbnail,
    label: row.label,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
  };
}
