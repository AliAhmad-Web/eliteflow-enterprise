import type {
  Notification,
  NotificationCategoryValue,
  NotificationPriorityValue,
} from "@enterprise/shared";
import {
  Bot,
  Briefcase,
  Calendar,
  FileText,
  FolderKanban,
  type LucideIcon,
  Receipt,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";

import { CATEGORY_LABELS } from "../types/notifications.types";
import { buildEntityDeepLink } from "./notification-deep-link";

export type NotificationSenderKind =
  | "Admin"
  | "Employee"
  | "AI Assistant"
  | "System";

export type RelatedRecordKind =
  | "task"
  | "project"
  | "invoice"
  | "calendar"
  | "file"
  | "ai"
  | "team"
  | "generic"
  | "none";

export interface NotificationMetadataFields {
  project?: string;
  client?: string;
  assignedBy?: string;
  assignedTo?: string;
  dueDate?: string;
  status?: string;
  progress?: number;
  sender?: string;
  senderKind?: NotificationSenderKind;
  description?: string;
  title?: string;
  comments?: Array<{
    id?: string;
    author: string;
    body: string;
    createdAt?: string;
  }>;
  attachments?: Array<{
    id?: string;
    name: string;
    size?: string;
    url?: string;
    mimeType?: string;
  }>;
  timeline?: Array<{
    id?: string;
    label: string;
    at?: string;
    description?: string;
  }>;
}

export interface RelatedRecordSummary {
  kind: RelatedRecordKind;
  icon: LucideIcon;
  title: string;
  description: string;
  status?: string;
  href: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function parseNotificationMetadata(
  metadata: unknown,
): NotificationMetadataFields {
  if (!isRecord(metadata)) return {};

  const commentsRaw = metadata.comments;
  const attachmentsRaw = metadata.attachments;
  const timelineRaw = metadata.timeline ?? metadata.events;

  const comments = Array.isArray(commentsRaw)
    ? commentsRaw
        .map((item) => {
          if (!isRecord(item)) return null;
          const author = asString(item.author) ?? asString(item.user);
          const body = asString(item.body) ?? asString(item.message);
          if (!author || !body) return null;
          return {
            id: asString(item.id),
            author,
            body,
            createdAt: asString(item.createdAt) ?? asString(item.at),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : undefined;

  const attachments = Array.isArray(attachmentsRaw)
    ? attachmentsRaw
        .map((item) => {
          if (!isRecord(item)) return null;
          const name = asString(item.name) ?? asString(item.filename);
          if (!name) return null;
          return {
            id: asString(item.id),
            name,
            size: asString(item.size) ?? asString(item.sizeLabel),
            url: asString(item.url) ?? asString(item.href),
            mimeType: asString(item.mimeType) ?? asString(item.type),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : undefined;

  const timeline = Array.isArray(timelineRaw)
    ? timelineRaw
        .map((item) => {
          if (!isRecord(item)) return null;
          const label = asString(item.label) ?? asString(item.action);
          if (!label) return null;
          return {
            id: asString(item.id),
            label,
            at: asString(item.at) ?? asString(item.createdAt),
            description: asString(item.description) ?? asString(item.detail),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : undefined;

  const senderKindRaw = asString(metadata.senderKind) ?? asString(metadata.senderType);
  const senderKind =
    senderKindRaw === "Admin" ||
    senderKindRaw === "Employee" ||
    senderKindRaw === "AI Assistant" ||
    senderKindRaw === "System"
      ? senderKindRaw
      : undefined;

  return {
    project:
      asString(metadata.project) ??
      asString(metadata.projectName) ??
      asString(metadata.projectTitle),
    client:
      asString(metadata.client) ??
      asString(metadata.clientName) ??
      asString(metadata.company),
    assignedBy:
      asString(metadata.assignedBy) ??
      asString(metadata.assignedByName) ??
      asString(metadata.createdByName),
    assignedTo:
      asString(metadata.assignedTo) ??
      asString(metadata.assignee) ??
      asString(metadata.assigneeName),
    dueDate: asString(metadata.dueDate) ?? asString(metadata.due),
    status: asString(metadata.status),
    progress: asNumber(metadata.progress) ?? asNumber(metadata.percentComplete),
    sender:
      asString(metadata.sender) ??
      asString(metadata.senderName) ??
      asString(metadata.from),
    senderKind,
    description: asString(metadata.description) ?? asString(metadata.summary),
    title: asString(metadata.entityTitle) ?? asString(metadata.recordTitle),
    comments,
    attachments,
    timeline,
  };
}

export function getPriorityLabel(
  priority: NotificationPriorityValue,
): "Urgent" | "High" | "Medium" | "Low" {
  switch (priority) {
    case "URGENT":
      return "Urgent";
    case "HIGH":
      return "High";
    case "NORMAL":
      return "Medium";
    case "LOW":
      return "Low";
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

export function getPriorityBadgeVariant(
  priority: NotificationPriorityValue,
): "destructive" | "warning" | "info" | "secondary" {
  switch (priority) {
    case "URGENT":
      return "destructive";
    case "HIGH":
      return "warning";
    case "NORMAL":
      return "info";
    case "LOW":
      return "secondary";
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

export function getCategoryIcon(
  category: NotificationCategoryValue,
): LucideIcon {
  switch (category) {
    case "TASK":
      return Briefcase;
    case "PROJECT":
      return FolderKanban;
    case "INVOICE":
      return Receipt;
    case "CALENDAR":
      return Calendar;
    case "FILE":
      return FileText;
    case "AI":
      return Sparkles;
    case "TEAM":
      return Users;
    case "SECURITY":
    case "AUTH":
      return Shield;
    case "SYSTEM":
      return Bot;
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export function getCategoryAccentClass(
  category: NotificationCategoryValue,
): string {
  switch (category) {
    case "TASK":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
    case "PROJECT":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "INVOICE":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "CALENDAR":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "FILE":
      return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400";
    case "AI":
      return "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400";
    case "TEAM":
      return "bg-teal-500/15 text-teal-600 dark:text-teal-400";
    case "SECURITY":
    case "AUTH":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    case "SYSTEM":
      return "bg-muted text-muted-foreground";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export function resolveSender(
  notification: Notification,
  meta: NotificationMetadataFields,
): { kind: NotificationSenderKind; label: string } {
  if (meta.senderKind) {
    return { kind: meta.senderKind, label: meta.sender ?? meta.senderKind };
  }

  if (notification.category === "AI") {
    return { kind: "AI Assistant", label: meta.sender ?? "AI Assistant" };
  }

  if (
    notification.category === "SYSTEM" ||
    notification.category === "SECURITY" ||
    notification.category === "AUTH"
  ) {
    return { kind: "System", label: meta.sender ?? "System" };
  }

  if (meta.sender) {
    const looksAdmin = /admin/i.test(meta.sender);
    return {
      kind: looksAdmin ? "Admin" : "Employee",
      label: meta.sender,
    };
  }

  if (notification.createdById) {
    return { kind: "Admin", label: "Admin" };
  }

  return { kind: "System", label: "System" };
}

export function resolveRelatedHref(notification: Notification): string | null {
  return buildEntityDeepLink(notification) ?? notification.linkUrl ?? null;
}

export function buildRelatedRecord(
  notification: Notification,
  meta: NotificationMetadataFields,
): RelatedRecordSummary {
  const href = resolveRelatedHref(notification);
  const entityType = (notification.entityType ?? "").toLowerCase();
  const hasEntity =
    Boolean(notification.entityId) ||
    Boolean(notification.linkUrl) ||
    Boolean(meta.title) ||
    Boolean(meta.project);

  if (!hasEntity && !href) {
    return {
      kind: "none",
      icon: FileText,
      title: "No related record",
      description: "No related record available.",
      href: null,
    };
  }

  const category = notification.category;
  let kind: RelatedRecordKind = "generic";
  let icon = getCategoryIcon(category);
  let title =
    meta.title ??
    meta.project ??
    notification.title;
  let description =
    meta.description ??
    meta.client ??
    notification.body;

  if (category === "TASK" || entityType.includes("task")) {
    kind = "task";
    icon = Briefcase;
    title = meta.title ?? notification.title;
    description =
      meta.description ??
      ([meta.project, meta.assignedTo].filter(Boolean).join(" · ") ||
        notification.body);
  } else if (category === "PROJECT" || entityType.includes("project")) {
    kind = "project";
    icon = FolderKanban;
    title = meta.project ?? meta.title ?? notification.title;
    description =
      meta.description ?? meta.client ?? notification.body;
  } else if (category === "INVOICE" || entityType.includes("invoice")) {
    kind = "invoice";
    icon = Receipt;
    title = meta.title ?? notification.title;
    description =
      meta.description ??
      ([meta.client, meta.dueDate].filter(Boolean).join(" · ") ||
        notification.body);
  } else if (
    category === "CALENDAR" ||
    entityType.includes("calendar") ||
    entityType.includes("event")
  ) {
    kind = "calendar";
    icon = Calendar;
    title = meta.title ?? notification.title;
    description =
      meta.description ?? meta.dueDate ?? notification.body;
  } else if (category === "FILE" || entityType.includes("file")) {
    kind = "file";
    icon = FileText;
    title = meta.title ?? notification.title;
    description = meta.description ?? notification.body;
  } else if (category === "AI") {
    kind = "ai";
    icon = Sparkles;
    title = meta.title ?? notification.title;
    description = meta.description ?? notification.body;
  } else if (category === "TEAM") {
    kind = "team";
    icon = Users;
  }

  return {
    kind,
    icon,
    title,
    description,
    status: meta.status,
    href,
  };
}

export function buildTimelineEvents(
  notification: Notification,
  meta: NotificationMetadataFields,
): Array<{ id: string; label: string; at: string; description?: string }> {
  const events: Array<{
    id: string;
    label: string;
    at: string;
    description?: string;
  }> = [];

  events.push({
    id: "created",
    label: "Created",
    at: notification.createdAt,
    description: `${CATEGORY_LABELS[notification.category]} notification created`,
  });

  if (notification.updatedAt !== notification.createdAt) {
    events.push({
      id: "updated",
      label: "Updated",
      at: notification.updatedAt,
    });
  }

  if (meta.timeline) {
    for (const [index, item] of meta.timeline.entries()) {
      events.push({
        id: item.id ?? `meta-${index}`,
        label: item.label,
        at: item.at ?? notification.createdAt,
        description: item.description,
      });
    }
  }

  if (notification.readAt) {
    events.push({
      id: "read",
      label: "Marked read",
      at: notification.readAt,
    });
  }

  if (notification.archivedAt) {
    events.push({
      id: "archived",
      label: "Archived",
      at: notification.archivedAt,
    });
  }

  const dueLabel = meta.dueDate?.toLowerCase() ?? "";
  if (dueLabel.includes("today") || /due today/i.test(notification.title)) {
    events.push({
      id: "due-today",
      label: "Due Today",
      at: notification.createdAt,
      description: meta.dueDate,
    });
  }

  if (/reminder/i.test(notification.title) || /reminder/i.test(notification.body)) {
    events.push({
      id: "reminder",
      label: "Reminder Sent",
      at: notification.createdAt,
    });
  }

  if (
    meta.status &&
    /complete|done|closed/i.test(meta.status)
  ) {
    events.push({
      id: "completed",
      label: "Completed",
      at: notification.updatedAt,
      description: meta.status,
    });
  }

  return events.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

export function formatDetailTimestamp(iso: string): {
  relative: string;
  absolute: string;
} {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  let relative: string;
  if (minutes < 1) relative = "Just now";
  else if (minutes < 60) {
    relative = minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  } else {
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      relative = hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    } else {
      const days = Math.floor(hours / 24);
      relative = days === 1 ? "Yesterday" : `${days} days ago`;
    }
  }

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const absolute = sameDay
    ? `Today ${timePart}`
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  return { relative, absolute };
}

export function buildShareableNotificationLink(notificationId: string): string {
  if (typeof window === "undefined") {
    return `${ROUTES.NOTIFICATIONS}/${notificationId}`;
  }
  return `${window.location.origin}${ROUTES.NOTIFICATIONS}/${notificationId}`;
}

export function getMetadataRows(
  meta: NotificationMetadataFields,
  priorityLabel: string,
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (meta.project) rows.push({ label: "Project", value: meta.project });
  if (meta.client) rows.push({ label: "Client", value: meta.client });
  if (meta.assignedBy) rows.push({ label: "Assigned By", value: meta.assignedBy });
  if (meta.assignedTo) rows.push({ label: "Assigned To", value: meta.assignedTo });
  if (meta.dueDate) rows.push({ label: "Due Date", value: meta.dueDate });
  rows.push({ label: "Priority", value: priorityLabel });
  if (meta.status) rows.push({ label: "Status", value: meta.status });
  return rows;
}
