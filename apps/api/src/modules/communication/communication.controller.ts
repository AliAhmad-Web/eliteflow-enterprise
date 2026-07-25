import type { Request, Response } from "express";

import type {
  AddConversationMembersInput,
  CommentIdParamsInput,
  CommunicationSearchQueryInput,
  ConversationIdParamsInput,
  CreateCommentInput,
  CreateConversationInput,
  CreateMessageInput,
  ForwardMessageInput,
  ListActivitiesQueryInput,
  ListCommentsQueryInput,
  ListConversationsQueryInput,
  ListMessagesQueryInput,
  MarkMessagesReadInput,
  MessageIdParamsInput,
  ReactToMessageInput,
  TypingInput,
  UpdateCommentInput,
  UpdateConversationInput,
  UpdateMessageInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import {
  COMMUNICATION_ERROR_CODES,
  CommunicationError,
} from "./communication.errors.js";
import { communicationService } from "./communication.service.js";
import { runActivityTriggers } from "./activity.triggers.js";
import type { CommunicationActor } from "./communication.types.js";

function getActor(req: Request): CommunicationActor {
  if (!req.auth) {
    throw new CommunicationError(
      "Authentication required",
      401,
      COMMUNICATION_ERROR_CODES.FORBIDDEN,
    );
  }
  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    permissions: req.auth.permissions,
    companyId: (req.auth as unknown as { companyId?: string | null }).companyId,
  };
}

export class CommunicationController {
  // ---- Conversations --------------------------------------------------------

