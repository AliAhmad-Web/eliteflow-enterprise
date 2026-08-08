"use client";

import type { Folder } from "@enterprise/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { filesService } from "../services/files.service";
import { FILES_QUERY_KEYS } from "../types/files.types";

/** In-memory registry of folders seen by the tree (for breadcrumbs / path). */
export function useFolderRegistry() {
  const [byId, setById] = useState<Map<string, Folder>>(() => new Map());

  const register = useCallback((folders: Folder[]) => {
    if (!folders.length) return;
    setById((current) => {
      const next = new Map(current);
      let changed = false;
      for (const folder of folders) {
        const prev = next.get(folder.id);
        if (
          !prev ||
          prev.name !== folder.name ||
          prev.parentId !== folder.parentId ||
          prev.childCount !== folder.childCount ||
          prev.fileCount !== folder.fileCount
        ) {
          next.set(folder.id, folder);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, []);

  const getPath = useCallback(
    (folderId: string | "root"): Array<{ id: string | "root"; name: string }> => {
      if (folderId === "root") return [{ id: "root", name: "Home" }];
      const path: Array<{ id: string | "root"; name: string }> = [];
      let current: string | null = folderId;
      const guard = new Set<string>();
      while (current && !guard.has(current)) {
        guard.add(current);
        const folder = byId.get(current);
        if (!folder) {
          path.unshift({ id: current, name: "…" });
          break;
        }
        path.unshift({ id: folder.id, name: folder.name });
        current = folder.parentId;
      }
      path.unshift({ id: "root", name: "Home" });
      return path;
    },
    [byId],
  );

  const getFolder = useCallback(
    (id: string) => byId.get(id) ?? null,
    [byId],
  );

  return { register, getPath, getFolder, byId };
}

/**
 * Prefetch children when expanding; React Query caches so nodes don't refetch.
 */
export function usePrefetchFolderChildren() {
  const queryClient = useQueryClient();

  return useCallback(
    (parentId: string | "root") => {
      void queryClient.prefetchQuery({
        queryKey: FILES_QUERY_KEYS.folders(`${String(parentId)}:`),
        queryFn: () =>
          filesService.listFolders({ parentId, search: "" }),
      });
    },
    [queryClient],
  );
}

export function useFolderSearchIndex(byId: Map<string, Folder>) {
  return useMemo(() => Array.from(byId.values()), [byId]);
}
