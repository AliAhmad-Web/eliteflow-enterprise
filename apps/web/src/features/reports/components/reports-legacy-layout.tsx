"use client";

/**
 * Pre-extraction monolithic rendering path (AI_ANALYTICS_ENTERPRISE_SHELL=OFF).
 * Preserves the original JSX structure for rollback parity using controlled props.
 */

import {
  REPORT_DATE_RANGES,
  REPORT_EXPORT_FORMATS,
  type ReportDateRangeValue,
  type ReportExportFormatValue,
} from "@enterprise/shared";
import {
  Bookmark,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  REPORT_DATE_RANGE_LABELS,
  REPORTS_TAB_LABELS,
  type ReportsTab,
} from "../types/reports.types";
import type { ReportsShellProps } from "./reports-enterprise-shell";
import { ReportsChartsSectionGate } from "./reports-charts-section-gate";
import { REPORT_EXPORT_LABELS, REPORTS_SELECT_CLASS_NAME } from "./reports-form-styles";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ReportsLegacyLayout(props: ReportsShellProps) {
  const tabs = Object.keys(REPORTS_TAB_LABELS) as ReportsTab[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Explore business performance, export data, and save custom report views."
        actionLabel={props.activeTab !== "saved" ? "Save report" : undefined}
        onAction={
          props.activeTab !== "saved" ? props.onOpenSaveDialog : undefined
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="report-date-range">Date range</Label>
            <select
              id="report-date-range"
              className={REPORTS_SELECT_CLASS_NAME}
              value={props.dateRange}
              onChange={(event) =>
                props.onDateRangeChange(
                  event.target.value as ReportDateRangeValue,
                )
              }
            >
              {REPORT_DATE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {REPORT_DATE_RANGE_LABELS[range]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={props.onOpenFilters}
            >
              {props.dateRange === "custom" ? "Custom dates" : "More filters"}
            </Button>
          </div>
        </div>

        {props.canExport ? (
          <div className="flex flex-wrap gap-2">
            {REPORT_EXPORT_FORMATS.map((format) => (
              <Button
                key={format}
                variant="secondary"
                size="sm"
                disabled={props.isExporting || props.exportDisabled}
                onClick={() => props.onExport(format)}
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
                {REPORT_EXPORT_LABELS[format as ReportExportFormatValue]}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {props.exportError ? (
        <p className="text-sm text-destructive" role="alert">
          {props.exportError}
        </p>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <TabButton
            key={tab}
            active={props.activeTab === tab}
            onClick={() => props.onTabChange(tab)}
          >
            {REPORTS_TAB_LABELS[tab]}
          </TabButton>
        ))}
      </div>

      {props.activeTab === "saved" ? (
        <div className="space-y-6">
          {props.savedLoading ? (
            <LoadingState label="Loading saved reports" />
          ) : null}
          {props.savedError ? (
            <ErrorState
              description={
                props.savedErrorMessage ?? "Could not load saved reports."
              }
              onRetry={props.onSavedRetry}
            />
          ) : null}
          {!props.savedLoading && !props.savedError ? (
            <>
              {props.templates.length > 0 ? (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      Report templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 lg:grid-cols-2">
                    {props.templates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-lg border border-border/50 p-3"
                      >
                        <p className="font-medium text-foreground">
                          {template.name}
                        </p>
                        {template.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {props.savedReports.length === 0 ? (
                <EmptyState
                  icon={Bookmark}
                  title="No saved reports"
                  description="Save your current filters and category to revisit them later."
                />
              ) : (
                <>
                  {props.savedReports.filter((r) => r.isFavorite).length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        Favorites
                      </h3>
                      {props.savedReports
                        .filter((r) => r.isFavorite)
                        .map((report) => (
                          <Card key={report.id} className="border-border/50">
                            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-foreground">
                                    {report.name}
                                  </h3>
                                  <Star
                                    className="h-4 w-4 fill-primary text-primary"
                                    aria-label="Favorite"
                                  />
                                </div>
                                {report.description ? (
                                  <p className="text-sm text-muted-foreground">
                                    {report.description}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">
                                  {report.category.replaceAll("_", " ")} ·
                                  Updated{" "}
                                  {new Date(
                                    report.updatedAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => props.onLoadReport(report)}
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    props.onToggleFavorite(report)
                                  }
                                  disabled={props.isUpdatingSaved}
                                >
                                  Unfavorite
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    props.onDeleteReport(report)
                                  }
                                  disabled={props.isDeletingSaved}
                                >
                                  <Trash2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : null}
                  {props.savedReports.filter((r) => !r.isFavorite).length >
                  0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        All saved reports
                      </h3>
                      {props.savedReports
                        .filter((r) => !r.isFavorite)
                        .map((report) => (
                          <Card key={report.id} className="border-border/50">
                            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <h3 className="font-semibold text-foreground">
                                  {report.name}
                                </h3>
                                {report.description ? (
                                  <p className="text-sm text-muted-foreground">
                                    {report.description}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">
                                  {report.category.replaceAll("_", " ")} ·
                                  Updated{" "}
                                  {new Date(
                                    report.updatedAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => props.onLoadReport(report)}
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    props.onToggleFavorite(report)
                                  }
                                  disabled={props.isUpdatingSaved}
                                >
                                  Favorite
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    props.onDeleteReport(report)
                                  }
                                  disabled={props.isDeletingSaved}
                                >
                                  <Trash2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>
      ) : props.activeTab === "ai-insights" ? (
        props.insightsLoading ? (
          <LoadingState label="Generating AI insights" />
        ) : props.insightsError ? (
          <ErrorState
            description={
              props.insightsErrorMessage ?? "Could not load AI insights."
            }
            onRetry={props.onInsightsRetry}
          />
        ) : !props.insight ? (
          <EmptyState
            icon={Sparkles}
            title="No insights yet"
            description="AI insights will appear here once analytics data is available."
          />
        ) : (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
                AI Insights
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Generated{" "}
                {new Date(props.insight.generatedAt).toLocaleString()}
                {props.insight.provider
                  ? ` · ${props.insight.provider}`
                  : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-foreground">
                {props.insight.summary}
              </p>
              {props.insight.bullets.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {props.insight.bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        )
      ) : props.analyticsLoading ? (
        <LoadingState label="Loading analytics" />
      ) : props.analyticsError ? (
        <ErrorState
          description={
            props.analyticsErrorMessage ?? "Could not load analytics data."
          }
          onRetry={props.onAnalyticsRetry}
        />
      ) : props.analyticsData ? (
        <ReportsChartsSectionGate
          tab={props.activeTab}
          data={props.analyticsData}
        />
      ) : (
        <EmptyState
          title="No analytics data"
          description="Try adjusting your date range or filters."
        />
      )}

      <Sheet open={props.filtersOpen} onOpenChange={props.onFiltersOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Report filters</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Narrow analytics by custom date range.
            </p>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-from">From</Label>
              <Input
                id="custom-from"
                type="datetime-local"
                value={props.customFrom}
                onChange={(event) =>
                  props.onCustomFromChange(event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-to">To</Label>
              <Input
                id="custom-to"
                type="datetime-local"
                value={props.customTo}
                onChange={(event) =>
                  props.onCustomToChange(event.target.value)
                }
              />
            </div>
            <Button className="w-full" onClick={props.onApplyFilters}>
              Apply filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={props.saveDialogOpen}
        onOpenChange={props.onSaveDialogOpenChange}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save report</DialogTitle>
            <DialogDescription>
              Save the current category and filters for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="save-report-name">Name</Label>
              <Input
                id="save-report-name"
                value={props.saveName}
                onChange={(event) =>
                  props.onSaveNameChange(event.target.value)
                }
                placeholder="Monthly revenue overview"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-report-description">Description</Label>
              <Input
                id="save-report-description"
                value={props.saveDescription}
                onChange={(event) =>
                  props.onSaveDescriptionChange(event.target.value)
                }
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => props.onSaveDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={props.onSaveReport}
              disabled={!props.saveName.trim() || props.isSavingReport}
            >
              Save report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
