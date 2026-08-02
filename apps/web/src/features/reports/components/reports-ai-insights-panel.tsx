"use client";

import type {
  AiInsight,
  AnalyticsDashboard,
} from "@enterprise/shared";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/common/feedback/empty-state";
import { ErrorState } from "@/components/common/feedback/error-state";
import { LoadingState } from "@/components/common/feedback/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ReportsActivityTimeline } from "./reports-activity-timeline";
import { ReportsBusinessSummary } from "./reports-business-summary";
import { ReportsInsightSkeleton } from "./reports-skeletons";
import { ReportsRecommendationCards } from "./reports-recommendation-cards";

export interface ReportsAiInsightsPanelProps {
  insight: AiInsight | undefined;
  analyticsData?: AnalyticsDashboard;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  useSkeletons?: boolean;
  insightCards?: boolean;
  businessSummary?: boolean;
  recommendationCards?: boolean;
  activityTimeline?: boolean;
}

export function ReportsAiInsightsPanel({
  insight,
  analyticsData,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  useSkeletons = false,
  insightCards = false,
  businessSummary = false,
  recommendationCards = false,
  activityTimeline = false,
}: ReportsAiInsightsPanelProps) {
  if (isLoading) {
    return useSkeletons ? (
      <ReportsInsightSkeleton />
    ) : (
      <LoadingState label="Generating AI insights" />
    );
  }

  if (isError) {
    return (
      <ErrorState
        description={errorMessage ?? "Could not load AI insights."}
        onRetry={onRetry}
      />
    );
  }

  if (!insight) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No insights yet"
        description="AI insights will appear here once analytics data is available."
      />
    );
  }

  const showEnhanced =
    insightCards || businessSummary || recommendationCards || activityTimeline;

  if (!showEnhanced) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            AI Insights
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(insight.generatedAt).toLocaleString()}
            {insight.provider ? ` · ${insight.provider}` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            {insight.summary}
          </p>
          {insight.bullets.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {insight.bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {businessSummary && analyticsData ? (
        <ReportsBusinessSummary insight={insight} kpis={analyticsData.kpis} />
      ) : null}

      {businessSummary && !analyticsData ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              Business summary
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Generated {new Date(insight.generatedAt).toLocaleString()}
              {insight.provider ? ` · ${insight.provider}` : ""}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              {insight.summary}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!businessSummary && insightCards ? (
        <Card className="border-border/50 border-l-2 border-l-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              Executive insight
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Generated {new Date(insight.generatedAt).toLocaleString()}
              {insight.provider ? ` · ${insight.provider}` : ""}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              {insight.summary}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!businessSummary && !insightCards ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              AI Insights
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Generated {new Date(insight.generatedAt).toLocaleString()}
              {insight.provider ? ` · ${insight.provider}` : ""}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              {insight.summary}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {insightCards && !recommendationCards && insight.bullets.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {insight.bullets.map((bullet, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Insight {index + 1}
                </p>
                <p className="text-sm text-foreground">{bullet}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {recommendationCards ? (
        <ReportsRecommendationCards bullets={insight.bullets} />
      ) : null}

      {!insightCards && !recommendationCards && insight.bullets.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {insight.bullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      {activityTimeline && analyticsData ? (
        <ReportsActivityTimeline
          data={analyticsData}
          generatedAt={insight.generatedAt}
        />
      ) : null}
    </div>
  );
}
