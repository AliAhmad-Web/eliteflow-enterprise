"use client";

import type { ChartPoint } from "@enterprise/shared";

import { cn } from "@/lib/utils";

/** Lightweight SVG sparkline from existing chart series (no chart lib). */
export function ReportsSparkline({
  points,
  className,
}: {
  points: ChartPoint[];
  className?: string;
}) {
  if (points.length < 2) return null;

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 72;
  const height = 28;
  const pad = 2;

  const coords = values
    .map((value, index) => {
      const x =
        pad + (index / (values.length - 1)) * (width - pad * 2);
      const y =
        height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-7 w-[4.5rem] text-primary", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}
