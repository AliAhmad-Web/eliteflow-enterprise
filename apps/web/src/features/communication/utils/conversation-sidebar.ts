import type { ConversationDto } from "@enterprise/shared";

/** Lightweight last-sender hints filled from opened threads (client-only). */
const lastSenderByConversation = new Map<
  string,
  { senderId: string; senderName: string; preview?: string }
>();

const listeners = new Set<() => void>();

export function setConversationLastSender(
  conversationId: string,
  meta: { senderId: string; senderName: string; preview?: string },
): void {
  lastSenderByConversation.set(conversationId, meta);
  listeners.forEach((l) => l());
}

export function getConversationLastSender(conversationId: string) {
  return lastSenderByConversation.get(conversationId) ?? null;
}

export function subscribeConversationLastSenders(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type ConversationSectionId =
  | "favorites"
  | "direct"
  | "groups"
  | "departments"
  | "clients";

export const CONVERSATION_SECTION_LABELS: Record<ConversationSectionId, string> = {
  favorites: "Favorites",
  direct: "Direct Messages",
  groups: "Groups",
  departments: "Departments",
  clients: "Clients",
};

const SECTION_ORDER: ConversationSectionId[] = [
  "favorites",
  "direct",
  "groups",
  "departments",
  "clients",
];

export function getConversationDisplayName(
  conv: ConversationDto,
  currentUserId?: string,
): string {
  if (conv.name?.trim()) return conv.name.trim();
  if (conv.type === "DIRECT") {
    const other = conv.members?.find((m) => m.userId !== currentUserId);
    if (other?.user) {
      return `${other.user.firstName} ${other.user.lastName}`.trim();
    }
  }
  return conv.type.charAt(0) + conv.type.slice(1).toLowerCase();
}

export function getConversationAvatarUrl(
  conv: ConversationDto,
  currentUserId?: string,
): string | null {
  if (conv.avatarUrl) return conv.avatarUrl;
  if (conv.type === "DIRECT") {
    const other = conv.members?.find((m) => m.userId !== currentUserId);
    return other?.user?.avatarUrl ?? null;
  }
  return null;
}

export function getConversationInitials(
  conv: ConversationDto,
  currentUserId?: string,
): string {
  const name = getConversationDisplayName(conv, currentUserId);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export function isConversationMuted(
  conv: ConversationDto,
  currentUserId?: string,
): boolean {
  if (!currentUserId) return false;
  const me = conv.members?.find((m) => m.userId === currentUserId);
  if (!me?.mutedUntil) return false;
  return new Date(me.mutedUntil).getTime() > Date.now();
}

export function isConversationOnline(
  conv: ConversationDto,
  currentUserId?: string,
  presenceOnlineIds?: Set<string>,
): boolean {
  const others =
    conv.members?.filter((m) => m.userId !== currentUserId) ?? [];
  if (others.length === 0) return false;

  return others.some((m) => {
    if (presenceOnlineIds?.has(m.userId)) return true;
    return m.isOnline === true;
  });
}

export function getPeerUser(
  conv: ConversationDto,
  currentUserId?: string,
) {
  if (conv.type !== "DIRECT") return null;
  return conv.members?.find((m) => m.userId !== currentUserId) ?? null;
}

export function resolveSection(
  conv: ConversationDto,
  isFavorite: boolean,
): ConversationSectionId {
  if (isFavorite) return "favorites";
  switch (conv.type) {
    case "DIRECT":
      return "direct";
    case "DEPARTMENT":
      return "departments";
    case "CLIENT":
      return "clients";
    case "GROUP":
    case "TEAM":
    case "PROJECT":
    case "ORGANIZATION":
      return "groups";
    default: {
      const _exhaustive: never = conv.type;
      return _exhaustive;
    }
  }
}

export function matchesConversationSearch(
  conv: ConversationDto,
  query: string,
  currentUserId?: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const name = getConversationDisplayName(conv, currentUserId).toLowerCase();
  const preview = (conv.lastMessagePreview ?? "").toLowerCase();
  const memberNames =
    conv.members
      ?.map((m) =>
        `${m.user?.firstName ?? ""} ${m.user?.lastName ?? ""} ${m.user?.email ?? ""}`.toLowerCase(),
      )
      .join(" ") ?? "";

  return (
    name.includes(q) ||
    preview.includes(q) ||
    memberNames.includes(q) ||
    conv.type.toLowerCase().includes(q)
  );
}

export function sortConversations(a: ConversationDto, b: ConversationDto): number {
  const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
  const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
  if (bTime !== aTime) return bTime - aTime;
  return a.id.localeCompare(b.id);
}

export type FlatSidebarRow =
  | {
      kind: "header";
      id: string;
      section: ConversationSectionId;
      label: string;
      count: number;
    }
  | {
      kind: "conversation";
      id: string;
      section: ConversationSectionId;
      conversation: ConversationDto;
    };

export function buildGroupedSidebarRows(
  conversations: ConversationDto[],
  isFavorite: (id: string) => boolean,
): FlatSidebarRow[] {
  const buckets: Record<ConversationSectionId, ConversationDto[]> = {
    favorites: [],
    direct: [],
    groups: [],
    departments: [],
    clients: [],
  };

  for (const conv of conversations) {
    const section = resolveSection(conv, isFavorite(conv.id));
    buckets[section].push(conv);
  }

  for (const section of SECTION_ORDER) {
    buckets[section].sort(sortConversations);
  }

  const rows: FlatSidebarRow[] = [];
  for (const section of SECTION_ORDER) {
    const items = buckets[section];
    if (items.length === 0) continue;
    rows.push({
      kind: "header",
      id: `header:${section}`,
      section,
      label: CONVERSATION_SECTION_LABELS[section],
      count: items.length,
    });
    for (const conversation of items) {
      rows.push({
        kind: "conversation",
        id: conversation.id,
        section,
        conversation,
      });
    }
  }

  return rows;
}

export function formatSidebarTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return "Yesterday";

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
