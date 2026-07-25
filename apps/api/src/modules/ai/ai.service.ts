import type {
  AiAssistMode,
  AiDocumentType,
} from "@enterprise/database";
import type {
  AiChatRequestInput,
  AiChatResponseDto,
  AiConversationDto,
  AiConversationListResponse,
  AiDocumentDto,
  AiDocumentListResponse,
  CreateAiDocumentInput,
  ListAiConversationsQueryInput,
  ListAiDocumentsQueryInput,
  UpdateAiDocumentInput,
} from "@enterprise/shared";

import { AI_AUDIT_ACTIONS, logAiAuditEvent } from "./ai.audit.js";
import { AI_ERROR_CODES, AiError } from "./ai.errors.js";
import { aiRepository } from "./ai.repository.js";
import {
  toAiConversationDto,
  toAiDocumentDto,
  toAiMessageDto,
} from "./ai.types.js";
import { aiProvider } from "./providers/index.js";
import { apiKeyProviderService } from "../integrations/api-keys/api-key-provider.service.js";

export interface AiActor {
  userId: string;
  role: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

async function recordAiProviderUsage(
  providerName: string,
  latencyMs: number,
): Promise<void> {
  const slug =
    providerName === "gemini" || providerName.startsWith("gemini")
      ? "gemini"
      : providerName === "openai" || providerName.startsWith("openai")
        ? "openai"
        : null;
  if (!slug) return;
  try {
    await apiKeyProviderService.recordAiRequest(slug, latencyMs);
  } catch {
    // Usage metrics are best-effort and must not break AI responses.
  }
}

export interface AiChatStreamHandlers {
  onMeta?: (meta: {
    conversationId: string;
    userMessageId: string;
    provider: string;
  }) => void | Promise<void>;
  onDelta?: (chunk: string) => void | Promise<void>;
}

function deriveTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New conversation";
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
}

function documentTitle(type: string, prompt: string, explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();
  return `${type.replaceAll("_", " ")} — ${deriveTitle(prompt)}`;
}

async function prepareChatContext(input: AiChatRequestInput, actor: AiActor) {
  let conversationId = input.conversationId;
  let conversation = conversationId
    ? await aiRepository.getConversation(conversationId, actor.userId)
    : null;

  if (conversationId && !conversation) {
    throw new AiError("Conversation not found", 404, AI_ERROR_CODES.NOT_FOUND);
  }

  if (!conversation) {
    const created = await aiRepository.createConversation(
      actor.userId,
      deriveTitle(input.message),
    );
    conversationId = created.id;
    conversation = {
      ...created,
      messages: [],
      _count: { messages: 0 },
    };
  }

  const mode = input.mode as AiAssistMode;

  const userMessage = await aiRepository.addMessage({
    conversationId: conversationId!,
    role: "USER",
    content: input.message,
    mode,
  });

  const history = await aiRepository.listMessages(conversationId!);
  const providerHistory = history
    .filter((message) => message.id !== userMessage.id)
    .map((message) => ({
      role: message.role as "USER" | "ASSISTANT" | "SYSTEM",
      content: message.content,
    }));

  return {
    conversationId: conversationId!,
    conversation,
    mode,
    userMessage,
    historyLength: history.length,
    providerHistory,
  };
}

