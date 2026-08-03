"use client";

import { Lightbulb } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import {
  groupInsightRecommendations,
  type BiInsightCategory,
} from "../utils/bi-composition";

export interface ReportsBiRecommendationGroupsProps {
  bullets: string[];
  prioritize?: boolean;
}

export function ReportsBiRecommendationGroups({
  bullets,
  prioritize = false,
}: ReportsBiRecommendationGroupsProps) {
  if (bullets.length === 0) return null;

  const groups = groupInsightRecommendations(bullets, prioritize);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Recommendations by category
      </h3>
      {groups.map((group) => (
        <RecommendationCategory
          key={group.category}
          category={group.category}
          items={group.items}
        />
      ))}
    </div>
  );
}

function RecommendationCategory({
  category,
  items,
}: {
  category: BiInsightCategory;
  items: string[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {category}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((bullet, index) => (
          <Card key={`${category}-${index}`} className="border-border/50">
            <CardContent className="flex gap-3 p-4">
              <div className="icon-box icon-box-sm shrink-0 rounded-lg bg-primary/10 text-primary">
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-sm text-foreground">{bullet}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
