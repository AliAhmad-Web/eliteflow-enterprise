"use client";

import { formatBytes } from "../../types/files.types";

interface FileViewerStatusBarProps {
  zoom: number | null;
  pageLabel?: string | null;
  status: string;
  sizeBytes: number;
  online: boolean;
}

export function FileViewerStatusBar({
  zoom,
  pageLabel,
  status,
  sizeBytes,
  online,
}: FileViewerStatusBarProps) {
  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border/50 bg-muted/30 px-3 text-[11px] text-muted-foreground">
      {zoom != null ? <span>Zoom {zoom}%</span> : null}
      {pageLabel ? (
        <>
          <span aria-hidden>·</span>
          <span>{pageLabel}</span>
        </>
      ) : null}
      <span aria-hidden>·</span>
      <span>{status}</span>
      <span aria-hidden>·</span>
      <span>{formatBytes(sizeBytes)}</span>
      <span className="ml-auto flex items-center gap-1.5">
        <span
          className={
            online
              ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
              : "h-1.5 w-1.5 rounded-full bg-amber-500"
          }
          aria-hidden
        />
        {online ? "Online" : "Offline"}
      </span>
    </footer>
  );
}
