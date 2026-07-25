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
} from "@enterprise/shared";

import { apiRequest, authenticatedFetch } from "@/api/api-client";
import { ApiClientError } from "@/api/api-error";
import { toQueryString } from "@/lib/utils";

export interface AiChatStreamHandlers {
  onMeta?: (meta: {
    conversationId: string;
    userMessageId: string;
    provider: string;
  }) => void;
  onDelta?: (chunk: string) => void;
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
  });

  if (!response.ok) {
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
      // ignore
    }
    throw new ApiClientError(message, code, response.status);
  }

  // React Native may not expose ReadableStream — fall back to text parse
  const text = await response.text();
  let finalResult: AiChatResponseDto | null = null;
  let streamError: ApiClientError | null = null;
  let currentEvent = "message";

  const blocks = text.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    let eventName = currentEvent;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
        currentEvent = eventName;
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (!dataLines.length) continue;
    let payload: unknown;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      continue;
    }

    if (eventName === "meta") {
      handlers.onMeta?.(
        payload as {
          conversationId: string;
          userMessageId: string;
          provider: string;
        },
      );
    } else if (eventName === "delta") {
      const chunk = (payload as { chunk?: string }).chunk;
      if (chunk) handlers.onDelta?.(chunk);
    } else if (eventName === "done") {
      finalResult = payload as AiChatResponseDto;
    } else if (eventName === "error") {
      const err = payload as { message?: string; code?: string; status?: number };
      streamError = new ApiClientError(
        err.message ?? "AI stream error",
        err.code ?? "AI_PROVIDER_ERROR",
        err.status ?? 500,
      );
    }
  }

  if (streamError) throw streamError;
  if (!finalResult) {
    // Fallback to non-streaming chat if SSE parse failed
    return apiRequest<AiChatResponseDto>(`${AI_API_PREFIX}/chat`, {
      method: "POST",
      body: input,
      auth: true,
      timeoutMs: 120_000,
    });
  }
  return finalResult;
}

export const aiService = {
  listConversations(query: Partial<ListAiConversationsQueryInput> = {}) {
    return apiRequest<AiConversationListResponse>(
      `${AI_API_PREFIX}/conversations${toQueryString({
        search: query.search,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      })}`,
      { auth: true },
    );
  },

  getConversation(id: string) {
    return apiRequest<AiConversation>(`${AI_API_PREFIX}/conversations/${id}`, {
      auth: true,
    });
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
      timeoutMs: 120_000,
    });
  },

  chatStream,

  listDocuments(query: Partial<ListAiDocumentsQueryInput> = {}) {
    return apiRequest<AiDocumentListResponse>(
      `${AI_API_PREFIX}/documents${toQueryString({
        search: query.search,
        type: query.type,
        page: query.page ?? 1,
        limit: query.limit ?? 10,
      })}`,
      { auth: true },
    );
  },

  createDocument(input: CreateAiDocumentInput) {
    return apiRequest<AiDocument>(`${AI_API_PREFIX}/documents`, {
      method: "POST",
      body: input,
      auth: true,
      timeoutMs: 120_000,
    });
  },

  getDocument(id: string) {
    return apiRequest<AiDocument>(`${AI_API_PREFIX}/documents/${id}`, {
      auth: true,
    });
  },
};

export const AI_SUGGESTED_PROMPTS = [
  {
    label: "Project summary",
    mode: "PROJECT_SUMMARY" as const,
    prompt: "Summarize the current status of my active projects and risks.",
  },
  {
    label: "Task summary",
    mode: "SUMMARIZE" as const,
    prompt: "Summarize my overdue and high-priority tasks for today.",
  },
  {
    label: "Meeting notes",
    mode: "MEETING_NOTES" as const,
    prompt: "Draft structured meeting notes with action items from this agenda:",
  },
  {
    label: "Draft email",
    mode: "EMAIL" as const,
    prompt: "Draft a professional client email about project progress:",
  },
  {
    label: "Proposal",
    mode: "PROPOSAL" as const,
    prompt: "Generate a concise project proposal outline for:",
  },
  {
    label: "Analyze",
    mode: "ANALYZE" as const,
    prompt: "Analyze bottlenecks across projects and suggest next actions.",
  },
];
