"use client";

import type { Folder } from "@enterprise/shared";
import { ChevronDown, ChevronRight, Folder as FolderIcon, Home } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { useFolders } from "../../hooks/use-files";

interface FolderDestinationPickerProps {
  /** Folder being moved — blocked along with its descendants. */
  movingFolderId: string;
  blockedIds: Set<string>;
  value: string | null;
  onChange: (parentId: string | null) => void;
  disabled?: boolean;
}

function PickerNode({
  folder,
  depth,
  blockedIds,
  value,
  onChange,
  disabled,
}: {
  folder: Folder;
  depth: number;
  blockedIds: Set<string>;
  value: string | null;
  onChange: (parentId: string | null) => void;
  disabled?: boolean;
}) {
  const isBlocked = blockedIds.has(folder.id);
  const [expanded, setExpanded] = useState(false);
  const hasChildren = (folder.childCount ?? 0) > 0;

  const childrenQuery = useFolders(
    { parentId: folder.id, search: "" },
    { enabled: expanded && !isBlocked },
  );
  const children = childrenQuery.data?.items ?? [];

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-md",
          value === folder.id && !isBlocked && "bg-primary/10 ring-1 ring-primary/30",
          isBlocked && "opacity-40",
        )}
        style={{ paddingLeft: `${4 + depth * 12}px` }}
      >
        <button
          type="button"
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded",
            hasChildren && !isBlocked ? "hover:bg-muted" : "opacity-0",
          )}
          tabIndex={hasChildren && !isBlocked ? 0 : -1}
          aria-label={expanded ? "Collapse" : "Expand"}
          disabled={isBlocked || !hasChildren}
          onClick={() => setExpanded((v) => !v)}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : null}
        </button>
        <button
          type="button"
          disabled={disabled || isBlocked}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm",
            isBlocked
              ? "cursor-not-allowed text-muted-foreground"
              : "hover:text-foreground",
          )}
          onClick={() => {
            if (!isBlocked) onChange(folder.id);
          }}
        >
          <FolderIcon className="h-3.5 w-3.5 shrink-0 text-primary/80" />
          <span className="truncate">{folder.name}</span>
          {isBlocked ? (
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              Unavailable
            </span>
          ) : null}
        </button>
      </div>
      {expanded && !isBlocked ? (
        <ul>
          {childrenQuery.isLoading ? (
            <li
              className="py-1 text-[11px] text-muted-foreground"
              style={{ paddingLeft: `${28 + depth * 12}px` }}
            >
              Loading…
            </li>
          ) : null}
          {children.map((child) => (
            <PickerNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              blockedIds={blockedIds}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function FolderDestinationPicker({
  movingFolderId,
  blockedIds,
  value,
  onChange,
  disabled,
}: FolderDestinationPickerProps) {
  const rootQuery = useFolders({ parentId: "root", search: "" });
  const roots = rootQuery.data?.items ?? [];

  // Ensure moving folder itself is always blocked even if set is still loading
  const effectiveBlocked = blockedIds.has(movingFolderId)
    ? blockedIds
    : new Set([...blockedIds, movingFolderId]);

  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-2">
      <ul className="space-y-0.5" role="tree" aria-label="Destination folder">
        <li>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
              value === null
                ? "bg-primary/10 font-medium ring-1 ring-primary/30"
                : "hover:bg-muted/50",
            )}
            onClick={() => onChange(null)}
          >
            <Home className="h-3.5 w-3.5 text-primary" />
            Home
          </button>
        </li>
        {rootQuery.isLoading ? (
          <li className="px-2 py-2 text-xs text-muted-foreground">
            Loading folders…
          </li>
        ) : null}
        {roots.map((folder) => (
          <PickerNode
            key={folder.id}
            folder={folder}
            depth={0}
            blockedIds={effectiveBlocked}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        ))}
      </ul>
    </div>
  );
}

/** Load blocked ids when move dialog opens. */
export function useMoveBlockedIds(folderId: string | null, open: boolean) {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !folderId) {
      setBlockedIds(new Set());
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void import("../../utils/folder-actions")
      .then(({ collectDescendantFolderIds }) =>
        collectDescendantFolderIds(folderId),
      )
      .then((ids) => {
        if (!cancelled) setBlockedIds(ids);
      })
      .catch(() => {
        if (!cancelled) {
          setBlockedIds(new Set([folderId]));
          setError("Could not load folder hierarchy for move validation.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [folderId, open]);

  return { blockedIds, loading, error };
}
