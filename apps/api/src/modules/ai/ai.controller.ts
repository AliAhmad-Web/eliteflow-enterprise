import type { Request, Response } from "express";

import type {
  AiChatRequestInput,
  AiConversationIdParamsInput,
  AiDocumentIdParamsInput,
  CreateAiDocumentInput,
  ListAiConversationsQueryInput,
  ListAiDocumentsQueryInput,
  UpdateAiDocumentInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { recordSaasAiRequest } from "../../shared/services/saas-metrics.service.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { AI_ERROR_CODES, AiError } from "./ai.errors.js";
import { aiService, type AiActor } from "./ai.service.js";

function getActor(req: Request): AiActor {
  if (!req.auth) {
    throw new AiError(
      "Authentication required",
      401,
      AI_ERROR_CODES.FORBIDDEN,
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

export class AiController {
  async listConversations(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListAiConversationsQueryInput;
    const result = await aiService.listConversations(query, getActor(req));
    res.json(successResponse(result, "Conversations retrieved successfully"));
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as AiConversationIdParamsInput;
    const result = await aiService.getConversation(params.id, getActor(req));
    res.json(successResponse(result, "Conversation retrieved successfully"));
  }

  async deleteConversation(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as AiConversationIdParamsInput;
    const result = await aiService.deleteConversation(params.id, getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "Conversation deleted successfully" },
        "Conversation deleted successfully",
      ),
    );
  }

  async chat(req: Request, res: Response): Promise<void> {
    const body = req.body as AiChatRequestInput;
    recordSaasAiRequest();
    const result = await aiService.chat(body, getActor(req));
    res.status(201).json(successResponse(result, "Response generated"));
  }

  async chatStream(req: Request, res: Response): Promise<void> {
    const body = req.body as AiChatRequestInput;
    const actor = getActor(req);
    recordSaasAiRequest();

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await aiService.chatStream(body, actor, {
        onMeta: async (meta) => {
          writeEvent("meta", meta);
        },
        onDelta: async (chunk) => {
          writeEvent("delta", { chunk });
        },
      });

      writeEvent("done", result);
      res.write("event: end\ndata: {}\n\n");
      res.end();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI stream failed";
      const code =
        error instanceof AiError ? error.code : AI_ERROR_CODES.PROVIDER_ERROR;
      const status = error instanceof AiError ? error.statusCode : 502;

      writeEvent("error", { message, code, status });
      res.end();
    }
  }

  async listDocuments(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListAiDocumentsQueryInput;
    const result = await aiService.listDocuments(query, getActor(req));
    res.json(successResponse(result, "Documents retrieved successfully"));
  }

  async getDocument(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as AiDocumentIdParamsInput;
    const result = await aiService.getDocument(params.id, getActor(req));
    res.json(successResponse(result, "Document retrieved successfully"));
  }

  async createDocument(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateAiDocumentInput;
    const result = await aiService.createDocument(body, getActor(req));
    res.status(201).json(successResponse(result, "Document created successfully"));
  }

  async updateDocument(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as AiDocumentIdParamsInput;
    const body = req.body as UpdateAiDocumentInput;
    const result = await aiService.updateDocument(
      params.id,
      body,
      getActor(req),
    );
    res.json(successResponse(result, "Document updated successfully"));
  }

  async deleteDocument(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as AiDocumentIdParamsInput;
    const result = await aiService.deleteDocument(params.id, getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "Document deleted successfully" },
        "Document deleted successfully",
      ),
    );
  }
}

export const aiController = new AiController();
