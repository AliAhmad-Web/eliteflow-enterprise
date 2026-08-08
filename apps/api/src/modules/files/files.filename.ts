import { FilesError, FILES_ERROR_CODES } from "./files.errors.js";

/** Matches ManagedFile.name / originalName VARCHAR(255). */
export const MAX_UPLOAD_FILENAME_LENGTH = 255;

/**
 * Executable / script-like suffixes that must never appear in a multi-dot name,
 * even when the final extension is allowlisted (e.g. report.exe.pdf).
 */
export const DANGEROUS_FILENAME_EXTENSIONS = new Set([
  "exe",
  "dll",
  "com",
  "bat",
  "cmd",
  "msi",
  "scr",
  "ps1",
  "vbs",
  "vbe",
  "js",
  "jse",
  "mjs",
  "cjs",
  "wsf",
  "wsh",
  "hta",
  "cpl",
  "jar",
  "app",
  "dmg",
  "pkg",
  "sh",
  "bash",
  "zsh",
  "php",
  "phtml",
  "asp",
  "aspx",
  "jsp",
  "cgi",
  "py",
  "rb",
  "pl",
]);

const WINDOWS_RESERVED_BASES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

/** Bidirectional / RTLO controls used for filename spoofing. */
const BIDI_CONTROL_PATTERN =
  /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/u;

const CONTROL_OR_NULL_PATTERN = /[\u0000-\u001F\u007F]/u;

function policy(message: string): never {
  throw new FilesError(message, 400, FILES_ERROR_CODES.VALIDATION);
}

function baseNameWithoutExtension(fileName: string): string {
  const normalized = fileName.replace(/\\/g, "/");
  const leaf = normalized.includes("/")
    ? (normalized.split("/").pop() ?? normalized)
    : normalized;
  const dot = leaf.lastIndexOf(".");
  return dot > 0 ? leaf.slice(0, dot) : leaf;
}

/**
 * Reject deceptive / unsafe upload filenames (F-08).
 * Does not canonicalize — call {@link canonicalizeDisplayFileName} after this passes.
 */
export function assertSafeUploadFileName(fileName: string): void {
  if (!fileName || fileName.trim().length === 0) {
    policy("File name is not allowed");
  }

  if (fileName.length > MAX_UPLOAD_FILENAME_LENGTH) {
    policy(
      `File name exceeds maximum length of ${MAX_UPLOAD_FILENAME_LENGTH} characters`,
    );
  }

  if (fileName.includes("\0") || CONTROL_OR_NULL_PATTERN.test(fileName)) {
    policy("File name contains invalid control characters");
  }

  if (BIDI_CONTROL_PATTERN.test(fileName)) {
    policy("File name contains disallowed Unicode direction controls");
  }

  if (/[\/\\]/.test(fileName)) {
    policy("File name contains invalid path separators");
  }

  const base = baseNameWithoutExtension(fileName).replace(/\.$/, "");
  if (WINDOWS_RESERVED_BASES.has(base.toUpperCase())) {
    policy("File name uses a reserved device name");
  }

  // Multi-extension deception: any non-final segment matching a dangerous suffix.
  const parts = fileName.toLowerCase().split(".").filter((part) => part.length > 0);
  if (parts.length >= 2) {
    const intermediate = parts.slice(0, -1);
    for (const part of intermediate) {
      if (DANGEROUS_FILENAME_EXTENSIONS.has(part)) {
        policy("File name contains a dangerous multi-extension pattern");
      }
    }
  }
}

/**
 * Produce a safe, readable display name for persistence (F-09).
 * Storage keys remain independently sanitized by the storage provider.
 */
export function canonicalizeDisplayFileName(
  fileName: string,
  extension: string,
): string {
  // Unicode normalize first so visually identical names collapse.
  let name = fileName.normalize("NFC");

  // Drop any residual controls / bidi (defense in depth after assert).
  name = name.replace(CONTROL_OR_NULL_PATTERN, "");
  name = name.replace(BIDI_CONTROL_PATTERN, "");
  name = name.replace(/[\/\\]/g, "_");

  // Collapse whitespace; trim dots/spaces that confuse Windows clients.
  name = name.replace(/\s+/g, " ").trim();
  name = name.replace(/^\.+/, "");

  const ext = extension.toLowerCase().replace(/^\./, "");
  const lower = name.toLowerCase();
  if (ext && lower.endsWith(`.${ext}`)) {
    name = name.slice(0, -(ext.length + 1));
  }

  // Keep letters/numbers/common punctuation for readability.
  name = name.replace(/[^\p{L}\p{N} ._()-]/gu, "_");
  name = name.replace(/_+/g, "_").replace(/\.+/g, ".").trim();
  name = name.replace(/^[\s._-]+|[\s._-]+$/g, "");

  if (!name) {
    name = "file";
  }

  const withExt = ext ? `${name}.${ext}` : name;
  if (withExt.length <= MAX_UPLOAD_FILENAME_LENGTH) {
    return withExt;
  }

  const maxBase =
    MAX_UPLOAD_FILENAME_LENGTH - (ext ? ext.length + 1 : 0);
  const truncated = name.slice(0, Math.max(1, maxBase));
  return ext ? `${truncated}.${ext}` : truncated;
}
