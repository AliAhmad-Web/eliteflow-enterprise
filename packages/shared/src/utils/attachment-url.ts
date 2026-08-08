import { FILES_API_PREFIX } from "../constants/auth.constants.js";

/** Schemes that must never be accepted as attachment URLs (F-15). */
export const FORBIDDEN_ATTACHMENT_URL_SCHEMES = [
  "data:",
  "javascript:",
  "vbscript:",
  "file:",
  "blob:",
] as const;

const UUID_RE =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const INTERNAL_FILE_PATH_RE = new RegExp(
  `(?:^|/)${FILES_API_PREFIX.replace(/\//g, "\\/")}/(${UUID_RE})/(download|preview)(?:[/?#]|$)`,
  "i",
);

export function hasForbiddenAttachmentUrlScheme(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return FORBIDDEN_ATTACHMENT_URL_SCHEMES.some((scheme) =>
    trimmed.startsWith(scheme),
  );
}

/**
 * Extract ManagedFile id from an internal File Manager URL.
 * Accepts absolute or path-absolute URLs ending in /download or /preview.
 */
export function parseInternalManagedFileId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed || hasForbiddenAttachmentUrlScheme(trimmed)) {
    return null;
  }

  try {
    // Absolute URL
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      const match = `${parsed.pathname}${parsed.search}`.match(
        INTERNAL_FILE_PATH_RE,
      );
      return match?.[1]?.toLowerCase() ?? null;
    }
  } catch {
    return null;
  }

  // Relative / path-absolute
  const match = trimmed.match(INTERNAL_FILE_PATH_RE);
  return match?.[1]?.toLowerCase() ?? null;
}

/** Canonical internal download URL path (no origin). */
export function buildInternalManagedFileDownloadPath(fileId: string): string {
  return `${FILES_API_PREFIX}/${fileId}/download`;
}

/**
 * Lightweight Zod-friendly check: not a forbidden scheme.
 * Full attachability (ACL / managed file) is enforced server-side.
 */
export function isAttachmentUrlSchemeAllowed(value: string): boolean {
  if (!value.trim()) return false;
  return !hasForbiddenAttachmentUrlScheme(value);
}
