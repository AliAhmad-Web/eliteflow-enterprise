"use client";

import {
  REPORT_EXPORT_FORMATS,
  type ReportExportFormatValue,
} from "@enterprise/shared";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { REPORT_EXPORT_LABELS } from "./reports-form-styles";

export interface ReportsExportControlsProps {
  disabled: boolean;
  isExporting: boolean;
  onExport: (format: ReportExportFormatValue) => void;
  enhancedExperience?: boolean;
}

export function ReportsExportControls({
  disabled,
  isExporting,
  onExport,
  enhancedExperience = false,
}: ReportsExportControlsProps) {
  return (
    <div className="space-y-2">
      {enhancedExperience ? (
        <p className="text-xs text-muted-foreground">
          Export uses your current filters and category. Choose a format below.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {REPORT_EXPORT_FORMATS.map((format) => (
          <Button
            key={format}
            variant={enhancedExperience ? "outline" : "secondary"}
            size="sm"
            disabled={isExporting || disabled}
            onClick={() => onExport(format)}
            aria-label={`Export as ${REPORT_EXPORT_LABELS[format]}`}
          >
            {format === "CSV" ? (
              <Download className="h-4 w-4" aria-hidden="true" />
            ) : format === "EXCEL" ? (
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            ) : format === "PDF" ? (
              <FileText className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Printer className="h-4 w-4" aria-hidden="true" />
            )}
            {REPORT_EXPORT_LABELS[format]}
          </Button>
        ))}
      </div>
      {enhancedExperience && isExporting ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Preparing export…
        </p>
      ) : null}
    </div>
  );
}
