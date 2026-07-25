import type { Request, Response } from "express";

import type {
  CreateTaskCommentInput,
  CreateTaskInput,
  ListTasksQueryInput,
  TaskIdParamsInput,
  UpdateTaskInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { TasksError, TASKS_ERROR_CODES } from "./tasks.errors.js";
import { tasksService, type TaskActor } from "./tasks.service.js";

function getActor(req: Request): TaskActor {
  if (!req.auth) {
    throw new TasksError(
      "Authentication required",
      401,
      TASKS_ERROR_CODES.FORBIDDEN,
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

export class TasksController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListTasksQueryInput;
    const result = await tasksService.list(query, getActor(req));
    res.json(successResponse(result, "Tasks retrieved successfully"));
  }

  async stats(req: Request, res: Response): Promise<void> {
    const result = await tasksService.getStats(getActor(req));
    res.json(successResponse(result, "Task stats retrieved successfully"));
  }

  async assignees(req: Request, res: Response): Promise<void> {
    const result = await tasksService.listAssignees(getActor(req));
    res.json(successResponse(result, "Assignees retrieved successfully"));
  }

  async projects(req: Request, res: Response): Promise<void> {
    const result = await tasksService.listProjects(getActor(req));
    res.json(successResponse(result, "Projects retrieved successfully"));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as TaskIdParamsInput;
    const result = await tasksService.getById(params.id, getActor(req));
    res.json(successResponse(result, "Task retrieved successfully"));
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateTaskInput;
    const result = await tasksService.create(body, getActor(req));
    res.status(201).json(successResponse(result, "Task created successfully"));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as TaskIdParamsInput;
    const body = req.body as UpdateTaskInput;
    const result = await tasksService.update(params.id, body, getActor(req));
    res.json(successResponse(result, "Task updated successfully"));
  }

  async remove(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as TaskIdParamsInput;
    const result = await tasksService.remove(params.id, getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "Task deleted successfully" },
        "Task deleted successfully",
      ),
    );
  }

  async addComment(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as TaskIdParamsInput;
    const body = req.body as CreateTaskCommentInput;
    const result = await tasksService.addComment(
      params.id,
      body,
      getActor(req),
    );
    res
      .status(201)
      .json(successResponse(result, "Comment added successfully"));
  }

  async activity(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as TaskIdParamsInput;
    const result = await tasksService.listActivity(params.id, getActor(req));
    res.json(successResponse(result, "Activity retrieved successfully"));
  }
}

export const tasksController = new TasksController();
