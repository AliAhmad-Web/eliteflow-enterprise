import type { Prisma } from "@enterprise/database";
import { prisma } from "@enterprise/database";
import type {
  CreateWhiteboardCommentInput,
  CreateWhiteboardInput,
  DuplicateWhiteboardInput,
  ListWhiteboardsQueryInput,
  RenameWhiteboardInput,
  UpdateWhiteboardInput,
  WhiteboardAiRequestInput,
  WhiteboardDto,
  WhiteboardListResponse,
  WhiteboardVersionDto,
} from "@enterprise/shared";
import { PERMISSIONS, UserRole } from "@enterprise/shared";

import { getAiProvider } from "../ai/providers/index.js";
import {
  WHITEBOARDS_AUDIT_ACTIONS,
  logWhiteboardAuditEvent,
} from "./whiteboards.audit.js";
import {
  WHITEBOARDS_ERROR_CODES,
  WhiteboardsError,
} from "./whiteboards.errors.js";
import { whiteboardsRepository } from "./whiteboards.repository.js";
import {
  toVersionDto,
  toWhiteboardDto,
  toWhiteboardListItem,
} from "./whiteboards.types.js";

export interface WhiteboardsActor {
  userId: string;
  role: string;
  email: string;
  companyId?: string | null;
  permissions: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

const EMPTY_CANVAS = {
  schemaVersion: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  objects: [] as unknown[],
};

function hasPermission(actor: WhiteboardsActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function isAdmin(actor: WhiteboardsActor): boolean {
  return actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN;
}

function assertRead(actor: WhiteboardsActor): void {
  if (!hasPermission(actor, PERMISSIONS.WHITEBOARDS_READ)) {
    throw new WhiteboardsError(
      "Permission denied",
      403,
      WHITEBOARDS_ERROR_CODES.FORBIDDEN,
    );
  }
}

function assertWrite(actor: WhiteboardsActor): void {
  if (!hasPermission(actor, PERMISSIONS.WHITEBOARDS_WRITE)) {
    throw new WhiteboardsError(
      "Permission denied",
      403,
      WHITEBOARDS_ERROR_CODES.FORBIDDEN,
    );
  }
}

function assertDelete(actor: WhiteboardsActor): void {
  if (!hasPermission(actor, PERMISSIONS.WHITEBOARDS_DELETE) && !isAdmin(actor)) {
    throw new WhiteboardsError(
      "Permission denied",
      403,
      WHITEBOARDS_ERROR_CODES.FORBIDDEN,
    );
  }
}

function scopeWhere(actor: WhiteboardsActor): Prisma.WhiteboardWhereInput {
  if (isAdmin(actor)) {
    return {};
  }
  if (actor.role === UserRole.CLIENT) {
    if (!actor.companyId) {
      return { ownerId: actor.userId };
    }
    return {
      OR: [{ ownerId: actor.userId }, { clientId: actor.companyId }],
    };
  }

  // Employee / staff: own boards + project membership + team membership
  return {
    OR: [
      { ownerId: actor.userId },
      {
        projectId: { not: null },
        project: {
          members: { some: { userId: actor.userId } },
        },
      },
      {
        teamId: { not: null },
        team: {
          members: { some: { userId: actor.userId } },
        },
      },
    ],
  };
}

async function canAccessBoard(
  row: {
    ownerId: string;
    clientId: string | null;
    projectId: string | null;
    teamId: string | null;
  },
  actor: WhiteboardsActor,
): Promise<boolean> {
  if (isAdmin(actor)) return true;
  if (row.ownerId === actor.userId) return true;

  if (
    actor.role === UserRole.CLIENT &&
    actor.companyId &&
    row.clientId === actor.companyId
  ) {
    return true;
  }

  if (actor.role === UserRole.CLIENT) {
    return false;
  }

  if (row.projectId) {
    const member = await prisma.projectMember.findFirst({
      where: { projectId: row.projectId, userId: actor.userId },
      select: { id: true },
    });
    if (member) return true;
  }

  if (row.teamId) {
    const member = await prisma.teamMember.findFirst({
      where: { teamId: row.teamId, userId: actor.userId },
      select: { id: true },
    });
    if (member) return true;
  }

  return false;
}

async function getOwnedOrThrow(id: string, actor: WhiteboardsActor) {
  const row = await whiteboardsRepository.getById(id);
  if (!row) {
    throw new WhiteboardsError(
      "Whiteboard not found",
      404,
      WHITEBOARDS_ERROR_CODES.NOT_FOUND,
    );
  }

  const allowed = await canAccessBoard(row, actor);
  if (!allowed) {
    throw new WhiteboardsError(
      "Whiteboard not found",
      404,
      WHITEBOARDS_ERROR_CODES.NOT_FOUND,
    );
  }

  return row;
}

function summarizeCanvas(canvasData: unknown): string {
  const data = canvasData as {
    objects?: Array<{ type?: string; text?: string }>;
  };
  const objects = Array.isArray(data?.objects) ? data.objects : [];
  const counts = new Map<string, number>();
  const texts: string[] = [];

  for (const obj of objects) {
    const type = obj.type ?? "unknown";
    counts.set(type, (counts.get(type) ?? 0) + 1);
    if (typeof obj.text === "string" && obj.text.trim()) {
      texts.push(obj.text.trim());
    }
  }

  const inventory = [...counts.entries()]
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");

  return [
    `Whiteboard contains ${objects.length} object(s)${inventory ? `: ${inventory}` : ""}.`,
    texts.length ? `Visible text content:\n- ${texts.slice(0, 40).join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export class WhiteboardsService {
  async list(
    query: ListWhiteboardsQueryInput,
    actor: WhiteboardsActor,
  ): Promise<WhiteboardListResponse> {
    assertRead(actor);

    const where: Prisma.WhiteboardWhereInput = {
      ...scopeWhere(actor),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.teamId ? { teamId: query.teamId } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      whiteboardsRepository.list(where, skip, query.limit),
      whiteboardsRepository.count(where),
    ]);

    return {
      items: rows.map(toWhiteboardListItem),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getById(id: string, actor: WhiteboardsActor): Promise<WhiteboardDto> {
    assertRead(actor);
    const row = await getOwnedOrThrow(id, actor);
    return toWhiteboardDto(row);
  }

  async create(
    input: CreateWhiteboardInput,
    actor: WhiteboardsActor,
  ): Promise<WhiteboardDto> {
    assertWrite(actor);

    // Never trust client-supplied company binding from CLIENT actors.
    const boundClientId =
      actor.role === UserRole.CLIENT
        ? actor.companyId ?? null
        : (input.clientId ?? null);

    const row = await whiteboardsRepository.create({
      title: input.title ?? "Untitled Whiteboard",
      canvasData: (input.canvasData ?? EMPTY_CANVAS) as Prisma.InputJsonValue,
      thumbnail: input.thumbnail ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      clientId: boundClientId,
      teamId: input.teamId ?? null,
      organizationId: input.organizationId ?? null,
      workspaceId: input.workspaceId ?? null,
      ownerId: actor.userId,
      createdById: actor.userId,
      updatedById: actor.userId,
      version: 1,
    });

    await whiteboardsRepository.createVersion({
      whiteboardId: row.id,
      version: 1,
      title: row.title,
      canvasData: row.canvasData as Prisma.InputJsonValue,
      thumbnail: row.thumbnail,
      createdById: actor.userId,
      label: "Initial",
    });

    void logWhiteboardAuditEvent({
      userId: actor.userId,
      action: WHITEBOARDS_AUDIT_ACTIONS.CREATE,
      resourceId: row.id,
      metadata: {
        title: row.title,
        projectId: row.projectId,
        clientId: row.clientId,
        teamId: row.teamId,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toWhiteboardDto(row);
  }

  async update(
    id: string,
    input: UpdateWhiteboardInput,
    actor: WhiteboardsActor,
  ): Promise<WhiteboardDto> {
    assertWrite(actor);
    const existing = await getOwnedOrThrow(id, actor);

    // Shared project/team members with write permission may update canvas.
    // CLIENT may only update if they own the board.
    if (
      actor.role === UserRole.CLIENT &&
      existing.ownerId !== actor.userId &&
      !isAdmin(actor)
    ) {
      throw new WhiteboardsError(
        "Permission denied",
        403,
        WHITEBOARDS_ERROR_CODES.FORBIDDEN,
      );
    }

    const nextVersion = input.createVersion
      ? existing.version + 1
      : existing.version;

    const nextClientId =
      actor.role === UserRole.CLIENT
        ? existing.clientId
        : input.clientId !== undefined
          ? input.clientId
          : undefined;

    const row = await whiteboardsRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.canvasData !== undefined
        ? { canvasData: input.canvasData as Prisma.InputJsonValue }
        : {}),
      ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
      ...(nextClientId !== undefined ? { clientId: nextClientId } : {}),
      ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
      version: nextVersion,
      updatedById: actor.userId,
    });

    if (input.createVersion) {
      await whiteboardsRepository.createVersion({
        whiteboardId: row.id,
        version: nextVersion,
        title: row.title,
        canvasData: row.canvasData as Prisma.InputJsonValue,
        thumbnail: row.thumbnail,
        createdById: actor.userId,
        label: input.versionLabel ?? "Manual save",
      });
    }

    void logWhiteboardAuditEvent({
      userId: actor.userId,
      action: WHITEBOARDS_AUDIT_ACTIONS.UPDATE,
      resourceId: id,
      metadata: { fields: Object.keys(input), version: nextVersion },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toWhiteboardDto(row);
  }

  async rename(
    id: string,
    input: RenameWhiteboardInput,
    actor: WhiteboardsActor,
  ): Promise<WhiteboardDto> {
    return this.update(id, { title: input.title, createVersion: false }, actor);
  }

  async duplicate(
    id: string,
    input: DuplicateWhiteboardInput,
    actor: WhiteboardsActor,
  ): Promise<WhiteboardDto> {
    assertWrite(actor);
    const source = await getOwnedOrThrow(id, actor);

    return this.create(
      {
        title: input.title ?? `${source.title} (Copy)`,
        canvasData: source.canvasData as CreateWhiteboardInput["canvasData"],
        thumbnail: source.thumbnail,
        projectId: source.projectId,
        taskId: source.taskId,
        clientId: source.clientId,
        teamId: source.teamId,
        organizationId: source.organizationId,
        workspaceId: source.workspaceId,
      },
      actor,
    );
  }

  async remove(id: string, actor: WhiteboardsActor): Promise<{ id: string }> {
    assertDelete(actor);
    const existing = await getOwnedOrThrow(id, actor);

    if (existing.ownerId !== actor.userId && !isAdmin(actor)) {
      throw new WhiteboardsError(
        "Permission denied",
        403,
        WHITEBOARDS_ERROR_CODES.FORBIDDEN,
      );
    }

    await whiteboardsRepository.softDelete(id, actor.userId);

    void logWhiteboardAuditEvent({
      userId: actor.userId,
      action: WHITEBOARDS_AUDIT_ACTIONS.DELETE,
      resourceId: id,
      metadata: { title: existing.title },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async listVersions(
    id: string,
    actor: WhiteboardsActor,
  ): Promise<WhiteboardVersionDto[]> {
    assertRead(actor);
    await getOwnedOrThrow(id, actor);
    const rows = await whiteboardsRepository.listVersions(id);
    return rows.map(toVersionDto);
  }

  async restoreVersion(
    id: string,
    version: number,
    actor: WhiteboardsActor,
  ): Promise<WhiteboardDto> {
    assertWrite(actor);
    await getOwnedOrThrow(id, actor);
    const snapshot = await whiteboardsRepository.getVersion(id, version);
    if (!snapshot) {
      throw new WhiteboardsError(
        "Version not found",
        404,
        WHITEBOARDS_ERROR_CODES.NOT_FOUND,
      );
    }

    return this.update(
      id,
      {
        title: snapshot.title,
        canvasData: snapshot.canvasData as UpdateWhiteboardInput["canvasData"],
        thumbnail: snapshot.thumbnail,
        createVersion: true,
        versionLabel: `Restored v${version}`,
      },
      actor,
    );
  }

  async addComment(
    id: string,
    input: CreateWhiteboardCommentInput,
    actor: WhiteboardsActor,
  ) {
    assertWrite(actor);
    await getOwnedOrThrow(id, actor);
    const comment = await whiteboardsRepository.createComment({
      whiteboardId: id,
      authorId: actor.userId,
      body: input.body,
      anchorX: input.anchorX ?? 0,
      anchorY: input.anchorY ?? 0,
      objectId: input.objectId ?? null,
    });
    return {
      id: comment.id,
      whiteboardId: comment.whiteboardId,
      authorId: comment.authorId,
      body: comment.body,
      anchorX: comment.anchorX,
      anchorY: comment.anchorY,
      objectId: comment.objectId,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async listComments(id: string, actor: WhiteboardsActor) {
    assertRead(actor);
    await getOwnedOrThrow(id, actor);
    const rows = await whiteboardsRepository.listComments(id);
    return rows.map((c) => ({
      id: c.id,
      whiteboardId: c.whiteboardId,
      authorId: c.authorId,
      body: c.body,
      anchorX: c.anchorX,
      anchorY: c.anchorY,
      objectId: c.objectId,
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async runAi(
    id: string,
    input: WhiteboardAiRequestInput,
    actor: WhiteboardsActor,
  ): Promise<{ action: string; result: string }> {
    assertRead(actor);
    if (!hasPermission(actor, PERMISSIONS.AI_USE)) {
      throw new WhiteboardsError(
        "AI permission denied",
        403,
        WHITEBOARDS_ERROR_CODES.FORBIDDEN,
      );
    }

    const board = await getOwnedOrThrow(id, actor);
    const canvasData = input.canvasData ?? board.canvasData;
    const summary = summarizeCanvas(canvasData);

    const actionPrompts: Record<string, string> = {
      SUMMARIZE: "Summarize this whiteboard for stakeholders.",
      OCR: "Extract all readable text and handwriting-like labels from this whiteboard description (OCR-style).",
      CONVERT_DIAGRAM:
        "Convert the sketched content into a structured diagram description (boxes, arrows, relationships) in Markdown.",
      GENERATE_TASKS:
        "Generate a concrete task list from this whiteboard. Return Markdown checklist items.",
      MEETING_NOTES:
        "Turn this whiteboard into meeting notes with decisions and action items.",
      SUGGESTIONS:
        "Suggest improvements, missing pieces, and next steps for this whiteboard.",
    };

    const prompt = [
      actionPrompts[input.action] ?? "Analyze this whiteboard.",
      input.prompt ? `User request: ${input.prompt}` : "",
      summary,
    ]
      .filter(Boolean)
      .join("\n\n");

    const provider = getAiProvider();
    const generated = await provider.generate({
      prompt,
      mode: "SUMMARIZE",
    });

    return { action: input.action, result: generated.content };
  }
}

export const whiteboardsService = new WhiteboardsService();
