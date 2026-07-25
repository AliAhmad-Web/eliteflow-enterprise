import type { AiConversation, AiDocument, AiMessage } from "@enterprise/database";
import type {
  AiConversationDto,
  AiDocumentDto,
  AiMessageDto,
} from "@enterprise/shared";

type ConversationWithMessages = AiConversation & {
  messages?: AiMessage[];
  _count?: { messages: number };
};

export function toAiMessageDto(message: AiMessage): AiMessageDto {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    mode: message.mode,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toAiConversationDto(
  conversation: ConversationWithMessages,
): AiConversationDto {
  const messages = conversation.messages
    ?.slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const lastUserOrAssistant = messages
    ?.slice()
    .reverse()
    .find((message) => message.role !== "SYSTEM");

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: conversation._count?.messages ?? messages?.length,
    preview: lastUserOrAssistant
      ? lastUserOrAssistant.content.slice(0, 140)
      : null,
    messages: messages?.map(toAiMessageDto),
  };
}

export function toAiDocumentDto(document: AiDocument): AiDocumentDto {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    prompt: document.prompt,
    content: document.content,
    createdById: document.createdById,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export type { ConversationWithMessages };
