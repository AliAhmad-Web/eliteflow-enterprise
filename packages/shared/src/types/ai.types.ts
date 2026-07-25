import type {
  AiConversationDto,
  AiDocumentDto,
  AiMessageDto,
} from "../schemas/ai.schema.js";
import type { PaginatedResponse } from "./api.types.js";

export type AiConversation = AiConversationDto;
export type AiDocument = AiDocumentDto;
export type AiMessage = AiMessageDto;

export type AiConversationListResponse = PaginatedResponse<AiConversation>;
export type AiDocumentListResponse = PaginatedResponse<AiDocument>;
