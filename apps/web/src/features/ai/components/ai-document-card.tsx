"use client";

import type { AiDocument } from "@enterprise/shared";
import { FileText } from "lucide-react";

import { maybeMemo } from "@/features/performance";

import { AI_DOCUMENT_TYPE_LABELS } from "../types/ai.types";

export interface AiDocumentCardProps {
  document: AiDocument;
  onOpen: (id: string) => void;
}

function AiDocumentCardComponent({ document, onOpen }: AiDocumentCardProps) {
  return (
    <button
      type="button"
      className="rounded-xl border border-border/50 bg-card p-4 text-left transition hover:border-primary/30 hover:bg-muted/20"
      onClick={() => onOpen(document.id)}
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
  );
}

export const AiDocumentCard = maybeMemo(AiDocumentCardComponent);