export class AiService {
  async listConversations(
    query: ListAiConversationsQueryInput,
    actor: AiActor,
  ): Promise<AiConversationListResponse> {
    const { items, total } = await aiRepository.listConversations(
      actor.userId,
      query,
    );
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toAiConversationDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getConversation(
    id: string,
    actor: AiActor,
  ): Promise<AiConversationDto> {
    const conversation = await aiRepository.getConversation(id, actor.userId);
    if (!conversation) {
      throw new AiError("Conversation not found", 404, AI_ERROR_CODES.NOT_FOUND);
    }
    return toAiConversationDto(conversation);
  }

  async deleteConversation(
    id: string,
    actor: AiActor,
  ): Promise<{ id: string }> {
    const deleted = await aiRepository.softDeleteConversation(
      id,
      actor.userId,
    );
    if (!deleted) {
      throw new AiError("Conversation not found", 404, AI_ERROR_CODES.NOT_FOUND);
    }

    await logAiAuditEvent({
      userId: actor.userId,
      action: AI_AUDIT_ACTIONS.CONVERSATION_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }

  async chat(
    input: AiChatRequestInput,
    actor: AiActor,
  ): Promise<AiChatResponseDto> {
    const context = await prepareChatContext(input, actor);

    let generated;
    const started = Date.now();
    try {
      generated = await aiProvider.generate({
        mode: input.mode,
        prompt: input.message,
        history: context.providerHistory,
      });
    } catch (error) {
      throw new AiError(
        error instanceof Error
          ? error.message
          : "AI provider failed to generate a response",
        502,
        AI_ERROR_CODES.PROVIDER_ERROR,
      );
    }

    void recordAiProviderUsage(generated.provider, Date.now() - started);

    return this.finalizeChat({
      actor,
      input,
      context,
      generated,
    });
  }

  async chatStream(
    input: AiChatRequestInput,
    actor: AiActor,
    handlers: AiChatStreamHandlers = {},
  ): Promise<AiChatResponseDto> {
    const context = await prepareChatContext(input, actor);

    await handlers.onMeta?.({
      conversationId: context.conversationId,
      userMessageId: context.userMessage.id,
      provider: aiProvider.name,
    });

    let generated;
    try {
      generated = aiProvider.generateStream
        ? await aiProvider.generateStream(
            {
              mode: input.mode,
              prompt: input.message,
              history: context.providerHistory,
            },
            { onDelta: handlers.onDelta },
          )
        : await aiProvider
            .generate({
              mode: input.mode,
              prompt: input.message,
              history: context.providerHistory,
            })
            .then(async (result) => {
              await handlers.onDelta?.(result.content);
              return result;
            });
    } catch (error) {
      throw new AiError(
        error instanceof Error
          ? error.message
          : "AI provider failed to generate a response",
        502,
        AI_ERROR_CODES.PROVIDER_ERROR,
      );
    }

    return this.finalizeChat({
      actor,
      input,
      context,
      generated,
    });
  }

  private async finalizeChat(args: {
    actor: AiActor;
    input: AiChatRequestInput;
    context: Awaited<ReturnType<typeof prepareChatContext>>;
    generated: { content: string; provider: string };
  }): Promise<AiChatResponseDto> {
    const { actor, input, context, generated } = args;

    const assistantMessage = await aiRepository.addMessage({
      conversationId: context.conversationId,
      role: "ASSISTANT",
      content: generated.content,
      mode: context.mode,
    });

    if (context.historyLength <= 1) {
      await aiRepository.updateConversationTitle(
        context.conversationId,
        deriveTitle(input.message),
      );
    }

    const fresh = await aiRepository.getConversation(
      context.conversationId,
      actor.userId,
    );

    await logAiAuditEvent({
      userId: actor.userId,
      action: AI_AUDIT_ACTIONS.CHAT,
      resourceId: context.conversationId,
      metadata: { mode: input.mode, provider: generated.provider },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      conversation: toAiConversationDto(fresh!),
      userMessage: toAiMessageDto(context.userMessage),
      assistantMessage: toAiMessageDto(assistantMessage),
      provider: generated.provider,
    };
  }

  async listDocuments(
    query: ListAiDocumentsQueryInput,
    actor: AiActor,
  ): Promise<AiDocumentListResponse> {
    const { items, total } = await aiRepository.listDocuments(
      actor.userId,
      query,
    );
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    return {
      items: items.map(toAiDocumentDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getDocument(id: string, actor: AiActor): Promise<AiDocumentDto> {
    const document = await aiRepository.getDocument(id, actor.userId);
    if (!document) {
      throw new AiError("Document not found", 404, AI_ERROR_CODES.NOT_FOUND);
    }
    return toAiDocumentDto(document);
  }

  async createDocument(
    input: CreateAiDocumentInput,
    actor: AiActor,
  ): Promise<AiDocumentDto> {
    let content = input.content?.trim() ?? "";

    if (input.generate || !content) {
      try {
        const generated = await aiProvider.generate({
          mode: "DOCUMENT",
          documentType: input.type,
          prompt: input.prompt,
        });
        content = generated.content;
      } catch (error) {
        throw new AiError(
          error instanceof Error
            ? error.message
            : "AI provider failed to generate a document",
          502,
          AI_ERROR_CODES.PROVIDER_ERROR,
        );
      }
    }

    const created = await aiRepository.createDocument({
      userId: actor.userId,
      title: documentTitle(input.type, input.prompt, input.title),
      type: input.type as AiDocumentType,
      prompt: input.prompt,
      content,
    });

    await logAiAuditEvent({
      userId: actor.userId,
      action: AI_AUDIT_ACTIONS.DOCUMENT_CREATE,
      resourceId: created.id,
      metadata: { type: input.type, provider: aiProvider.name },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toAiDocumentDto(created);
  }

  async updateDocument(
    id: string,
    input: UpdateAiDocumentInput,
    actor: AiActor,
  ): Promise<AiDocumentDto> {
    const existing = await aiRepository.getDocument(id, actor.userId);
    if (!existing) {
      throw new AiError("Document not found", 404, AI_ERROR_CODES.NOT_FOUND);
    }

    const updated = await aiRepository.updateDocument(id, {
      title: input.title,
      type: input.type as AiDocumentType | undefined,
      prompt: input.prompt,
      content: input.content,
    });

    await logAiAuditEvent({
      userId: actor.userId,
      action: AI_AUDIT_ACTIONS.DOCUMENT_UPDATE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toAiDocumentDto(updated);
  }

  async deleteDocument(
    id: string,
    actor: AiActor,
  ): Promise<{ id: string }> {
    const deleted = await aiRepository.softDeleteDocument(id, actor.userId);
    if (!deleted) {
      throw new AiError("Document not found", 404, AI_ERROR_CODES.NOT_FOUND);
    }

    await logAiAuditEvent({
      userId: actor.userId,
      action: AI_AUDIT_ACTIONS.DOCUMENT_DELETE,
      resourceId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id };
  }
}

export const aiService = new AiService();
