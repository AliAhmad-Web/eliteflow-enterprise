"use client";

import {
  FILE_CATEGORIES,
  PERMISSIONS,
  type FileCategoryValue,
  type Folder,
  type ListFilesQueryInput,
} from "@enterprise/shared";
import {
  FileIcon,
  Folder as FolderIcon,
  FolderPlus,
  Grid2X2,
  Heart,
  LayoutList,
  PanelLeft,
  Search,
  Upload,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AiUiToastViewport,
  useAiUiToasts,
} from "@/features/ai/components/ai-ui-toast";
import { ClientWorkspaceGate } from "@/features/quotes/components/client-workspace-gate";
import {
  useHasPermission,
} from "@/features/rbac/hooks/use-permissions";
import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useCreateFolder,
  useDeleteFolder,
  useMoveFile,
  useUpdateFolder,
  useUploadFiles,
} from "../hooks/use-file-mutations";
import { useFolderRegistry } from "../hooks/use-folder-registry";
import { useFolderTreeState } from "../hooks/use-folder-tree-state";
import { useFiles, useFolders } from "../hooks/use-files";
import {
  collectDescendantFolderIds,
  folderDeepLink,
  validateFolderName,
} from "../utils/folder-actions";
import { duplicateFolderStructure } from "../utils/folder-duplicate";
import {
  FILES_QUERY_KEYS,
  FILE_CATEGORY_LABELS,
  formatBytes,
} from "../types/files.types";
import {
  FolderDeleteDialog,
  FolderDuplicateDialog,
  FolderMoveDialog,
  FolderPropertiesDialog,
  FolderRenameDialog,
} from "./folder-tree/folder-action-dialogs";
import type { FolderContextAction } from "./folder-tree/folder-context-menu";
import { FolderTreePanel } from "./folder-tree/folder-tree-panel";
import { fileViewerPath } from "./file-viewer/file-viewer.utils";

const selectClassName =
  "flex h-10 rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50";

type LibraryView = ListFilesQueryInput["view"];
type LayoutMode = "grid" | "table";

export function FileManagerPageContent() {
  return (
    <ClientWorkspaceGate>
      <FileManagerPageBody />
    </ClientWorkspaceGate>
  );
}

function FileManagerPageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const canUpload = useHasPermission(PERMISSIONS.FILES_UPLOAD);
  const { toasts, pushToast, dismiss } = useAiUiToasts();

  const tree = useFolderTreeState();
  const registry = useFolderRegistry();

  const [libraryView, setLibraryView] = useState<LibraryView>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [folderSearch, setFolderSearch] = useState("");
  const [category, setCategory] = useState<FileCategoryValue | "ALL">("ALL");
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [page, setPage] = useState(1);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [createFolderError, setCreateFolderError] = useState<string | null>(
    null,
  );
  const [renameTarget, setRenameTarget] = useState<Folder | null>(null);
  const [moveTarget, setMoveTarget] = useState<Folder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Folder | null>(null);
  const [duplicatePending, setDuplicatePending] = useState(false);
  const [duplicateProgress, setDuplicateProgress] = useState<string | null>(
    null,
  );
  const [propertiesFolder, setPropertiesFolder] = useState<Folder | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderDeepLinkHandled = useRef<string | null>(null);

  useEntityDeepLink((openId) => {
    router.replace(fileViewerPath(openId));
  });

  const selectedFolderId = tree.selectedId;
  const breadcrumb = registry.getPath(selectedFolderId);

  const childFoldersQuery = useFolders(
    {
      parentId: selectedFolderId,
      search: "",
    },
    { enabled: tree.ready && libraryView === "all" },
  );

  const filesQuery = useFiles(
    {
      folderId: libraryView === "all" ? selectedFolderId : undefined,
      search: debouncedSearch,
      category: category === "ALL" ? undefined : category,
      view: libraryView,
      sortBy: "updatedAt",
      sortOrder: "desc",
      page,
      limit: 24,
    },
    { enabled: tree.ready },
  );

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const uploadFiles = useUploadFiles();
  const moveFile = useMoveFile();

  useEffect(() => {
    if (childFoldersQuery.data?.items) {
      registry.register(childFoldersQuery.data.items);
    }
  }, [childFoldersQuery.data?.items, registry]);

  useEffect(() => {
    setPage(1);
  }, [selectedFolderId, deferredSearch, category, libraryView]);

  useEffect(() => {
    if (folderSearch.trim()) {
      tree.beginSearchExpansion();
    } else {
      tree.endSearchExpansion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to search text
  }, [folderSearch]);

  // Deep-link: /file-manager?folder=<id>
  useEffect(() => {
    if (!tree.ready) return;
    const folderId = searchParams.get("folder");
    if (!folderId || folderDeepLinkHandled.current === folderId) return;
    folderDeepLinkHandled.current = folderId;

    tree.setSelectedId(folderId);
    tree.expandFolder(folderId);
    setLibraryView("all");
  }, [tree.ready, searchParams, tree.setSelectedId, tree.expandFolder]);

  const childFolders = childFoldersQuery.data?.items ?? [];
  const files = filesQuery.data?.items ?? [];
  const totalPages = filesQuery.data?.pagination.totalPages ?? 1;
  const selectedFolder =
    selectedFolderId === "root" ? null : registry.getFolder(selectedFolderId);

  const openFile = (fileId: string) => {
    router.push(fileViewerPath(fileId));
  };

  const selectFolder = (id: string | "root", folder?: Folder) => {
    if (folder) registry.register([folder]);
    tree.setSelectedId(id);
    if (id !== "root") tree.expandFolder(id);
    setLibraryView("all");
    setMobileTreeOpen(false);
  };

  const handleUpload = async (fileList: FileList | File[]) => {
    const filesToUpload = Array.from(fileList);
    if (!filesToUpload.length || !canUpload) return;
    try {
      await uploadFiles.mutateAsync({
        files: filesToUpload,
        folderId: selectedFolderId === "root" ? null : selectedFolderId,
      });
      pushToast("Upload complete", "success");
    } catch (err) {
      pushToast(
        err instanceof ApiClientError ? err.message : "Upload failed",
        "error",
      );
    }
  };

  const onDropUpload = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) {
      void handleUpload(event.dataTransfer.files);
    }
  };

  const handleDropFolder = (dragFolderId: string, targetFolderId: string) => {
    if (!canUpload) return;
    if (dragFolderId === targetFolderId) return;
    void (async () => {
      try {
        const blocked = await collectDescendantFolderIds(dragFolderId);
        if (targetFolderId !== "root" && blocked.has(targetFolderId)) {
          pushToast(
            "Cannot move a folder into itself or a subfolder.",
            "error",
          );
          return;
        }
        await updateFolder.mutateAsync({
          id: dragFolderId,
          input: {
            parentId: targetFolderId === "root" ? null : targetFolderId,
          },
        });
        if (targetFolderId !== "root") tree.expandFolder(targetFolderId);
        pushToast("Folder moved", "success");
      } catch (err) {
        pushToast(
          err instanceof ApiClientError ? err.message : "Could not move folder",
          "error",
        );
      }
    })();
  };

  const handleDropFile = (fileId: string, targetFolderId: string) => {
    if (!canUpload) return;
    void moveFile
      .mutateAsync({
        id: fileId,
        input: {
          folderId: targetFolderId === "root" ? null : targetFolderId,
        },
      })
      .then(() => {
        if (targetFolderId !== "root") tree.expandFolder(targetFolderId);
        pushToast("File moved", "success");
      })
      .catch((err: unknown) => {
        pushToast(
          err instanceof ApiClientError ? err.message : "Could not move file",
          "error",
        );
      });
  };

  const handleFolderAction = (action: FolderContextAction, folder: Folder) => {
    registry.register([folder]);
    switch (action) {
      case "open":
        selectFolder(folder.id, folder);
        break;
      case "rename":
        setRenameTarget(folder);
        break;
      case "move":
        setMoveTarget(folder);
        break;
      case "duplicate":
        setDuplicateTarget(folder);
        break;
      case "copyLink":
        void navigator.clipboard
          .writeText(folderDeepLink(folder.id))
          .then(() => pushToast("Folder link copied", "success"))
          .catch(() => pushToast("Could not copy link", "error"));
        break;
      case "properties":
        setPropertiesFolder(folder);
        break;
      case "delete":
        setDeleteTarget(folder);
        break;
      default:
        break;
    }
  };

  const currentTitle =
    libraryView === "trash"
      ? "Trash"
      : libraryView === "favorites"
        ? "Favorites"
        : libraryView === "shared"
          ? "Shared"
          : libraryView === "recent"
            ? "Recent"
            : (selectedFolder?.name ?? "Home");

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Manager"
        description="Upload, organize, preview, and share enterprise files."
        actionLabel={canUpload ? "Upload files" : undefined}
        onAction={
          canUpload ? () => fileInputRef.current?.click() : undefined
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void handleUpload(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="flex min-h-[560px] gap-0 md:gap-0">
        <FolderTreePanel
          tree={tree}
          libraryView={libraryView}
          onLibraryViewChange={setLibraryView}
          onSelectFolder={selectFolder}
          onRegister={registry.register}
          onFolderAction={handleFolderAction}
          onDropFolder={handleDropFolder}
          onDropFile={handleDropFile}
          onCreateFolder={() => {
            setCreateFolderError(null);
            setCreateFolderOpen(true);
          }}
          canWrite={canUpload}
          folderSearch={folderSearch}
          onFolderSearchChange={setFolderSearch}
          mobileOpen={mobileTreeOpen}
          onMobileOpenChange={setMobileTreeOpen}
        />

        <Card className="min-w-0 flex-1 border-border/50">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="md:hidden"
                onClick={() => setMobileTreeOpen(true)}
              >
                <PanelLeft className="h-4 w-4" />
                Folders
              </Button>

              <nav
                className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm text-muted-foreground"
                aria-label="Breadcrumb"
              >
                {libraryView === "all" ? (
                  breadcrumb.map((item, index) => (
                    <span
                      key={`${item.id}-${index}`}
                      className="flex items-center gap-1"
                    >
                      {index > 0 ? (
                        <span
                          className="text-muted-foreground/60"
                          aria-hidden
                        >
                          ›
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={cn(
                          "truncate hover:text-foreground",
                          index === breadcrumb.length - 1 &&
                            "font-medium text-foreground",
                        )}
                        onClick={() => {
                          selectFolder(item.id);
                          breadcrumb.slice(1, index + 1).forEach((crumb) => {
                            if (crumb.id !== "root") {
                              tree.expandFolder(crumb.id);
                            }
                          });
                        }}
                      >
                        {item.name}
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="font-medium text-foreground">
                    {currentTitle}
                  </span>
                )}
              </nav>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {currentTitle}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {libraryView === "all" ? (
                    <>
                      {childFolders.length} folder
                      {childFolders.length === 1 ? "" : "s"} ·{" "}
                      {filesQuery.data?.pagination.total ?? files.length} file
                      {(filesQuery.data?.pagination.total ?? files.length) === 1
                        ? ""
                        : "s"}
                    </>
                  ) : (
                    <>
                      {filesQuery.data?.pagination.total ?? files.length} item
                      {(filesQuery.data?.pagination.total ?? files.length) === 1
                        ? ""
                        : "s"}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search files…"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={cn(selectClassName, "min-w-[140px]")}
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as FileCategoryValue | "ALL")
                  }
                >
                  <option value="ALL">All categories</option>
                  {FILE_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {FILE_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="icon"
                  variant={layout === "grid" ? "default" : "outline"}
                  onClick={() => setLayout("grid")}
                  aria-label="Grid view"
                >
                  <Grid2X2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={layout === "table" ? "default" : "outline"}
                  onClick={() => setLayout("table")}
                  aria-label="Table view"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {canUpload && libraryView === "all" ? (
              <div
                className={cn(
                  "rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-center transition",
                  dragging && "border-primary bg-primary/5",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDropUpload}
              >
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-foreground">
                  Drag & drop files here, or{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </button>
                </p>
                {uploadFiles.isPending ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Uploading…
                  </p>
                ) : null}
                {uploadFiles.error instanceof ApiClientError ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {uploadFiles.error.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {libraryView === "all" && childFolders.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Folders
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {childFolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-3 text-left hover:border-primary/30"
                      onClick={() => {
                        if (selectedFolderId !== "root") {
                          tree.expandFolder(selectedFolderId);
                        }
                        selectFolder(folder.id, folder);
                        tree.expandFolder(folder.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dragFolder = e.dataTransfer.getData(
                          "application/x-eliteflow-folder",
                        );
                        const dragFile = e.dataTransfer.getData(
                          "application/x-eliteflow-file",
                        );
                        if (dragFolder)
                          handleDropFolder(dragFolder, folder.id);
                        if (dragFile) handleDropFile(dragFile, folder.id);
                      }}
                    >
                      <FolderIcon className="h-5 w-5 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {folder.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {folder.childCount ?? 0} sub · {folder.fileCount ?? 0}{" "}
                          files
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {filesQuery.isLoading ? (
              <LoadingState label="Loading files" className="border-0" />
            ) : null}
            {filesQuery.isError ? (
              <ErrorState
                title="Could not load files"
                description={
                  filesQuery.error instanceof ApiClientError
                    ? filesQuery.error.status >= 500
                      ? "Server or database is temporarily unavailable. Wait a moment and try again."
                      : filesQuery.error.message
                    : filesQuery.error instanceof Error
                      ? filesQuery.error.message
                      : "Please try again."
                }
                onRetry={() => void filesQuery.refetch()}
              />
            ) : null}

            {!filesQuery.isLoading &&
            !filesQuery.isError &&
            files.length === 0 &&
            (libraryView !== "all" || childFolders.length === 0) ? (
              <EmptyState
                title={
                  deferredSearch
                    ? "No results"
                    : libraryView === "all"
                      ? "Empty folder"
                      : "Nothing here"
                }
                description={
                  deferredSearch
                    ? "Try a different search or filter."
                    : libraryView === "all" && canUpload
                      ? "Create a folder or upload files to get started."
                      : "Items will appear here."
                }
                actionLabel={
                  libraryView === "all" && canUpload && !deferredSearch
                    ? "Upload files"
                    : undefined
                }
                onAction={
                  libraryView === "all" && canUpload && !deferredSearch
                    ? () => fileInputRef.current?.click()
                    : undefined
                }
              />
            ) : null}

            {!filesQuery.isLoading &&
            !filesQuery.isError &&
            files.length > 0 ? (
              layout === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      className="rounded-xl border border-border/50 bg-card p-4 text-left hover:border-primary/30"
                      draggable={canUpload}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/x-eliteflow-file",
                          file.id,
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => openFile(file.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <FileIcon className="h-5 w-5 text-primary" />
                        {file.isFavorite ? (
                          <Heart className="h-4 w-4 fill-current text-primary" />
                        ) : null}
                      </div>
                      <p className="mt-3 truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {FILE_CATEGORY_LABELS[file.category]} ·{" "}
                        {formatBytes(file.sizeBytes)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr
                          key={file.id}
                          className="cursor-pointer border-t border-border/50 hover:bg-muted/20"
                          draggable={canUpload}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "application/x-eliteflow-file",
                              file.id,
                            );
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => openFile(file.id)}
                        >
                          <td className="px-4 py-3 font-medium">{file.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {FILE_CATEGORY_LABELS[file.category]}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(file.updatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}

            {totalPages > 1 ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {libraryView === "all" && canUpload ? (
              <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setCreateFolderError(null);
                    setCreateFolderOpen(true);
                  }}
                >
                  <FolderPlus className="h-4 w-4" />
                  Create folder
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Upload files
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={createFolderOpen}
        onOpenChange={(open) => {
          setCreateFolderOpen(open);
          if (!open) {
            setFolderName("");
            setCreateFolderError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder in{" "}
              {selectedFolderId === "root"
                ? "Home"
                : (selectedFolder?.name ?? "the current location")}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              disabled={createFolder.isPending}
              onChange={(event) => {
                setFolderName(event.target.value);
                setCreateFolderError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("create-folder-submit")?.click();
                }
              }}
            />
            {createFolderError ? (
              <p className="text-sm text-destructive" role="alert">
                {createFolderError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={createFolder.isPending}
              onClick={() => setCreateFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              id="create-folder-submit"
              type="button"
              isLoading={createFolder.isPending}
              disabled={!folderName.trim()}
              onClick={() => {
                const validation = validateFolderName(folderName);
                if (validation) {
                  setCreateFolderError(validation);
                  return;
                }
                void createFolder
                  .mutateAsync({
                    name: folderName.trim(),
                    parentId:
                      selectedFolderId === "root" ? null : selectedFolderId,
                  })
                  .then(() => {
                    setFolderName("");
                    setCreateFolderOpen(false);
                    if (selectedFolderId !== "root") {
                      tree.expandFolder(selectedFolderId);
                    }
                    pushToast("Folder created", "success");
                  })
                  .catch((err: unknown) => {
                    const message =
                      err instanceof ApiClientError
                        ? err.message
                        : "Could not create folder.";
                    setCreateFolderError(message);
                    pushToast(message, "error");
                  });
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FolderRenameDialog
        folder={renameTarget}
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        isPending={updateFolder.isPending}
        onSubmit={async (name) => {
          if (!renameTarget) return;
          const updated = await updateFolder.mutateAsync({
            id: renameTarget.id,
            input: { name },
          });
          registry.register([updated]);
        }}
        pushToast={pushToast}
      />

      <FolderMoveDialog
        folder={moveTarget}
        open={Boolean(moveTarget)}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null);
        }}
        isPending={updateFolder.isPending}
        onSubmit={async (parentId) => {
          if (!moveTarget) return;
          const updated = await updateFolder.mutateAsync({
            id: moveTarget.id,
            input: { parentId },
          });
          registry.register([updated]);
          if (parentId) tree.expandFolder(parentId);
        }}
        pushToast={pushToast}
      />

      <FolderDeleteDialog
        folder={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        isPending={deleteFolder.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          const parentId = deleteTarget.parentId;
          await deleteFolder.mutateAsync(id);
          if (tree.selectedId === id) {
            tree.setSelectedId(parentId ?? "root");
          }
        }}
        pushToast={pushToast}
      />

      <FolderDuplicateDialog
        folder={duplicateTarget}
        open={Boolean(duplicateTarget)}
        onOpenChange={(open) => {
          if (!open && !duplicatePending) {
            setDuplicateTarget(null);
            setDuplicateProgress(null);
          }
        }}
        isPending={duplicatePending}
        progress={duplicateProgress}
        onConfirm={async () => {
          if (!duplicateTarget) return;
          setDuplicatePending(true);
          setDuplicateProgress("Preparing…");
          try {
            const created = await duplicateFolderStructure(
              duplicateTarget,
              setDuplicateProgress,
            );
            registry.register([created]);
            if (created.parentId) tree.expandFolder(created.parentId);
            else tree.expandFolder(created.id);
            await queryClient.invalidateQueries({
              queryKey: FILES_QUERY_KEYS.all,
            });
          } finally {
            setDuplicatePending(false);
            setDuplicateProgress(null);
          }
        }}
        pushToast={pushToast}
      />

      <FolderPropertiesDialog
        folder={propertiesFolder}
        open={Boolean(propertiesFolder)}
        onOpenChange={(open) => {
          if (!open) setPropertiesFolder(null);
        }}
        getParent={registry.getFolder}
      />

      <AiUiToastViewport toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
