import { FilesError, FILES_ERROR_CODES } from "./files.errors.js";

/** User-facing ZIP uploads — strict bomb / nesting policy. */
const ZIP_LIMITS = {
  maxEntries: 500,
  maxUncompressedBytes: 100 * 1024 * 1024,
  maxCompressionRatio: 40,
  maxPathDepth: 12,
  rejectNestedArchives: true,
} as const;

/**
 * OOXML (docx/xlsx/pptx) are ZIP containers with many small parts.
 * Lighter structural checks; still capped against zip-bomb patterns.
 */
const OFFICE_LIMITS = {
  maxEntries: 5_000,
  maxUncompressedBytes: 200 * 1024 * 1024,
  maxCompressionRatio: 100,
  maxPathDepth: 20,
  rejectNestedArchives: true,
} as const;

const NESTED_ARCHIVE_EXTENSIONS = new Set([
  "zip",
  "jar",
  "war",
  "ear",
  "apk",
  "ipa",
  "7z",
  "rar",
  "gz",
  "tgz",
  "bz2",
  "xz",
]);

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;

type ArchiveKind = "zip" | "docx" | "xlsx" | "pptx";

interface ZipCentralEntry {
  fileName: string;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  compressionMethod: number;
  isDirectory: boolean;
  /** Stored (method 0) payload begins with a ZIP signature. */
  looksLikeNestedZip: boolean;
}

function readUInt16LE(buffer: Buffer, offset: number): number {
  if (offset + 2 > buffer.length) {
    throw corrupt("truncated ZIP structure");
  }
  return buffer.readUInt16LE(offset);
}

function readUInt32LE(buffer: Buffer, offset: number): number {
  if (offset + 4 > buffer.length) {
    throw corrupt("truncated ZIP structure");
  }
  return buffer.readUInt32LE(offset);
}

function corrupt(message: string): FilesError {
  return new FilesError(
    `Corrupted or invalid archive: ${message}`,
    400,
    FILES_ERROR_CODES.VALIDATION,
  );
}

function policy(message: string): FilesError {
  return new FilesError(message, 400, FILES_ERROR_CODES.VALIDATION);
}

function findEocdOffset(buffer: Buffer): number {
  // EOCD is at least 22 bytes; comment may add up to 65535 bytes.
  const minEocd = 22;
  if (buffer.length < minEocd) {
    throw corrupt("file too small to be a ZIP archive");
  }
  const maxComment = 0xffff;
  const start = Math.max(0, buffer.length - (minEocd + maxComment));
  for (let i = buffer.length - minEocd; i >= start; i -= 1) {
    if (readUInt32LE(buffer, i) === EOCD_SIGNATURE) {
      return i;
    }
  }
  throw corrupt("missing end-of-central-directory record");
}

