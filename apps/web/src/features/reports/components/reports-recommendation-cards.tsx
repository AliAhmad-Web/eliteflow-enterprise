"use client";

import { Lightbulb } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface ReportsRecommendationCardsProps {
  bullets: string[];
}

export function ReportsRecommendationCards({
  bullets,
}: ReportsRecommendationCardsProps) {
  if (bullets.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {bullets.map((bullet, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="flex gap-3 p-4">
              <div className="icon-box icon-box-sm shrink-0 rounded-lg bg-primary/10 text-primary">
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommendation {index + 1}
                </p>
                <p className="text-sm text-foreground">{bullet}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
