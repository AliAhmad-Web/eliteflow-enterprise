"use client";

import type {
  AiDocument,
  AiDocumentTypeValue,
} from "@enterprise/shared";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { OpenedFromNotificationBanner } from "@/features/notifications/components/opened-from-notification-banner";

import {
  AiDocumentCreateDialog,
  type AiDocumentCreateMode,
} from "./ai-document-create-dialog";
import { AiDocumentDeleteDialog } from "./ai-document-delete-dialog";
import {
  AiDocumentEditor,
  type AiDocumentAutosaveStatus,
} from "./ai-document-editor";
import type { AiDocumentTemplate } from "./ai-document-templates";
import { AiDocumentViewer } from "./ai-document-viewer";
import { AiDocumentsList } from "./ai-documents-list";
import { AiDocumentsPagination } from "./ai-documents-pagination";
import { AiDocumentsToolbar } from "./ai-documents-toolbar";

export interface AiDocumentsShellProps {
  bannerVisible: boolean;
  onDismissBanner: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  type: AiDocumentTypeValue | "ALL";
  onTypeChange: (value: AiDocumentTypeValue | "ALL") => void;
  onOpenCreate: () => void;
  documents: AiDocument[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  useSkeletons: boolean;
  onRetry: () => void;
  onOpenDocument: (id: string) => void;
  page: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  createType: AiDocumentTypeValue;
  createTitle: string;
  createPrompt: string;
  createContent: string;
  createMode: AiDocumentCreateMode;
  createErrorMessage: string | null;
  isCreating: boolean;
  allowManualCreate: boolean;
  showTemplatePresets: boolean;
  templates: readonly AiDocumentTemplate[];
  onCreateTypeChange: (value: AiDocumentTypeValue) => void;
  onCreateTitleChange: (value: string) => void;
  onCreatePromptChange: (value: string) => void;
  onCreateContentChange: (value: string) => void;
  onCreateModeChange: (mode: AiDocumentCreateMode) => void;
  onApplyTemplate: (template: AiDocumentTemplate) => void;
  onCreateSubmit: () => void;
  editOpen: boolean;
  editTitle: string;
  editContent: string;
  editErrorMessage: string | null;
  isSaving: boolean;
  livePreview: boolean;
  autosaveEnabled: boolean;
  autosaveStatus: AiDocumentAutosaveStatus;
  onEditOpenChange: (open: boolean) => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onEditSave: () => void;
  deleteDoc: AiDocument | null;
  deleteErrorMessage: string | null;
  isDeleting: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteConfirm: () => void;
  viewOpen: boolean;
  activeDoc: AiDocument | null;
  viewIsLoading: boolean;
  viewIsError: boolean;
  viewErrorMessage: string | null;
  exportEnhanced: boolean;
  onViewOpenChange: (open: boolean) => void;
  onViewRetry: () => void;
  onCopy: (content: string) => void;
  onExport: (document: AiDocument) => void;
  onPrint: (document: AiDocument) => void;
  onEditDocument: (document: AiDocument) => void;
  onRequestDelete: (document: AiDocument) => void;
}

/** Modular composition path (AI_DOCS_ENTERPRISE_SHELL or any Phase 2 flag ON). */
export function AiDocumentsEnterpriseShell(props: AiDocumentsShellProps) {
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
          <AiDocumentsToolbar
            search={props.search}
            onSearchChange={props.onSearchChange}
            type={props.type}
            onTypeChange={props.onTypeChange}
            onGenerate={props.onOpenCreate}
          />
          <AiDocumentsList
            documents={props.documents}
            isLoading={props.isLoading}
            isError={props.isError}
            errorMessage={props.errorMessage}
            useSkeletons={props.useSkeletons}
            onRetry={props.onRetry}
            onOpen={props.onOpenDocument}
            onGenerate={props.onOpenCreate}
          />
          {!props.isLoading && !props.isError ? (
            <AiDocumentsPagination
              page={props.page}
              totalPages={props.totalPages}
              onPrevious={props.onPreviousPage}
              onNext={props.onNextPage}
            />
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

      <AiDocumentEditor
        open={props.editOpen}
        title={props.editTitle}
        content={props.editContent}
        errorMessage={props.editErrorMessage}
        isSaving={props.isSaving}
        livePreview={props.livePreview}
        autosaveEnabled={props.autosaveEnabled}
        autosaveStatus={props.autosaveStatus}
        onOpenChange={props.onEditOpenChange}
        onTitleChange={props.onEditTitleChange}
        onContentChange={props.onEditContentChange}
        onSave={props.onEditSave}
      />

      <AiDocumentDeleteDialog
        document={props.deleteDoc}
        errorMessage={props.deleteErrorMessage}
        isDeleting={props.isDeleting}
        onOpenChange={props.onDeleteOpenChange}
        onConfirm={props.onDeleteConfirm}
      />

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
