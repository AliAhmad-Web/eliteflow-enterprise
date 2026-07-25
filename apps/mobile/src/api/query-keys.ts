export const queryKeys = {
  me: ["auth", "me"] as const,
  analytics: ["reports", "analytics"] as const,

  clients: {
    all: ["clients"] as const,
    lists: () => ["clients", "list"] as const,
    list: (filters: Record<string, unknown>) =>
      ["clients", "list", filters] as const,
    details: () => ["clients", "detail"] as const,
    detail: (id: string) => ["clients", "detail", id] as const,
    stats: ["clients", "stats"] as const,
  },

  projects: {
    all: ["projects"] as const,
    lists: () => ["projects", "list"] as const,
    list: (filters: Record<string, unknown>) =>
      ["projects", "list", filters] as const,
    details: () => ["projects", "detail"] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
    stats: ["projects", "stats"] as const,
  },

  tasks: {
    all: ["tasks"] as const,
    lists: () => ["tasks", "list"] as const,
    list: (filters: Record<string, unknown>) =>
      ["tasks", "list", filters] as const,
    details: () => ["tasks", "detail"] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
    stats: ["tasks", "stats"] as const,
    activity: (id: string) => ["tasks", "activity", id] as const,
    assignees: ["tasks", "assignees"] as const,
    projects: ["tasks", "projects"] as const,
  },

  calendar: {
    all: ["calendar"] as const,
    events: (filters: Record<string, unknown>) =>
      ["calendar", "events", filters] as const,
    upcoming: ["calendar", "upcoming"] as const,
    event: (id: string) => ["calendar", "event", id] as const,
  },

  ai: {
    all: ["ai"] as const,
    conversations: (filters: Record<string, unknown> = {}) =>
      ["ai", "conversations", filters] as const,
    conversation: (id: string) => ["ai", "conversation", id] as const,
    documents: (filters: Record<string, unknown> = {}) =>
      ["ai", "documents", filters] as const,
    document: (id: string) => ["ai", "document", id] as const,
  },

  communication: {
    all: ["communication"] as const,
    conversations: (filters: Record<string, unknown> = {}) =>
      ["communication", "conversations", filters] as const,
    channels: (filters: Record<string, unknown> = {}) =>
      ["communication", "channels", filters] as const,
    messages: (id: string, page = 1) =>
      ["communication", "messages", id, page] as const,
    announcements: ["communication", "announcements"] as const,
    threads: ["communication", "threads"] as const,
    meetings: ["communication", "meetings"] as const,
    activities: ["communication", "activities"] as const,
  },

  files: {
    all: ["files"] as const,
    folders: (parentId: string) => ["files", "folders", parentId] as const,
    list: (filters: Record<string, unknown>) =>
      ["files", "list", filters] as const,
    detail: (id: string) => ["files", "detail", id] as const,
  },

  // Legacy aliases used by M1 dashboard
  projectStats: ["projects", "stats"] as const,
  taskStats: ["tasks", "stats"] as const,
  upcomingEvents: ["calendar", "upcoming"] as const,
  notifications: (page = 1) => ["notifications", "list", page] as const,
  unreadCount: ["notifications", "unread-count"] as const,

  search: (q: string) => ["search", "global", q] as const,
};
