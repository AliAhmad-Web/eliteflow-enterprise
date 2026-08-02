"use client";

import type { AiAssistModeValue } from "@enterprise/shared";
import { AI_ASSIST_MODES } from "@enterprise/shared";
import { Bot } from "lucide-react";

import { FORM_SELECT_CLASS_MD } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

import { AI_MODE_LABELS } from "../types/ai.types";

const selectClassName = FORM_SELECT_CLASS_MD;

export interface AiThreadHeaderProps {
  title: string;
  mode: AiAssistModeValue;
  onModeChange: (mode: AiAssistModeValue) => void;
  providerLabel?: string | null;
  showProviderBadge?: boolean;
  contextChips?: string[];
  showContextIndicators?: boolean;
}

export function AiThreadHeader({
  title,
  mode,
  onModeChange,
  providerLabel = null,
  showProviderBadge = false,
  contextChips = [],
  showContextIndicators = false,
}: AiThreadHeaderProps) {
  return (
    <div className="space-y-2 border-b border-border/60 bg-card/60 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="icon-box icon-box-sm rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
            <Bot strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {title}
            </p>
            <p className="text-xs text-muted-foreground">
              Mode: {AI_MODE_LABELS[mode]}
              {showProviderBadge && providerLabel
                ? ` · Provider: ${providerLabel}`
                : null}
            </p>
          </div>
        </div>
        <select
          className={cn(selectClassName, "min-w-40")}
          value={mode}
          onChange={(event) =>
            onModeChange(event.target.value as AiAssistModeValue)
          }
          aria-label="Assistant mode"
        >
          {AI_ASSIST_MODES.map((value) => (
            <option key={value} value={value}>
              {AI_MODE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {showContextIndicators && contextChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {contextChips.map((chip) => (
            <span
              key={chip}
              className="rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
