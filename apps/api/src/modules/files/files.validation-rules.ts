import type { FileCategory } from "@enterprise/database";

import { isApiSecurityUploadHardeningEnabled } from "../../config/security-flags.js";
import { FilesError, FILES_ERROR_CODES } from "./files.errors.js";

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

export function isPreviewable(category: FileCategory): boolean {
  return (
    category === "IMAGE" ||
    category === "PDF" ||
    category === "TEXT" ||
    category === "VIDEO" ||
    category === "AUDIO"
  );
}

export function validateUploadFile(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer?: Buffer;
}): { extension: string; category: FileCategory } {
  const extension = getExtension(input.originalName);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new FilesError(
      `File extension .${extension || "unknown"} is not allowed`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new FilesError(
      `MIME type ${input.mimeType} is not allowed`,
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

  if (input.buffer && input.buffer.length > 0) {
    validateMagicBytes(input.buffer, extension, input.mimeType);
  }

  // SVG can carry script payloads — reject embedded script / event handlers.
  if (extension === "svg" && input.buffer) {
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

      // Reject double extensions (e.g. file.php.svg)
      if (/\.(php|phtml|asp|aspx|js|exe|sh|bat)(\.|$)/i.test(input.originalName)) {
        throw new FilesError(
          "File name is not allowed",
          400,
          FILES_ERROR_CODES.VALIDATION,
        );
      }
    }
  }

  // When upload hardening is ON, require MIME ↔ extension consistency for images.
  if (isApiSecurityUploadHardeningEnabled()) {
    assertMimeExtensionConsistency(extension, input.mimeType);
  }

  return {
    extension,
    category: categorizeFile(extension, input.mimeType),
  };
}

/**
 * Magic-byte (file signature) checks to prevent MIME/extension spoofing.
 * Text-only formats (txt/md/csv) and some Office/OpenXML zips are lenient.
 */
function validateMagicBytes(
  buffer: Buffer,
  extension: string,
  mimeType: string,
): void {
  const signatures: Record<string, Array<number[]>> = {
    jpg: [[0xff, 0xd8, 0xff]],
    jpeg: [[0xff, 0xd8, 0xff]],
    png: [[0x89, 0x50, 0x4e, 0x47]],
    gif: [[0x47, 0x49, 0x46, 0x38]],
    webp: [[0x52, 0x49, 0x46, 0x46]],
    pdf: [[0x25, 0x50, 0x44, 0x46]],
    zip: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
    docx: [[0x50, 0x4b, 0x03, 0x04]],
    xlsx: [[0x50, 0x4b, 0x03, 0x04]],
    pptx: [[0x50, 0x4b, 0x03, 0x04]],
    mp4: [[0x00, 0x00, 0x00]], // ftyp box offset varies — soft check below
    webm: [[0x1a, 0x45, 0xdf, 0xa3]],
    wav: [[0x52, 0x49, 0x46, 0x46]],
    ogg: [[0x4f, 0x67, 0x67, 0x53]],
  };

  // Pure text formats — no fixed magic bytes
  if (["txt", "md", "csv", "svg"].includes(extension)) {
    return;
  }

  // Legacy OLE Compound Document (doc/xls/ppt)
  if (["doc", "xls", "ppt"].includes(extension)) {
    const ole = [0xd0, 0xcf, 0x11, 0xe0];
    if (!matchesSignature(buffer, [ole])) {
      throw new FilesError(
        "File content does not match declared Office document type",
        400,
        FILES_ERROR_CODES.VALIDATION,
      );
    }
    return;
  }

  if (extension === "mp3") {
    if (buffer.length < 3) {
      throw new FilesError(
        "File content does not match declared audio type",
        400,
        FILES_ERROR_CODES.VALIDATION,
      );
    }
    const isId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
    const second = buffer[1] ?? 0;
    const isFrame = buffer[0] === 0xff && (second & 0xe0) === 0xe0;
    if (!isId3 && !isFrame) {
      throw new FilesError(
        "File content does not match declared audio type",
        400,
        FILES_ERROR_CODES.VALIDATION,
      );
    }
    return;
  }

  if (extension === "mp4") {
    // ISO BMFF: bytes 4..7 often "ftyp"
    const ftyp =
      buffer.length >= 8 &&
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70;
    if (!ftyp) {
      throw new FilesError(
        "File content does not match declared video type",
        400,
        FILES_ERROR_CODES.VALIDATION,
      );
    }
    return;
  }

  const expected = signatures[extension];
  if (!expected) {
    return;
  }

  if (!matchesSignature(buffer, expected)) {
    throw new FilesError(
      `File content does not match declared type (${mimeType})`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }
}

function matchesSignature(buffer: Buffer, signatures: number[][]): boolean {
  return signatures.some((sig) =>
    sig.every((byte, index) => buffer[index] === byte),
  );
}

function assertMimeExtensionConsistency(
  extension: string,
  mimeType: string,
): void {
  const expectedByExt: Record<string, string[]> = {
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    png: ["image/png"],
    gif: ["image/gif"],
    webp: ["image/webp"],
    svg: ["image/svg+xml"],
    pdf: ["application/pdf"],
    txt: ["text/plain"],
    md: ["text/markdown", "text/plain"],
    csv: ["text/csv", "text/plain"],
    mp4: ["video/mp4"],
    webm: ["video/webm"],
    mp3: ["audio/mpeg"],
    wav: ["audio/wav"],
    ogg: ["audio/ogg"],
  };

  const allowed = expectedByExt[extension];
  if (!allowed) return;
  if (!allowed.includes(mimeType)) {
    throw new FilesError(
      `MIME type ${mimeType} does not match file extension .${extension}`,
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }
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
