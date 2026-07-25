import { create } from "zustand";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { filesService } from "@/api/files.service";

export type DownloadEntry = {
  id: string;
  fileId: string;
  name: string;
  localUri?: string;
  progress: number;
  status: "queued" | "downloading" | "done" | "error";
  error?: string;
  updatedAt: string;
};

interface DownloadStore {
  items: DownloadEntry[];
  download: (fileId: string, name: string) => Promise<string | null>;
  clear: () => void;
  remove: (id: string) => void;
}

function newId() {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  items: [],

  remove: (id) =>
    set({ items: get().items.filter((i) => i.id !== id) }),

  clear: () => set({ items: [] }),

  download: async (fileId, name) => {
    const id = newId();
    const entry: DownloadEntry = {
      id,
      fileId,
      name,
      progress: 0,
      status: "queued",
      updatedAt: new Date().toISOString(),
    };
    set({ items: [entry, ...get().items].slice(0, 40) });

    try {
      set({
        items: get().items.map((i) =>
          i.id === id
            ? { ...i, status: "downloading", progress: 0.1 }
            : i,
        ),
      });

      const response = await filesService.downloadBlob(fileId);
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }

      const blob = await response.blob();
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      set({
        items: get().items.map((i) =>
          i.id === id ? { ...i, progress: 0.7 } : i,
        ),
      });

      const safeName = name.replace(/[^\w.\-]+/g, "_");
      const localUri = `${FileSystem.cacheDirectory}downloads/${safeName}`;
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.cacheDirectory}downloads`,
        { intermediates: true },
      ).catch(() => undefined);

      await FileSystem.writeAsStringAsync(localUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      set({
        items: get().items.map((i) =>
          i.id === id
            ? {
                ...i,
                localUri,
                progress: 1,
                status: "done",
                updatedAt: new Date().toISOString(),
              }
            : i,
        ),
      });

      return localUri;
    } catch (err) {
      set({
        items: get().items.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "error",
                error: err instanceof Error ? err.message : "Download failed",
                updatedAt: new Date().toISOString(),
              }
            : i,
        ),
      });
      return null;
    }
  },
}));

export async function shareLocalFile(uri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
}
