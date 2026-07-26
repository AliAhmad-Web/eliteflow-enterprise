"use client";

import { useCallback, useRef, useState } from "react";

import {
  MAX_HISTORY,
  cloneDocument,
  createEmptyDocument,
  createId,
  type AlignMode,
  type BrushSize,
  type LayerAction,
  type WhiteboardDocument,
  type WhiteboardObject,
  type WhiteboardTool,
} from "../types/whiteboard.types";
import { getObjectBounds } from "../lib/canvas-engine";

export function useWhiteboardDocument(initial?: WhiteboardDocument) {
  const [document, setDocument] = useState<WhiteboardDocument>(
    initial ?? createEmptyDocument(),
  );
  const [tool, setTool] = useState<WhiteboardTool>("pen");
  const [color, setColor] = useState("#0f172a");
  const [brushSize, setBrushSize] = useState<BrushSize>(4);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [dirty, setDirty] = useState(false);

  const historyRef = useRef<WhiteboardDocument[]>([
    cloneDocument(initial ?? createEmptyDocument()),
  ]);
  const indexRef = useRef(0);

  const syncFlags = useCallback(() => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current < historyRef.current.length - 1);
  }, []);

  const commit = useCallback(
    (next: WhiteboardDocument, markDirty = true) => {
      const cloned = cloneDocument(next);
      const trimmed = historyRef.current.slice(0, indexRef.current + 1);
      trimmed.push(cloned);
      if (trimmed.length > MAX_HISTORY) trimmed.shift();
      historyRef.current = trimmed;
      indexRef.current = trimmed.length - 1;
      setDocument(cloned);
      if (markDirty) setDirty(true);
      syncFlags();
    },
    [syncFlags],
  );

  const replaceDocument = useCallback(
    (next: WhiteboardDocument, markDirty = false) => {
      const cloned = cloneDocument(next);
      historyRef.current = [cloned];
      indexRef.current = 0;
      setDocument(cloned);
      setSelectedIds([]);
      setDirty(markDirty);
      syncFlags();
    },
    [syncFlags],
  );

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    setDocument(cloneDocument(historyRef.current[indexRef.current]!));
    setDirty(true);
    syncFlags();
  }, [syncFlags]);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    setDocument(cloneDocument(historyRef.current[indexRef.current]!));
    setDirty(true);
    syncFlags();
  }, [syncFlags]);

  const clearCanvas = useCallback(() => {
    commit({
      ...document,
      objects: [],
    });
    setSelectedIds([]);
  }, [commit, document]);

  const upsertObject = useCallback(
    (obj: WhiteboardObject, options?: { commit?: boolean }) => {
      setDocument((prev) => {
        const exists = prev.objects.some((o) => o.id === obj.id);
        const objects = exists
          ? prev.objects.map((o) => (o.id === obj.id ? obj : o))
          : [...prev.objects, obj];
        const next = { ...prev, objects };
        if (options?.commit !== false) {
          // deferred commit handled by caller for stroke streams
        }
        return next;
      });
      setDirty(true);
    },
    [],
  );

  const commitCurrent = useCallback(
    (next?: WhiteboardDocument) => {
      commit(next ?? document);
    },
    [commit, document],
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    commit({
      ...document,
      objects: document.objects.filter((o) => !selectedIds.includes(o.id)),
    });
    setSelectedIds([]);
  }, [commit, document, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const clones = document.objects
      .filter((o) => selectedIds.includes(o.id))
      .map((o) => ({
        ...cloneDocument({ schemaVersion: 1, viewport: document.viewport, objects: [o] })
          .objects[0]!,
        id: createId(),
        x: o.x + 16,
        y: o.y + 16,
        zIndex: document.objects.length + 1,
      }));
    commit({
      ...document,
      objects: [...document.objects, ...clones],
    });
    setSelectedIds(clones.map((c) => c.id));
  }, [commit, document, selectedIds]);

  const toggleLockSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    commit({
      ...document,
      objects: document.objects.map((o) =>
        selectedIds.includes(o.id) ? { ...o, locked: !o.locked } : o,
      ),
    });
  }, [commit, document, selectedIds]);

  const alignSelected = useCallback(
    (mode: AlignMode) => {
      const selected = document.objects.filter((o) => selectedIds.includes(o.id));
      if (selected.length < 2) return;
      const bounds = selected.map(getObjectBounds);
      const minX = Math.min(...bounds.map((b) => b.x));
      const maxX = Math.max(...bounds.map((b) => b.x + b.w));
      const minY = Math.min(...bounds.map((b) => b.y));
      const maxY = Math.max(...bounds.map((b) => b.y + b.h));
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      commit({
        ...document,
        objects: document.objects.map((o) => {
          if (!selectedIds.includes(o.id)) return o;
          const b = getObjectBounds(o);
          let x = o.x;
          let y = o.y;
          switch (mode) {
            case "left":
              x += minX - b.x;
              break;
            case "center":
              x += midX - (b.x + b.w / 2);
              break;
            case "right":
              x += maxX - (b.x + b.w);
              break;
            case "top":
              y += minY - b.y;
              break;
            case "middle":
              y += midY - (b.y + b.h / 2);
              break;
            case "bottom":
              y += maxY - (b.y + b.h);
              break;
            default: {
              const _never: never = mode;
              void _never;
            }
          }
          return { ...o, x, y };
        }),
      });
    },
    [commit, document, selectedIds],
  );

  const layerSelected = useCallback(
    (action: LayerAction) => {
      if (selectedIds.length === 0) return;
      const objects = [...document.objects].sort((a, b) => a.zIndex - b.zIndex);
      const selectedSet = new Set(selectedIds);
      const moving = objects.filter((o) => selectedSet.has(o.id));
      const rest = objects.filter((o) => !selectedSet.has(o.id));

      let next: WhiteboardObject[] = [];
      switch (action) {
        case "front":
          next = [...rest, ...moving];
          break;
        case "back":
          next = [...moving, ...rest];
          break;
        case "forward":
        case "backward": {
          next = objects;
          for (const id of selectedIds) {
            const idx = next.findIndex((o) => o.id === id);
            if (idx < 0) continue;
            const swapWith = action === "forward" ? idx + 1 : idx - 1;
            if (swapWith < 0 || swapWith >= next.length) continue;
            const copy = [...next];
            const tmp = copy[idx]!;
            copy[idx] = copy[swapWith]!;
            copy[swapWith] = tmp;
            next = copy;
          }
          break;
        }
        default: {
          const _never: never = action;
          void _never;
          next = objects;
        }
      }

      commit({
        ...document,
        objects: next.map((o, i) => ({ ...o, zIndex: i + 1 })),
      });
    },
    [commit, document, selectedIds],
  );

  const setViewport = useCallback(
    (viewport: WhiteboardDocument["viewport"], markDirty = true) => {
      const next = { ...document, viewport };
      setDocument(next);
      if (markDirty) setDirty(true);
    },
    [document],
  );

  const markClean = useCallback(() => setDirty(false), []);

  return {
    document,
    tool,
    color,
    brushSize,
    selectedIds,
    canUndo,
    canRedo,
    dirty,
    setTool,
    setColor,
    setBrushSize,
    setSelectedIds,
    setDocument,
    commit,
    replaceDocument,
    undo,
    redo,
    clearCanvas,
    upsertObject,
    commitCurrent,
    deleteSelected,
    duplicateSelected,
    toggleLockSelected,
    alignSelected,
    layerSelected,
    setViewport,
    markClean,
    createId,
  };
}
