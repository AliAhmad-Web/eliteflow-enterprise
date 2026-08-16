import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

export const AI_ASSIST_MODES = [
  "ASK",
  "EMAIL",
  "PROPOSAL",
  "SUMMARIZE",
  "ANALYZE",
  "IMPROVE",
  "MEETING_NOTES",
  "PROJECT_SUMMARY",
  "TECHNICAL_DOCS",
] as const;

export const AI_DOCUMENT_TYPES = [
  "PROPOSAL",
  "EMAIL",
  "MEETING_NOTES",
  "PROJECT_SUMMARY",
  "TECHNICAL_DOCS",
  "GENERAL",
] as const;

export const AI_MESSAGE_ROLES = ["USER", "ASSISTANT", "SYSTEM"] as const;

export const aiAssistModeSchema = z.enum(AI_ASSIST_MODES);
export const aiDocumentTypeSchema = z.enum(AI_DOCUMENT_TYPES);
export const aiMessageRoleSchema = z.enum(AI_MESSAGE_ROLES);

export type AiAssistModeValue = z.infer<typeof aiAssistModeSchema>;
export type AiDocumentTypeValue = z.infer<typeof aiDocumentTypeSchema>;
export type AiMessageRoleValue = z.infer<typeof aiMessageRoleSchema>;

export const AI_PAGE_CONTEXT_ENTITY_TYPES = [
  "request",
  "quote",
  "payment",
  "invoice",
  "project",
  "task",
] as const;

export const aiPageContextEntityTypeSchema = z.enum(
  AI_PAGE_CONTEXT_ENTITY_TYPES,
);

/** Route hint only — never trust names, amounts, or ownership from the client. */
export const aiPageContextSchema = z.object({
  path: z.string().trim().max(300).optional(),
  entityType: aiPageContextEntityTypeSchema.optional(),
  entityId: uuidSchema.optional(),
});

export type AiPageContextInput = z.infer<typeof aiPageContextSchema>;

export const aiChatRequestSchema = z.object({
  conversationId: uuidSchema.optional(),
  message: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(1, "Message is required")
    .max(8000, "Message must not exceed 8000 characters"),
  mode: aiAssistModeSchema.optional().default("ASK"),
  pageContext: aiPageContextSchema.optional(),
});

export type AiChatRequestInput = z.infer<typeof aiChatRequestSchema>;

export const aiConversationIdParamsSchema = z.object({
  id: uuidSchema,
});

export type AiConversationIdParamsInput = z.infer<
  typeof aiConversationIdParamsSchema
>;

export const listAiConversationsQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListAiConversationsQueryInput = z.infer<
  typeof listAiConversationsQuerySchema
>;

export const createAiDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .max(200, "Title must not exceed 200 characters")
    .optional()
    .default(""),
  type: aiDocumentTypeSchema,
  prompt: z
    .string({ required_error: "Prompt is required" })
    .trim()
    .min(1, "Prompt is required")
    .max(8000, "Prompt must not exceed 8000 characters"),
  content: z
    .string()
    .trim()
    .max(100000, "Content is too long")
    .optional(),
  generate: z.boolean().optional().default(true),
});

export type CreateAiDocumentInput = z.infer<typeof createAiDocumentSchema>;

export const updateAiDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must not exceed 200 characters")
      .optional(),
    type: aiDocumentTypeSchema.optional(),
    prompt: z
      .string()
      .trim()
      .min(1)
      .max(8000)
      .optional(),
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(100000)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateAiDocumentInput = z.infer<typeof updateAiDocumentSchema>;

export const aiDocumentIdParamsSchema = z.object({
  id: uuidSchema,
});

export type AiDocumentIdParamsInput = z.infer<typeof aiDocumentIdParamsSchema>;

export const listAiDocumentsQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  type: aiDocumentTypeSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type ListAiDocumentsQueryInput = z.infer<
  typeof listAiDocumentsQuerySchema
>;

export const aiMessageSchema = z.object({
  id: uuidSchema,
  role: aiMessageRoleSchema,
  content: z.string(),
  mode: aiAssistModeSchema,
  createdAt: z.string(),
});

export const aiConversationSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().int().optional(),
  preview: z.string().nullable().optional(),
  messages: z.array(aiMessageSchema).optional(),
});

export const aiDocumentSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  type: aiDocumentTypeSchema,
  prompt: z.string(),
  content: z.string(),
  createdById: uuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AiMessageDto = z.infer<typeof aiMessageSchema>;
export type AiConversationDto = z.infer<typeof aiConversationSchema>;
export type AiDocumentDto = z.infer<typeof aiDocumentSchema>;

/** Structured human-confirmation dialog payload (additive; no provider redesign). */
export const aiConfirmationRiskLevelSchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const aiConfirmationRequiredSchema = z.object({
  confirmationRequired: z.literal(true),
  confirmationId: z.string().min(1),
  expiresAt: z.string(),
  action: z.string(),
  summary: z.string(),
  riskLevel: aiConfirmationRiskLevelSchema,
  toolId: z.string().optional(),
});

export type AiConfirmationRequiredDto = z.infer<
  typeof aiConfirmationRequiredSchema
>;

export const aiChatResponseSchema = z.object({
  conversation: aiConversationSchema,
  userMessage: aiMessageSchema,
  assistantMessage: aiMessageSchema,
  provider: z.string(),
  /** When true, frontend must show the human approval dialog before tool side effects. */
  confirmationRequired: z.boolean().optional(),
  confirmationId: z.string().optional(),
  expiresAt: z.string().optional(),
  action: z.string().optional(),
  summary: z.string().optional(),
  riskLevel: aiConfirmationRiskLevelSchema.optional(),
  /** All pending confirmations from this turn (supports multi-tool). */
  confirmations: z.array(aiConfirmationRequiredSchema).optional(),
});

export type AiChatResponseDto = z.infer<typeof aiChatResponseSchema>;

export const aiConfirmationIdParamsSchema = z.object({
  id: z.string().uuid("Invalid confirmation id"),
});

export type AiConfirmationIdParamsInput = z.infer<
  typeof aiConfirmationIdParamsSchema
>;

export const aiConfirmationDecisionResponseSchema = z.object({
  confirmationId: z.string(),
  status: z.enum(["approved", "rejected"]),
  toolId: z.string().optional(),
  output: z.record(z.string(), z.unknown()).optional(),
});

export type AiConfirmationDecisionResponseDto = z.infer<
  typeof aiConfirmationDecisionResponseSchema
>;