  async listConversations(req: Request, res: Response) {
    const result = await communicationService.listConversations(
      req.query as unknown as ListConversationsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Conversations retrieved"));
  }

  async createConversation(req: Request, res: Response) {
    const result = await communicationService.createConversation(
      req.body as CreateConversationInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Conversation created"));
  }

  async getConversation(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.getConversation(
      params.id,
      getActor(req),
    );
    res.json(successResponse(result, "Conversation retrieved"));
  }

  async updateConversation(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.updateConversation(
      params.id,
      req.body as UpdateConversationInput,
      getActor(req),
    );
    res.json(successResponse(result, "Conversation updated"));
  }

  async deleteConversation(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    await communicationService.deleteConversation(params.id, getActor(req));
    res.json(successResponse(null, "Conversation deleted"));
  }

  async addMembers(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.addMembers(
      params.id,
      req.body as AddConversationMembersInput,
      getActor(req),
    );
    res.json(successResponse(result, "Members added"));
  }

  async removeMember(req: Request, res: Response) {
    const params = req.params as unknown as {
      id: string;
      userId: string;
    };
    const result = await communicationService.removeMember(
      params.id,
      params.userId,
      getActor(req),
    );
    res.json(successResponse(result, "Member removed"));
  }

  async updateMemberRole(req: Request, res: Response) {
    const params = req.params as unknown as {
      id: string;
      userId: string;
    };
    const body = req.body as { role: string };
    const result = await communicationService.updateMemberRole(
      params.id,
      params.userId,
      body.role,
      getActor(req),
    );
    res.json(successResponse(result, "Member role updated"));
  }

  async archiveConversation(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.archiveConversation(
      params.id,
      getActor(req),
    );
    res.json(successResponse(result, "Channel archived"));
  }

  async unarchiveConversation(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.unarchiveConversation(
      params.id,
      getActor(req),
    );
    res.json(successResponse(result, "Channel unarchived"));
  }

  // ---- Messages ------------------------------------------------------------

  async listMessages(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.listMessages(
      params.id,
      req.query as unknown as ListMessagesQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Messages retrieved"));
  }

  async getPinnedMessages(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.getPinnedMessages(
      params.id,
      getActor(req),
    );
    res.json(successResponse(result, "Pinned messages retrieved"));
  }

  async sendMessage(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.sendMessage(
      params.id,
      req.body as CreateMessageInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Message sent"));
  }

  async getMessage(req: Request, res: Response) {
    const params = req.params as unknown as MessageIdParamsInput;
    const result = await communicationService.getMessage(
      params.id,
      getActor(req),
    );
    res.json(successResponse(result, "Message retrieved"));
  }

  async updateMessage(req: Request, res: Response) {
    const params = req.params as unknown as MessageIdParamsInput;
    const result = await communicationService.updateMessage(
      params.id,
      req.body as UpdateMessageInput,
      getActor(req),
    );
    res.json(successResponse(result, "Message updated"));
  }

  async deleteMessage(req: Request, res: Response) {
    const params = req.params as unknown as MessageIdParamsInput;
    await communicationService.deleteMessage(params.id, getActor(req));
    res.json(successResponse(null, "Message deleted"));
  }

  async forwardMessage(req: Request, res: Response) {
    const params = req.params as unknown as MessageIdParamsInput;
    const result = await communicationService.forwardMessage(
      params.id,
      req.body as ForwardMessageInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Message forwarded"));
  }

  async pinMessage(req: Request, res: Response) {
    const params = req.params as unknown as MessageIdParamsInput;
    const result = await communicationService.pinMessage(
      params.id,
      getActor(req),
    );
    res.json(successResponse(result, "Message pinned"));
  }

  async unpinMessage(req: Request, res: Response) {
    const params = req.params as unknown as MessageIdParamsInput;
    const result = await communicationService.unpinMessage(
      params.id,
      getActor(req),
    );
    res.json(successResponse(result, "Message unpinned"));
  }

  async reactToMessage(req: Request, res: Response) {
    const params = req.params as unknown as MessageIdParamsInput;
    const result = await communicationService.reactToMessage(
      params.id,
      req.body as ReactToMessageInput,
      getActor(req),
    );
    res.json(successResponse(result, "Reaction added"));
  }

  async unreactToMessage(req: Request, res: Response) {
    const params = req.params as unknown as MessageIdParamsInput;
    const { emoji } = req.body as { emoji: string };
    const result = await communicationService.unreactToMessage(
      params.id,
      emoji,
      getActor(req),
    );
    res.json(successResponse(result, "Reaction removed"));
  }

  async markRead(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.markRead(
      params.id,
      req.body as MarkMessagesReadInput,
      getActor(req),
    );
    res.json(successResponse(result, "Messages marked as read"));
  }

  async setTyping(req: Request, res: Response) {
    const params = req.params as unknown as ConversationIdParamsInput;
    const result = await communicationService.setTyping(
      params.id,
      req.body as TypingInput,
      getActor(req),
    );
    res.json(successResponse(result, "Typing status updated"));
  }

  // ---- Presence ------------------------------------------------------------

  async heartbeat(req: Request, res: Response) {
    const result = await communicationService.heartbeat(getActor(req));
    res.json(successResponse(result, "Presence updated"));
  }

  async setOffline(req: Request, res: Response) {
    const result = await communicationService.setOffline(getActor(req));
    res.json(successResponse(result, "Marked offline"));
  }

  async getPresence(req: Request, res: Response) {
    const raw = req.query.userIds;
    const userIds =
      typeof raw === "string"
        ? raw.split(",").map((id) => id.trim()).filter(Boolean)
        : Array.isArray(raw)
          ? raw.flatMap((v) => String(v).split(",")).map((id) => id.trim()).filter(Boolean)
          : undefined;
    const result = await communicationService.getPresence(
      getActor(req),
      userIds,
    );
    res.json(successResponse(result, "Presence retrieved"));
  }

  // ---- Comments ------------------------------------------------------------

  async listComments(req: Request, res: Response) {
    const result = await communicationService.listComments(
      req.query as unknown as ListCommentsQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Comments retrieved"));
  }

  async createComment(req: Request, res: Response) {
    const result = await communicationService.createComment(
      req.body as CreateCommentInput,
      getActor(req),
    );
    res.status(201).json(successResponse(result, "Comment created"));
  }

  async updateComment(req: Request, res: Response) {
    const params = req.params as unknown as CommentIdParamsInput;
    const result = await communicationService.updateComment(
      params.id,
      req.body as UpdateCommentInput,
      getActor(req),
    );
    res.json(successResponse(result, "Comment updated"));
  }

  async deleteComment(req: Request, res: Response) {
    const params = req.params as unknown as CommentIdParamsInput;
    await communicationService.deleteComment(params.id, getActor(req));
    res.json(successResponse(null, "Comment deleted"));
  }

  // ---- Activities ----------------------------------------------------------

  async listActivities(req: Request, res: Response) {
    const result = await communicationService.listActivities(
      req.query as unknown as ListActivitiesQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Activities retrieved"));
  }

  async syncActivities(req: Request, res: Response) {
    const actor = getActor(req);
    const result = await runActivityTriggers(actor.userId);
    res.json(successResponse(result, "Activity sync complete"));
  }

  // ---- Search --------------------------------------------------------------

  async search(req: Request, res: Response) {
    const result = await communicationService.search(
      req.query as unknown as CommunicationSearchQueryInput,
      getActor(req),
    );
    res.json(successResponse(result, "Search results"));
  }
}

export const communicationController = new CommunicationController();
