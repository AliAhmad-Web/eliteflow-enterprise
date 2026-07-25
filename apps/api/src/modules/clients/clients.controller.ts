import type { Request, Response } from "express";

import type {
  ClientIdParamsInput,
  CreateClientInput,
  ListClientsQueryInput,
  UpdateClientInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { clientsService } from "./clients.service.js";

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

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const result = await clientsService.getById(params.id);
    res.json(successResponse(result, "Client retrieved successfully"));
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateClientInput;
    const createdById = req.auth?.userId ?? null;
    const result = await clientsService.create(body, createdById);
    res.status(201).json(successResponse(result, "Client created successfully"));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const body = req.body as UpdateClientInput;
    const result = await clientsService.update(params.id, body);
    res.json(successResponse(result, "Client updated successfully"));
  }

  async remove(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ClientIdParamsInput;
    const result = await clientsService.remove(params.id);
    res.json(
      successResponse(
        { id: result.id, message: "Client deleted successfully" },
        "Client deleted successfully",
      ),
    );
  }
}

export const clientsController = new ClientsController();
