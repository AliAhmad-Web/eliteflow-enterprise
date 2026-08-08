"use client";

import { Download, FileWarning } from "lucide-react";

import { Button } from "@/components/ui/button";

interface UnsupportedViewerProps {
  fileName: string;
  message?: string;
  onDownload: () => void;
}

export function UnsupportedViewer({
  fileName,
  message,
  onDownload,
}: UnsupportedViewerProps) {
  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center bg-zinc-950 px-6 text-center"
      role="region"
      aria-label={`Preview unavailable for ${fileName}`}
    >
      <FileWarning className="h-12 w-12 text-zinc-500" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold text-zinc-100">{fileName}</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        {message ??
          "Preview is not available for this file type. Download to open it locally."}
      </p>
      <Button type="button" className="mt-6" onClick={onDownload}>
        <Download className="h-4 w-4" />
        Download
      </Button>
    </div>
  );
}
