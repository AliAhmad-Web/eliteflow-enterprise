import { fileTypeFromBuffer } from "file-type";

import { FilesError, FILES_ERROR_CODES } from "./files.errors.js";

/** Canonical MIME values accepted for each allowlisted extension. */
export const MIME_TYPES_BY_EXTENSION: Record<string, readonly string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  svg: ["image/svg+xml"],
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  zip: ["application/zip", "application/x-zip-compressed"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain"],
  csv: ["text/csv", "text/plain"],
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  mp3: ["audio/mpeg"],
  wav: ["audio/wav"],
  ogg: ["audio/ogg"],
};

const TEXT_EXTENSIONS = new Set(["txt", "md", "csv"]);

/**
 * Normalize detector / lib output into allowlist MIME values used by EliteFlow.
 */
export function normalizeDetectedMime(
  mime: string,
  extension: string,
): string {
  const lower = mime.toLowerCase();

  // Legacy OLE Compound File Binary — disambiguate via declared extension only
  // after magic confirmation that content is CFB (never from client MIME).
  if (
    lower === "application/x-cfb" ||
    lower === "application/vnd.ms-office"
  ) {
    if (extension === "doc") return "application/msword";
    if (extension === "xls") return "application/vnd.ms-excel";
    if (extension === "ppt") return "application/vnd.ms-powerpoint";
  }

  if (lower === "audio/wave" || lower === "audio/x-wav") return "audio/wav";
  if (lower === "audio/mp3") return "audio/mpeg";

  return lower;
}

function looksLikeSvg(buffer: Buffer): boolean {
  const head = buffer
    .subarray(0, Math.min(buffer.length, 8192))
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart()
    .replace(/^<\?xml\b[^>]*>\s*/i, "");
  return /^<svg[\s>]/i.test(head);
}

function isLikelyTextContent(buffer: Buffer): boolean {
  if (buffer.length === 0) return false;
  // Binary formats (and most polyglots) contain NUL; plain text should not.
  if (buffer.includes(0)) return false;

  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  let control = 0;
  for (const byte of sample) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d) continue;
    if (byte < 0x20 || byte === 0x7f) control += 1;
  }
  return control / sample.length < 0.05;
}

/**
 * Detect authoritative MIME from file bytes.
 * Client Content-Type / browser MIME are never used.
 */
export async function detectServerMimeType(
  buffer: Buffer,
  extension: string,
): Promise<string> {
  if (!buffer.length) {
    throw new FilesError(
      "Unable to determine file type from empty content",
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  let detectedMime: string | undefined;

  try {
    const result = await fileTypeFromBuffer(buffer);
    if (result?.mime) {
      detectedMime = normalizeDetectedMime(result.mime, extension);
    }
  } catch {
    // Truncated / ambiguous buffers: fall through to text/SVG heuristics.
    detectedMime = undefined;
  }

  if (!detectedMime) {
    if (looksLikeSvg(buffer)) {
      detectedMime = "image/svg+xml";
    } else if (TEXT_EXTENSIONS.has(extension) && isLikelyTextContent(buffer)) {
      // Content verified as text; extension selects among text MIME variants.
      const mapped = MIME_TYPES_BY_EXTENSION[extension];
      detectedMime = mapped?.[0];
    }
  }

  if (!detectedMime) {
    throw new FilesError(
      "Unable to determine file type from content",
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  return detectedMime;
}

export function assertMimeMatchesExtension(
  extension: string,
  mimeType: string,
): void {
  const allowed = MIME_TYPES_BY_EXTENSION[extension];
  if (!allowed) {
    throw new FilesError(
      `File extension .${extension || "unknown"} is not allowed`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }
  if (!allowed.includes(mimeType)) {
    throw new FilesError(
      `Detected MIME type ${mimeType} does not match file extension .${extension}`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }
}
