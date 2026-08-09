"use client";

import { PERMISSIONS } from "@enterprise/shared";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import {
  useHasPermission,
} from "@/features/rbac/hooks/use-permissions";

import {
  useShareFile,
  useUnshareFile,
  useUpdateFile,
} from "../../hooks/use-file-mutations";
import {
  useFileActivities,
  useFileDetail,
  useFileShares,
  useFileVersions,
} from "../../hooks/use-files";
import { filesService } from "../../services/files.service";
import { FileViewerHeader } from "./file-viewer-header";
import { FileViewerSidebar } from "./file-viewer-sidebar";
import { FileViewerStage } from "./file-viewer-stage";
import { FileViewerStatusBar } from "./file-viewer-status-bar";
import { useFilePreviewBlob } from "./use-file-preview-blob";

export function FileViewerPageContent() {
  const params = useParams<{ id: string }>();
  const fileId = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const canWrite = useHasPermission(PERMISSIONS.FILES_UPLOAD);

  const detailQuery = useFileDetail(fileId || null);
  const versionsQuery = useFileVersions(fileId || null);
  const activityQuery = useFileActivities(fileId || null);
  const sharesQuery = useFileShares(fileId || null, { enabled: canWrite });
  const updateFile = useUpdateFile();
  const shareFile = useShareFile();
  const unshareFile = useUnshareFile();

  const file = detailQuery.data;
  const preview = useFilePreviewBlob(file);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [status, setStatus] = useState("Initializing");
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [shareClientId, setShareClientId] = useState("");

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (preview.status === "loading") setStatus("Loading preview…");
    if (preview.status === "ready") setStatus("Preview ready");
    if (preview.status === "error") setStatus("Preview failed");
    if (preview.status === "unsupported") setStatus("Preview unavailable");
  }, [preview.status]);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(ROUTES.FILE_MANAGER);
  }, [router]);

  const handleDownload = useCallback(async () => {
    if (!file) return;
    const blob = await filesService.downloadBlob(file.id, "download");
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [file]);

  const handlePrint = useCallback(() => {
    if (preview.url && file?.category === "PDF") {
      const w = window.open(preview.url, "_blank");
      w?.addEventListener("load", () => w.print());
      return;
    }
    window.print();
  }, [file?.category, preview.url]);

  if (!fileId) {
    return (
      <ErrorState
        title="Invalid file"
        description="Missing file id."
        onRetry={() => router.push(ROUTES.FILE_MANAGER)}
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <LoadingState label="Opening file" className="border-0" />
      </div>
    );
  }

  if (detailQuery.isError || !file) {
    return (
      <ErrorState
        title="Could not open file"
        description={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "The file may have been deleted or you lack access."
        }
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  return (
    <>
      {/* Immersive full-viewport document viewer */}
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <FileViewerHeader
          file={file}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onBack={handleBack}
          onDownload={() => void handleDownload()}
          onShare={() => setShareOpen(true)}
          onFavorite={() => {
            void updateFile.mutateAsync({
              id: file.id,
              input: { isFavorite: !file.isFavorite },
            });
          }}
          onPrint={handlePrint}
          canWrite={canWrite}
          favoritePending={updateFile.isPending}
        />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative min-h-0 min-w-0 flex-1">
            <FileViewerStage
              file={file}
              preview={preview}
              sidebarOpen={sidebarOpen}
              onDownload={() => void handleDownload()}
              onZoomChange={setZoom}
              onStatusChange={setStatus}
            />
          </div>

          <FileViewerSidebar
            file={file}
            versions={versionsQuery.data ?? []}
            activities={activityQuery.data ?? []}
            shares={sharesQuery.data ?? []}
            sharesLoading={sharesQuery.isLoading}
            canManageShares={canWrite}
            unsharePendingId={
              unshareFile.isPending
                ? ((unshareFile.variables as string | undefined) ?? null)
                : null
            }
            onUnshare={(shareId) => {
              void unshareFile.mutateAsync(shareId);
            }}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        <FileViewerStatusBar
          zoom={zoom}
          status={status}
          sizeBytes={file.sizeBytes}
          online={online}
        />
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share file</DialogTitle>
            <DialogDescription>
              Share with a client company by client ID (UUID).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="viewer-share-client">Client ID</Label>
            <Input
              id="viewer-share-client"
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
              disabled={!shareClientId.trim()}
              onClick={() => {
                void shareFile
                  .mutateAsync({
                    id: file.id,
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
    </>
  );
}