function parseCentralDirectory(buffer: Buffer): ZipCentralEntry[] {
  const eocdOffset = findEocdOffset(buffer);
  const totalEntries = readUInt16LE(buffer, eocdOffset + 10);
  const centralSize = readUInt32LE(buffer, eocdOffset + 12);
  const centralOffset = readUInt32LE(buffer, eocdOffset + 16);

  // ZIP64 / overflow markers — treat as unsupported high-risk for upload policy.
  if (
    totalEntries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    throw policy("ZIP64 archives are not allowed");
  }

  if (centralOffset + centralSize > buffer.length) {
    throw corrupt("central directory extends past end of file");
  }
  if (centralOffset + centralSize > eocdOffset) {
    throw corrupt("central directory overlaps end-of-central-directory");
  }

  const entries: ZipCentralEntry[] = [];
  let cursor = centralOffset;
  const centralEnd = centralOffset + centralSize;

  while (cursor < centralEnd && entries.length < totalEntries) {
    if (readUInt32LE(buffer, cursor) !== CENTRAL_DIR_SIGNATURE) {
      throw corrupt("invalid central directory header");
    }

    const compressionMethod = readUInt16LE(buffer, cursor + 10);
    const compressedSize = readUInt32LE(buffer, cursor + 20);
    const uncompressedSize = readUInt32LE(buffer, cursor + 24);
    const fileNameLength = readUInt16LE(buffer, cursor + 28);
    const extraLength = readUInt16LE(buffer, cursor + 30);
    const commentLength = readUInt16LE(buffer, cursor + 32);
    const localHeaderOffset = readUInt32LE(buffer, cursor + 42);

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      throw policy("ZIP64 archives are not allowed");
    }

    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd + extraLength + commentLength > buffer.length) {
      throw corrupt("central directory entry truncated");
    }

    const fileName = buffer.subarray(nameStart, nameEnd).toString("utf8");
    const isDirectory = fileName.endsWith("/") || fileName.endsWith("\\");

    entries.push({
      fileName,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      compressionMethod,
      isDirectory,
      looksLikeNestedZip: false,
    });

    cursor = nameEnd + extraLength + commentLength;
  }

  if (entries.length !== totalEntries) {
    throw corrupt(
      `central directory entry count mismatch (expected ${totalEntries}, got ${entries.length})`,
    );
  }

  return entries;
}

function assertLocalHeadersIntact(
  buffer: Buffer,
  entries: ZipCentralEntry[],
): void {
  for (const entry of entries) {
    const offset = entry.localHeaderOffset;
    if (offset + 30 > buffer.length) {
      throw corrupt(`local header out of range for "${entry.fileName}"`);
    }
    if (readUInt32LE(buffer, offset) !== LOCAL_FILE_SIGNATURE) {
      throw corrupt(`invalid local header for "${entry.fileName}"`);
    }
    const nameLength = readUInt16LE(buffer, offset + 26);
    const extraLength = readUInt16LE(buffer, offset + 28);
    const dataStart = offset + 30 + nameLength + extraLength;
    if (dataStart > buffer.length) {
      throw corrupt(`local file data out of range for "${entry.fileName}"`);
    }
    // Stored nested ZIP heuristic: uncompressed payload begins with PK\x03\x04.
    if (
      !entry.isDirectory &&
      entry.compressionMethod === 0 &&
      entry.uncompressedSize >= 4 &&
      dataStart + 4 <= buffer.length
    ) {
      const sig = readUInt32LE(buffer, dataStart);
      if (sig === LOCAL_FILE_SIGNATURE || sig === EOCD_SIGNATURE) {
        entry.looksLikeNestedZip = true;
      }
    }
  }
}

function normalizeEntryPath(fileName: string): string {
  return fileName.replace(/\\/g, "/");
}

function assertSafeEntryName(fileName: string, maxDepth: number): void {
  if (!fileName || fileName.trim().length === 0) {
    throw policy("Archive contains an entry with an empty filename");
  }
  if (fileName.includes("\0")) {
    throw policy("Archive contains an entry with an invalid filename");
  }

  const normalized = normalizeEntryPath(fileName);

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.startsWith("//")
  ) {
    throw policy("Archive contains an absolute path entry");
  }

  if (
    normalized.includes("../") ||
    normalized.includes("..\\") ||
    normalized === ".." ||
    normalized.endsWith("/..") ||
    normalized.split("/").includes("..")
  ) {
    throw policy("Archive contains a path traversal entry");
  }

  // Disallow control characters in entry names.
  if (/[\x00-\x1f\x7f]/.test(normalized)) {
    throw policy("Archive contains an entry with an invalid filename");
  }

  const depth = normalized.split("/").filter((part) => part.length > 0).length;
  if (depth > maxDepth) {
    throw policy(
      `Archive exceeds maximum directory depth of ${maxDepth}`,
    );
  }
}

