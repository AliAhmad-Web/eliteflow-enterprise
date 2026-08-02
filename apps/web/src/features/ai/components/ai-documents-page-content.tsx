"use client";

import {
  type AiDocument,
  type AiDocumentTypeValue,
  type ListAiDocumentsQueryInput,
  type UpdateAiDocumentInput,
} from "@enterprise/shared";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useEntityDeepLink } from "@/features/notifications/hooks/use-entity-deep-link";
import {
  usePerformanceMemo,
  usePerformanceStableCallback,
  useRenderProfiler,
} from "@/features/performance";
import { ApiClientError } from "@/services/api/api-error";

import {
  isAiDocsAutosaveEnabled,
  isAiDocsCreateManualEnabled,
  isAiDocsDeepLinkFetchEnabled,
  isAiDocsEnhancedFeedbackEnabled,
  isAiDocsEnterpriseShellEnabled,
  isAiDocsExportEnhancedEnabled,
  isAiDocsLivePreviewEnabled,
  isAiDocsSkeletonsEnabled,
  isAiDocsTemplatePresetsEnabled,
} from "../feature-flags";
import {
  useCreateAiDocument,
  useDeleteAiDocument,
  useUpdateAiDocument,
} from "../hooks/use-ai-mutations";
import { useAiDocument, useAiDocuments } from "../hooks/use-ai";
import type { AiDocumentCreateMode } from "./ai-document-create-dialog";
import type { AiDocumentAutosaveStatus } from "./ai-document-editor";
import {
  AI_DOCUMENT_TEMPLATES,
  type AiDocumentTemplate,
} from "./ai-document-templates";
import {
  buildAiDocumentExportFilename,
  buildAiDocumentLegacyExportFilename,
  downloadAiDocumentMarkdown,
  printAiDocument,
} from "./ai-documents-export";
import type { AiDocumentsShellProps } from "./ai-documents-enterprise-shell";
import { AiDocumentsEnterpriseShell } from "./ai-documents-enterprise-shell";
import { AiDocumentsLegacyLayout } from "./ai-documents-legacy-layout";
import { AiUiToastViewport, useAiUiToasts } from "./ai-ui-toast";

const AUTOSAVE_DEBOUNCE_MS = 1500;
const MANUAL_CREATE_PROMPT_FALLBACK = "Manually authored document";

/**
 * AI Documents orchestration layer.
 * Owns React Query, mutations, dialogs, filters, search, pagination, handlers.
 * Phase 2 UX enhancements are opt-in via AI_DOCS_* flags (default OFF).
 */
