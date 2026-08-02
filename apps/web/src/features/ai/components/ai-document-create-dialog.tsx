"use client";

import {
  AI_DOCUMENT_TYPES,
  type AiDocumentTypeValue,
} from "@enterprise/shared";
import { Sparkles } from "lucide-react";

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
import { maybeMemo, usePerformanceStableCallback } from "@/features/performance";
import { cn } from "@/lib/utils";

import { AI_DOCUMENT_TYPE_LABELS } from "../types/ai.types";
import type { AiDocumentTemplate } from "./ai-document-templates";
import { AI_DOCUMENTS_SELECT_CLASS_NAME } from "./ai-documents-form-styles";

export type AiDocumentCreateMode = "generate" | "manual";

export interface AiDocumentCreateDialogProps {
  open: boolean;
  type: AiDocumentTypeValue;
  title: string;
  prompt: string;
  content: string;
  createMode: AiDocumentCreateMode;
  errorMessage: string | null;
  isCreating: boolean;
  allowManualCreate: boolean;
  showTemplatePresets: boolean;
  templates: readonly AiDocumentTemplate[];
  onOpenChange: (open: boolean) => void;
  onTypeChange: (value: AiDocumentTypeValue) => void;
  onTitleChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onCreateModeChange: (mode: AiDocumentCreateMode) => void;
  onApplyTemplate: (template: AiDocumentTemplate) => void;
  onSubmit: () => void;
}

function AiDocumentCreateDialogComponent({
  open,
  type,
  title,
  prompt,
  content,
  createMode,
  errorMessage,
  isCreating,
  allowManualCreate,
  showTemplatePresets,
  templates,
  onOpenChange,
  onTypeChange,
  onTitleChange,
  onPromptChange,
  onContentChange,
  onCreateModeChange,
  onApplyTemplate,
  onSubmit,
}: AiDocumentCreateDialogProps) {
  const isManual = allowManualCreate && createMode === "manual";
  const canSubmit = isManual
    ? content.trim().length > 0
    : prompt.trim().length > 0;
  const handleCancel = usePerformanceStableCallback(() => {
    if (!isCreating) onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isCreating && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="space-y-3 border-b border-border/60 bg-muted/25 px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle>
                {isManual ? "Create document" : "Generate AI document"}
              </DialogTitle>
              <DialogDescription>
                {isManual
                  ? "Write markdown content directly without AI generation."
                  : "Pick a type, describe what you need, and EliteFlow will draft the document for you."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {allowManualCreate ? (
            <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/20 p-1">
              <Button
                type="button"
                size="sm"
                variant={createMode === "generate" ? "default" : "ghost"}
                className="flex-1"
                disabled={isCreating}
                onClick={() => onCreateModeChange("generate")}
              >
                Generate with AI
              </Button>
              <Button
                type="button"
                size="sm"
                variant={createMode === "manual" ? "default" : "ghost"}
                className="flex-1"
                disabled={isCreating}
                onClick={() => onCreateModeChange("manual")}
              >
                Write manually
              </Button>
            </div>
          ) : null}

          {showTemplatePresets ? (
            <div className="space-y-2">
              <Label>Quick templates</Label>
              <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    disabled={isCreating}
                    className={cn(
                      "rounded-xl border border-border/50 bg-card px-3 py-2.5 text-left transition hover:border-primary/30 hover:bg-muted/20 disabled:opacity-50",
                      type === template.type &&
                        prompt.startsWith(
                          template.defaultPrompt.slice(0, 24),
                        ) &&
                        "border-primary/40 bg-primary/5",
                    )}
                    onClick={() => onApplyTemplate(template)}
                  >
                    <p className="text-xs font-medium text-foreground">
                      {template.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Type</Label>
              <select
                id="doc-type"
                className={AI_DOCUMENTS_SELECT_CLASS_NAME}
                value={type}
                disabled={isCreating}
                onChange={(event) =>
                  onTypeChange(event.target.value as AiDocumentTypeValue)
                }
              >
                {AI_DOCUMENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {AI_DOCUMENT_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title (optional)</Label>
              <Input
                id="doc-title"
                value={title}
                disabled={isCreating}
                placeholder="Auto-generated if empty"
                onChange={(event) => onTitleChange(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-prompt" required={!isManual}>
              Prompt{isManual ? " (optional)" : ""}
            </Label>
            <Textarea
              id="doc-prompt"
              rows={isManual ? 2 : 5}
              value={prompt}
              disabled={isCreating}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder={
                isManual
                  ? "Optional description of this document…"
                  : "Example: Write a project proposal for a 6-week CRM rollout including scope, timeline, and budget."
              }
            />
            {!isManual ? (
              <p className="text-xs text-muted-foreground">
                Be specific about audience, tone, and must-have sections for
                better results.
              </p>
            ) : null}
          </div>

          {isManual ? (
            <div className="space-y-2">
              <Label htmlFor="doc-content" required>
                Content
              </Label>
              <Textarea
                id="doc-content"
                rows={8}
                value={content}
                disabled={isCreating}
                onChange={(event) => onContentChange(event.target.value)}
                placeholder="Write markdown content…"
              />
            </div>
          ) : null}

          {isCreating ? (
            <div
              className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-foreground">
                {isManual ? "Creating document…" : "Generating with AI…"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This can take a few seconds. Keep this window open.
              </p>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/15 px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            disabled={isCreating}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={isCreating}
            disabled={!canSubmit || isCreating}
            onClick={onSubmit}
          >
            {isManual ? "Create" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const AiDocumentCreateDialog = maybeMemo(
  AiDocumentCreateDialogComponent,
);
