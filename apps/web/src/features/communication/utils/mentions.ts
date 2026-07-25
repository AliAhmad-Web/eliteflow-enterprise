/** Markdown-style mention tag used by the API mention extractor. */
export const MENTION_TAGGED_RE = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/gi;
export const MENTION_UUID_RE =
  /@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
/** Display mentions like @Alex or @AlexSmith (letters only after @). */
export const MENTION_DISPLAY_RE = /@([A-Za-z][A-Za-z0-9._-]{0,63})/g;

export type ParsedMention =
  | { kind: "tagged"; raw: string; label: string; userId: string; index: number }
  | { kind: "uuid"; raw: string; userId: string; index: number }
  | { kind: "display"; raw: string; label: string; index: number };

/**
 * Build a human mention token shown in the composer and messages.
 * Prefer first name; fall back to first+last when needed for uniqueness.
 */
export function formatMentionLabel(
  user: { id: string; firstName: string; lastName: string },
  peers: Array<{ id: string; firstName: string; lastName: string }> = [],
): string {
  const first = (user.firstName || "User").replace(/\s+/g, "");
  const sameFirst = peers.filter(
    (peer) =>
      peer.id !== user.id &&
      peer.firstName.replace(/\s+/g, "").toLowerCase() === first.toLowerCase(),
  );
  if (sameFirst.length === 0) return first;
  const last = (user.lastName || "").replace(/\s+/g, "");
  return `${first}${last}`;
}

/** Encode mention for storage so the API can extract the user id from body. */
export function encodeMentionTag(label: string, userId: string): string {
  return `@[${label}](${userId})`;
}

/** Convert stored mention tags to readable @Label for display / editing. */
export function displayifyMentions(body: string): string {
  return body
    .replace(MENTION_TAGGED_RE, (_full, label: string) => `@${label}`)
    .replace(MENTION_UUID_RE, "@someone");
}

/**
 * Replace display `@Label` tokens with `@[Label](uuid)` for known members
 * so the API mention extractor can notify the right users.
 */
export function encodeDisplayMentionsForStorage(
  body: string,
  members: Array<{ id: string; firstName: string; lastName: string }>,
): string {
  if (!body || members.length === 0) return body;

  const labels = members
    .map((member) => ({
      id: member.id,
      label: formatMentionLabel(member, members),
    }))
    .sort((a, b) => b.label.length - a.label.length);

  let result = body;
  for (const { id, label } of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|\\s)@${escaped}(?=$|\\s|[.,!?;:])`, "g");
    result = result.replace(re, (_full, prefix: string) => {
      return `${prefix}${encodeMentionTag(label, id)}`;
    });
  }
  return result;
}

export function extractMentionUserIdsFromBody(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(new RegExp(MENTION_TAGGED_RE.source, "gi"))) {
    if (match[2]) ids.add(match[2]);
  }
  for (const match of body.matchAll(new RegExp(MENTION_UUID_RE.source, "gi"))) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

export type InlineSegment =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; label: string; userId?: string }
  | { type: "quote"; value: string }
  | { type: "url"; value: string; href: string };

/**
 * Split a plain (non-code) text chunk into text / mention / url segments.
 */
export function splitInlineRichText(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern =
    /@\[([^\]]+)\]\(([0-9a-f-]{36})\)|@(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})|@([A-Za-z][A-Za-z0-9._-]{0,63})|(https?:\/\/[^\s<>"'`)\]]+)/gi;

  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", value: text.slice(last, match.index) });
    }

    const full = match[0];
    if (full.startsWith("@[")) {
      segments.push({
        type: "mention",
        value: full,
        label: match[1] ?? "someone",
        userId: match[2],
      });
    } else if (/^@[0-9a-f-]{36}$/i.test(full)) {
      segments.push({
        type: "mention",
        value: full,
        label: "someone",
        userId: full.slice(1),
      });
    } else if (full.startsWith("@")) {
      segments.push({
        type: "mention",
        value: full,
        label: match[3] ?? full.slice(1),
      });
    } else {
      const cleaned = full.replace(/[.,;:!?)]+$/, "");
      segments.push({ type: "url", value: cleaned, href: cleaned });
      const trailing = full.slice(cleaned.length);
      if (trailing) segments.push({ type: "text", value: trailing });
    }

    last = match.index + full.length;
  }

  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

export function buildQuoteBlock(body: string, author?: string): string {
  const cleaned = displayifyMentions(body)
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const header = author ? `> — ${author}\n` : "";
  return `${header}${cleaned}\n\n`;
}

export function countReplies(
  messages: Array<{ id: string; parentId?: string | null }>,
  messageId: string,
): number {
  return messages.filter((msg) => msg.parentId === messageId).length;
}

export function getThreadMessages<T extends { id: string; parentId?: string | null }>(
  messages: T[],
  rootId: string,
): T[] {
  return messages.filter(
    (msg) => msg.id === rootId || msg.parentId === rootId,
  );
}
