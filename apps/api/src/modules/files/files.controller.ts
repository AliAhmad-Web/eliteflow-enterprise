import type { Request, Response } from "express";

import type {
  CreateFolderInput,
  FileIdParamsInput,
  FolderIdParamsInput,
  ListFilesQueryInput,
  ListFoldersQueryInput,
  MoveFileInput,
  ShareFileInput,
  ShareIdParamsInput,
  UpdateFileInput,
  UpdateFolderInput,
} from "@enterprise/shared";
import { prisma } from "@enterprise/database";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { FILES_ERROR_CODES, FilesError } from "./files.errors.js";
import {
  applyFileDeliveryHeaders,
  resolveFileDeliveryHeaders,
} from "./files.preview-security.js";
import { filesService, type FilesActor } from "./files.service.js";
import {
  cleanupRequestTempUploads,
  handleMultipartUpload,
  uploadMiddleware,
} from "./files.upload-middleware.js";

export { handleMultipartUpload, uploadMiddleware };

async function getActor(req: Request): Promise<FilesActor> {
  if (!req.auth) {
    throw new FilesError(
      "Authentication required",
      401,
      FILES_ERROR_CODES.FORBIDDEN,
    );
  }

  const context = extractRequestContext(req);
  let companyId: string | null = null;

  if (req.auth.role === "CLIENT") {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { companyId: true },
    });
    companyId = user?.companyId ?? null;
  }

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    companyId,
    permissions: req.auth.permissions,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export class FilesController {
  async listFolders(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListFoldersQueryInput;
    const result = await filesService.listFolders(query, await getActor(req));
    res.json(successResponse(result, "Folders retrieved successfully"));
  }

  async createFolder(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateFolderInput;
    const result = await filesService.createFolder(body, await getActor(req));
    res.status(201).json(successResponse(result, "Folder created successfully"));
  }

  async updateFolder(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FolderIdParamsInput;
    const body = req.body as UpdateFolderInput;
    const result = await filesService.updateFolder(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Folder updated successfully"));
  }

  async deleteFolder(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FolderIdParamsInput;
    const result = await filesService.deleteFolder(params.id, await getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "Folder deleted successfully" },
        "Folder deleted successfully",
      ),
    );
  }

  async listFiles(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListFilesQueryInput;
    const result = await filesService.listFiles(query, await getActor(req));
    res.json(successResponse(result, "Files retrieved successfully"));
  }

  async getFile(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.getFile(params.id, await getActor(req));
    res.json(successResponse(result, "File retrieved successfully"));
  }

  async upload(req: Request, res: Response): Promise<void> {
    const actor = await getActor(req);
    const uploaded = req.files as Express.Multer.File[] | undefined;
    if (!uploaded?.length) {
      throw new FilesError(
        "At least one file is required",
        400,
        FILES_ERROR_CODES.VALIDATION,
      );
    }

    const folderId =
      typeof req.body.folderId === "string" && req.body.folderId.length > 0
        ? req.body.folderId
        : null;
    const projectId =
      typeof req.body.projectId === "string" && req.body.projectId.length > 0
        ? req.body.projectId
        : null;
    const clientId =
      typeof req.body.clientId === "string" && req.body.clientId.length > 0
        ? req.body.clientId
        : null;
    let tags: string[] = [];
    if (typeof req.body.tags === "string" && req.body.tags.trim()) {
      try {
        const parsed = JSON.parse(req.body.tags) as unknown;
        if (Array.isArray(parsed)) {
          tags = parsed.map(String);
        } else {
          tags = req.body.tags.split(",").map((tag: string) => tag.trim());
        }
      } catch {
        tags = req.body.tags.split(",").map((tag: string) => tag.trim());
      }
    }

    try {
      const result = await filesService.uploadFiles(
        uploaded.map((file) => ({
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          // Disk-backed multer: stream path instead of in-memory buffer.
          tempPath: file.path,
          buffer: file.buffer?.length ? file.buffer : undefined,
        })),
        { folderId, projectId, clientId, tags },
        actor,
      );

      res
        .status(201)
        .json(successResponse(result, "Files uploaded successfully"));
    } finally {
      await cleanupRequestTempUploads(req);
    }
  }

  async updateFile(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const body = req.body as UpdateFileInput;
    const result = await filesService.updateFile(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "File updated successfully"));
  }

  async moveFile(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const body = req.body as MoveFileInput;
    const result = await filesService.moveFile(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "File moved successfully"));
  }

  async deleteFile(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.deleteFile(params.id, await getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "File deleted successfully" },
        "File deleted successfully",
      ),
    );
  }

  async restoreFile(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.restoreFile(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "File restored successfully"));
  }

  async permanentDelete(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.permanentDelete(
      params.id,
      await getActor(req),
    );
    res.json(
      successResponse(
        { id: result.id, message: "File permanently deleted" },
        "File permanently deleted",
      ),
    );
  }

  async download(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.download(params.id, await getActor(req));

    if (result.signedUrl && req.query.redirect === "1") {
      res.redirect(result.signedUrl);
      return;
    }

    const headers = resolveFileDeliveryHeaders({
      mode: "download",
      extension: result.file.extension,
      fileName: result.file.name,
    });
    applyFileDeliveryHeaders(res, headers, result.sizeBytes);
    result.stream.pipe(res);
  }

  async preview(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.preview(params.id, await getActor(req));

    const headers = resolveFileDeliveryHeaders({
      mode: "preview",
      extension: result.file.extension,
      fileName: result.file.name,
    });
    applyFileDeliveryHeaders(res, headers, result.sizeBytes);
    result.stream.pipe(res);
  }

  async versions(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.listVersions(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Versions retrieved successfully"));
  }

  async activities(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.listActivities(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Activity retrieved successfully"));
  }

  async shares(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const result = await filesService.listShares(params.id, await getActor(req));
    res.json(successResponse(result, "Shares retrieved successfully"));
  }

  async share(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as FileIdParamsInput;
    const body = req.body as ShareFileInput;
    const result = await filesService.shareFile(
      params.id,
      body,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "File shared successfully"));
  }

  async unshare(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as ShareIdParamsInput;
    const result = await filesService.unshare(params.id, await getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "Share removed successfully" },
        "Share removed successfully",
      ),
    );
  }
}

export const filesController = new FilesController();
