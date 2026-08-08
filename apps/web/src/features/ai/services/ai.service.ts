import {
  AI_API_PREFIX,
  type AiChatRequestInput,
  type AiChatResponseDto,
  type AiConversation,
  type AiConversationListResponse,
  type AiDocument,
  type AiDocumentListResponse,
  type CreateAiDocumentInput,
  type ListAiConversationsQueryInput,
  type ListAiDocumentsQueryInput,
  type UpdateAiDocumentInput,
} from "@enterprise/shared";

import { authenticatedFetch, apiRequest } from "@/services/api/api-client";
import { ApiClientError } from "@/services/api/api-error";

function toConversationQuery(query: ListAiConversationsQueryInput): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function toDocumentQuery(query: ListAiDocumentsQueryInput): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.type) params.set("type", query.type);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export interface AiChatStreamHandlers {
  onMeta?: (meta: {
    conversationId: string;
    userMessageId: string;
    provider: string;
  }) => void;
  onDelta?: (chunk: string) => void;
  /** Optional abort signal for stop-generation (Phase 2 stream controls). */
  signal?: AbortSignal;
}

async function chatStream(
  input: AiChatRequestInput,
  handlers: AiChatStreamHandlers = {},
): Promise<AiChatResponseDto> {
  const response = await authenticatedFetch(`${AI_API_PREFIX}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(input),
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    let message = "AI stream request failed";
    let code = "AI_PROVIDER_ERROR";
    try {
      const body = (await response.json()) as {
        message?: string;
        code?: string;
      };
      message = body.message ?? message;
      code = body.code ?? code;
    } catch {
      // ignore parse errors
    }
    throw new ApiClientError(message, code, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: AiChatResponseDto | null = null;
  let streamError: ApiClientError | null = null;
  const processBlock = (block: string) => {
    const lines = block.split("\n");
    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) return;
    const raw = dataLines.join("\n");
    if (!raw) return;

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (eventName === "meta") {
      handlers.onMeta?.(
        payload as {
          conversationId: string;
          userMessageId: string;
          provider: string;
        },
      );
      return;
    }

    if (eventName === "delta") {
      const chunk = (payload as { chunk?: string }).chunk;
      if (chunk) handlers.onDelta?.(chunk);
      return;
    }

    if (eventName === "done") {
      finalResult = payload as AiChatResponseDto;
      return;
    }

    if (eventName === "error") {
      const errorPayload = payload as {
        message?: string;
        code?: string;
        status?: number;
      };
      streamError = new ApiClientError(
        errorPayload.message ?? "AI stream failed",
        errorPayload.code ?? "AI_PROVIDER_ERROR",
        errorPayload.status ?? 502,
      );
    }
  };

  try {
    while (true) {
      if (handlers.signal?.aborted) {
        throw new ApiClientError(
          "Generation stopped",
          "AI_STREAM_ABORTED",
          499,
        );
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        processBlock(part);
      }
    }
  } catch (error) {
    const aborted =
      handlers.signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError") ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name: string }).name === "AbortError");

    if (aborted) {
      try {
        await reader.cancel();
      } catch {
        // ignore cancel errors
      }
      throw new ApiClientError("Generation stopped", "AI_STREAM_ABORTED", 499);
    }
    throw error;
  }

  if (buffer.trim()) {
    processBlock(buffer);
  }

  if (streamError) {
    throw streamError;
  }

  if (!finalResult) {
    throw new ApiClientError(
      "AI stream ended without a final response",
      "AI_PROVIDER_ERROR",
      502,
    );
  }

  return finalResult;
}

export const aiService = {
  listConversations(query: ListAiConversationsQueryInput) {
    return apiRequest<AiConversationListResponse>(
      `${AI_API_PREFIX}/conversations${toConversationQuery(query)}`,
      { auth: true },
    );
  },

  getConversation(id: string) {
    return apiRequest<AiConversation>(
      `${AI_API_PREFIX}/conversations/${id}`,
      { auth: true },
    );
  },

  deleteConversation(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${AI_API_PREFIX}/conversations/${id}`,
      { method: "DELETE", auth: true },
    );
  },

  chat(input: AiChatRequestInput) {
    return apiRequest<AiChatResponseDto>(`${AI_API_PREFIX}/chat`, {
      method: "POST",
      body: input,
      auth: true,
      timeoutMs: 60_000,
    });
  },

  chatStream,

  approveToolConfirmation(confirmationId: string) {
    return apiRequest<{
      confirmationId: string;
      status: "approved";
      toolId: string;
      output?: Record<string, unknown>;
    }>(`${AI_API_PREFIX}/tool-confirmations/${confirmationId}/approve`, {
      method: "POST",
      auth: true,
      timeoutMs: 60_000,
    });
  },

  rejectToolConfirmation(confirmationId: string) {
    return apiRequest<{
      confirmationId: string;
      status: "rejected";
    }>(`${AI_API_PREFIX}/tool-confirmations/${confirmationId}/reject`, {
      method: "POST",
      auth: true,
    });
  },

  listDocuments(query: ListAiDocumentsQueryInput) {
    return apiRequest<AiDocumentListResponse>(
      `${AI_API_PREFIX}/documents${toDocumentQuery(query)}`,
      { auth: true },
    );
  },

  getDocument(id: string) {
    return apiRequest<AiDocument>(`${AI_API_PREFIX}/documents/${id}`, {
      auth: true,
    });
  },

  createDocument(input: CreateAiDocumentInput) {
    return apiRequest<AiDocument>(`${AI_API_PREFIX}/documents`, {
      method: "POST",
      body: input,
      auth: true,
      timeoutMs: 60_000,
    });
  },

  updateDocument(id: string, input: UpdateAiDocumentInput) {
    return apiRequest<AiDocument>(`${AI_API_PREFIX}/documents/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteDocument(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${AI_API_PREFIX}/documents/${id}`,
      { method: "DELETE", auth: true },
    );
  },
};
