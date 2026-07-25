"use client";

import {
  AI_DOCUMENT_TYPES,
  type AiDocument,
  type AiDocumentTypeValue,
  type ListAiDocumentsQueryInput,
} from "@enterprise/shared";
import {
  Copy,
  Download,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OpenedFromNotificationBanner } from "@/features/notifications/components/opened-from-notification-banner";
import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import { ApiClientError } from "@/services/api/api-error";
import { cn } from "@/lib/utils";

import {
  useCreateAiDocument,
  useDeleteAiDocument,
  useUpdateAiDocument,
} from "../hooks/use-ai-mutations";
import { useAiDocuments } from "../hooks/use-ai";
import { AI_DOCUMENT_TYPE_LABELS } from "../types/ai.types";
import { MarkdownView } from "./markdown-view";

const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-xs)] transition-all focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50";

export function AiDocumentsPageContent() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [type, setType] = useState<AiDocumentTypeValue | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const deepLink = useEntityDeepLink((openId) => setViewId(openId));
  const [editDoc, setEditDoc] = useState<AiDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<AiDocument | null>(null);

  const [createType, setCreateType] =
    useState<AiDocumentTypeValue>("PROPOSAL");
  const [createTitle, setCreateTitle] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const query = useMemo<ListAiDocumentsQueryInput>(
    () => ({
      search: deferredSearch,
      type: type === "ALL" ? undefined : type,
      page,
      limit: 10,
    }),
    [deferredSearch, type, page],
  );

  const documentsQuery = useAiDocuments(query);
  const createMutation = useCreateAiDocument();
  const updateMutation = useUpdateAiDocument();
  const deleteMutation = useDeleteAiDocument();

  const documents = documentsQuery.data?.items ?? [];
  const pagination = documentsQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const activeDoc =
    documents.find((document) => document.id === viewId) ?? null;

  const handleCreate = async () => {
    try {
      const created = await createMutation.mutateAsync({
        type: createType,
        title: createTitle,
        prompt: createPrompt,
        generate: true,
      });
      setCreateOpen(false);
      setCreateTitle("");
      setCreatePrompt("");
      setViewId(created.id);
    } catch {
      // surfaced below
    }
  };

  const openEdit = (document: AiDocument) => {
    setEditDoc(document);
    setEditTitle(document.title);
    setEditContent(document.content);
  };

  const handleUpdate = async () => {
    if (!editDoc) return;
    try {
      await updateMutation.mutateAsync({
        id: editDoc.id,
        input: { title: editTitle, content: editContent },
      });
      setEditDoc(null);
    } catch {
      // surfaced below
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    try {
      await deleteMutation.mutateAsync(deleteDoc.id);
      if (viewId === deleteDoc.id) setViewId(null);
      setDeleteDoc(null);
    } catch {
      // surfaced below
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // ignore
    }
  };

  const handleExport = (document: AiDocument) => {
    const blob = new Blob([document.content], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${document.title.replace(/\s+/g, "-").toLowerCase()}.md`;
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
        title="AI Documents"
        description="Generate, edit, and export proposals, emails, meeting notes, and technical docs."
        actionLabel="Generate document"
        onAction={() => setCreateOpen(true)}
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
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search documents..."
                className="pl-9"
                aria-label="Search documents"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className={cn(selectClassName, "min-w-[160px]")}
                value={type}
                onChange={(event) => {
                  setType(event.target.value as AiDocumentTypeValue | "ALL");
                  setPage(1);
                }}
                aria-label="Filter by type"
              >
                <option value="ALL">All types</option>
                {AI_DOCUMENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {AI_DOCUMENT_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Generate
              </Button>
            </div>
          </div>

          {documentsQuery.isLoading ? (
            <LoadingState label="Loading documents" className="border-0" />
          ) : null}

          {documentsQuery.isError ? (
            <ErrorState
              title="Could not load documents"
              description={
                documentsQuery.error instanceof Error
                  ? documentsQuery.error.message
                  : "Please try again."
              }
              onRetry={() => void documentsQuery.refetch()}
            />
          ) : null}

          {!documentsQuery.isLoading && !documentsQuery.isError ? (
            <>
              {documents.length === 0 ? (
                <EmptyState
                  title="No AI documents yet"
                  description="Generate a proposal, email, or technical document to get started."
                  actionLabel="Generate document"
                  onAction={() => setCreateOpen(true)}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      className="rounded-xl border border-border/50 bg-card p-4 text-left transition hover:border-primary/30 hover:bg-muted/20"
                      onClick={() => setViewId(document.id)}
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

              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
            </>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate AI document</DialogTitle>
            <DialogDescription>
              Choose a document type and describe what you need. Content is
              generated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Type</Label>
              <select
                id="doc-type"
                className={selectClassName}
                value={createType}
                onChange={(event) =>
                  setCreateType(event.target.value as AiDocumentTypeValue)
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
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-prompt" required>
                Prompt
              </Label>
              <Textarea
                id="doc-prompt"
                rows={4}
                value={createPrompt}
                onChange={(event) => setCreatePrompt(event.target.value)}
                placeholder="Describe the document you need…"
              />
            </div>
            {createMutation.error instanceof ApiClientError ? (
              <p className="text-sm text-destructive" role="alert">
                {createMutation.error.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={createMutation.isPending}
              disabled={!createPrompt.trim()}
              onClick={() => {
                void handleCreate();
              }}
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editDoc)}
        onOpenChange={(open) => {
          if (!open) setEditDoc(null);
        }}
      >
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
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                rows={12}
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
              />
            </div>
            {updateMutation.error instanceof ApiClientError ? (
              <p className="text-sm text-destructive" role="alert">
                {updateMutation.error.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditDoc(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={updateMutation.isPending}
              onClick={() => {
                void handleUpdate();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteDoc)}
        onOpenChange={(open) => {
          if (!open) setDeleteDoc(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              {deleteDoc
                ? `Delete “${deleteDoc.title}”? This soft-deletes the document.`
                : "Delete this document?"}
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.error instanceof ApiClientError ? (
            <p className="text-sm text-destructive" role="alert">
              {deleteMutation.error.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteDoc(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                void handleDelete();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(viewId)}
        onOpenChange={(open) => {
          if (!open) {
            setViewId(null);
            deepLink.clearDeepLinkParams();
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-lg overflow-y-auto bg-background p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b border-border px-6 py-4 text-left">
            <SheetTitle className="pr-8">
              {activeDoc?.title ?? "Document"}
            </SheetTitle>
          </SheetHeader>
          {activeDoc ? (
            <div className="space-y-4 px-6 py-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {AI_DOCUMENT_TYPE_LABELS[activeDoc.type]}
              </p>
              <p className="text-sm text-muted-foreground">{activeDoc.prompt}</p>
              <MarkdownView content={activeDoc.content} />
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void handleCopy(activeDoc.content);
                  }}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport(activeDoc)}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => openEdit(activeDoc)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDoc(activeDoc)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
