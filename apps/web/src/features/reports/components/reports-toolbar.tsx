"use client";

import {
  REPORT_DATE_RANGES,
  type ReportDateRangeValue,
  type ReportExportFormatValue,
} from "@enterprise/shared";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { REPORT_DATE_RANGE_LABELS } from "../types/reports.types";
import { ReportsExportControls } from "./reports-export-controls";
import { REPORTS_SELECT_CLASS_NAME } from "./reports-form-styles";

export interface ReportsToolbarProps {
  dateRange: ReportDateRangeValue;
  onDateRangeChange: (value: ReportDateRangeValue) => void;
  onOpenFilters: () => void;
  canExport: boolean;
  exportDisabled: boolean;
  isExporting: boolean;
  onExport: (format: ReportExportFormatValue) => void;
  showRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  biExportExperience?: boolean;
}

export function ReportsToolbar({
  dateRange,
  onDateRangeChange,
  onOpenFilters,
  canExport,
  exportDisabled,
  isExporting,
  onExport,
  showRefresh = false,
  isRefreshing = false,
  onRefresh,
  biExportExperience = false,
}: ReportsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 p-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="report-date-range">Date range</Label>
          <select
            id="report-date-range"
            className={REPORTS_SELECT_CLASS_NAME}
            value={dateRange}
            onChange={(event) =>
              onDateRangeChange(event.target.value as ReportDateRangeValue)
            }
          >
            {REPORT_DATE_RANGES.map((range) => (
              <option key={range} value={range}>
                {REPORT_DATE_RANGE_LABELS[range]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={onOpenFilters}
          >
            {dateRange === "custom" ? "Custom dates" : "More filters"}
          </Button>
          {showRefresh && onRefresh ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="shrink-0"
              aria-label="Refresh analytics"
              disabled={isRefreshing}
              onClick={onRefresh}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </Button>
          ) : null}
        </div>
      </div>

      {canExport ? (
        <ReportsExportControls
          disabled={exportDisabled}
          isExporting={isExporting}
          onExport={onExport}
          enhancedExperience={biExportExperience}
        />
      ) : null}
    </div>
  );
}
