"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "eliteflow.file-manager.tree.v1";

export type FolderId = string | "root";

export interface FolderTreePersistedState {
  expandedIds: string[];
  selectedId: FolderId;
  scrollTop: number;
  treeWidth: number;
}

const DEFAULT_STATE: FolderTreePersistedState = {
  expandedIds: [],
  selectedId: "root",
  scrollTop: 0,
  treeWidth: 280,
};

function isValidFolderId(id: string): id is string {
  return (
    id === "root" ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  );
}

function readStored(): FolderTreePersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<FolderTreePersistedState>;
    const selectedRaw =
      parsed.selectedId === "root" || typeof parsed.selectedId === "string"
        ? parsed.selectedId
        : "root";
    const selectedId = isValidFolderId(selectedRaw) ? selectedRaw : "root";
    return {
      expandedIds: Array.isArray(parsed.expandedIds)
        ? parsed.expandedIds.filter(
            (id) => typeof id === "string" && isValidFolderId(id),
          )
        : [],
      selectedId,
      scrollTop:
        typeof parsed.scrollTop === "number" ? parsed.scrollTop : 0,
      treeWidth:
        typeof parsed.treeWidth === "number"
          ? Math.min(480, Math.max(220, parsed.treeWidth))
          : 280,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useFolderTreeState() {
  const [ready, setReady] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<FolderId>("root");
  const [scrollTop, setScrollTop] = useState(0);
  const [treeWidth, setTreeWidth] = useState(280);
  /** Snapshot of expansion before search — restored on clear. */
  const [preSearchExpanded, setPreSearchExpanded] = useState<string[] | null>(
    null,
  );

  useEffect(() => {
    const stored = readStored();
    // Restore selection, but only expand the selected folder (not the full history).
    // Restoring dozens of expanded nodes floods the DB with parallel folder queries.
    setSelectedId(stored.selectedId);
    setExpandedIds(
      stored.selectedId !== "root"
        ? new Set([stored.selectedId])
        : new Set(),
    );
    setScrollTop(stored.scrollTop);
    setTreeWidth(stored.treeWidth);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const payload: FolderTreePersistedState = {
      expandedIds: Array.from(expandedIds),
      selectedId,
      scrollTop,
      treeWidth,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, expandedIds, selectedId, scrollTop, treeWidth]);

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandFolder = useCallback((id: string) => {
    setExpandedIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const expandMany = useCallback((ids: string[]) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const beginSearchExpansion = useCallback(() => {
    setPreSearchExpanded((prev) =>
      prev == null ? Array.from(expandedIds) : prev,
    );
  }, [expandedIds]);

  const endSearchExpansion = useCallback(() => {
    setPreSearchExpanded((prev) => {
      if (prev) setExpandedIds(new Set(prev));
      return null;
    });
  }, []);

  return {
    ready,
    expandedIds,
    selectedId,
    setSelectedId,
    scrollTop,
    setScrollTop,
    treeWidth,
    setTreeWidth,
    isExpanded,
    toggleExpanded,
    expandFolder,
    expandMany,
    beginSearchExpansion,
    endSearchExpansion,
  };
}

export type FolderTreeState = ReturnType<typeof useFolderTreeState>;
