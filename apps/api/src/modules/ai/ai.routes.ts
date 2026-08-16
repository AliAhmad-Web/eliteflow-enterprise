import { Router } from "express";

import { PERMISSIONS, RATE_LIMIT } from "@enterprise/shared";

import {
  authenticate,
  authorizeAnyPermission,
  authorizePermissions,
} from "../../shared/authorization.js";
import {
  rateLimit,
  rateLimitByUser,
} from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { aiController } from "./ai.controller.js";
import {
  aiChatRequestSchema,
  aiConfirmationIdParamsSchema,
  aiConversationIdParamsSchema,
  aiDocumentIdParamsSchema,
  createAiDocumentSchema,
  listAiConversationsQuerySchema,
  listAiDocumentsQuerySchema,
  updateAiDocumentSchema,
} from "./ai.validation.js";

const aiRouter = Router();

aiRouter.use(authenticate);

const authorizeAiChat = authorizeAnyPermission(
  PERMISSIONS.AI_USE,
  PERMISSIONS.AI_CUSTOMER,
);

aiRouter.get(
  "/conversations",
  authorizeAiChat,
  rateLimit({
    name: "ai.conversations.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listAiConversationsQuerySchema, "query"),
  asyncHandler((req, res) => aiController.listConversations(req, res)),
);

aiRouter.get(
  "/conversations/:id",
  authorizeAiChat,
  rateLimit({
    name: "ai.conversations.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiConversationIdParamsSchema, "params"),
  asyncHandler((req, res) => aiController.getConversation(req, res)),
);

aiRouter.delete(
  "/conversations/:id",
  authorizeAiChat,
  rateLimit({
    name: "ai.conversations.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiConversationIdParamsSchema, "params"),
  asyncHandler((req, res) => aiController.deleteConversation(req, res)),
);

aiRouter.post(
  "/chat",
  authorizeAiChat,
  rateLimit({
    name: "ai.chat",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiChatRequestSchema),
  asyncHandler((req, res) => aiController.chat(req, res)),
);

aiRouter.post(
  "/chat/stream",
  authorizeAiChat,
  rateLimit({
    name: "ai.chat.stream",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiChatRequestSchema),
  asyncHandler((req, res) => aiController.chatStream(req, res)),
);

aiRouter.post(
  "/tool-confirmations/:id/approve",
  authorizeAiChat,
  rateLimit({
    name: "ai.confirmation.approve",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiConfirmationIdParamsSchema, "params"),
  asyncHandler((req, res) => aiController.approveToolConfirmation(req, res)),
);

aiRouter.post(
  "/tool-confirmations/:id/reject",
  authorizeAiChat,
  rateLimit({
    name: "ai.confirmation.reject",
    max: 40,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiConfirmationIdParamsSchema, "params"),
  asyncHandler((req, res) => aiController.rejectToolConfirmation(req, res)),
);

aiRouter.get(
  "/documents",
  authorizePermissions(PERMISSIONS.AI_USE),
  rateLimit({
    name: "ai.documents.list",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(listAiDocumentsQuerySchema, "query"),
  asyncHandler((req, res) => aiController.listDocuments(req, res)),
);

aiRouter.get(
  "/documents/:id",
  authorizePermissions(PERMISSIONS.AI_USE),
  rateLimit({
    name: "ai.documents.get",
    ...RATE_LIMIT.GLOBAL_API,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiDocumentIdParamsSchema, "params"),
  asyncHandler((req, res) => aiController.getDocument(req, res)),
);

aiRouter.post(
  "/documents",
  authorizePermissions(PERMISSIONS.AI_USE),
  rateLimit({
    name: "ai.documents.create",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(createAiDocumentSchema),
  asyncHandler((req, res) => aiController.createDocument(req, res)),
);

aiRouter.patch(
  "/documents/:id",
  authorizePermissions(PERMISSIONS.AI_USE),
  rateLimit({
    name: "ai.documents.update",
    max: 60,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiDocumentIdParamsSchema, "params"),
  validate(updateAiDocumentSchema),
  asyncHandler((req, res) => aiController.updateDocument(req, res)),
);

aiRouter.delete(
  "/documents/:id",
  authorizePermissions(PERMISSIONS.AI_USE),
  rateLimit({
    name: "ai.documents.delete",
    max: 30,
    windowMs: 15 * 60 * 1000,
    keyGenerator: rateLimitByUser,
  }),
  validate(aiDocumentIdParamsSchema, "params"),
  asyncHandler((req, res) => aiController.deleteDocument(req, res)),
);

export { aiRouter };
