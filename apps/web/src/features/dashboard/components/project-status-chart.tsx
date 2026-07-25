"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { slideUp } from "@/lib/motion";

import type { ProjectStatusSegment } from "@/features/dashboard/types/dashboard.types";

interface ProjectStatusChartProps {
  segments: ProjectStatusSegment[];
  title?: string;
  className?: string;
}

const CHART_COLORS = [
  "var(--chart-3)",
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-6)",
];

function buildArcs(
  segments: ProjectStatusSegment[],
  total: number,
  circumference: number,
) {
  return segments.reduce<
    Array<
      ProjectStatusSegment & {
        dash: number;
        gap: number;
        offset: number;
        color: string;
      }
    >
  >((acc, segment, index) => {
    const fraction = total > 0 ? segment.value / total : 0;
    const dash = fraction * circumference;
    const previousOffset = acc.reduce((sum, arc) => sum + arc.dash, 0);

    acc.push({
      ...segment,
      dash,
      gap: circumference - dash,
      offset: -previousOffset,
      color: CHART_COLORS[index % CHART_COLORS.length] ?? "var(--chart-1)",
    });

    return acc;
  }, []);
}

export function ProjectStatusChart({
  segments,
  title = "Project Status",
  className,
}: ProjectStatusChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const arcs = useMemo(
    () => buildArcs(segments, total, circumference),
    [segments, total, circumference],
  );

  return (
    <motion.div {...slideUp} className={className}>
      <Card className="h-full border-border/50 shadow-[var(--shadow-sm)] hover:border-primary/15 hover:shadow-[var(--shadow-md)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex h-44 w-44 items-center justify-center">
              <svg
                viewBox="0 0 200 200"
                className="h-full w-full -rotate-90"
                role="img"
                aria-label={`${title} donut chart showing ${total} total projects`}
              >
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="var(--muted)"
                  strokeWidth="18"
                  opacity="0.45"
                />
                {arcs.map((arc) => (
                  <circle
                    key={arc.id}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="18"
                    strokeDasharray={`${arc.dash} ${arc.gap}`}
                    strokeDashoffset={arc.offset}
                    strokeLinecap="butt"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tracking-tight text-foreground">{total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>

            <ul className="w-full space-y-3 sm:max-w-[180px]" aria-label="Project status legend">
              {segments.map((segment, index) => (
                <li key={segment.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 rounded-full ring-2 ring-background"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{segment.label}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-foreground">{segment.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
