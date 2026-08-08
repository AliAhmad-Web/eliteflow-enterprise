"use client";

import type { Folder } from "@enterprise/shared";
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
} from "lucide-react";
import {
  memo,
  useEffect,
  useRef,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

import { useFolders } from "../../hooks/use-files";
import {
  FolderContextMenu,
  type FolderContextAction,
} from "./folder-context-menu";
import { useFolderNodeExpanded } from "./folder-expanded-store";

export interface FolderTreeNodeProps {
  folder: Folder;
  depth: number;
  selectedId: string | "root";
  onToggle: (id: string) => void;
  onSelect: (folder: Folder) => void;
  onRegister: (folders: Folder[]) => void;
  onFolderAction: (action: FolderContextAction, folder: Folder) => void;
  onDropFolder: (dragFolderId: string, targetFolderId: string) => void;
  onDropFile: (fileId: string, targetFolderId: string) => void;
  canWrite: boolean;
  searchQuery: string;
}

function FolderTreeNodeImpl({
  folder,
  depth,
  selectedId,
  onToggle,
  onSelect,
  onRegister,
  onFolderAction,
  onDropFolder,
  onDropFile,
  canWrite,
  searchQuery,
}: FolderTreeNodeProps) {
  const expanded = useFolderNodeExpanded(folder.id);
  const selected = selectedId === folder.id;
  const hasChildren = (folder.childCount ?? 0) > 0;
  const expandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const childrenQuery = useFolders(
    { parentId: folder.id, search: "" },
    { enabled: expanded },
  );
  const children = childrenQuery.data?.items ?? [];

  useEffect(() => {
    if (expanded && childrenQuery.data?.items) {
      onRegister(childrenQuery.data.items);
    }
  }, [expanded, childrenQuery.data?.items, onRegister]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (folder.name.toLowerCase().includes(q) && hasChildren && !expanded) {
      onToggle(folder.id);
    }
  }, [searchQuery, folder.name, hasChildren, expanded, onToggle, folder.id]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (!expanded && hasChildren) onToggle(folder.id);
      else if (expanded && children[0]) onSelect(children[0]);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (expanded) onToggle(folder.id);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onSelect(folder);
    } else if (event.key === " ") {
      event.preventDefault();
      if (hasChildren) onToggle(folder.id);
    }
  };

  const clearExpandTimer = () => {
    if (expandTimer.current) {
      clearTimeout(expandTimer.current);
      expandTimer.current = null;
    }
  };

  const handleDragStart = (event: ReactDragEvent) => {
    event.dataTransfer.setData("application/x-eliteflow-folder", folder.id);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: ReactDragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!expanded && hasChildren && !expandTimer.current) {
      expandTimer.current = setTimeout(() => {
        onToggle(folder.id);
        expandTimer.current = null;
      }, 600);
    }
  };

  const handleDrop = (event: ReactDragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    clearExpandTimer();
    const dragFolder = event.dataTransfer.getData(
      "application/x-eliteflow-folder",
    );
    const dragFile = event.dataTransfer.getData("application/x-eliteflow-file");
    if (dragFolder && dragFolder !== folder.id) {
      onDropFolder(dragFolder, folder.id);
    } else if (dragFile) {
      onDropFile(dragFile, folder.id);
    }
  };

  const match =
    searchQuery.trim().length > 0 &&
    folder.name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div
        className={cn(
          "group flex items-center gap-0.5 rounded-lg pr-1 text-sm transition-colors",
          selected
            ? "bg-primary/15 text-foreground ring-1 ring-primary/40"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          match && !selected && "bg-amber-500/10",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        draggable={canWrite}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={clearExpandTimer}
        onDrop={handleDrop}
      >
        <button
          type="button"
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            hasChildren ? "hover:bg-muted" : "cursor-default opacity-0",
          )}
          aria-label={expanded ? "Collapse folder" : "Expand folder"}
          tabIndex={hasChildren ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) onToggle(folder.id);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={() => onSelect(folder)}
          onKeyDown={onKeyDown}
          aria-current={selected ? "true" : undefined}
        >
          {expanded ? (
            <FolderOpen
              className={cn(
                "h-4 w-4 shrink-0",
                selected ? "text-primary" : "text-primary/70",
              )}
              aria-hidden
            />
          ) : (
            <FolderIcon
              className={cn(
                "h-4 w-4 shrink-0",
                selected ? "text-primary" : "text-primary/70",
              )}
              aria-hidden
            />
          )}
          <span className="truncate font-medium">{folder.name}</span>
          {(folder.fileCount ?? 0) > 0 ? (
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/80">
              {folder.fileCount}
            </span>
          ) : null}
        </button>

        <FolderContextMenu
          folder={folder}
          canWrite={canWrite}
          onAction={onFolderAction}
        />
      </div>

      {expanded ? (
        <ul
          role="group"
          className="animate-in fade-in-0 slide-in-from-top-1 duration-150"
        >
          {childrenQuery.isLoading ? (
            <li
              className="px-3 py-1 text-[11px] text-muted-foreground"
              style={{ paddingLeft: `${22 + depth * 14}px` }}
            >
              Loading…
            </li>
          ) : null}
          {children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onRegister={onRegister}
              onFolderAction={onFolderAction}
              onDropFolder={onDropFolder}
              onDropFile={onDropFile}
              canWrite={canWrite}
              searchQuery={searchQuery}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function areEqual(
  prev: FolderTreeNodeProps,
  next: FolderTreeNodeProps,
): boolean {
  const prevSelected = prev.selectedId === prev.folder.id;
  const nextSelected = next.selectedId === next.folder.id;

  return (
    prev.folder.id === next.folder.id &&
    prev.folder.name === next.folder.name &&
    prev.folder.childCount === next.folder.childCount &&
    prev.folder.fileCount === next.folder.fileCount &&
    prev.folder.updatedAt === next.folder.updatedAt &&
    prev.depth === next.depth &&
    prevSelected === nextSelected &&
    (prevSelected || nextSelected
      ? prev.selectedId === next.selectedId
      : true) &&
    prev.canWrite === next.canWrite &&
    prev.searchQuery === next.searchQuery &&
    prev.onToggle === next.onToggle &&
    prev.onSelect === next.onSelect &&
    prev.onRegister === next.onRegister &&
    prev.onFolderAction === next.onFolderAction &&
    prev.onDropFolder === next.onDropFolder &&
    prev.onDropFile === next.onDropFile
  );
}

/**
 * Expand state is subscribed per-node via FolderExpandedProvider —
 * toggling one folder does not re-render unrelated siblings.
 */
export const FolderTreeNode = memo(FolderTreeNodeImpl, areEqual);
