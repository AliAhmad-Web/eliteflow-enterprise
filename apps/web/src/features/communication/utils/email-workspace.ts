/**
 * Enterprise AI Email Workspace models & helpers (Task 7.3).
 * Reuses notifications + emailService delivery — no new mail backend.
 */

import type {
  Notification,
  NotificationPriorityValue,
  NotificationQueueDto,
} from "@enterprise/shared";

export const EMAIL_FOLDER_IDS = [
  "inbox",
  "sent",
  "drafts",
  "scheduled",
  "starred",
  "important",
  "archive",
  "spam",
  "trash",
] as const;

export type EmailFolderId = (typeof EMAIL_FOLDER_IDS)[number];

export const EMAIL_FOLDER_LABELS: Record<EmailFolderId, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  scheduled: "Scheduled",
  starred: "Starred",
  important: "Important",
  archive: "Archive",
  spam: "Spam",
  trash: "Trash",
};

export const SHARED_MAILBOX_KEYS = [
  "hr",
  "finance",
  "sales",
  "marketing",
  "support",
  "admin",
  "developers",
] as const;

export type SharedMailboxKey = (typeof SHARED_MAILBOX_KEYS)[number];

export const SHARED_MAILBOX_LABELS: Record<SharedMailboxKey, string> = {
  hr: "HR",
  finance: "Finance",
  sales: "Sales",
  marketing: "Marketing",
  support: "Support",
  admin: "Admin",
  developers: "Developers",
};

export type EmailPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type EmailMailboxOwner =
  | { kind: "self"; userId: string; label: string }
  | { kind: "employee"; userId: string; employeeId: string; label: string }
  | { kind: "shared"; key: SharedMailboxKey; label: string; departmentId?: string };

export interface EmailAttachmentMeta {
  id: string;
  name: string;
  sizeLabel?: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  folder: EmailFolderId;
  mailboxOwnerId: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  preview: string;
  body: string;
  createdAt: string;
  scheduledFor?: string | null;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  priority: EmailPriority;
  hasAttachments: boolean;
  attachments: EmailAttachmentMeta[];
  aiGenerated?: boolean;
  departmentHint?: string | null;
  teamHint?: string | null;
  notificationId?: string | null;
  source: "notification" | "queue" | "local" | "draft";
}

export interface EmailThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  latestAt: string;
  unreadCount: number;
}

export interface EmailSearchFilters {
  query: string;
  subject?: string;
  sender?: string;
  recipient?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachments?: boolean;
  unreadOnly?: boolean;
  priority?: EmailPriority | "ALL";
  department?: string;
  team?: string;
  scheduledOnly?: boolean;
  draftOnly?: boolean;
  aiGeneratedOnly?: boolean;
}

export const DEFAULT_EMAIL_SEARCH_FILTERS: EmailSearchFilters = {
  query: "",
  priority: "ALL",
};

const DRAFT_STORAGE_KEY = "eliteflow.email-workspace.drafts.v1";
const LOCAL_MAIL_STORAGE_KEY = "eliteflow.email-workspace.local.v1";
const STARRED_STORAGE_KEY = "eliteflow.email-workspace.stars.v1";

export function mailboxOwnerKey(owner: EmailMailboxOwner): string {
  switch (owner.kind) {
    case "self":
      return `self:${owner.userId}`;
    case "employee":
      return `employee:${owner.userId}`;
    case "shared":
      return `shared:${owner.key}`;
    default: {
      const _exhaustive: never = owner;
      return _exhaustive;
    }
  }
}

export function mapNotificationPriority(
  priority: NotificationPriorityValue | undefined,
): EmailPriority {
  switch (priority) {
    case "LOW":
      return "LOW";
    case "NORMAL":
      return "NORMAL";
    case "HIGH":
      return "HIGH";
    case "URGENT":
      return "URGENT";
    default:
      return "NORMAL";
  }
}

function previewFromBody(body: string): string {
  return body.replace(/\s+/g, " ").trim().slice(0, 140);
}

