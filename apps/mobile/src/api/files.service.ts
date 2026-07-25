import {
  FILES_API_PREFIX,
  type ManagedFile,
} from "@enterprise/shared";

import { apiRequest, authenticatedFetch } from "@/api/api-client";
import { getApiBaseUrl } from "@/api/api-error";
import { toQueryString } from "@/lib/utils";
import { useAuthStore } from "@/auth/auth.store";

export type FolderDto = {
  id: string;
  name: string;
  parentId?: string | null;
};

export const filesService = {
  listFolders(parentId: string | "root" = "root") {
    return apiRequest<{ items: FolderDto[] }>(
      `${FILES_API_PREFIX}/folders${toQueryString({ parentId })}`,
      { auth: true },
    );
  },

  listFiles(params: {
    folderId?: string;
    search?: string;
    view?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    return apiRequest<{
      items: ManagedFile[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(
      `${FILES_API_PREFIX}${toQueryString({
        folderId: params.folderId,
        search: params.search,
        view: params.view ?? "all",
        page: params.page ?? 1,
        limit: params.limit ?? 24,
        sortBy: params.sortBy ?? "updatedAt",
        sortOrder: params.sortOrder ?? "desc",
      })}`,
      { auth: true },
    );
  },

  getById(id: string) {
    return apiRequest<ManagedFile>(`${FILES_API_PREFIX}/${id}`, { auth: true });
  },

  async upload(params: {
    uris: Array<{ uri: string; name: string; mimeType?: string }>;
    folderId?: string;
    onProgress?: (ratio: number) => void;
  }) {
    const form = new FormData();
    if (params.folderId) form.append("folderId", params.folderId);

    params.uris.forEach((file, index) => {
      form.append("files", {
        uri: file.uri,
        name: file.name || `upload-${index}`,
        type: file.mimeType || "application/octet-stream",
      } as unknown as Blob);
    });

    params.onProgress?.(0.1);

    const response = await authenticatedFetch(`${FILES_API_PREFIX}/upload`, {
      method: "POST",
      body: form,
    });

    params.onProgress?.(0.9);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Upload failed");
    }

    const json = (await response.json()) as {
      success: boolean;
      data: ManagedFile[];
    };
    params.onProgress?.(1);
    return json.data;
  },

  downloadUrl(id: string) {
    const token = useAuthStore.getState().accessToken;
    const base = `${getApiBaseUrl()}${FILES_API_PREFIX}/${id}/download`;
    // Caller should use authenticatedFetch for binary; URL for Sharing helpers
    return { url: base, token };
  },

  async downloadBlob(id: string) {
    return authenticatedFetch(`${FILES_API_PREFIX}/${id}/download`);
  },

  async previewBlob(id: string) {
    return authenticatedFetch(`${FILES_API_PREFIX}/${id}/preview`);
  },

  remove(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${FILES_API_PREFIX}/${id}`,
      { method: "DELETE", auth: true },
    );
  },
};
