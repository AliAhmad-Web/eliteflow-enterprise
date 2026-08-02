"use client";

import {
  AI_DOCUMENT_TYPES,
  type AiDocumentTypeValue,
} from "@enterprise/shared";
import { FileText, Plus, Search } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { OpenedFromNotificationBanner } from "@/features/notifications/components/opened-from-notification-banner";
import { cn } from "@/lib/utils";

import { AI_DOCUMENT_TYPE_LABELS } from "../types/ai.types";
import { AiDocumentCreateDialog } from "./ai-document-create-dialog";
import { AiDocumentViewer } from "./ai-document-viewer";
import type { AiDocumentsShellProps } from "./ai-documents-enterprise-shell";
import { AI_DOCUMENTS_SELECT_CLASS_NAME } from "./ai-documents-form-styles";

/**
 * Pre-extraction monolithic rendering path (AI_DOCS_ENTERPRISE_SHELL=OFF).
 * Preserves the original JSX structure for rollback parity.
 */
export function AiDocumentsLegacyLayout(props: AiDocumentsShellProps) {
  return (
    <div className="space-y-6">
      <OpenedFromNotificationBanner
        visible={props.bannerVisible}
        onDismiss={props.onDismissBanner}
      />
      <PageHeader
        title="AI Documents"
        description="Generate, edit, and export proposals, emails, meeting notes, and technical docs."
        actionLabel="Generate document"
        onAction={props.onOpenCreate}
      />

      <Card className="border-border/50">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={props.search}
                onChange={(event) => props.onSearchChange(event.target.value)}
                placeholder="Search documents..."
                className="pl-9"
                aria-label="Search documents"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className={cn(AI_DOCUMENTS_SELECT_CLASS_NAME, "min-w-[160px]")}
                value={props.type}
                onChange={(event) =>
                  props.onTypeChange(
                    event.target.value as AiDocumentTypeValue | "ALL",
                  )
                }
                aria-label="Filter by type"
              >
                <option value="ALL">All types</option>
                {AI_DOCUMENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {AI_DOCUMENT_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={props.onOpenCreate}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Generate
              </Button>
            </div>
          </div>

          {props.isLoading ? (
            <LoadingState label="Loading documents" className="border-0" />
          ) : null}

          {props.isError ? (
            <ErrorState
              title="Could not load documents"
              description={props.errorMessage ?? "Please try again."}
              onRetry={props.onRetry}
            />
          ) : null}

          {!props.isLoading && !props.isError ? (
            <>
              {props.documents.length === 0 ? (
                <EmptyState
                  title="No AI documents yet"
                  description="Generate a proposal, email, or technical document to get started."
                  actionLabel="Generate document"
                  onAction={props.onOpenCreate}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {props.documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      className="rounded-xl border border-border/50 bg-card p-4 text-left transition hover:border-primary/30 hover:bg-muted/20"
                      onClick={() => props.onOpenDocument(document.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="icon-box icon-box-sm rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {AI_DOCUMENT_TYPE_LABELS[document.type]}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-medium text-foreground">
                        {document.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {document.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {props.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {props.page} of {props.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={props.page <= 1}
                      onClick={props.onPreviousPage}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={props.page >= props.totalPages}
                      onClick={props.onNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      <AiDocumentCreateDialog
        open={props.createOpen}
        type={props.createType}
        title={props.createTitle}
        prompt={props.createPrompt}
        content={props.createContent}
        createMode={props.createMode}
        errorMessage={props.createErrorMessage}
        isCreating={props.isCreating}
        allowManualCreate={props.allowManualCreate}
        showTemplatePresets={props.showTemplatePresets}
        templates={props.templates}
        onOpenChange={props.onCreateOpenChange}
        onTypeChange={props.onCreateTypeChange}
        onTitleChange={props.onCreateTitleChange}
        onPromptChange={props.onCreatePromptChange}
        onContentChange={props.onCreateContentChange}
        onCreateModeChange={props.onCreateModeChange}
        onApplyTemplate={props.onApplyTemplate}
        onSubmit={props.onCreateSubmit}
      />

      <Dialog open={props.editOpen} onOpenChange={props.onEditOpenChange}>
        <DialogContent className="sm:max-w-2xl">
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
                value={props.editTitle}
                onChange={(event) =>
                  props.onEditTitleChange(event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                rows={12}
                value={props.editContent}
                onChange={(event) =>
                  props.onEditContentChange(event.target.value)
                }
              />
            </div>
            {props.editErrorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {props.editErrorMessage}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => props.onEditOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={props.isSaving}
              onClick={props.onEditSave}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(props.deleteDoc)}
        onOpenChange={(open) => {
          if (!open) props.onDeleteOpenChange(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              {props.deleteDoc
                ? `Delete “${props.deleteDoc.title}”? This soft-deletes the document.`
                : "Delete this document?"}
            </DialogDescription>
          </DialogHeader>
          {props.deleteErrorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {props.deleteErrorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => props.onDeleteOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              isLoading={props.isDeleting}
              onClick={props.onDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AiDocumentViewer
        open={props.viewOpen}
        document={props.activeDoc}
        isLoading={props.viewIsLoading}
        isError={props.viewIsError}
        errorMessage={props.viewErrorMessage}
        exportEnhanced={props.exportEnhanced}
        onOpenChange={props.onViewOpenChange}
        onCopy={props.onCopy}
        onExport={props.onExport}
        onPrint={props.onPrint}
        onEdit={props.onEditDocument}
        onDelete={props.onRequestDelete}
        onRetry={props.onViewRetry}
      />
    </div>
  );
}
