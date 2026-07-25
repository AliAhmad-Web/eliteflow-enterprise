"use client";

import {
  FILE_CATEGORIES,
  PERMISSIONS,
  type FileCategoryValue,
  type ListFilesQueryInput,
  type ManagedFile,
} from "@enterprise/shared";
import {
  Download,
  FileIcon,
  FolderPlus,
  Grid2X2,
  Heart,
  LayoutList,
  Search,
  Share2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useHasPermission,
  useRole,
} from "@/features/rbac/hooks/use-permissions";
import { OpenedFromNotificationBanner } from "@/features/notifications/components/opened-from-notification-banner";
import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useCreateFolder,
  useDeleteFile,
  usePermanentDeleteFile,
  useRestoreFile,
  useShareFile,
  useUpdateFile,
  useUploadFiles,
} from "../hooks/use-file-mutations";
import {
  useFileActivities,
  useFileDetail,
  useFiles,
  useFileVersions,
  useFolders,
} from "../hooks/use-files";
import { filesService } from "../services/files.service";
import {
  FILE_CATEGORY_LABELS,
  formatBytes,
} from "../types/files.types";

const selectClassName =
  "flex h-10 rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50";

type ViewMode = ListFilesQueryInput["view"];
type LayoutMode = "grid" | "table";

