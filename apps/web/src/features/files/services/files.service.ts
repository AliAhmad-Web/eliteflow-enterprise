import {
  FILES_API_PREFIX,
  type CreateFolderInput,
  type Folder,
  type FolderListResponse,
  type FileActivityDto,
  type FileShareDto,
  type FileVersionDto,
  type ListFilesQueryInput,
  type ListFoldersQueryInput,
  type ManagedFile,
  type ManagedFileListResponse,
  type MoveFileInput,
  type ShareFileInput,
  type UpdateFileInput,
  type UpdateFolderInput,
} from "@enterprise/shared";

import { authenticatedFetch, apiRequest } from "@/services/api/api-client";
import { ApiClientError } from "@/services/api/api-error";

function toFolderQuery(query: ListFoldersQueryInput): string {
  const params = new URLSearchParams();
  if (query.parentId) params.set("parentId", String(query.parentId));
  if (query.search) params.set("search", query.search);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function toFilesQuery(query: ListFilesQueryInput): string {
  const params = new URLSearchParams();
  if (query.folderId) params.set("folderId", String(query.folderId));
  if (query.search) params.set("search", query.search);
  if (query.category) params.set("category", query.category);
  if (query.tag) params.set("tag", query.tag);
  if (query.favorite !== undefined) params.set("favorite", String(query.favorite));
  if (query.view) params.set("view", query.view);
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  return `?${params.toString()}`;
}

export const filesService = {
  listFolders(query: ListFoldersQueryInput) {
    return apiRequest<FolderListResponse>(
      `${FILES_API_PREFIX}/folders${toFolderQuery(query)}`,
      { auth: true },
    );
  },

  createFolder(input: CreateFolderInput) {
    return apiRequest<Folder>(`${FILES_API_PREFIX}/folders`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateFolder(id: string, input: UpdateFolderInput) {
    return apiRequest<Folder>(`${FILES_API_PREFIX}/folders/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteFolder(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${FILES_API_PREFIX}/folders/${id}`,
      { method: "DELETE", auth: true },
    );
  },

  listFiles(query: ListFilesQueryInput) {
    return apiRequest<ManagedFileListResponse>(
      `${FILES_API_PREFIX}${toFilesQuery(query)}`,
      { auth: true },
    );
  },

  getFile(id: string) {
    return apiRequest<ManagedFile>(`${FILES_API_PREFIX}/${id}`, { auth: true });
  },

  async uploadFiles(input: {
    files: File[];
    folderId?: string | null;
    projectId?: string | null;
    clientId?: string | null;
    tags?: string[];
  }) {
    const form = new FormData();
    for (const file of input.files) {
      form.append("files", file);
    }
    if (input.folderId) form.append("folderId", input.folderId);
    if (input.projectId) form.append("projectId", input.projectId);
    if (input.clientId) form.append("clientId", input.clientId);
    if (input.tags?.length) form.append("tags", JSON.stringify(input.tags));

    const response = await authenticatedFetch(`${FILES_API_PREFIX}/upload`, {
      method: "POST",
      body: form,
      // Let browser set multipart boundary — do not set Content-Type
      headers: {},
    });

    if (!response.ok) {
      let message = "Upload failed";
      let code = "FILES_STORAGE_ERROR";
      try {
        const body = (await response.json()) as {
          message?: string;
          code?: string;
        };
        message = body.message ?? message;
        code = body.code ?? code;
      } catch {
        // ignore
      }
      throw new ApiClientError(message, code, response.status);
    }

    const body = (await response.json()) as {
      data: ManagedFile[];
    };
    return body.data;
  },

  updateFile(id: string, input: UpdateFileInput) {
    return apiRequest<ManagedFile>(`${FILES_API_PREFIX}/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  moveFile(id: string, input: MoveFileInput) {
    return apiRequest<ManagedFile>(`${FILES_API_PREFIX}/${id}/move`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  deleteFile(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${FILES_API_PREFIX}/${id}`,
      { method: "DELETE", auth: true },
    );
  },

  restoreFile(id: string) {
    return apiRequest<ManagedFile>(`${FILES_API_PREFIX}/${id}/restore`, {
      method: "POST",
      auth: true,
    });
  },

  permanentDelete(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${FILES_API_PREFIX}/${id}/permanent`,
      { method: "DELETE", auth: true },
    );
  },

  shareFile(id: string, input: ShareFileInput) {
    return apiRequest<FileShareDto>(`${FILES_API_PREFIX}/${id}/share`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  listVersions(id: string) {
    return apiRequest<FileVersionDto[]>(`${FILES_API_PREFIX}/${id}/versions`, {
      auth: true,
    });
  },

  listActivities(id: string) {
    return apiRequest<FileActivityDto[]>(`${FILES_API_PREFIX}/${id}/activity`, {
      auth: true,
    });
  },

  listShares(id: string) {
    return apiRequest<FileShareDto[]>(`${FILES_API_PREFIX}/${id}/shares`, {
      auth: true,
    });
  },

  async downloadBlob(id: string, mode: "download" | "preview" = "download") {
    const response = await authenticatedFetch(
      `${FILES_API_PREFIX}/${id}/${mode}`,
      { method: "GET" },
    );
    if (!response.ok) {
      throw new ApiClientError("Could not download file", "FILES_STORAGE_ERROR", response.status);
    }
    return response.blob();
  },
};