function entryExtension(fileName: string): string {
  const normalized = normalizeEntryPath(fileName);
  const base = normalized.split("/").pop() ?? normalized;
  if (base.endsWith(".")) return "";
  const parts = base.toLowerCase().split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

function assertNoNestedArchive(entry: ZipCentralEntry): void {
  if (entry.isDirectory) return;
  const ext = entryExtension(entry.fileName);
  if (NESTED_ARCHIVE_EXTENSIONS.has(ext) || entry.looksLikeNestedZip) {
    throw policy("Nested archives are not allowed");
  }
}

function getLimits(kind: ArchiveKind) {
  return kind === "zip" ? ZIP_LIMITS : OFFICE_LIMITS;
}

function assertOfficeStructure(
  kind: Exclude<ArchiveKind, "zip">,
  entries: ZipCentralEntry[],
): void {
  const names = new Set(
    entries.map((entry) => normalizeEntryPath(entry.fileName).toLowerCase()),
  );

  const hasContentTypes =
    names.has("[content_types].xml") ||
    [...names].some((name) => name.endsWith("/[content_types].xml"));

  if (!hasContentTypes) {
    throw policy(
      `Invalid ${kind.toUpperCase()} package: missing [Content_Types].xml`,
    );
  }

  const requiredPrefix =
    kind === "docx" ? "word/" : kind === "xlsx" ? "xl/" : "ppt/";

  const hasRoot = [...names].some(
    (name) => name === requiredPrefix.slice(0, -1) || name.startsWith(requiredPrefix),
  );

  if (!hasRoot) {
    throw policy(
      `Invalid ${kind.toUpperCase()} package: missing ${requiredPrefix} content`,
    );
  }
}

/**
 * Inspect ZIP / OOXML archive metadata without writing extracted files to storage.
 * Rejects zip bombs, path traversal, nested archives, and corrupted containers.
 */
export function validateArchiveUpload(
  buffer: Buffer,
  extension: string,
): void {
  const kind = extension.toLowerCase() as ArchiveKind;
  if (kind !== "zip" && kind !== "docx" && kind !== "xlsx" && kind !== "pptx") {
    return;
  }

  const limits = getLimits(kind);
  let entries: ZipCentralEntry[];

  try {
    entries = parseCentralDirectory(buffer);
    assertLocalHeadersIntact(buffer, entries);
  } catch (error) {
    if (error instanceof FilesError) throw error;
    throw corrupt(error instanceof Error ? error.message : "parse failed");
  }

  if (entries.length > limits.maxEntries) {
    throw policy(
      `Archive exceeds maximum file count of ${limits.maxEntries}`,
    );
  }

  let totalUncompressed = 0;
  for (const entry of entries) {
    assertSafeEntryName(entry.fileName, limits.maxPathDepth);

    if (limits.rejectNestedArchives) {
      assertNoNestedArchive(entry);
    }

    if (!entry.isDirectory) {
      if (entry.uncompressedSize > limits.maxUncompressedBytes) {
        throw policy(
          `Archive entry exceeds maximum uncompressed size`,
        );
      }
      totalUncompressed += entry.uncompressedSize;
      if (totalUncompressed > limits.maxUncompressedBytes) {
        throw policy(
          `Archive exceeds maximum uncompressed size of ${Math.round(limits.maxUncompressedBytes / (1024 * 1024))}MB`,
        );
      }
    }
  }

  const ratio =
    buffer.length > 0 ? totalUncompressed / buffer.length : Number.POSITIVE_INFINITY;
  if (totalUncompressed > 0 && ratio > limits.maxCompressionRatio) {
    throw policy(
      `Archive compression ratio exceeds safe threshold (${limits.maxCompressionRatio}:1)`,
    );
  }

  if (kind === "docx" || kind === "xlsx" || kind === "pptx") {
    assertOfficeStructure(kind, entries);
  }
}

export function isZipContainerExtension(extension: string): boolean {
  return ["zip", "docx", "xlsx", "pptx"].includes(extension.toLowerCase());
}
