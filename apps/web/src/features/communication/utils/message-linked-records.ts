import { ROUTES, invoiceDetailPath, taskDetailPath } from "@/constants/routes";
import {
  DEEP_LINK_PARAMS,
  type DeepLinkSourceModule,
} from "@/features/notifications/utils/notification-deep-link";

export const LINKED_ENTITY_TYPES = [
  "PROJECT",
  "TASK",
  "INVOICE",
  "CLIENT",
  "CALENDAR",
  "FILE",
  "AI_DOCUMENT",
] as const;

export type LinkedEntityType = (typeof LINKED_ENTITY_TYPES)[number];

export type LinkedRecordRef = {
  type: LinkedEntityType;
  id: string;
};

const UUID_RE =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Compact marker stored in message body; stripped from display. */
export const LINK_MARKER_RE = new RegExp(
  `\\[\\[link:(PROJECT|TASK|INVOICE|CLIENT|CALENDAR|FILE|AI_DOCUMENT):(${UUID_RE})\\]\\]`,
  "gi",
);

const DEEP_LINK_URL_RE = new RegExp(
  `(?:^|\\s)(/?(?:projects|tasks|invoices|clients|calendar|file-manager|ai-documents))\\?(?:[^\\s]*?(?:open|event|file|id)=(${UUID_RE})[^\\s]*)`,
  "gi",
);

export function isLinkedEntityType(value: string): value is LinkedEntityType {
  return (LINKED_ENTITY_TYPES as readonly string[]).includes(value);
}

export function encodeLinkMarker(type: LinkedEntityType, id: string): string {
  return `[[link:${type}:${id}]]`;
}

export function encodeLinkMarkers(refs: LinkedRecordRef[]): string {
  if (refs.length === 0) return "";
  return `${refs.map((ref) => encodeLinkMarker(ref.type, ref.id)).join("\n")}\n`;
}

export function stripLinkMarkers(body: string): string {
  return body
    .replace(LINK_MARKER_RE, "")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();
}

export function extractLinkMarkers(body: string): LinkedRecordRef[] {
  const refs: LinkedRecordRef[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(new RegExp(LINK_MARKER_RE.source, "gi"))) {
    const type = (match[1] ?? "").toUpperCase();
    const id = match[2];
    if (!id || !isLinkedEntityType(type)) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ type, id });
  }
  return refs;
}

function typeFromPath(path: string): LinkedEntityType | null {
  const normalized = path.replace(/^\//, "").toLowerCase();
  switch (normalized) {
    case "projects":
      return "PROJECT";
    case "tasks":
      return "TASK";
    case "invoices":
      return "INVOICE";
    case "clients":
      return "CLIENT";
    case "calendar":
      return "CALENDAR";
    case "file-manager":
      return "FILE";
    case "ai-documents":
      return "AI_DOCUMENT";
    default:
      return null;
  }
}

export function extractDeepLinkRefsFromText(body: string): LinkedRecordRef[] {
  const refs: LinkedRecordRef[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(new RegExp(DEEP_LINK_URL_RE.source, "gi"))) {
    const path = match[1] ?? "";
    const id = match[2];
    const type = typeFromPath(path);
    if (!type || !id) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ type, id });
  }
  return refs;
}

export function collectMessageLinkedRecords(input: {
  body: string;
  attachmentFileIds?: Array<string | null | undefined>;
  conversationProjectId?: string | null;
  conversationClientId?: string | null;
}): LinkedRecordRef[] {
  const seen = new Set<string>();
  const refs: LinkedRecordRef[] = [];

  function push(type: LinkedEntityType, id: string | null | undefined) {
    if (!id) return;
    const key = `${type}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ type, id });
  }

  for (const ref of extractLinkMarkers(input.body)) {
    push(ref.type, ref.id);
  }
  for (const ref of extractDeepLinkRefsFromText(input.body)) {
    push(ref.type, ref.id);
  }
  for (const fileId of input.attachmentFileIds ?? []) {
    push("FILE", fileId);
  }
  push("PROJECT", input.conversationProjectId);
  push("CLIENT", input.conversationClientId);

  return refs;
}

export function linkedEntityLabel(type: LinkedEntityType): string {
  switch (type) {
    case "PROJECT":
      return "Project";
    case "TASK":
      return "Task";
    case "INVOICE":
      return "Invoice";
    case "CLIENT":
      return "Client";
    case "CALENDAR":
      return "Calendar";
    case "FILE":
      return "File";
    case "AI_DOCUMENT":
      return "AI Document";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function linkedEntityOpenLabel(type: LinkedEntityType): string {
  return `Open ${linkedEntityLabel(type)}`;
}

function sourceModuleForType(type: LinkedEntityType): DeepLinkSourceModule {
  switch (type) {
    case "PROJECT":
      return "projects";
    case "TASK":
      return "tasks";
    case "INVOICE":
      return "invoices";
    case "CLIENT":
      return "clients";
    case "CALENDAR":
      return "calendar";
    case "FILE":
      return "files";
    case "AI_DOCUMENT":
      return "ai";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function baseRouteForType(type: LinkedEntityType): string {
  switch (type) {
    case "PROJECT":
      return ROUTES.PROJECTS;
    case "TASK":
      return ROUTES.TASKS;
    case "INVOICE":
      return ROUTES.INVOICES;
    case "CLIENT":
      return ROUTES.CLIENTS;
    case "CALENDAR":
      return ROUTES.CALENDAR;
    case "FILE":
      return ROUTES.FILES;
    case "AI_DOCUMENT":
      return ROUTES.AI_DOCUMENTS;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/**
 * Deep link that opens the exact ERP record (never a bare list).
 */
export function buildLinkedRecordDeepLink(
  type: LinkedEntityType,
  entityId: string,
  options?: { messageId?: string },
): string {
  const params = new URLSearchParams({
    [DEEP_LINK_PARAMS.FROM]: "messages",
    [DEEP_LINK_PARAMS.ACTION]: "view",
    [DEEP_LINK_PARAMS.HIGHLIGHT]: "1",
    [DEEP_LINK_PARAMS.SOURCE]: sourceModuleForType(type),
  });
  if (options?.messageId) {
    params.set("mid", options.messageId);
  }

  if (type === "TASK") {
    return `${taskDetailPath(entityId)}?${params.toString()}`;
  }
  if (type === "INVOICE") {
    return `${invoiceDetailPath(entityId)}?${params.toString()}`;
  }

  params.set(DEEP_LINK_PARAMS.OPEN, entityId);

  const base = baseRouteForType(type);
  if (base === ROUTES.CALENDAR) params.set("event", entityId);
  if (base === ROUTES.AI_DOCUMENTS) params.set("id", entityId);

  if (base === ROUTES.FILES || base === ROUTES.FILE_MANAGER) {
    return `${ROUTES.FILES}/${entityId}?${params.toString()}`;
  }

  return `${base}?${params.toString()}`;
}

export function formatLinkedStatus(value?: string | null): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
