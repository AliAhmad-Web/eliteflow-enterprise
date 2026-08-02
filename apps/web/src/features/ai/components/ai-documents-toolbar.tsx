"use client";

import {
  AI_DOCUMENT_TYPES,
  type AiDocumentTypeValue,
} from "@enterprise/shared";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { AI_DOCUMENT_TYPE_LABELS } from "../types/ai.types";
import { AI_DOCUMENTS_SELECT_CLASS_NAME } from "./ai-documents-form-styles";

export interface AiDocumentsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  type: AiDocumentTypeValue | "ALL";
  onTypeChange: (value: AiDocumentTypeValue | "ALL") => void;
  onGenerate: () => void;
}

export function AiDocumentsToolbar({
  search,
  onSearchChange,
  type,
  onTypeChange,
  onGenerate,
}: AiDocumentsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search documents..."
          className="pl-9"
          aria-label="Search documents"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className={cn(AI_DOCUMENTS_SELECT_CLASS_NAME, "min-w-[160px]")}
          value={type}
          onChange={(event) =>
            onTypeChange(event.target.value as AiDocumentTypeValue | "ALL")
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
        <Button type="button" onClick={onGenerate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Generate
        </Button>
      </div>
    </div>
  );
}
