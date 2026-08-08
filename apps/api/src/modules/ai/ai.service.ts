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
import {
  isAiFoundationOrchestratorEnabled,
  promptOrchestrator,
  toAiGenerateParams,
  type AiMemoryMessage,
  type AiRuntimePipelineState,
  type AiToolExecution,
} from "./foundation/index.js";
import type { ConfirmationRequiredPayload } from "./foundation/confirmation/index.js";
import {
  humanConfirmationService,
  ConfirmationEngineError,
} from "./foundation/confirmation/index.js";
import { aiDataPolicyService } from "./foundation/policy/ai-data-policy.service.js";
import { promptSecurityService } from "./foundation/security/index.js";
import {
  aiBudgetService,
  AiBudgetBlockedError,
  isAiBudgetEnabled,
} from "./foundation/budget/index.js";
import { getAiRuntimeState } from "./providers/ai-runtime-config.js";
import type { AiProviderId } from "./providers/ai-runtime-config.js";
import {
  aiProvider,
  type AiGenerateParams,
} from "./providers/index.js";
import { apiKeyProviderService } from "../integrations/api-keys/api-key-provider.service.js";

export interface AiActor {
  userId: string;
  role: string;
  email: string;
  permissions?: readonly string[];
  sessionId?: string | null;
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

function resolveProviderModelId(providerName: string): string | null {
  const runtime = getAiRuntimeState();
  const key = providerName.trim().toLowerCase() as AiProviderId;
  return runtime.models[key] ?? null;
}

function mapBudgetBlockedError(error: unknown): AiError | null {
  if (!(error instanceof AiBudgetBlockedError)) return null;
  return new AiError(
    error.message,
    error.statusCode,
    AI_ERROR_CODES.BUDGET_EXCEEDED,
  );
}

async function enforceAiBudgetBeforeGenerate(input: {
  actor: AiActor;
  providerId: string;
  modelId?: string | null;
  prompt: string;
  history?: Array<{ content: string }>;
  conversationId?: string | null;
  surface?: string;
}): Promise<{
  estimatedCostUsd: number;
  estimatedTokens: number;
  reservationId?: string;
}> {
  if (!isAiBudgetEnabled()) {
    return { estimatedCostUsd: 0, estimatedTokens: 0 };
  }

  const estimate = aiBudgetService.estimateFromGenerateParams({
    providerId: input.providerId,
    modelId: input.modelId,
    prompt: input.prompt,
    history: input.history,
  });

  try {
    const validation = await aiBudgetService.assertWithinBudget({
      actor: {
        userId: input.actor.userId,
        role: input.actor.role,
        email: input.actor.email,
        permissions: input.actor.permissions,
        ipAddress: input.actor.ipAddress,
        userAgent: input.actor.userAgent,
      },
      providerId: input.providerId,
      modelId: input.modelId,
      conversationId: input.conversationId,
      surface: input.surface ?? "chat",
      estimatedPromptTokens: estimate.usage.promptTokens,
      estimatedCompletionTokens: estimate.usage.completionTokens,
    });
    return {
      estimatedCostUsd: validation.estimatedCostUsd,
      estimatedTokens: validation.estimatedTokens,
      reservationId:
        typeof validation.metadata.reservationId === "string"
          ? validation.metadata.reservationId
          : undefined,
    };
  } catch (error) {
    const mapped = mapBudgetBlockedError(error);
    if (mapped) throw mapped;
    throw error;
  }
}

async function recordAiBudgetAfterGenerate(input: {
  actor: AiActor;
  providerId: string;
  modelId?: string | null;
  prompt: string;
  history?: Array<{ content: string }>;
  completionText: string;
  conversationId?: string | null;
  surface?: string;
  preflightEstimatedCostUsd?: number;
}): Promise<void> {
  if (!isAiBudgetEnabled()) return;

  try {
    const actual = aiBudgetService.estimateFromGenerateParams({
      providerId: input.providerId,
      modelId: input.modelId,
      prompt: input.prompt,
      history: input.history,
      completionText: input.completionText,
    });
    await aiBudgetService.recordUsage({
      context: {
        actor: {
          userId: input.actor.userId,
          role: input.actor.role,
          email: input.actor.email,
          permissions: input.actor.permissions,
          ipAddress: input.actor.ipAddress,
          userAgent: input.actor.userAgent,
        },
        providerId: input.providerId,
        modelId: input.modelId,
        conversationId: input.conversationId,
        surface: input.surface ?? "chat",
      },
      usage: actual.usage,
      estimatedCostUsd:
        input.preflightEstimatedCostUsd ?? actual.estimatedCostUsd,
      actualCostUsd: actual.estimatedCostUsd,
    });
  } catch {
    // Budget accounting must not break AI responses.
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

function extractPendingConfirmations(
  executions: readonly AiToolExecution[] | undefined,
): ConfirmationRequiredPayload[] {
  if (!executions?.length) return [];
  const out: ConfirmationRequiredPayload[] = [];
  for (const execution of executions) {
    if (execution.status !== "pending_confirmation") continue;
    const meta = execution.metadata ?? {};
    const output = execution.output ?? {};
    const confirmationId =
      (typeof meta.confirmationId === "string" && meta.confirmationId) ||
      (typeof output.confirmationId === "string" && output.confirmationId) ||
      "";
    if (!confirmationId) continue;
    const expiresAt =
      (typeof meta.expiresAt === "string" && meta.expiresAt) ||
      (typeof output.expiresAt === "string" && output.expiresAt) ||
      "";
    const action =
      (typeof meta.action === "string" && meta.action) ||
      (typeof output.action === "string" && output.action) ||
      execution.toolId;
    const summary =
      (typeof meta.summary === "string" && meta.summary) ||
      (typeof output.summary === "string" && output.summary) ||
      "Human approval required";
    const riskRaw =
      (typeof meta.riskLevel === "string" && meta.riskLevel) ||
      (typeof output.riskLevel === "string" && output.riskLevel) ||
      "HIGH";
    const riskLevel =
      riskRaw === "LOW" ||
      riskRaw === "MEDIUM" ||
      riskRaw === "HIGH" ||
      riskRaw === "CRITICAL"
        ? riskRaw
        : "HIGH";
    out.push({
      confirmationRequired: true,
      confirmationId,
      expiresAt,
      action,
      summary,
      riskLevel,
      toolId: execution.toolId,
    });
  }
  return out;
}

function mapConfirmationError(error: unknown): AiError {
  if (error instanceof ConfirmationEngineError) {
    return new AiError(
      error.message,
      error.statusCode,
      `AI_CONFIRMATION_${error.reason}`,
    );
  }
  if (error instanceof AiError) return error;
  return new AiError(
    error instanceof Error ? error.message : "Confirmation failed",
    400,
    AI_ERROR_CODES.VALIDATION_ERROR,
  );
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

async function loadPriorConversationHistory(
  conversationId: string | undefined,
  userId: string,
): Promise<AiMemoryMessage[]> {
  if (!conversationId) return [];

  const conversation = await aiRepository.getConversation(
    conversationId,
    userId,
  );
  if (!conversation) {
    throw new AiError("Conversation not found", 404, AI_ERROR_CODES.NOT_FOUND);
  }

  return (conversation.messages ?? []).map((message) => ({
    role: message.role as AiMemoryMessage["role"],
    content: message.content,
  }));
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
    await aiDataPolicyService.assertAIAccess(
      aiDataPolicyService.subjectFrom({
        userId: actor.userId,
        role: actor.role,
      }),
      "ai_surface",
    );

    promptSecurityService.assertSafePrompt(input.message, {
      userId: actor.userId,
      conversationId: input.conversationId ?? null,
      surface: "chat",
    });

    try {
      if (!isAiFoundationOrchestratorEnabled()) {
        return await this.executeChat(input, actor);
      }

      const conversationHistory = await loadPriorConversationHistory(
        input.conversationId,
        actor.userId,
      );

      return await promptOrchestrator.runChat(
        (state) => this.executeChat(input, actor, state),
        {
          userId: actor.userId,
          conversationHistory,
          prompt: input.message,
          mode: input.mode,
          contextHints: {
            surface: "ASSISTANT",
            module: "ai",
            conversationId: input.conversationId ?? null,
            mode: input.mode,
            role: actor.role,
            email: actor.email,
            entityRefs: [],
            permissions: actor.permissions ? [...actor.permissions] : undefined,
            sessionId: actor.sessionId ?? null,
          },
        },
      );
    } catch (error) {
      const budgetErr = mapBudgetBlockedError(error);
      if (budgetErr) throw budgetErr;
      throw error;
    }
  }

  async chatStream(
    input: AiChatRequestInput,
    actor: AiActor,
    handlers: AiChatStreamHandlers = {},
  ): Promise<AiChatResponseDto> {
    await aiDataPolicyService.assertAIAccess(
      aiDataPolicyService.subjectFrom({
        userId: actor.userId,
        role: actor.role,
      }),
      "ai_surface",
    );

    promptSecurityService.assertSafePrompt(input.message, {
      userId: actor.userId,
      conversationId: input.conversationId ?? null,
      surface: "chat_stream",
    });

    try {
      if (!isAiFoundationOrchestratorEnabled()) {
        return await this.executeChatStream(input, actor, handlers);
      }

      const conversationHistory = await loadPriorConversationHistory(
        input.conversationId,
        actor.userId,
      );

      return await promptOrchestrator.runChatStream(
        (state) => this.executeChatStream(input, actor, handlers, state),
        {
          userId: actor.userId,
          conversationHistory,
          prompt: input.message,
          mode: input.mode,
          streaming: true,
          contextHints: {
            surface: "ASSISTANT",
            module: "ai",
            conversationId: input.conversationId ?? null,
            mode: input.mode,
            role: actor.role,
            email: actor.email,
            entityRefs: [],
            permissions: actor.permissions ? [...actor.permissions] : undefined,
            sessionId: actor.sessionId ?? null,
          },
        },
      );
    } catch (error) {
      const budgetErr = mapBudgetBlockedError(error);
      if (budgetErr) throw budgetErr;
      throw error;
    }
  }

  /**
   * Resolve generate params from Foundation providerRequest when present;
   * otherwise use the legacy input + conversation history path.
   */
  private resolveChatGenerateParams(
    input: AiChatRequestInput,
    context: Awaited<ReturnType<typeof prepareChatContext>>,
    pipelineState?: AiRuntimePipelineState<AiChatResponseDto>,
  ): AiGenerateParams {
    const providerRequest = pipelineState?.providerRequest;
    if (providerRequest) {
      return toAiGenerateParams(providerRequest, input.mode);
    }

    return {
      mode: input.mode,
      prompt: input.message,
      history: [
        ...(pipelineState?.providerHistory ?? context.providerHistory),
      ],
    };
  }

  /**
   * Existing non-streaming chat implementation.
   * When pipeline state includes providerRequest, consumes Foundation params.
   */
  private async executeChat(
    input: AiChatRequestInput,
    actor: AiActor,
    pipelineState?: AiRuntimePipelineState<AiChatResponseDto>,
  ): Promise<AiChatResponseDto> {
    const context = await prepareChatContext(input, actor);
    const generateParams = this.resolveChatGenerateParams(
      input,
      context,
      pipelineState,
    );

    const providerId =
      pipelineState?.providerBinding?.providerId ?? aiProvider.name;
    const modelId =
      pipelineState?.providerBinding?.model ??
      resolveProviderModelId(providerId);

    // Pipeline budget stage may already have validated; still enforce for
    // direct (orchestrator-disabled) paths and double-check when enabled.
    const preflight = pipelineState?.budgetValidation
      ? {
          estimatedCostUsd: pipelineState.budgetValidation.estimatedCostUsd,
          estimatedTokens: pipelineState.budgetValidation.estimatedTokens,
        }
      : await enforceAiBudgetBeforeGenerate({
          actor,
          providerId,
          modelId,
          prompt: generateParams.prompt,
          history: generateParams.history,
          conversationId: context.conversationId,
          surface: "chat",
        });

    let generated;
    const started = Date.now();
    try {
      generated = await aiProvider.generate(generateParams);
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
    void recordAiBudgetAfterGenerate({
      actor,
      providerId: generated.provider || providerId,
      modelId,
      prompt: generateParams.prompt,
      history: generateParams.history,
      completionText: generated.content,
      conversationId: context.conversationId,
      surface: "chat",
      preflightEstimatedCostUsd: preflight.estimatedCostUsd,
    });

    return this.finalizeChat({
      actor,
      input,
      context,
      generated,
      toolExecutions: pipelineState?.toolExecutions,
      budgetMetadata: isAiBudgetEnabled()
        ? {
            estimatedCostUsd: preflight.estimatedCostUsd,
            estimatedTokens: preflight.estimatedTokens,
            action: pipelineState?.budgetValidation?.action ?? "ALLOW",
          }
        : undefined,
    });
  }

  /**
   * Existing streaming chat implementation.
   * When pipeline state includes providerRequest, consumes Foundation params.
   */
  private async executeChatStream(
    input: AiChatRequestInput,
    actor: AiActor,
    handlers: AiChatStreamHandlers = {},
    pipelineState?: AiRuntimePipelineState<AiChatResponseDto>,
  ): Promise<AiChatResponseDto> {
    const context = await prepareChatContext(input, actor);
    const generateParams = this.resolveChatGenerateParams(
      input,
      context,
      pipelineState,
    );

    const providerId =
      pipelineState?.providerBinding?.providerId ?? aiProvider.name;
    const modelId =
      pipelineState?.providerBinding?.model ??
      resolveProviderModelId(providerId);

    const preflight = pipelineState?.budgetValidation
      ? {
          estimatedCostUsd: pipelineState.budgetValidation.estimatedCostUsd,
          estimatedTokens: pipelineState.budgetValidation.estimatedTokens,
        }
      : await enforceAiBudgetBeforeGenerate({
          actor,
          providerId,
          modelId,
          prompt: generateParams.prompt,
          history: generateParams.history,
          conversationId: context.conversationId,
          surface: "chat_stream",
        });

    await handlers.onMeta?.({
      conversationId: context.conversationId,
      userMessageId: context.userMessage.id,
      provider: aiProvider.name,
    });

    let generated;
    try {
      generated = aiProvider.generateStream
        ? await aiProvider.generateStream(generateParams, {
            onDelta: handlers.onDelta,
          })
        : await aiProvider.generate(generateParams).then(async (result) => {
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

    void recordAiBudgetAfterGenerate({
      actor,
      providerId: generated.provider || providerId,
      modelId,
      prompt: generateParams.prompt,
      history: generateParams.history,
      completionText: generated.content,
      conversationId: context.conversationId,
      surface: "chat_stream",
      preflightEstimatedCostUsd: preflight.estimatedCostUsd,
    });

    return this.finalizeChat({
      actor,
      input,
      context,
      generated,
      toolExecutions: pipelineState?.toolExecutions,
      budgetMetadata: isAiBudgetEnabled()
        ? {
            estimatedCostUsd: preflight.estimatedCostUsd,
            estimatedTokens: preflight.estimatedTokens,
            action: pipelineState?.budgetValidation?.action ?? "ALLOW",
          }
        : undefined,
    });
  }

  private async finalizeChat(args: {
    actor: AiActor;
    input: AiChatRequestInput;
    context: Awaited<ReturnType<typeof prepareChatContext>>;
    generated: { content: string; provider: string };
    toolExecutions?: readonly AiToolExecution[];
    budgetMetadata?: {
      estimatedCostUsd: number;
      estimatedTokens: number;
      action: string;
    };
  }): Promise<AiChatResponseDto> {
    const { actor, input, context, generated, toolExecutions, budgetMetadata } =
      args;

    const safeContent = promptSecurityService.validateModelOutput(
      generated.content,
      {
        userId: actor.userId,
        conversationId: context.conversationId,
        surface: "model_output",
      },
    );

    const assistantMessage = await aiRepository.addMessage({
      conversationId: context.conversationId,
      role: "ASSISTANT",
      content: safeContent,
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
      metadata: {
        mode: input.mode,
        provider: generated.provider,
        ...(budgetMetadata
          ? {
              budgetEstimatedCostUsd: budgetMetadata.estimatedCostUsd,
              budgetEstimatedTokens: budgetMetadata.estimatedTokens,
              budgetAction: budgetMetadata.action,
            }
          : {}),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    const confirmations = extractPendingConfirmations(toolExecutions);
    const primary = confirmations[0];

    return {
      conversation: toAiConversationDto(fresh!),
      userMessage: toAiMessageDto(context.userMessage),
      assistantMessage: toAiMessageDto(assistantMessage),
      provider: generated.provider,
      ...(primary
        ? {
            confirmationRequired: true as const,
            confirmationId: primary.confirmationId,
            expiresAt: primary.expiresAt,
            action: primary.action,
            summary: primary.summary,
            riskLevel: primary.riskLevel,
            confirmations,
          }
        : {}),
    };
  }

  async approveToolConfirmation(
    confirmationId: string,
    actor: AiActor,
  ): Promise<{
    confirmationId: string;
    status: "approved";
    toolId: string;
    output: Readonly<Record<string, unknown>>;
  }> {
    try {
      const result = await humanConfirmationService.approveConfirmation({
        confirmationId,
        userId: actor.userId,
        sessionId: actor.sessionId ?? null,
        role: actor.role,
        permissions: actor.permissions,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      return {
        confirmationId: result.confirmationId,
        status: "approved",
        toolId: result.toolId,
        output: result.output,
      };
    } catch (error) {
      throw mapConfirmationError(error);
    }
  }

  async rejectToolConfirmation(
    confirmationId: string,
    actor: AiActor,
  ): Promise<{ confirmationId: string; status: "rejected" }> {
    try {
      const result = await humanConfirmationService.rejectConfirmation({
        confirmationId,
        userId: actor.userId,
        sessionId: actor.sessionId ?? null,
        role: actor.role,
        permissions: actor.permissions,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
      return {
        confirmationId: result.confirmationId,
        status: "rejected",
      };
    } catch (error) {
      throw mapConfirmationError(error);
    }
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
    await aiDataPolicyService.assertAIAccess(
      aiDataPolicyService.subjectFrom({
        userId: actor.userId,
        role: actor.role,
      }),
      "document",
    );

    promptSecurityService.assertSafePrompt(input.prompt, {
      userId: actor.userId,
      surface: "document_prompt",
    });

    let content = input.content?.trim() ?? "";

    if (input.generate || !content) {
      const providerId = aiProvider.name;
      const modelId = resolveProviderModelId(providerId);
      const preflight = await enforceAiBudgetBeforeGenerate({
        actor,
        providerId,
        modelId,
        prompt: input.prompt,
        surface: "document",
      });
      try {
        const generated = await aiProvider.generate({
          mode: "DOCUMENT",
          documentType: input.type,
          prompt: input.prompt,
        });
        content = generated.content;
        void recordAiBudgetAfterGenerate({
          actor,
          providerId: generated.provider || providerId,
          modelId,
          prompt: input.prompt,
          completionText: generated.content,
          surface: "document",
          preflightEstimatedCostUsd: preflight.estimatedCostUsd,
        });
      } catch (error) {
        const budgetErr = mapBudgetBlockedError(error);
        if (budgetErr) throw budgetErr;
        throw new AiError(
          error instanceof Error
            ? error.message
            : "AI provider failed to generate a document",
          502,
          AI_ERROR_CODES.PROVIDER_ERROR,
        );
      }
    }

    content = promptSecurityService.validateModelOutput(content, {
      userId: actor.userId,
      surface: "document_output",
    });

    const docScan = promptSecurityService.sanitizeDocumentContent(content, {
      userId: actor.userId,
      surface: "document_persist",
    });
    content = docScan.text;

    // Never persist RESTRICTED credentials/secrets in AI documents.
    content = aiDataPolicyService.sanitizeDocuments(
      content,
      aiDataPolicyService.subjectFrom({
        userId: actor.userId,
        role: "EMPLOYEE",
        permissions: [],
        explicitRestrictedAccess: false,
      }),
    );

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
