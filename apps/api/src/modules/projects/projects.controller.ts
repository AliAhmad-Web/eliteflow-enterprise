import type { Request, Response } from "express";

import type {
  CreateProjectInput,
  ListProjectsQueryInput,
  ProjectIdParamsInput,
  UpdateProjectInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { ProjectsError, PROJECTS_ERROR_CODES } from "./projects.errors.js";
import { projectsService, type ProjectActor } from "./projects.service.js";

function getActor(req: Request): ProjectActor {
  if (!req.auth) {
    throw new ProjectsError(
      "Authentication required",
      401,
      PROJECTS_ERROR_CODES.FORBIDDEN,
    );
  }

  const context = extractRequestContext(req);

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export class ProjectsController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListProjectsQueryInput;
    const result = await projectsService.list(query, getActor(req));
    res.json(successResponse(result, "Projects retrieved successfully"));
  }

  async stats(req: Request, res: Response): Promise<void> {
    const result = await projectsService.getStats(getActor(req));
    res.json(successResponse(result, "Project stats retrieved successfully"));
  }

  async assignees(req: Request, res: Response): Promise<void> {
    const result = await projectsService.listAssignees(getActor(req));
    res.json(successResponse(result, "Assignees retrieved successfully"));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ProjectIdParamsInput;
    const result = await projectsService.getById(params.id, getActor(req));
    res.json(successResponse(result, "Project retrieved successfully"));
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateProjectInput;
    const result = await projectsService.create(body, getActor(req));
    res
      .status(201)
      .json(successResponse(result, "Project created successfully"));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ProjectIdParamsInput;
    const body = req.body as UpdateProjectInput;
    const result = await projectsService.update(
      params.id,
      body,
      getActor(req),
    );
    res.json(successResponse(result, "Project updated successfully"));
  }

  async remove(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ProjectIdParamsInput;
    const result = await projectsService.remove(params.id, getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "Project deleted successfully" },
        "Project deleted successfully",
      ),
    );
  }

  async complete(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ProjectIdParamsInput;
    const result = await projectsService.complete(params.id, getActor(req));
    res.json(successResponse(result, "Project marked as completed"));
  }
}

export const projectsController = new ProjectsController();
