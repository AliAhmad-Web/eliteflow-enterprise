import type {
  ListAiConversationsQueryInput,
  ListAiDocumentsQueryInput,
} from "@enterprise/shared";

export const AI_QUERY_KEYS = {
  all: ["ai"] as const,
  conversations: () => [...AI_QUERY_KEYS.all, "conversations"] as const,
  conversationList: (query: ListAiConversationsQueryInput) =>
    [...AI_QUERY_KEYS.conversations(), "list", query] as const,
  conversation: (id: string) =>
    [...AI_QUERY_KEYS.conversations(), "detail", id] as const,
  documents: () => [...AI_QUERY_KEYS.all, "documents"] as const,
  documentList: (query: ListAiDocumentsQueryInput) =>
    [...AI_QUERY_KEYS.documents(), "list", query] as const,
  document: (id: string) => [...AI_QUERY_KEYS.documents(), "detail", id] as const,
};

export const AI_MODE_LABELS = {
  ASK: "Ask",
  EMAIL: "Email",
  PROPOSAL: "Proposal",
  SUMMARIZE: "Summarize",
  ANALYZE: "Analyze",
  IMPROVE: "Improve",
  MEETING_NOTES: "Meeting notes",
  PROJECT_SUMMARY: "Project summary",
  TECHNICAL_DOCS: "Technical docs",
} as const;

export const AI_DOCUMENT_TYPE_LABELS = {
  PROPOSAL: "Proposal",
  EMAIL: "Email",
  MEETING_NOTES: "Meeting notes",
  PROJECT_SUMMARY: "Project summary",
  TECHNICAL_DOCS: "Technical docs",
  GENERAL: "General",
} as const;
