import type { Request, Response } from "express";

import type {
  CreateWhiteboardCommentInput,
  CreateWhiteboardInput,
  DuplicateWhiteboardInput,
  ListWhiteboardsQueryInput,
  RenameWhiteboardInput,
  UpdateWhiteboardInput,
  WhiteboardAiRequestInput,
  WhiteboardIdParamsInput,
} from "@enterprise/shared";
import { prisma } from "@enterprise/database";

import { successResponse } from "../../shared/utils/api-response.js";
import {
  WHITEBOARDS_ERROR_CODES,
  WhiteboardsError,
} from "./whiteboards.errors.js";
import {
  whiteboardsService,
  type WhiteboardsActor,
} from "./whiteboards.service.js";

async function getActor(req: Request): Promise<WhiteboardsActor> {
  if (!req.auth) {
    throw new WhiteboardsError(
      "Authentication required",
      401,
      WHITEBOARDS_ERROR_CODES.FORBIDDEN,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: { companyId: true },
  });

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    companyId: user?.companyId ?? null,
    permissions: req.auth.permissions,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
}

export class WhiteboardsController {
  async list(req: Request, res: Response) {
    const result = await whiteboardsService.list(
      req.query as unknown as ListWhiteboardsQueryInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Whiteboards retrieved"));
  }

  async getById(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.getById(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Whiteboard retrieved"));
  }

  async create(req: Request, res: Response) {
    const result = await whiteboardsService.create(
      req.body as CreateWhiteboardInput,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "Whiteboard created"));
  }

  async update(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.update(
      params.id,
      req.body as UpdateWhiteboardInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Whiteboard saved"));
  }

  async rename(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.rename(
      params.id,
      req.body as RenameWhiteboardInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Whiteboard renamed"));
  }

  async duplicate(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.duplicate(
      params.id,
      (req.body ?? {}) as DuplicateWhiteboardInput,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "Whiteboard duplicated"));
  }

  async remove(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.remove(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Whiteboard deleted"));
  }

  async listVersions(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.listVersions(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Versions retrieved"));
  }

  async restoreVersion(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput & {
      version: string;
    };
    const version = Number(params.version);
    const result = await whiteboardsService.restoreVersion(
      params.id,
      version,
      await getActor(req),
    );
    res.json(successResponse(result, "Version restored"));
  }

  async listComments(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.listComments(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Comments retrieved"));
  }

  async addComment(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.addComment(
      params.id,
      req.body as CreateWhiteboardCommentInput,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "Comment added"));
  }

  async runAi(req: Request, res: Response) {
    const params = req.params as unknown as WhiteboardIdParamsInput;
    const result = await whiteboardsService.runAi(
      params.id,
      req.body as WhiteboardAiRequestInput,
      await getActor(req),
    );
    res.json(successResponse(result, "AI result ready"));
  }
}

export const whiteboardsController = new WhiteboardsController();
