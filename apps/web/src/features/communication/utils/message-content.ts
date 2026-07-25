export type MessageContentPart =
  | { type: "text"; value: string }
  | { type: "code"; value: string; language?: string }
  | { type: "inline-code"; value: string };

const FENCED_CODE_RE = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const URL_RE = /https?:\/\/[^\s<>"'`)\]]+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  const unique: string[] = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?)]+$/, "");
    if (!unique.includes(cleaned)) unique.push(cleaned);
  }
  return unique;
}

export function parseMessageContent(body: string): MessageContentPart[] {
  const parts: MessageContentPart[] = [];
  let lastIndex = 0;
  const fenced = [...body.matchAll(FENCED_CODE_RE)];

  for (const match of fenced) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(...parseInline(body.slice(lastIndex, start)));
    }
    parts.push({
      type: "code",
      language: match[1] || undefined,
      value: (match[2] ?? "").replace(/\n$/, ""),
    });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < body.length) {
    parts.push(...parseInline(body.slice(lastIndex)));
  }

  return parts.length > 0 ? parts : [{ type: "text", value: body }];
}

function parseInline(text: string): MessageContentPart[] {
  const parts: MessageContentPart[] = [];
  let lastIndex = 0;
  const matches = [...text.matchAll(INLINE_CODE_RE)];

  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ type: "inline-code", value: match[1] ?? "" });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

export function isImageAttachment(
  mimeType?: string | null,
  fileName?: string,
): boolean {
  if (mimeType?.startsWith("image/")) return true;
  const name = (fileName ?? "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMessageClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfMsg.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  }
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function isSameCalendarDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const GROUP_WINDOW_MS = 5 * 60_000;

export function shouldGroupWithPrevious(
  current: { senderId: string; createdAt: string },
  previous?: { senderId: string; createdAt: string } | null,
): boolean {
  if (!previous) return false;
  if (previous.senderId !== current.senderId) return false;
  const delta =
    new Date(current.createdAt).getTime() -
    new Date(previous.createdAt).getTime();
  return delta >= 0 && delta <= GROUP_WINDOW_MS;
}

export function getLinkPreviewMeta(url: string): {
  hostname: string;
  title: string;
  favicon: string;
} {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return {
      hostname,
      title: `${hostname}${path}`,
      favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`,
    };
  } catch {
    return { hostname: url, title: url, favicon: "" };
  }
}
