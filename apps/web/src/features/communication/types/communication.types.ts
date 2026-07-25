import type {
  ActivityEntityTypeValue,
  CommentEntityTypeValue,
  ConversationTypeValue,
  ListActivitiesQueryInput,
  ListAnnouncementsQueryInput,
  ListCommentsQueryInput,
  ListConversationsQueryInput,
  ListDiscussionThreadsQueryInput,
  ListMeetingsQueryInput,
  ListMessagesQueryInput,
  CommunicationSearchQueryInput,
} from "@enterprise/shared";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------
export const COMMUNICATION_QUERY_KEYS = {
  all: ["communication"] as const,

  conversations: () => ["communication", "conversations"] as const,
  conversationsList: (query: ListConversationsQueryInput) =>
    ["communication", "conversations", "list", query] as const,
  conversationsInfinite: () =>
    ["communication", "conversations", "infinite"] as const,
  conversationDetail: (id: string) =>
    ["communication", "conversations", id] as const,

  messages: (conversationId: string) =>
    ["communication", "messages", conversationId] as const,
  messagesInfinite: (conversationId: string, query?: Partial<ListMessagesQueryInput>) =>
    ["communication", "messages", conversationId, "infinite", query ?? {}] as const,
  pinned: (conversationId: string) =>
    ["communication", "pinned", conversationId] as const,

  comments: (query: ListCommentsQueryInput) =>
    ["communication", "comments", query] as const,

  activities: (query: ListActivitiesQueryInput) =>
    ["communication", "activities", query] as const,

  presence: (userIds?: string[]) =>
    ["communication", "presence", ...(userIds ?? [])] as const,

  search: (query: CommunicationSearchQueryInput) =>
    ["communication", "search", query] as const,

  announcements: () => ["communication", "announcements"] as const,
  announcementsList: (query: ListAnnouncementsQueryInput) =>
    ["communication", "announcements", "list", query] as const,
  announcementDetail: (id: string) =>
    ["communication", "announcements", id] as const,

  threads: () => ["communication", "threads"] as const,
  threadsList: (query: ListDiscussionThreadsQueryInput) =>
    ["communication", "threads", "list", query] as const,
  threadDetail: (id: string) => ["communication", "threads", id] as const,

  meetings: () => ["communication", "meetings"] as const,
  meetingsList: (query: ListMeetingsQueryInput) =>
    ["communication", "meetings", "list", query] as const,
  meetingDetail: (id: string) => ["communication", "meetings", id] as const,

  channels: () => ["communication", "channels"] as const,
  channelsList: (query: ListConversationsQueryInput) =>
    ["communication", "channels", "list", query] as const,

  hubAi: () => ["communication", "hubAi"] as const,
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
export const CONVERSATION_TYPE_LABELS: Record<ConversationTypeValue, string> = {
  DIRECT: "Direct Message",
  GROUP: "Group",
  DEPARTMENT: "Department",
  TEAM: "Team",
  PROJECT: "Project",
  CLIENT: "Client",
  ORGANIZATION: "Organization",
};

export const ACTIVITY_ENTITY_TYPE_LABELS: Record<ActivityEntityTypeValue, string> = {
  CLIENT: "Client",
  PROJECT: "Project",
  TASK: "Task",
  INVOICE: "Invoice",
  CALENDAR: "Calendar",
  FILE: "File",
  AI: "AI",
  NOTIFICATION: "Notification",
  TEAM: "Team",
  MESSAGE: "Message",
  COMMENT: "Comment",
  CONVERSATION: "Conversation",
  USER: "User",
  SYSTEM: "System",
  ANNOUNCEMENT: "Announcement",
  MEETING: "Meeting",
  THREAD: "Thread",
};

export const COMMENT_ENTITY_TYPE_LABELS: Record<CommentEntityTypeValue, string> = {
  PROJECT: "Project",
  TASK: "Task",
  INVOICE: "Invoice",
  CLIENT: "Client",
  CALENDAR: "Calendar",
  FILE: "File",
  REPORT: "Report",
  TEAM: "Team",
  AI_DOCUMENT: "AI Document",
};

// ---------------------------------------------------------------------------
// Emoji constants (common subset for picker)
// ---------------------------------------------------------------------------
export const COMMON_EMOJIS = [
  "👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉",
  "🔥", "✅", "❌", "⭐", "💯", "🙏", "👏", "🤔",
  "😊", "😍", "🥳", "😎", "🤣", "😅", "🙌", "💪",
  "🚀", "💡", "📌", "🔔", "💬", "📎", "🗂️", "✏️",
] as const;

export type CommonEmoji = (typeof COMMON_EMOJIS)[number];

// ---------------------------------------------------------------------------
// Relative time helper (shared with notifications pattern)
// ---------------------------------------------------------------------------
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
