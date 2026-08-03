"use client";

import type { ReportTemplate, SavedReport } from "@enterprise/shared";
import { Bookmark, Star, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ReportsSavedPanelProps {
  templates: ReportTemplate[];
  savedReports: SavedReport[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isUpdating: boolean;
  isDeleting: boolean;
  onRetry: () => void;
  onLoadReport: (report: SavedReport) => void;
  onToggleFavorite: (report: SavedReport) => void;
  onDeleteReport: (report: SavedReport) => void;
  enhancedPresentation?: boolean;
}

export function ReportsSavedPanel({
  templates,
  savedReports,
  isLoading,
  isError,
  errorMessage,
  isUpdating,
  isDeleting,
  onRetry,
  onLoadReport,
  onToggleFavorite,
  onDeleteReport,
  enhancedPresentation = false,
}: ReportsSavedPanelProps) {
  if (isLoading) {
    return <LoadingState label="Loading saved reports" />;
  }

  if (isError) {
    return (
      <ErrorState
        description={errorMessage ?? "Could not load saved reports."}
        onRetry={onRetry}
      />
    );
  }

  const favorites = savedReports.filter((item) => item.isFavorite);
  const others = savedReports.filter((item) => !item.isFavorite);

  const renderReport = (report: SavedReport) => {
    const filters = report.filters as Record<string, unknown>;
    const filterPreview = enhancedPresentation
      ? [
          typeof filters.range === "string" ? String(filters.range) : null,
          typeof filters.clientId === "string" && filters.clientId
            ? "Client filter"
            : null,
          typeof filters.projectId === "string" && filters.projectId
            ? "Project filter"
            : null,
          typeof filters.teamId === "string" && filters.teamId
            ? "Team filter"
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

    return (
    <Card key={report.id} className="border-border/50">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{report.name}</h3>
            {report.isFavorite ? (
              <Star
                className="h-4 w-4 fill-primary text-primary"
                aria-label="Favorite"
              />
            ) : null}
          </div>
          {report.description ? (
            <p className="text-sm text-muted-foreground">{report.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {report.category.replaceAll("_", " ")} · Updated{" "}
            {new Date(report.updatedAt).toLocaleDateString()}
            {enhancedPresentation ? ` · ${report.visibility}` : ""}
          </p>
          {filterPreview ? (
            <p className="text-xs text-muted-foreground">
              Filters: {filterPreview}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onLoadReport(report)}
          >
            Load
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleFavorite(report)}
            disabled={isUpdating}
          >
            {report.isFavorite ? "Unfavorite" : "Favorite"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDeleteReport(report)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-6">
      {templates.length > 0 ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Report templates
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border border-border/50 p-3"
              >
                <p className="font-medium text-foreground">{template.name}</p>
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

      {savedReports.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved reports"
          description="Save your current filters and category to revisit them later."
        />
      ) : (
        <>
          {favorites.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Favorites
              </h3>
              {favorites.map(renderReport)}
            </div>
          ) : null}
          {others.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                All saved reports
              </h3>
              {others.map(renderReport)}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
