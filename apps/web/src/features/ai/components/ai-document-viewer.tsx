"use client";

import type { AiDocument } from "@enterprise/shared";
import {
  Copy,
  Download,
  FileText,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";

import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { AI_DOCUMENT_TYPE_LABELS } from "../types/ai.types";
import { MarkdownView } from "./markdown-view";

export interface AiDocumentViewerProps {
  open: boolean;
  document: AiDocument | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  exportEnhanced: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (content: string) => void;
  onExport: (document: AiDocument) => void;
  onPrint: (document: AiDocument) => void;
  onEdit: (document: AiDocument) => void;
  onDelete: (document: AiDocument) => void;
  onRetry?: () => void;
}

export function AiDocumentViewer({
  open,
  document,
  isLoading,
  isError,
  errorMessage,
  exportEnhanced,
  onOpenChange,
  onCopy,
  onExport,
  onPrint,
  onEdit,
  onDelete,
  onRetry,
}: AiDocumentViewerProps) {
  const hasContent = Boolean(document?.content?.trim());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-lg flex-col overflow-hidden bg-background p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle className="pr-8 text-base leading-snug">
            {document?.title ?? (isLoading ? "Loading document…" : "Document")}
          </SheetTitle>
          {document ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {AI_DOCUMENT_TYPE_LABELS[document.type]}
            </p>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="px-6 py-8">
              <LoadingState label="Loading document" className="border-0" />
            </div>
          ) : null}

          {isError && !isLoading ? (
            <div className="px-6 py-8">
              <ErrorState
                title="Could not load document"
                description={errorMessage ?? "Please try again."}
                onRetry={onRetry}
              />
            </div>
          ) : null}

          {!isLoading && !isError && !document ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText
                  className="h-6 w-6 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <p className="text-sm font-medium text-foreground">
                Document unavailable
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                The generated document could not be loaded. Close this panel and
                open it from the list, or try again.
              </p>
            </div>
          ) : null}

          {document && !isLoading ? (
            <div className="space-y-5 px-6 py-5">
              {document.prompt?.trim() ? (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Prompt
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">
                    {document.prompt}
                  </p>
                </div>
              ) : null}

              {hasContent ? (
                <div className="rounded-lg border border-border/50 bg-card p-4 shadow-[var(--shadow-xs)]">
                  <MarkdownView content={document.content} />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No content yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This document has no body text. Edit it to add content.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {document && !isLoading ? (
          <div className="shrink-0 border-t border-border bg-background px-6 py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onCopy(document.content);
                }}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onExport(document)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export
              </Button>
              {exportEnhanced ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onPrint(document)}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Print
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onEdit(document)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(document)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
