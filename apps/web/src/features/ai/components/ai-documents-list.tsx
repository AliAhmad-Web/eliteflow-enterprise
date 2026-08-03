"use client";

import type { AiDocument } from "@enterprise/shared";

import { VirtualizedList } from "@/components/common/data/virtualized-list";
import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { isPerformanceAdvVirtualizationEnabled } from "@/features/performance";

import { AiDocumentCard } from "./ai-document-card";
import { AiDocumentsListSkeleton } from "./ai-documents-skeletons";

export interface AiDocumentsListProps {
  documents: AiDocument[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  useSkeletons: boolean;
  onRetry: () => void;
  onOpen: (id: string) => void;
  onGenerate: () => void;
}

export function AiDocumentsList({
  documents,
  isLoading,
  isError,
  errorMessage,
  useSkeletons,
  onRetry,
  onOpen,
  onGenerate,
}: AiDocumentsListProps) {
  if (isLoading) {
    return useSkeletons ? (
      <AiDocumentsListSkeleton />
    ) : (
      <LoadingState label="Loading documents" className="border-0" />
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load documents"
        description={errorMessage ?? "Please try again."}
        onRetry={onRetry}
      />
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        title="No AI documents yet"
        description="Generate a proposal, email, or technical document to get started."
        actionLabel="Generate document"
        onAction={onGenerate}
      />
    );
  }

  if (isPerformanceAdvVirtualizationEnabled()) {
    return (
      <VirtualizedList
        items={documents}
        estimateSize={140}
        overscan={4}
        heightClassName="max-h-[min(70vh,720px)]"
        getItemKey={(document) => document.id}
        renderItem={(document) => (
          <div className="pb-3">
            <AiDocumentCard document={document} onOpen={onOpen} />
          </div>
        )}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((document) => (
        <AiDocumentCard
          key={document.id}
          document={document}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