function metaRecord(
  metadata: unknown,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

/** Map in-app notifications into workspace email rows (email-capable). */
export function notificationToEmailMessage(
  notification: Notification,
  mailboxOwnerId: string,
): EmailMessage {
  const meta = metaRecord(notification.metadata);
  const fromName =
    typeof meta?.fromName === "string"
      ? meta.fromName
      : typeof meta?.senderName === "string"
        ? meta.senderName
        : "EliteFlow";
  const fromEmail =
    typeof meta?.fromEmail === "string"
      ? meta.fromEmail
      : "notifications@eliteflow.app";
  const to =
    Array.isArray(meta?.to) && meta.to.every((v) => typeof v === "string")
      ? (meta.to as string[])
      : [];
  const cc =
    Array.isArray(meta?.cc) && meta.cc.every((v) => typeof v === "string")
      ? (meta.cc as string[])
      : [];
  const bcc =
    Array.isArray(meta?.bcc) && meta.bcc.every((v) => typeof v === "string")
      ? (meta.bcc as string[])
      : [];
  const threadId =
    typeof meta?.threadId === "string"
      ? meta.threadId
      : `thread:${notification.id}`;
  const folder: EmailFolderId = notification.isArchived
    ? "archive"
    : "inbox";
  const attachmentsRaw = meta?.attachments;
  const attachments: EmailAttachmentMeta[] = Array.isArray(attachmentsRaw)
    ? attachmentsRaw
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object",
        )
        .map((item, index) => ({
          id: typeof item.id === "string" ? item.id : `att-${index}`,
          name:
            typeof item.name === "string" ? item.name : `Attachment ${index + 1}`,
          sizeLabel:
            typeof item.sizeLabel === "string" ? item.sizeLabel : undefined,
        }))
    : [];

  return {
    id: `notif:${notification.id}`,
    threadId,
    folder,
    mailboxOwnerId,
    fromName,
    fromEmail,
    to,
    cc,
    bcc,
    subject: notification.title,
    preview: previewFromBody(notification.body),
    body: notification.body,
    createdAt: notification.createdAt,
    scheduledFor: null,
    isRead: notification.isRead,
    isStarred: Boolean(meta?.starred),
    isImportant:
      notification.priority === "HIGH" || notification.priority === "URGENT",
    priority: mapNotificationPriority(notification.priority),
    hasAttachments: attachments.length > 0 || Boolean(meta?.hasAttachments),
    attachments,
    aiGenerated: Boolean(meta?.aiGenerated),
    departmentHint:
      typeof meta?.department === "string" ? meta.department : null,
    teamHint: typeof meta?.team === "string" ? meta.team : null,
    notificationId: notification.id,
    source: "notification",
  };
}

export function queueItemToEmailMessage(
  item: NotificationQueueDto,
  mailboxOwnerId: string,
): EmailMessage {
  const folder: EmailFolderId =
    item.status === "PENDING" &&
    new Date(item.scheduledFor).getTime() > Date.now()
      ? "scheduled"
      : "sent";
  const subject = item.subject ?? "Queued email";
  const body =
    typeof item.payload === "object" &&
    item.payload &&
    "body" in item.payload &&
    typeof (item.payload as { body?: unknown }).body === "string"
      ? (item.payload as { body: string }).body
      : subject;

  return {
    id: `queue:${item.id}`,
    threadId: `thread:queue:${item.id}`,
    folder,
    mailboxOwnerId,
    fromName: "You",
    fromEmail: "me",
    to: item.toAddress ? [item.toAddress] : [],
    cc: [],
    bcc: [],
    subject,
    preview: previewFromBody(body),
    body,
    createdAt: item.createdAt,
    scheduledFor: item.scheduledFor,
    isRead: true,
    isStarred: false,
    isImportant: false,
    priority: "NORMAL",
    hasAttachments: false,
    attachments: [],
    aiGenerated: false,
    notificationId: item.notificationId,
    source: "queue",
  };
}

export function matchesFolder(
  message: EmailMessage,
  folder: EmailFolderId,
): boolean {
  switch (folder) {
    case "inbox":
      return message.folder === "inbox";
    case "sent":
      return message.folder === "sent";
    case "drafts":
      return message.folder === "drafts";
    case "scheduled":
      return message.folder === "scheduled";
    case "starred":
      return message.isStarred;
    case "important":
      return message.isImportant;
    case "archive":
      return message.folder === "archive";
    case "spam":
      return message.folder === "spam";
    case "trash":
      return message.folder === "trash";
    default: {
      const _exhaustive: never = folder;
      return _exhaustive;
    }
  }
}

