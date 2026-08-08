"use client";

import { Download, FileSpreadsheet, FileText, MonitorPlay } from "lucide-react";
import type { FileCategoryValue } from "@enterprise/shared";

import { Button } from "@/components/ui/button";

interface OfficeViewerProps {
  fileName: string;
  category: FileCategoryValue;
  onDownload: () => void;
}

export function OfficeViewer({
  fileName,
  category,
  onDownload,
}: OfficeViewerProps) {
  const Icon =
    category === "SPREADSHEET"
      ? FileSpreadsheet
      : category === "PRESENTATION"
        ? MonitorPlay
        : FileText;

  const label =
    category === "SPREADSHEET"
      ? "spreadsheet"
      : category === "PRESENTATION"
        ? "presentation"
        : "document";

  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center bg-zinc-950 px-6 text-center"
      role="region"
      aria-label={`Office file viewer for ${fileName}`}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
        <Icon className="h-10 w-10 text-primary" aria-hidden />
      </div>
      <h2 className="mt-6 max-w-md text-xl font-semibold text-zinc-50">
        {fileName}
      </h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        In-browser preview for this {label} is not available yet. Download the
        file to open it in your desktop app. Enterprise office rendering can be
        enabled later without changing this layout.
      </p>
      <Button type="button" className="mt-6" onClick={onDownload}>
        <Download className="h-4 w-4" />
        Download to open
      </Button>
    </div>
  );
}
