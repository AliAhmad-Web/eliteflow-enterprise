import type { Request, Response } from "express";

import type {
  ClientActivityIdParamsInput,
  ClientIdParamsInput,
  CreateClientActivityInput,
  CreateClientInput,
  LinkPortalUserInput,
  ListClientActivitiesQueryInput,
  ListClientsQueryInput,
  ListUnlinkedPortalUsersQueryInput,
  PortalUserIdParamsInput,
  UpdateClientInput,
  UpdateClientPipelineStageInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { CLIENTS_ERROR_CODES, ClientsError } from "./clients.errors.js";
import { clientsService, type ClientsActor } from "./clients.service.js";

function getActor(req: Request): ClientsActor {
  if (!req.auth) {
    throw new ClientsError(
      "Authentication required",
      401,
      CLIENTS_ERROR_CODES.FORBIDDEN,
    );
  }
  const context = extractRequestContext(req);
  return {
    userId: req.auth.userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export class ClientsController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListClientsQueryInput;
    const result = await clientsService.list(query);
    res.json(successResponse(result, "Clients retrieved successfully"));
  }

  async stats(_req: Request, res: Response): Promise<void> {
    const result = await clientsService.getStats();
    res.json(successResponse(result, "Client stats retrieved successfully"));
  }

  async getPipelineBoard(_req: Request, res: Response): Promise<void> {
    const result = await clientsService.getPipelineBoard();
    res.json(
      successResponse(result, "Client pipeline board retrieved successfully"),
    );
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const result = await clientsService.getById(params.id);
    res.json(successResponse(result, "Client retrieved successfully"));
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateClientInput;
    const actor = getActor(req);
    const result = await clientsService.create(body, actor.userId, actor);
    res.status(201).json(successResponse(result, "Client created successfully"));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const body = req.body as UpdateClientInput;
    const result = await clientsService.update(params.id, body, getActor(req));
    res.json(successResponse(result, "Client updated successfully"));
  }

  async updatePipelineStage(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const body = req.body as UpdateClientPipelineStageInput;
    const result = await clientsService.updatePipelineStage(
      params.id,
      body.pipelineStage,
      getActor(req),
    );
    res.json(
      successResponse(result, "Client pipeline stage updated successfully"),
    );
  }

  async listActivities(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const query = req.query as unknown as ListClientActivitiesQueryInput;
    const result = await clientsService.listActivities(params.id, query);
    res.json(
      successResponse(result, "Client activities retrieved successfully"),
    );
  }

  async createActivity(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const body = req.body as CreateClientActivityInput;
    const result = await clientsService.createActivity(
      params.id,
      body,
      getActor(req),
    );
    res
      .status(201)
      .json(successResponse(result, "Client activity created successfully"));
  }

  async deleteActivity(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientActivityIdParamsInput;
    const result = await clientsService.deleteActivity(
      params.id,
      params.activityId,
      getActor(req),
    );
    res.json(
      successResponse(
        { id: result.id, message: "Client activity deleted successfully" },
        "Client activity deleted successfully",
      ),
    );
  }

  async remove(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const result = await clientsService.remove(params.id, getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "Client deleted successfully" },
        "Client deleted successfully",
      ),
    );
  }

  async listPortalUsers(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const result = await clientsService.listPortalUsers(params.id);
    res.json(
      successResponse(result, "Portal users retrieved successfully"),
    );
  }

  async listUnlinkedPortalUsers(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListUnlinkedPortalUsersQueryInput;
    const result = await clientsService.listUnlinkedPortalUsers(query);
    res.json(
      successResponse(result, "Unlinked portal users retrieved successfully"),
    );
  }

  async linkPortalUser(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const body = req.body as LinkPortalUserInput;
    const result = await clientsService.linkPortalUser(
      params.id,
      body,
      getActor(req),
    );
    res.status(200).json(
      successResponse(result, "Portal user linked successfully"),
    );
  }

  async unlinkPortalUser(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as PortalUserIdParamsInput;
    const result = await clientsService.unlinkPortalUser(
      params.id,
      params.userId,
      getActor(req),
    );
    res.json(
      successResponse(result, "Portal user unlinked successfully"),
    );
  }
}

export const clientsController = new ClientsController();
