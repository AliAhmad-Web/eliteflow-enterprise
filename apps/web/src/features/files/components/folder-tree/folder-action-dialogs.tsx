"use client";

import type { Folder } from "@enterprise/shared";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { ApiClientError } from "@/services/api/api-error";

import {
  formatFolderPath,
  listSiblingFolderNames,
  validateFolderName,
} from "../../utils/folder-actions";
import {
  FolderDestinationPicker,
  useMoveBlockedIds,
} from "./folder-destination-picker";

type ToastFn = (message: string, tone?: "success" | "error" | "info") => void;

interface FolderRenameDialogProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (name: string) => Promise<void>;
  pushToast: ToastFn;
}

export function FolderRenameDialog({
  folder,
  open,
  onOpenChange,
  isPending,
  onSubmit,
  pushToast,
}: FolderRenameDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && folder) {
      setValue(folder.name);
      setError(null);
    }
  }, [open, folder]);

  const submit = async () => {
    if (!folder) return;
    const validation = validateFolderName(value);
    if (validation) {
      setError(validation);
      return;
    }
    const trimmed = value.trim();
    if (trimmed === folder.name) {
      onOpenChange(false);
      return;
    }
    try {
      const siblings = await listSiblingFolderNames(folder.parentId);
      const clash = siblings.some(
        (n) =>
          n.toLowerCase() === trimmed.toLowerCase() &&
          n.toLowerCase() !== folder.name.toLowerCase(),
      );
      if (clash) {
        setError("A folder with this name already exists here.");
        return;
      }
      setError(null);
      await onSubmit(trimmed);
      pushToast(`Renamed to “${trimmed}”`, "success");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not rename folder.";
      setError(message);
      pushToast(message, "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename folder</DialogTitle>
          <DialogDescription>
            Choose a new name for “{folder?.name}”.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-folder-name">Name</Label>
          <Input
            id="rename-folder-name"
            value={value}
            autoFocus
            disabled={isPending}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            disabled={!value.trim()}
            onClick={() => void submit()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FolderMoveDialogProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (parentId: string | null) => Promise<void>;
  pushToast: ToastFn;
}

export function FolderMoveDialog({
  folder,
  open,
  onOpenChange,
  isPending,
  onSubmit,
  pushToast,
}: FolderMoveDialogProps) {
  const [destParentId, setDestParentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { blockedIds, loading, error: loadError } = useMoveBlockedIds(
    folder?.id ?? null,
    open,
  );

  useEffect(() => {
    if (open && folder) {
      setDestParentId(folder.parentId);
      setError(null);
    }
  }, [open, folder]);

  const submit = async () => {
    if (!folder) return;
    const nextParent = destParentId;
    if (nextParent === folder.parentId) {
      onOpenChange(false);
      return;
    }
    if (nextParent && blockedIds.has(nextParent)) {
      setError("Cannot move a folder into itself or one of its subfolders.");
      return;
    }
    try {
      setError(null);
      await onSubmit(nextParent);
      pushToast(`Moved “${folder.name}”`, "success");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not move folder.";
      setError(message);
      pushToast(message, "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move folder</DialogTitle>
          <DialogDescription>
            Choose a new location for “{folder?.name}”. Moving into itself or a
            child folder is blocked.
          </DialogDescription>
        </DialogHeader>
        {folder ? (
          <FolderDestinationPicker
            movingFolderId={folder.id}
            blockedIds={blockedIds}
            value={destParentId}
            onChange={(id) => {
              setDestParentId(id);
              setError(null);
            }}
            disabled={isPending || loading}
          />
        ) : null}
        {loading ? (
          <p className="text-xs text-muted-foreground">
            Validating folder hierarchy…
          </p>
        ) : null}
        {loadError || error ? (
          <p className="text-sm text-destructive" role="alert">
            {error ?? loadError}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            disabled={!folder || loading}
            onClick={() => void submit()}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FolderDeleteDialogProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => Promise<void>;
  pushToast: ToastFn;
}

export function FolderDeleteDialog({
  folder,
  open,
  onOpenChange,
  isPending,
  onConfirm,
  pushToast,
}: FolderDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const submit = async () => {
    if (!folder) return;
    try {
      setError(null);
      await onConfirm();
      pushToast(`Deleted “${folder.name}”`, "success");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not delete folder.";
      setError(message);
      pushToast(message, "error");
    }
  };

  const fileCount = folder?.fileCount ?? 0;
  const childCount = folder?.childCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete folder</DialogTitle>
          <DialogDescription>
            This permanently removes the folder and its contents from File
            Manager. This action cannot be undone from here.
          </DialogDescription>
        </DialogHeader>
        {folder ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Folder</span>
              <span className="font-medium">{folder.name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Files</span>
              <span>{fileCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subfolders</span>
              <span>{childCount}</span>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            isLoading={isPending}
            disabled={!folder}
            onClick={() => void submit()}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FolderPropertiesDialogProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getParent: (id: string) => Folder | null;
}

export function FolderPropertiesDialog({
  folder,
  open,
  onOpenChange,
  getParent,
}: FolderPropertiesDialogProps) {
  const path = folder ? formatFolderPath(folder, getParent) : "";
  const rows: { label: string; value: string }[] = folder
    ? [
        { label: "Folder name", value: folder.name },
        {
          label: "Owner",
          value: folder.createdById
            ? `${folder.createdById.slice(0, 8)}…`
            : "—",
        },
        {
          label: "Created",
          value: new Date(folder.createdAt).toLocaleString(),
        },
        {
          label: "Modified",
          value: new Date(folder.updatedAt).toLocaleString(),
        },
        { label: "Path", value: path },
        { label: "Total files", value: String(folder.fileCount ?? 0) },
        {
          label: "Total subfolders",
          value: String(folder.childCount ?? 0),
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Folder properties</DialogTitle>
          <DialogDescription>
            {folder ? `Details for “${folder.name}”.` : "Folder details"}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-2.5 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 border-b border-border/40 pb-2 last:border-0"
            >
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="max-w-[60%] break-words text-right font-medium">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FolderDuplicateDialogProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  progress: string | null;
  onConfirm: () => Promise<void>;
  pushToast: ToastFn;
}

export function FolderDuplicateDialog({
  folder,
  open,
  onOpenChange,
  isPending,
  progress,
  onConfirm,
  pushToast,
}: FolderDuplicateDialogProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const submit = async () => {
    if (!folder) return;
    try {
      setError(null);
      await onConfirm();
      pushToast(`Duplicated “${folder.name}”`, "success");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not duplicate folder.";
      setError(message);
      pushToast(message, "error");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate folder</DialogTitle>
          <DialogDescription>
            Creates a full copy of “{folder?.name}” (including nested folders
            and files) as a sibling. Large folders may take a while.
          </DialogDescription>
        </DialogHeader>
        {progress ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {progress}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            disabled={!folder}
            onClick={() => void submit()}
          >
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
