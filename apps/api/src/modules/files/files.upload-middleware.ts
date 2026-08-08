import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer, { MulterError } from "multer";

import { FILES_ERROR_CODES, FilesError } from "./files.errors.js";
import {
  assertEarlyUploadAcceptance,
  getMaxUploadBytes,
  getMaxUploadFileCount,
} from "./files.validation-rules.js";

function resolveUploadTempDir(): string {
  const configured = process.env.FILE_UPLOAD_TEMP_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(os.tmpdir(), "eliteflow-uploads");
}

let ensuredTempDir: string | null = null;

async function ensureUploadTempDir(): Promise<string> {
  const dir = resolveUploadTempDir();
  if (ensuredTempDir === dir) return dir;
  await mkdir(dir, { recursive: true });
  ensuredTempDir = dir;
  return dir;
}

/**
 * Disk-backed multer storage (F-06).
 * Multipart parts stream to temp files instead of Node heap (memoryStorage).
 */
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    void ensureUploadTempDir()
      .then((dir) => cb(null, dir))
      .catch((error: unknown) => {
        cb(
          error instanceof Error
            ? error
            : new Error("Failed to prepare upload temp directory"),
          "",
        );
      });
  },
  filename: (_req, _file, cb) => {
    cb(null, `${randomUUID()}.upload`);
  },
});

function earlyUploadFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  try {
    assertEarlyUploadAcceptance({
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
    cb(null, true);
  } catch (error) {
    cb(error instanceof Error ? error : new Error("Upload rejected"));
  }
}

export const uploadMiddleware = multer({
  storage: diskStorage,
  limits: {
    fileSize: getMaxUploadBytes(),
    files: getMaxUploadFileCount(),
  },
  fileFilter: earlyUploadFileFilter,
});

function mapMultipartError(error: unknown): FilesError {
  if (error instanceof FilesError) return error;

  if (error instanceof MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE": {
        const maxMb = Math.round(getMaxUploadBytes() / (1024 * 1024));
        return new FilesError(
          `File exceeds maximum size of ${maxMb}MB`,
          400,
          FILES_ERROR_CODES.VALIDATION,
        );
      }
      case "LIMIT_FILE_COUNT":
      case "LIMIT_UNEXPECTED_FILE":
        return new FilesError(
          `Too many files (maximum ${getMaxUploadFileCount()} per request)`,
          400,
          FILES_ERROR_CODES.VALIDATION,
        );
      default:
        return new FilesError(
          error.message || "Upload rejected",
          400,
          FILES_ERROR_CODES.VALIDATION,
        );
    }
  }

  if (error instanceof Error) {
    return new FilesError(
      error.message || "Upload rejected",
      400,
      FILES_ERROR_CODES.VALIDATION,
    );
  }

  return new FilesError(
    "Upload rejected",
    400,
    FILES_ERROR_CODES.VALIDATION,
  );
}

/**
 * Multipart upload handler with early filter + disk temp + mapped errors.
 */
export function handleMultipartUpload(
  fieldName = "files",
  maxCount = getMaxUploadFileCount(),
): RequestHandler {
  const parse = uploadMiddleware.array(fieldName, maxCount);
  return (req: Request, res: Response, next: NextFunction) => {
    parse(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }
      void cleanupRequestTempUploads(req).finally(() => {
        next(mapMultipartError(error));
      });
    });
  };
}

export async function cleanupTempUploadPaths(
  paths: Array<string | undefined | null>,
): Promise<void> {
  await Promise.all(
    paths.map(async (filePath) => {
      if (!filePath) return;
      try {
        await unlink(filePath);
      } catch {
        // Already removed or never written.
      }
    }),
  );
}

export async function cleanupRequestTempUploads(req: Request): Promise<void> {
  const files = req.files;
  if (!files) return;
  const list = Array.isArray(files)
    ? files
    : Object.values(files).flat();
  await cleanupTempUploadPaths(list.map((file) => file.path));
}
