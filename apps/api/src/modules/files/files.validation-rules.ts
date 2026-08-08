import type { FileCategory } from "@enterprise/database";

import { isApiSecurityUploadHardeningEnabled } from "../../config/security-flags.js";
import {
  isZipContainerExtension,
  validateArchiveUpload,
} from "./files.archive-validation.js";
import { FilesError, FILES_ERROR_CODES } from "./files.errors.js";
import {
  assertSafeUploadFileName,
  canonicalizeDisplayFileName,
} from "./files.filename.js";
import {
  assertMimeMatchesExtension,
  detectServerMimeType,
} from "./files.mime-detect.js";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "txt",
  "md",
  "csv",
  "mp4",
  "webm",
  "mp3",
  "wav",
  "ogg",
]);

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/markdown",
  "text/csv",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
]);

export function getMaxUploadBytes(): number {
  const raw = process.env.FILE_MAX_SIZE_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_BYTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
}

const DEFAULT_MAX_UPLOAD_FILES = 20;

/** Max files per multipart request (env: FILE_MAX_UPLOAD_FILES). */
export function getMaxUploadFileCount(): number {
  const raw = process.env.FILE_MAX_UPLOAD_FILES?.trim();
  if (!raw) return DEFAULT_MAX_UPLOAD_FILES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(Math.floor(parsed), 50)
    : DEFAULT_MAX_UPLOAD_FILES;
}

/**
 * Early multer gate (F-12): reject clearly invalid extension / declared MIME
 * before the body is fully buffered to disk. Authoritative checks still run later.
 */
export function assertEarlyUploadAcceptance(input: {
  originalName: string;
  mimeType?: string;
}): void {
  assertSafeUploadFileName(input.originalName);

  const extension = getExtension(input.originalName);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new FilesError(
      `File extension .${extension || "unknown"} is not allowed`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  const mime = (input.mimeType ?? "").trim().toLowerCase();
  // Generic / empty client MIME is allowed — server detection is authoritative.
  if (
    mime &&
    mime !== "application/octet-stream" &&
    mime !== "binary/octet-stream" &&
    !ALLOWED_MIME_TYPES.has(mime)
  ) {
    throw new FilesError(
      `MIME type ${input.mimeType} is not allowed`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }
}

export function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

export function categorizeFile(
  extension: string,
  mimeType: string,
): FileCategory {
  if (
    mimeType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)
  ) {
    return "IMAGE";
  }
  if (mimeType === "application/pdf" || extension === "pdf") return "PDF";
  if (["doc", "docx"].includes(extension) || mimeType.includes("word")) {
    return "DOCUMENT";
  }
  if (["xls", "xlsx", "csv"].includes(extension) || mimeType.includes("sheet")) {
    return "SPREADSHEET";
  }
  if (["ppt", "pptx"].includes(extension) || mimeType.includes("presentation")) {
    return "PRESENTATION";
  }
  if (extension === "zip" || mimeType.includes("zip")) return "ARCHIVE";
  if (
    mimeType.startsWith("text/") ||
    ["txt", "md"].includes(extension)
  ) {
    return "TEXT";
  }
  if (mimeType.startsWith("video/") || ["mp4", "webm"].includes(extension)) {
    return "VIDEO";
  }
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(extension)) {
    return "AUDIO";
  }
  return "OTHER";
}

export function isPreviewable(
  category: FileCategory,
  extension?: string,
): boolean {
  // FS-08: SVG must not be treated as an inline-previewable image.
  if (extension?.toLowerCase() === "svg") {
    return false;
  }

  return (
    category === "IMAGE" ||
    category === "PDF" ||
    category === "TEXT" ||
    category === "VIDEO" ||
    category === "AUDIO"
  );
}

/**
 * Validate an upload using server-detected MIME as the authoritative type.
 * Client-supplied `mimeType` (if provided) is informational only and ignored.
 */