export function applyEmailSearch(
  messages: EmailMessage[],
  filters: EmailSearchFilters,
): EmailMessage[] {
  const q = filters.query.trim().toLowerCase();
  const subjectQ = (filters.subject ?? "").trim().toLowerCase();
  const senderQ = (filters.sender ?? "").trim().toLowerCase();
  const recipientQ = (filters.recipient ?? "").trim().toLowerCase();
  const deptQ = (filters.department ?? "").trim().toLowerCase();
  const teamQ = (filters.team ?? "").trim().toLowerCase();

  return messages.filter((message) => {
    if (q) {
      const hay = [
        message.subject,
        message.fromName,
        message.fromEmail,
        message.preview,
        message.body,
        ...message.to,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (subjectQ && !message.subject.toLowerCase().includes(subjectQ)) {
      return false;
    }
    if (
      senderQ &&
      !`${message.fromName} ${message.fromEmail}`.toLowerCase().includes(senderQ)
    ) {
      return false;
    }
    if (
      recipientQ &&
      ![...message.to, ...message.cc, ...message.bcc]
        .join(" ")
        .toLowerCase()
        .includes(recipientQ)
    ) {
      return false;
    }
    if (filters.dateFrom) {
      if (new Date(message.createdAt) < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      if (new Date(message.createdAt) > new Date(filters.dateTo)) return false;
    }
    if (filters.hasAttachments && !message.hasAttachments) return false;
    if (filters.unreadOnly && message.isRead) return false;
    if (
      filters.priority &&
      filters.priority !== "ALL" &&
      message.priority !== filters.priority
    ) {
      return false;
    }
    if (
      deptQ &&
      !(message.departmentHint ?? "").toLowerCase().includes(deptQ)
    ) {
      return false;
    }
    if (teamQ && !(message.teamHint ?? "").toLowerCase().includes(teamQ)) {
      return false;
    }
    if (filters.scheduledOnly && message.folder !== "scheduled") return false;
    if (filters.draftOnly && message.folder !== "drafts") return false;
    if (filters.aiGeneratedOnly && !message.aiGenerated) return false;
    return true;
  });
}

export function groupIntoThreads(messages: EmailMessage[]): EmailThread[] {
  const map = new Map<string, EmailMessage[]>();
  for (const message of messages) {
    const list = map.get(message.threadId) ?? [];
    list.push(message);
    map.set(message.threadId, list);
  }
  const threads: EmailThread[] = [];
  for (const [id, items] of map) {
    const sorted = [...items].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const latest = sorted[sorted.length - 1]!;
    threads.push({
      id,
      subject: latest.subject,
      messages: sorted,
      latestAt: latest.createdAt,
      unreadCount: sorted.filter((m) => !m.isRead).length,
    });
  }
  return threads.sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
  );
}

export interface EmailComposeDraft {
  id: string;
  mailboxOwnerId: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  priority: EmailPriority;
  signature: string;
  templateCode?: string;
  scheduledFor?: string | null;
  updatedAt: string;
  aiGenerated?: boolean;
}

function readJsonArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

export function loadLocalDrafts(mailboxOwnerId: string): EmailComposeDraft[] {
  return readJsonArray<EmailComposeDraft>(DRAFT_STORAGE_KEY).filter(
    (d) => d.mailboxOwnerId === mailboxOwnerId,
  );
}

export function upsertLocalDraft(draft: EmailComposeDraft): void {
  const all = readJsonArray<EmailComposeDraft>(DRAFT_STORAGE_KEY);
  const next = all.filter((d) => d.id !== draft.id);
  next.push(draft);
  writeJsonArray(DRAFT_STORAGE_KEY, next);
}

export function removeLocalDraft(draftId: string): void {
  const all = readJsonArray<EmailComposeDraft>(DRAFT_STORAGE_KEY).filter(
    (d) => d.id !== draftId,
  );
  writeJsonArray(DRAFT_STORAGE_KEY, all);
}

export function loadLocalMessages(mailboxOwnerId: string): EmailMessage[] {
  return readJsonArray<EmailMessage>(LOCAL_MAIL_STORAGE_KEY).filter(
    (m) => m.mailboxOwnerId === mailboxOwnerId,
  );
}

export function upsertLocalMessage(message: EmailMessage): void {
  const all = readJsonArray<EmailMessage>(LOCAL_MAIL_STORAGE_KEY);
  const next = all.filter((m) => m.id !== message.id);
  next.push(message);
  writeJsonArray(LOCAL_MAIL_STORAGE_KEY, next);
}

export function loadStarredIds(): Set<string> {
  return new Set(readJsonArray<string>(STARRED_STORAGE_KEY));
}

export function toggleStarredId(id: string): Set<string> {
  const set = loadStarredIds();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  writeJsonArray(STARRED_STORAGE_KEY, [...set]);
  return set;
}

export function draftToEmailMessage(
  draft: EmailComposeDraft,
): EmailMessage {
  const to = draft.to
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id: `draft:${draft.id}`,
    threadId: `thread:draft:${draft.id}`,
    folder: draft.scheduledFor ? "scheduled" : "drafts",
    mailboxOwnerId: draft.mailboxOwnerId,
    fromName: "You",
    fromEmail: "me",
    to,
    cc: draft.cc
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
    bcc: draft.bcc
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
    subject: draft.subject || "(No subject)",
    preview: previewFromBody(draft.body),
    body: draft.body,
    createdAt: draft.updatedAt,
    scheduledFor: draft.scheduledFor ?? null,
    isRead: true,
    isStarred: false,
    isImportant: draft.priority === "HIGH" || draft.priority === "URGENT",
    priority: draft.priority,
    hasAttachments: false,
    attachments: [],
    aiGenerated: Boolean(draft.aiGenerated),
    source: "draft",
  };
}

export function createEmptyComposeDraft(
  mailboxOwnerId: string,
  signature = "",
): EmailComposeDraft {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}`,
    mailboxOwnerId,
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    priority: "NORMAL",
    signature,
    scheduledFor: null,
    updatedAt: new Date().toISOString(),
  };
}

export function defaultEmailSignature(displayName: string): string {
  return `\n\n—\n${displayName}\nEliteFlow`;
}

export function mergeMailboxMessages(parts: EmailMessage[]): EmailMessage[] {
  const map = new Map<string, EmailMessage>();
  for (const message of parts) {
    map.set(message.id, message);
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