export function AiDocumentsPageContent() {
  useRenderProfiler("AiDocumentsPageContent");

  const enterpriseShell = isAiDocsEnterpriseShellEnabled();
  const deepLinkFetch = isAiDocsDeepLinkFetchEnabled();
  const createManual = isAiDocsCreateManualEnabled();
  const livePreview = isAiDocsLivePreviewEnabled();
  const templatePresets = isAiDocsTemplatePresetsEnabled();
  const exportEnhanced = isAiDocsExportEnhancedEnabled();
  const autosave = isAiDocsAutosaveEnabled();
  const skeletons = isAiDocsSkeletonsEnabled();
  const enhancedFeedback = isAiDocsEnhancedFeedbackEnabled();

  const useModularShell =
    enterpriseShell ||
    deepLinkFetch ||
    createManual ||
    livePreview ||
    templatePresets ||
    exportEnhanced ||
    autosave ||
    skeletons ||
    enhancedFeedback;

  const { toasts, pushToast, dismiss } = useAiUiToasts();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [type, setType] = useState<AiDocumentTypeValue | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  /** Immediate document for the viewer (avoids empty sheet while list refetch races). */
  const [viewedDocument, setViewedDocument] = useState<AiDocument | null>(null);
  const deepLink = useEntityDeepLink((openId) => {
    setViewedDocument(null);
    setViewId(openId);
  });
  const [editDoc, setEditDoc] = useState<AiDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<AiDocument | null>(null);

  const [createType, setCreateType] =
    useState<AiDocumentTypeValue>("PROPOSAL");
  const [createTitle, setCreateTitle] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createMode, setCreateMode] =
    useState<AiDocumentCreateMode>("generate");

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [autosaveStatus, setAutosaveStatus] =
    useState<AiDocumentAutosaveStatus>("idle");

  const editBaselineRef = useRef({ title: "", content: "" });
  const autosaveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingAutosaveRef = useRef(false);
  const editDocRef = useRef<AiDocument | null>(null);
  const editTitleRef = useRef(editTitle);
  const editContentRef = useRef(editContent);

  useEffect(() => {
    editDocRef.current = editDoc;
    editTitleRef.current = editTitle;
    editContentRef.current = editContent;
  }, [editDoc, editTitle, editContent]);

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
  const documents = documentsQuery.data?.items ?? [];
  const listActiveDoc =
    documents.find((document) => document.id === viewId) ?? null;
  const seededViewDoc =
    viewedDocument?.id === viewId ? viewedDocument : null;
  const needsViewFetch = Boolean(
    viewId &&
      !seededViewDoc &&
      (deepLinkFetch || !listActiveDoc),
  );
  const fetchedDocumentQuery = useAiDocument(needsViewFetch ? viewId : null);
  const createMutation = useCreateAiDocument();
  const updateMutation = useUpdateAiDocument();
  const deleteMutation = useDeleteAiDocument();

  const pagination = documentsQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const activeDoc =
    seededViewDoc ?? fetchedDocumentQuery.data ?? listActiveDoc;

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const buildChangedUpdateInput = useCallback((): UpdateAiDocumentInput | null => {
    const baseline = editBaselineRef.current;
    const nextTitle = editTitleRef.current.trim();
    const nextContent = editContentRef.current;
    const input: UpdateAiDocumentInput = {};

    if (nextTitle !== baseline.title.trim() && nextTitle.length > 0) {
      input.title = nextTitle;
    }
    if (nextContent !== baseline.content && nextContent.trim().length > 0) {
      input.content = nextContent;
    }

    return Object.keys(input).length > 0 ? input : null;
  }, []);

  // Refs + self-reentry for pending autosave — intentional; Compiler cannot preserve.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- autosave flush
  const flushAutosave = useCallback(async () => {
    const document = editDocRef.current;
    if (!document || !autosave) return;

    const input = buildChangedUpdateInput();
    if (!input) {
      setAutosaveStatus("idle");
      return;
    }

    if (saveInFlightRef.current) {
      pendingAutosaveRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    setAutosaveStatus("saving");

    try {
      const updated = await updateMutation.mutateAsync({
        id: document.id,
        input,
      });
      editBaselineRef.current = {
        title: updated.title,
        content: updated.content,
      };
      editDocRef.current = updated;
      setEditDoc(updated);
      setAutosaveStatus("saved");
    } catch {
      setAutosaveStatus("error");
    } finally {
      saveInFlightRef.current = false;
      if (pendingAutosaveRef.current) {
        pendingAutosaveRef.current = false;
        void flushAutosave();
      }
    }
  }, [autosave, buildChangedUpdateInput, updateMutation]);

  const scheduleAutosave = useCallback(() => {
    if (!autosave || !editDocRef.current) return;
    setAutosaveStatus("dirty");
    clearAutosaveTimer();
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void flushAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [autosave, clearAutosaveTimer, flushAutosave]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
    };
  }, [clearAutosaveTimer]);

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreatePrompt("");
    setCreateContent("");
    setCreateMode("generate");
    setCreateType("PROPOSAL");
  };

  const handleCreate = async () => {
    const isManual = createManual && createMode === "manual";
    try {
      const created = await createMutation.mutateAsync(
        isManual
          ? {
              type: createType,
              title: createTitle,
              prompt: createPrompt.trim() || MANUAL_CREATE_PROMPT_FALLBACK,
              content: createContent,
              generate: false,
            }
          : {
              type: createType,
              title: createTitle,
              prompt: createPrompt,
              generate: true,
            },
      );
      setCreateOpen(false);
      resetCreateForm();
      setType("ALL");
      setPage(1);
      setViewedDocument(created);
      setViewId(created.id);
      if (enhancedFeedback) {
        pushToast(
          isManual ? "Document created" : "Document generated",
          "success",
        );
      }
    } catch (error) {
      if (enhancedFeedback) {
        pushToast(
          error instanceof Error ? error.message : "Create failed",
          "error",
        );
      }
    }
  };

  const openEdit = (document: AiDocument) => {
    clearAutosaveTimer();
    pendingAutosaveRef.current = false;
    setEditDoc(document);
    setEditTitle(document.title);
    setEditContent(document.content);
    editBaselineRef.current = {
      title: document.title,
      content: document.content,
    };
    setAutosaveStatus("idle");
  };

  const handleEditTitleChange = (value: string) => {
    setEditTitle(value);
    scheduleAutosave();
  };

  const handleEditContentChange = (value: string) => {
    setEditContent(value);
    scheduleAutosave();
  };

  const handleUpdate = async () => {
    if (!editDoc) return;
    clearAutosaveTimer();
    pendingAutosaveRef.current = false;

    const input = buildChangedUpdateInput() ?? {
      title: editTitle.trim() || editDoc.title,
      content: editContent.trim() ? editContent : editDoc.content,
    };

    try {
      await updateMutation.mutateAsync({
        id: editDoc.id,
        input,
      });
      setEditDoc(null);
      setAutosaveStatus("idle");
      if (enhancedFeedback) pushToast("Document saved", "success");
    } catch (error) {
      if (enhancedFeedback) {
        pushToast(
          error instanceof Error ? error.message : "Save failed",
          "error",
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    try {
      await deleteMutation.mutateAsync(deleteDoc.id);
      if (viewId === deleteDoc.id) {
        setViewId(null);
        setViewedDocument(null);
      }
      setDeleteDoc(null);
      if (enhancedFeedback) pushToast("Document deleted", "success");
    } catch (error) {
      if (enhancedFeedback) {
        pushToast(
          error instanceof Error ? error.message : "Delete failed",
          "error",
        );
      }
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      if (enhancedFeedback) pushToast("Copied to clipboard", "success");
    } catch {
      if (enhancedFeedback) pushToast("Copy failed", "error");
    }
  };

  const handleExport = (document: AiDocument) => {
    const filename = exportEnhanced
      ? buildAiDocumentExportFilename(document)
      : buildAiDocumentLegacyExportFilename(document);
    downloadAiDocumentMarkdown(document, filename);
    if (enhancedFeedback) pushToast("Markdown exported", "success");
  };

  const handlePrint = (document: AiDocument) => {
    printAiDocument(document);
    if (enhancedFeedback) pushToast("Print dialog opened", "info");
  };

  const handleApplyTemplate = (template: AiDocumentTemplate) => {
    setCreateType(template.type);
    setCreateTitle(template.title);
    setCreatePrompt(template.defaultPrompt);
    if (createManual && createMode === "manual") {
      setCreateContent(template.defaultContent);
    }
  };

  const onSearchChange = usePerformanceStableCallback((value: string) => {
    setSearch(value);
    setPage(1);
  });
  const onTypeChange = usePerformanceStableCallback(
    (value: AiDocumentTypeValue | "ALL") => {
      setType(value);
      setPage(1);
    },
  );
  const onOpenCreate = usePerformanceStableCallback(() => setCreateOpen(true));
  const onRetry = usePerformanceStableCallback(() => {
    void documentsQuery.refetch();
  });
  const onOpenDocument = usePerformanceStableCallback((id: string) => {
    const fromList = documents.find((document) => document.id === id) ?? null;
    setViewedDocument(fromList);
    setViewId(id);
  });
  const onPreviousPage = usePerformanceStableCallback(() => {
    setPage((current) => Math.max(1, current - 1));
  });
  const onNextPage = usePerformanceStableCallback(() => {
    setPage((current) => Math.min(totalPages, current + 1));
  });
  const onCreateOpenChange = usePerformanceStableCallback((open: boolean) => {
    setCreateOpen(open);
    if (!open) resetCreateForm();
  });
  const onApplyTemplate = usePerformanceStableCallback(
    (template: AiDocumentTemplate) => {
      handleApplyTemplate(template);
    },
  );
  const onCreateSubmit = usePerformanceStableCallback(() => {
    void handleCreate();
  });
  const onEditOpenChange = usePerformanceStableCallback((open: boolean) => {
    if (!open) {
      clearAutosaveTimer();
      pendingAutosaveRef.current = false;
      setEditDoc(null);
      setAutosaveStatus("idle");
    }
  });
  const onEditTitleChange = usePerformanceStableCallback(
    (value: string) => {
      handleEditTitleChange(value);
    },
  );
  const onEditContentChange = usePerformanceStableCallback(
    (value: string) => {
      handleEditContentChange(value);
    },
  );
  const onEditSave = usePerformanceStableCallback(() => {
    void handleUpdate();
  });
  const onDeleteOpenChange = usePerformanceStableCallback((open: boolean) => {
    if (!open) setDeleteDoc(null);
  });
  const onDeleteConfirm = usePerformanceStableCallback(() => {
    void handleDelete();
  });
  const onViewOpenChange = usePerformanceStableCallback((open: boolean) => {
    if (!open) {
      setViewId(null);
      setViewedDocument(null);
      deepLink.clearDeepLinkParams();
    }
  });
  const onViewRetry = usePerformanceStableCallback(() => {
    void fetchedDocumentQuery.refetch();
  });
  const onCopy = usePerformanceStableCallback((content: string) => {
    void handleCopy(content);
  });
  const onExport = usePerformanceStableCallback((document: AiDocument) => {
    handleExport(document);
  });
  const onPrint = usePerformanceStableCallback((document: AiDocument) => {
    handlePrint(document);
  });
  const onEditDocument = usePerformanceStableCallback(
    (document: AiDocument) => {
      openEdit(document);
    },
  );
  const onRequestDelete = usePerformanceStableCallback(
    (document: AiDocument) => {
      setDeleteDoc(document);
    },
  );

  const errorMessage =
    documentsQuery.error instanceof Error
      ? documentsQuery.error.message
      : "Please try again.";
  const createErrorMessage =
    createMutation.error instanceof ApiClientError
      ? createMutation.error.message
      : null;
  const editErrorMessage =
    updateMutation.error instanceof ApiClientError
      ? updateMutation.error.message
      : null;
  const deleteErrorMessage =
    deleteMutation.error instanceof ApiClientError
      ? deleteMutation.error.message
      : null;
  const viewErrorMessage =
    fetchedDocumentQuery.error instanceof Error
      ? fetchedDocumentQuery.error.message
      : null;
  const viewIsLoading = Boolean(
    needsViewFetch && viewId && fetchedDocumentQuery.isLoading,
  );
  const viewIsError = Boolean(
    needsViewFetch && viewId && fetchedDocumentQuery.isError && !activeDoc,
  );

  const shellProps = usePerformanceMemo(
    (): AiDocumentsShellProps => ({
      bannerVisible: deepLink.bannerVisible,
      onDismissBanner: deepLink.dismissBanner,
      search,
      onSearchChange,
      type,
      onTypeChange,
      onOpenCreate,
      documents,
      isLoading: documentsQuery.isLoading,
      isError: documentsQuery.isError,
      errorMessage,
      useSkeletons: skeletons,
      onRetry,
      onOpenDocument,
      page,
      totalPages,
      onPreviousPage,
      onNextPage,
      createOpen,
      onCreateOpenChange,
      createType,
      createTitle,
      createPrompt,
      createContent,
      createMode,
      createErrorMessage,
      isCreating: createMutation.isPending,
      allowManualCreate: createManual,
      showTemplatePresets: templatePresets,
      templates: AI_DOCUMENT_TEMPLATES,
      onCreateTypeChange: setCreateType,
      onCreateTitleChange: setCreateTitle,
      onCreatePromptChange: setCreatePrompt,
      onCreateContentChange: setCreateContent,
      onCreateModeChange: setCreateMode,
      onApplyTemplate,
      onCreateSubmit,
      editOpen: Boolean(editDoc),
      editTitle,
      editContent,
      editErrorMessage,
      isSaving: updateMutation.isPending,
      livePreview,
      autosaveEnabled: autosave,
      autosaveStatus,
      onEditOpenChange,
      onEditTitleChange,
      onEditContentChange,
      onEditSave,
      deleteDoc,
      deleteErrorMessage,
      isDeleting: deleteMutation.isPending,
      onDeleteOpenChange,
      onDeleteConfirm,
      viewOpen: Boolean(viewId),
      activeDoc,
      viewIsLoading,
      viewIsError,
      viewErrorMessage,
      exportEnhanced,
      onViewOpenChange,
      onViewRetry,
      onCopy,
      onExport,
      onPrint,
      onEditDocument,
      onRequestDelete,
    }),
    [
      deepLink.bannerVisible,
      deepLink.dismissBanner,
      search,
      onSearchChange,
      type,
      onTypeChange,
      onOpenCreate,
      documents,
      documentsQuery.isLoading,
      documentsQuery.isError,
      errorMessage,
      skeletons,
      onRetry,
      onOpenDocument,
      page,
      totalPages,
      onPreviousPage,
      onNextPage,
      createOpen,
      onCreateOpenChange,
      createType,
      createTitle,
      createPrompt,
      createContent,
      createMode,
      createErrorMessage,
      createMutation.isPending,
      createManual,
      templatePresets,
      onApplyTemplate,
      onCreateSubmit,
      editDoc,
      editTitle,
      editContent,
      editErrorMessage,
      updateMutation.isPending,
      livePreview,
      autosave,
      autosaveStatus,
      onEditOpenChange,
      onEditTitleChange,
      onEditContentChange,
      onEditSave,
      deleteDoc,
      deleteErrorMessage,
      deleteMutation.isPending,
      onDeleteOpenChange,
      onDeleteConfirm,
      viewId,
      activeDoc,
      viewIsLoading,
      viewIsError,
      viewErrorMessage,
      exportEnhanced,
      onViewOpenChange,
      onViewRetry,
      onCopy,
      onExport,
      onPrint,
      onEditDocument,
      onRequestDelete,
    ],
  );

  return (
    <>
      {useModularShell ? (
        <AiDocumentsEnterpriseShell {...shellProps} />
      ) : (
        <AiDocumentsLegacyLayout {...shellProps} />
      )}
      {enhancedFeedback ? (
        <AiUiToastViewport toasts={toasts} onDismiss={dismiss} />
      ) : null}
    </>
  );
}