export async function validateUploadFile(input: {
  originalName: string;
  /** Client multipart MIME — ignored for authorization decisions. */
  mimeType?: string;
  sizeBytes: number;
  buffer?: Buffer;
}): Promise<{
  extension: string;
  category: FileCategory;
  mimeType: string;
  /** Canonical display name for persistence (F-09). */
  displayName: string;
}> {
  assertSafeUploadFileName(input.originalName);

  const extension = getExtension(input.originalName);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new FilesError(
      `File extension .${extension || "unknown"} is not allowed`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  const maxBytes = getMaxUploadBytes();
  if (input.sizeBytes <= 0 || input.sizeBytes > maxBytes) {
    throw new FilesError(
      `File exceeds maximum size of ${Math.round(maxBytes / (1024 * 1024))}MB`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  if (!input.buffer || input.buffer.length === 0) {
    throw new FilesError(
      "Unable to determine file type from empty content",
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  const detectedMime = await detectServerMimeType(input.buffer, extension);

  if (!ALLOWED_MIME_TYPES.has(detectedMime)) {
    throw new FilesError(
      `MIME type ${detectedMime} is not allowed`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  // Detected MIME must match the allowlisted extension mapping.
  assertMimeMatchesExtension(extension, detectedMime);

  validateMagicBytes(input.buffer, extension, detectedMime);

  // ZIP / OOXML: inspect central directory before storage (F-04).
  if (isZipContainerExtension(extension)) {
    validateArchiveUpload(input.buffer, extension);
  }

  // SVG can carry script payloads — reject embedded script / event handlers.
  if (extension === "svg") {
    const svgText = input.buffer.toString("utf8").slice(0, 64_000);
    if (/<script[\s>]|on\w+\s*=/i.test(svgText)) {
      throw new FilesError(
        "SVG file contains potentially unsafe content",
        400,
        FILES_ERROR_CODES.VALIDATION,
      );
    }

    if (isApiSecurityUploadHardeningEnabled()) {
      // Harden: block common SVG XSS vectors beyond script/on*.
      if (
        /javascript\s*:/i.test(svgText) ||
        /<foreignObject[\s>]/i.test(svgText) ||
        /<iframe[\s>]/i.test(svgText) ||
        /xlink:href\s*=\s*["']?\s*data:/i.test(svgText) ||
        /href\s*=\s*["']?\s*data:text\/html/i.test(svgText) ||
        /<animate[\s>]/i.test(svgText)
      ) {
        throw new FilesError(
          "SVG file contains potentially unsafe content",
          400,
          FILES_ERROR_CODES.VALIDATION,
        );
      }
    }
  }

  return {
    extension,
    mimeType: detectedMime,
    category: categorizeFile(extension, detectedMime),
    displayName: canonicalizeDisplayFileName(input.originalName, extension),
  };
}

/**
 * Magic-byte (file signature) checks to prevent MIME/extension spoofing (F-07).
 * Text-only formats (txt/md/csv/svg) have no fixed magic bytes.
 */
function validateMagicBytes(
  buffer: Buffer,
  extension: string,
  mimeType: string,
): void {
  const mismatch = (detail?: string) => {
    throw new FilesError(
      detail ??
        `File content does not match declared type (${mimeType})`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  };

  // Pure text formats — no fixed magic bytes
  if (["txt", "md", "csv", "svg"].includes(extension)) {
    return;
  }

  // Legacy OLE Compound Document (doc/xls/ppt)
  if (["doc", "xls", "ppt"].includes(extension)) {
    const ole = [0xd0, 0xcf, 0x11, 0xe0];
    if (!matchesSignature(buffer, [ole])) {
      mismatch("File content does not match declared Office document type");
    }
    return;
  }

  if (extension === "webp") {
    // RIFF....WEBP
    if (
      buffer.length < 12 ||
      buffer[0] !== 0x52 ||
      buffer[1] !== 0x49 ||
      buffer[2] !== 0x46 ||
      buffer[3] !== 0x46 ||
      buffer[8] !== 0x57 ||
      buffer[9] !== 0x45 ||
      buffer[10] !== 0x42 ||
      buffer[11] !== 0x50
    ) {
      mismatch("File content does not match WEBP signature");
    }
    return;
  }

  if (extension === "wav") {
    // RIFF....WAVE
    if (
      buffer.length < 12 ||
      buffer[0] !== 0x52 ||
      buffer[1] !== 0x49 ||
      buffer[2] !== 0x46 ||
      buffer[3] !== 0x46 ||
      buffer[8] !== 0x57 ||
      buffer[9] !== 0x41 ||
      buffer[10] !== 0x56 ||
      buffer[11] !== 0x45
    ) {
      mismatch("File content does not match WAV signature");
    }
    return;
  }

  if (extension === "gif") {
    // GIF87a or GIF89a
    if (buffer.length < 6) {
      mismatch("File content does not match GIF signature");
    }
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header !== "GIF87a" && header !== "GIF89a") {
      mismatch("File content does not match GIF signature");
    }
    return;
  }

  if (extension === "png") {
    // 89 50 4E 47 0D 0A 1A 0A
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (!matchesSignature(buffer, [png])) {
      mismatch("File content does not match PNG signature");
    }
    return;
  }

  if (extension === "jpg" || extension === "jpeg") {
    if (
      buffer.length < 3 ||
      buffer[0] !== 0xff ||
      buffer[1] !== 0xd8 ||
      buffer[2] !== 0xff
    ) {
      mismatch("File content does not match JPEG signature");
    }
    return;
  }

  if (extension === "pdf") {
    // Optional UTF-8 BOM + leading whitespace, then %PDF
    let offset = 0;
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf
    ) {
      offset = 3;
    }
    while (
      offset < buffer.length &&
      offset < 32 &&
      (buffer[offset] === 0x20 ||
        buffer[offset] === 0x09 ||
        buffer[offset] === 0x0d ||
        buffer[offset] === 0x0a)
    ) {
      offset += 1;
    }
    if (
      offset + 4 > buffer.length ||
      buffer[offset] !== 0x25 ||
      buffer[offset + 1] !== 0x50 ||
      buffer[offset + 2] !== 0x44 ||
      buffer[offset + 3] !== 0x46
    ) {
      mismatch("File content does not match PDF signature");
    }
    return;
  }

  if (extension === "mp3") {
    if (buffer.length < 3) {
      mismatch("File content does not match declared audio type");
    }
    const isId3 =
      buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
    const second = buffer[1] ?? 0;
    const isFrame = buffer[0] === 0xff && (second & 0xe0) === 0xe0;
    if (!isId3 && !isFrame) {
      mismatch("File content does not match declared audio type");
    }
    return;
  }

  if (extension === "mp4") {
    // ISO BMFF: bytes 4..7 are "ftyp"
    const ftyp =
      buffer.length >= 8 &&
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70;
    if (!ftyp) {
      mismatch("File content does not match declared video type");
    }
    return;
  }

  if (extension === "ogg") {
    if (!matchesSignature(buffer, [[0x4f, 0x67, 0x67, 0x53]])) {
      mismatch("File content does not match OGG signature");
    }
    return;
  }

  if (extension === "webm") {
    // EBML header
    if (!matchesSignature(buffer, [[0x1a, 0x45, 0xdf, 0xa3]])) {
      mismatch("File content does not match WebM signature");
    }
    return;
  }

  if (["zip", "docx", "xlsx", "pptx"].includes(extension)) {
    const zipLocal = [0x50, 0x4b, 0x03, 0x04];
    const zipEmpty = [0x50, 0x4b, 0x05, 0x06];
    if (!matchesSignature(buffer, [zipLocal, zipEmpty])) {
      mismatch("File content does not match ZIP/Office container signature");
    }
    return;
  }
}

function matchesSignature(buffer: Buffer, signatures: number[][]): boolean {
  return signatures.some((sig) =>
    sig.every((byte, index) => buffer[index] === byte),
  );
}

export function uniqueFileName(desired: string, existingNames: string[]): string {
  if (!existingNames.includes(desired)) return desired;

  const dot = desired.lastIndexOf(".");
  const base = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : "";
  let index = 1;
  while (existingNames.includes(`${base} (${index})${ext}`)) {
    index += 1;
  }
  return `${base} (${index})${ext}`;
}