export function FileManagerPageContent() {
  const { isClient } = useRole();
  const canUpload = useHasPermission(PERMISSIONS.FILES_UPLOAD) && !isClient;
  const canDelete = useHasPermission(PERMISSIONS.FILES_DELETE);

  const [folderId, setFolderId] = useState<string | "root">("root");
  const [breadcrumb, setBreadcrumb] = useState<
    Array<{ id: string | "root"; name: string }>
  >([{ id: "root", name: "All files" }]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const debouncedSearch = useDebouncedValue(deferredSearch, 300);
  const [category, setCategory] = useState<FileCategoryValue | "ALL">("ALL");
  const [view, setView] = useState<ViewMode>("all");
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const deepLink = useEntityDeepLink((openId) => setSelectedId(openId));
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareClientId, setShareClientId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const foldersQuery = useFolders({
    parentId: folderId,
    search: "",
  });
  const filesQuery = useFiles({
    folderId: view === "all" ? folderId : undefined,
    search: debouncedSearch,
    category: category === "ALL" ? undefined : category,
    view,
    sortBy: "updatedAt",
    sortOrder: "desc",
    page,
    limit: 24,
  });
  const detailQuery = useFileDetail(selectedId);
  const versionsQuery = useFileVersions(selectedId);
  const activityQuery = useFileActivities(selectedId);

  const createFolder = useCreateFolder();
  const uploadFiles = useUploadFiles();
  const updateFile = useUpdateFile();
  const deleteFile = useDeleteFile();
  const restoreFile = useRestoreFile();
  const permanentDelete = usePermanentDeleteFile();
  const shareFile = useShareFile();

  const folders = foldersQuery.data?.items ?? [];
  const files = filesQuery.data?.items ?? [];
  const totalPages = filesQuery.data?.pagination.totalPages ?? 1;
  const selected = detailQuery.data;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setPage(1);
  }, [folderId, deferredSearch, category, view]);

  const openFolder = (id: string, name: string) => {
    setFolderId(id);
    setBreadcrumb((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index >= 0) return current.slice(0, index + 1);
      return [...current, { id, name }];
    });
    setView("all");
  };

  const handleUpload = async (fileList: FileList | File[]) => {
    const filesToUpload = Array.from(fileList);
    if (!filesToUpload.length || !canUpload) return;
    try {
      await uploadFiles.mutateAsync({
        files: filesToUpload,
        folderId: folderId === "root" ? null : folderId,
      });
    } catch {
      // surfaced below
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) {
      void handleUpload(event.dataTransfer.files);
    }
  };

  const handlePreview = async (file: ManagedFile) => {
    setSelectedId(file.id);
    setPreviewText(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!file.previewable && !["DOCUMENT", "SPREADSHEET", "PRESENTATION", "ARCHIVE"].includes(file.category)) {
      return;
    }

    try {
      const blob = await filesService.downloadBlob(file.id, "preview");
      if (file.category === "TEXT") {
        setPreviewText(await blob.text());
        return;
      }
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      // ignore preview errors; details panel still useful
    }
  };

  const handleDownload = async (file: ManagedFile) => {
    const blob = await filesService.downloadBlob(file.id, "download");
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <OpenedFromNotificationBanner
        visible={deepLink.bannerVisible}
        onDismiss={deepLink.dismissBanner}
      />
      <PageHeader
        title="File Manager"
        description="Upload, organize, preview, and share enterprise files."
        actionLabel={canUpload ? "Upload files" : undefined}
        onAction={
          canUpload
            ? () => fileInputRef.current?.click()
            : undefined
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

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="border-border/50">
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Library
            </p>
            {(
              [
                ["all", "All files", FolderPlus],
                ["recent", "Recent", FileIcon],
                ["favorites", "Favorites", Star],
                ["shared", "Shared", Share2],
                ["trash", "Trash", Trash2],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50",
                  view === key && "bg-muted/60 font-medium",
                )}
                onClick={() => {
                  setView(key);
                  if (key !== "all") setFolderId("root");
                }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}

            {view === "all" ? (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Folders
                  </p>
                  {canUpload ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setCreateFolderOpen(true)}
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {foldersQuery.isLoading ? (
                  <LoadingState label="Loading folders" className="border-0" />
                ) : null}
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/40"
                    onClick={() => openFolder(folder.id, folder.name)}
                  >
                    <span className="truncate">{folder.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {folder.fileCount ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {breadcrumb.map((item, index) => (
                <button
                  key={`${item.id}-${index}`}
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => {
                    setBreadcrumb((current) => current.slice(0, index + 1));
                    setFolderId(item.id);
                    setView("all");
                  }}
                >
                  {item.name}
                  {index < breadcrumb.length - 1 ? " /" : ""}
                </button>
              ))}
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
                  placeholder="Search files..."
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

            {canUpload && view === "all" ? (
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
                onDrop={onDrop}
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
                  <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>
                ) : null}
                {uploadFiles.error instanceof ApiClientError ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {uploadFiles.error.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {filesQuery.isLoading ? (
              <LoadingState label="Loading files" className="border-0" />
            ) : null}
            {filesQuery.isError ? (
              <ErrorState
                title="Could not load files"
                description={
                  filesQuery.error instanceof Error
                    ? filesQuery.error.message
                    : "Please try again."
                }
                onRetry={() => void filesQuery.refetch()}
              />
            ) : null}

            {!filesQuery.isLoading && !filesQuery.isError && files.length === 0 ? (
              <EmptyState
                title={deferredSearch ? "No results" : "No files yet"}
                description={
                  deferredSearch
                    ? "Try a different search or filter."
                    : canUpload
                      ? "Upload files to get started."
                      : "Shared files will appear here."
                }
              />
            ) : null}

            {!filesQuery.isLoading && !filesQuery.isError && files.length > 0 ? (
              layout === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      className="rounded-xl border border-border/50 bg-card p-4 text-left hover:border-primary/30"
                      onClick={() => {
                        void handlePreview(file);
                      }}
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
                          onClick={() => {
                            void handlePreview(file);
                          }}
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
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
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
          </CardContent>
        </Card>
      </div>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder in the current location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={createFolder.isPending}
              disabled={!folderName.trim()}
              onClick={() => {
                void createFolder
                  .mutateAsync({
                    name: folderName.trim(),
                    parentId: folderId === "root" ? null : folderId,
                  })
                  .then(() => {
                    setFolderName("");
                    setCreateFolderOpen(false);
                  });
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share file</DialogTitle>
            <DialogDescription>
              Share with a client company by client ID (UUID).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="share-client">Client ID</Label>
            <Input
              id="share-client"
              value={shareClientId}
              onChange={(event) => setShareClientId(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShareOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={shareFile.isPending}
              disabled={!selectedId || !shareClientId.trim()}
              onClick={() => {
                if (!selectedId) return;
                void shareFile
                  .mutateAsync({
                    id: selectedId,
                    input: {
                      sharedWithClientId: shareClientId.trim(),
                      access: "DOWNLOAD",
                    },
                  })
                  .then(() => {
                    setShareOpen(false);
                    setShareClientId("");
                  });
              }}
            >
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setPreviewText(null);
            deepLink.clearDeepLinkParams();
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
          }
        }}
      >
        <SheetContent className="w-full max-w-lg overflow-y-auto bg-background p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-6 py-4 text-left">
            <SheetTitle className="pr-8">
              {selected?.name ?? "File details"}
            </SheetTitle>
          </SheetHeader>
          {selected ? (
            <div className="space-y-4 px-6 py-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {FILE_CATEGORY_LABELS[selected.category]} ·{" "}
                {formatBytes(selected.sizeBytes)} · v{selected.version}
              </p>

              {previewText ? (
                <pre className="max-h-64 overflow-auto rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
                  {previewText}
                </pre>
              ) : null}

              {previewUrl && selected.category === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={selected.name}
                  className="max-h-72 w-full rounded-lg object-contain"
                />
              ) : null}

              {previewUrl && selected.category === "PDF" ? (
                <iframe
                  title={selected.name}
                  src={previewUrl}
                  className="h-72 w-full rounded-lg border border-border/50"
                />
              ) : null}

              {previewUrl && selected.category === "VIDEO" ? (
                <video controls className="w-full rounded-lg" src={previewUrl} />
              ) : null}

              {previewUrl && selected.category === "AUDIO" ? (
                <audio controls className="w-full" src={previewUrl} />
              ) : null}

              {!selected.previewable ? (
                <p className="text-sm text-muted-foreground">
                  Preview is not available for this file type. Download to open
                  it locally.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void handleDownload(selected);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {canUpload ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void updateFile.mutateAsync({
                        id: selected.id,
                        input: { isFavorite: !selected.isFavorite },
                      });
                    }}
                  >
                    <Star className="h-4 w-4" />
                    {selected.isFavorite ? "Unfavorite" : "Favorite"}
                  </Button>
                ) : null}
                {canUpload ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setShareOpen(true)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                ) : null}
                {view === "trash" ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void restoreFile.mutateAsync(selected.id);
                      }}
                    >
                      Restore
                    </Button>
                    {canDelete ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          void permanentDelete.mutateAsync(selected.id).then(() => {
                            setSelectedId(null);
                          });
                        }}
                      >
                        Delete forever
                      </Button>
                    ) : null}
                  </>
                ) : canUpload ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      void deleteFile.mutateAsync(selected.id).then(() => {
                        setSelectedId(null);
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-medium">Versions</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {(versionsQuery.data ?? []).map((version) => (
                    <li key={version.id}>
                      v{version.version} · {formatBytes(version.sizeBytes)} ·{" "}
                      {new Date(version.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium">Activity</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {(activityQuery.data ?? []).map((item) => (
                    <li key={item.id}>
                      {item.action} · {new Date(item.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
