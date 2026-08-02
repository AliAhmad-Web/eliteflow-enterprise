"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { MarkdownView } from "./markdown-view";

export type AiDocumentAutosaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

export interface AiDocumentEditorProps {
  open: boolean;
  title: string;
  content: string;
  errorMessage: string | null;
  isSaving: boolean;
  livePreview: boolean;
  autosaveEnabled: boolean;
  autosaveStatus: AiDocumentAutosaveStatus;
  onOpenChange: (open: boolean) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
}

function autosaveStatusLabel(status: AiDocumentAutosaveStatus): string {
  switch (status) {
    case "idle":
      return "All changes saved";
    case "dirty":
      return "Unsaved changes…";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "error":
      return "Autosave failed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function AiDocumentEditor({
  open,
  title,
  content,
  errorMessage,
  isSaving,
  livePreview,
  autosaveEnabled,
  autosaveStatus,
  onOpenChange,
  onTitleChange,
  onContentChange,
  onSave,
}: AiDocumentEditorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(livePreview ? "sm:max-w-4xl" : "sm:max-w-2xl")}
      >
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Update the title or markdown content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </div>
          <div
            className={cn(
              "space-y-2",
              livePreview && "grid gap-3 md:grid-cols-2 md:space-y-0",
            )}
          >
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                rows={12}
                value={content}
                onChange={(event) => onContentChange(event.target.value)}
                className="font-mono text-sm"
              />
            </div>
            {livePreview ? (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="max-h-[18.5rem] overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3">
                  <MarkdownView content={content || "_Nothing to preview_"} />
                </div>
              </div>
            ) : null}
          </div>
          {autosaveEnabled ? (
            <p
              className={cn(
                "text-xs text-muted-foreground",
                autosaveStatus === "error" && "text-destructive",
                autosaveStatus === "saved" && "text-emerald-600 dark:text-emerald-400",
              )}
              aria-live="polite"
            >
              {autosaveStatusLabel(autosaveStatus)}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" isLoading={isSaving} onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
