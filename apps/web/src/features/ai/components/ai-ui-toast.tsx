"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type AiUiToastTone = "success" | "error" | "info";

export interface AiUiToastItem {
  id: string;
  message: string;
  tone: AiUiToastTone;
}

/**
 * Lightweight AI-scoped toast host (no third-party toast library).
 * Used when AI_UI_ENHANCED_FEEDBACK is enabled.
 */
export function useAiUiToasts() {
  const [toasts, setToasts] = useState<AiUiToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: AiUiToastTone = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3200);
    },
    [],
  );

  return { toasts, pushToast, dismiss };
}

export function AiUiToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: AiUiToastItem[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    // keep hook import meaningful for client boundary
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100%-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={cn(
            "pointer-events-auto rounded-lg border px-3 py-2 text-left text-sm shadow-(--shadow-md) backdrop-blur-sm",
            toast.tone === "success" &&
              "border-emerald-500/30 bg-emerald-500/10 text-foreground",
            toast.tone === "error" &&
              "border-destructive/40 bg-destructive/10 text-destructive",
            toast.tone === "info" &&
              "border-border/60 bg-card/95 text-foreground",
          )}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
