"use client";

import type { Folder } from "@enterprise/shared";
import {
  FileIcon,
  FolderPlus,
  Home,
  Search,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type DragEvent as ReactDragEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { useFolders } from "../../hooks/use-files";
import type {
  FolderId,
  FolderTreeState,
} from "../../hooks/use-folder-tree-state";
import type { FolderContextAction } from "./folder-context-menu";
import { FolderExpandedProvider } from "./folder-expanded-store";
import { FolderTreeNode } from "./folder-tree-node";

type LibraryView = "all" | "recent" | "favorites" | "shared" | "trash";

interface FolderTreePanelProps {
  tree: FolderTreeState;
  libraryView: LibraryView;
  onLibraryViewChange: (view: LibraryView) => void;
  onSelectFolder: (id: FolderId, folder?: Folder) => void;
  onRegister: (folders: Folder[]) => void;
  onFolderAction: (action: FolderContextAction, folder: Folder) => void;
  onDropFolder: (dragFolderId: string, targetFolderId: string) => void;
  onDropFile: (fileId: string, targetFolderId: string) => void;
  onCreateFolder: () => void;
  canWrite: boolean;
  folderSearch: string;
  onFolderSearchChange: (value: string) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function TreeBody(
  props: Omit<FolderTreePanelProps, "mobileOpen" | "onMobileOpenChange">,
) {
  const {
    tree,
    libraryView,
    onLibraryViewChange,
    onSelectFolder,
    onRegister,
    onFolderAction,
    onDropFolder,
    onDropFile,
    onCreateFolder,
    canWrite,
    folderSearch,
    onFolderSearchChange,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const rootQuery = useFolders(
    { parentId: "root", search: "" },
    { enabled: tree.ready },
  );

  useEffect(() => {
    if (rootQuery.data?.items) {
      onRegister(rootQuery.data.items);
    }
  }, [rootQuery.data?.items, onRegister]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !tree.ready) return;
    el.scrollTop = tree.scrollTop;
  }, [tree.ready, tree.scrollTop]);

  const roots = rootQuery.data?.items ?? [];
  const rootSelected = tree.selectedId === "root" && libraryView === "all";

  const handleSelectFolder = useCallback(
    (f: Folder) => {
      onLibraryViewChange("all");
      onSelectFolder(f.id, f);
    },
    [onLibraryViewChange, onSelectFolder],
  );

  const onRootDrop = (event: ReactDragEvent) => {
    event.preventDefault();
    const dragFolder = event.dataTransfer.getData(
      "application/x-eliteflow-folder",
    );
    const dragFile = event.dataTransfer.getData("application/x-eliteflow-file");
    if (dragFolder) onDropFolder(dragFolder, "root");
    if (dragFile) onDropFile(dragFile, "root");
  };

  const libraryItems = [
    { key: "all" as const, label: "All files", Icon: Home },
    { key: "recent" as const, label: "Recent", Icon: FileIcon },
    { key: "favorites" as const, label: "Favorites", Icon: Star },
    { key: "shared" as const, label: "Shared", Icon: Share2 },
    { key: "trash" as const, label: "Trash", Icon: Trash2 },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-1 border-b border-border/50 p-3">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Library
        </p>
        {libraryItems.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
              libraryView === key
                ? "bg-primary/15 font-medium text-foreground ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            onClick={() => {
              onLibraryViewChange(key);
              if (key === "all") onSelectFolder("root");
            }}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Folders
        </p>
        {canWrite ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={onCreateFolder}
            aria-label="Create folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="relative px-3 pb-2 pt-1">
        <Search
          className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={folderSearch}
          onChange={(e) => onFolderSearchChange(e.target.value)}
          placeholder="Filter folders…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-3"
        onScroll={(e) => tree.setScrollTop(e.currentTarget.scrollTop)}
      >
        <FolderExpandedProvider expandedIds={tree.expandedIds}>
          <ul role="tree" aria-label="Folder tree" className="space-y-0.5">
            <li role="treeitem">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                  rootSelected
                    ? "bg-primary/15 font-medium text-foreground ring-1 ring-primary/40"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                onClick={() => {
                  onLibraryViewChange("all");
                  onSelectFolder("root");
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={onRootDrop}
              >
                <Home
                  className={cn(
                    "h-4 w-4",
                    rootSelected ? "text-primary" : "text-primary/70",
                  )}
                />
                <span className="truncate font-medium">Home</span>
              </button>
            </li>

            {rootQuery.isLoading ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                Loading folders…
              </li>
            ) : null}

            {roots.map((folder) => (
              <FolderTreeNode
                key={folder.id}
                folder={folder}
                depth={0}
                selectedId={
                  libraryView === "all" ? tree.selectedId : "__none__"
                }
                onToggle={tree.toggleExpanded}
                onSelect={handleSelectFolder}
                onRegister={onRegister}
                onFolderAction={onFolderAction}
                onDropFolder={onDropFolder}
                onDropFile={onDropFile}
                canWrite={canWrite}
                searchQuery={folderSearch}
              />
            ))}

            {!rootQuery.isLoading && roots.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                No folders yet
                {canWrite ? (
                  <>
                    <br />
                    <button
                      type="button"
                      className="mt-2 text-primary underline"
                      onClick={onCreateFolder}
                    >
                      Create folder
                    </button>
                  </>
                ) : null}
              </li>
            ) : null}
          </ul>
        </FolderExpandedProvider>
      </div>
    </div>
  );
}

export function FolderTreePanel(props: FolderTreePanelProps) {
  const { tree, mobileOpen, onMobileOpenChange } = props;

  return (
    <>
      <aside
        className="hidden min-h-[560px] overflow-hidden rounded-xl border border-border/50 bg-card md:flex md:flex-col"
        style={{ width: tree.treeWidth }}
        aria-label="Folder tree"
      >
        <TreeBody {...props} />
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize folder tree"
        className="relative hidden w-1 shrink-0 cursor-col-resize bg-transparent md:block"
        onMouseDown={(event) => {
          event.preventDefault();
          const startX = event.clientX;
          const startW = tree.treeWidth;
          const onMove = (e: MouseEvent) => {
            tree.setTreeWidth(startW + (e.clientX - startX));
          };
          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[min(100%,320px)] p-0">
          <SheetHeader className="border-b border-border px-4 py-3 text-left">
            <SheetTitle>Folders</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100dvh-4rem)]">
            <TreeBody {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
