import type { Request, Response } from "express";

import type {
  CreatePublicApiKeyInput,
  PublicApiIdParamsInput,
  PublicApiKeyIdParamsInput,
  PublicApiListQueryInput,
} from "@enterprise/shared";

import { publicApiKeysService } from "./public-api-keys.service.js";
import { PUBLIC_API_OPENAPI_V1 } from "./public-api.openapi.js";
import { publicApiService } from "./public-api.service.js";
import { publicSuccess } from "./public-api.response.js";

function auditFrom(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
}

function requirePublicCtx(req: Request) {
  if (!req.publicApi) {
    throw new Error("Public API auth context missing");
  }
  return req.publicApi;
}

export class PublicApiController {
  openapi(_req: Request, res: Response) {
    publicSuccess(res, PUBLIC_API_OPENAPI_V1, {});
  }

  async me(req: Request, res: Response) {
    const data = await publicApiService.getMe(
      requirePublicCtx(req),
      auditFrom(req),
    );
    publicSuccess(res, data);
  }

  async listClients(req: Request, res: Response) {
    const query = req.query as unknown as PublicApiListQueryInput;
    const result = await publicApiService.listClients(
      requirePublicCtx(req),
      query,
      auditFrom(req),
    );
    publicSuccess(res, result.items, result.meta);
  }

  async getClient(req: Request, res: Response) {
    const { id } = req.params as PublicApiIdParamsInput;
    const data = await publicApiService.getClient(
      requirePublicCtx(req),
      id,
      auditFrom(req),
    );
    publicSuccess(res, data);
  }

  async listProjects(req: Request, res: Response) {
    const query = req.query as unknown as PublicApiListQueryInput;
    const result = await publicApiService.listProjects(
      requirePublicCtx(req),
      query,
      auditFrom(req),
    );
    publicSuccess(res, result.items, result.meta);
  }

  async getProject(req: Request, res: Response) {
    const { id } = req.params as PublicApiIdParamsInput;
    const data = await publicApiService.getProject(
      requirePublicCtx(req),
      id,
      auditFrom(req),
    );
    publicSuccess(res, data);
  }

  async listTasks(req: Request, res: Response) {
    const query = req.query as unknown as PublicApiListQueryInput;
    const result = await publicApiService.listTasks(
      requirePublicCtx(req),
      query,
      auditFrom(req),
    );
    publicSuccess(res, result.items, result.meta);
  }

  async getTask(req: Request, res: Response) {
    const { id } = req.params as PublicApiIdParamsInput;
    const data = await publicApiService.getTask(
      requirePublicCtx(req),
      id,
      auditFrom(req),
    );
    publicSuccess(res, data);
  }

  async listInvoices(req: Request, res: Response) {
    const query = req.query as unknown as PublicApiListQueryInput;
    const result = await publicApiService.listInvoices(
      requirePublicCtx(req),
      query,
      auditFrom(req),
    );
    publicSuccess(res, result.items, result.meta);
  }

  async getInvoice(req: Request, res: Response) {
    const { id } = req.params as PublicApiIdParamsInput;
    const data = await publicApiService.getInvoice(
      requirePublicCtx(req),
      id,
      auditFrom(req),
    );
    publicSuccess(res, data);
  }

  async createKey(req: Request, res: Response) {
    const body = req.body as CreatePublicApiKeyInput;
    const auth = req.auth!;
    const result = await publicApiKeysService.create(body, {
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    publicSuccess(
      res,
      {
        ...result.key,
        secret: result.secret,
        warning: "Store this secret now. It will not be shown again.",
      },
      {},
      201,
    );
  }

  async listKeys(req: Request, res: Response) {
    const auth = req.auth!;
    const keys = await publicApiKeysService.list({
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    publicSuccess(res, keys);
  }

  async revokeKey(req: Request, res: Response) {
    const { id } = req.params as PublicApiKeyIdParamsInput;
    const auth = req.auth!;
    const key = await publicApiKeysService.revoke(id, {
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    publicSuccess(res, key);
  }
}

export const publicApiController = new PublicApiController();
