"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { slideUp } from "@/lib/motion";

import type { RevenueDataPoint } from "@/features/dashboard/types/dashboard.types";

interface RevenueChartCardProps {
  data: RevenueDataPoint[];
  title?: string;
  className?: string;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;
const PADDING = { top: 20, right: 16, bottom: 28, left: 48 };

export function RevenueChartCard({
  data,
  title = "Revenue Overview",
  className,
}: RevenueChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { path, areaPath, points, maxValue } = useMemo(() => {
    const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const max = Math.max(...data.map((d) => d.value), 1);
    const step = innerW / Math.max(data.length - 1, 1);

    const pts = data.map((d, i) => ({
      x: PADDING.left + i * step,
      y: PADDING.top + innerH - (d.value / max) * innerH,
      ...d,
    }));

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area = `${line} L ${pts[pts.length - 1]?.x ?? 0} ${PADDING.top + innerH} L ${pts[0]?.x ?? 0} ${PADDING.top + innerH} Z`;

    return { path: line, areaPath: area, points: pts, maxValue: max };
  }, [data]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <motion.div {...slideUp} className={className}>
      <Card className="h-full border-border/50 shadow-[var(--shadow-sm)] hover:border-primary/15 hover:shadow-[var(--shadow-md)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="h-auto w-full"
              role="img"
              aria-label={`${title} line chart`}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y =
                  PADDING.top +
                  (CHART_HEIGHT - PADDING.top - PADDING.bottom) * ratio;
                return (
                  <line
                    key={ratio}
                    x1={PADDING.left}
                    x2={CHART_WIDTH - PADDING.right}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="1"
                    strokeOpacity="0.7"
                  />
                );
              })}

              <path d={areaPath} fill="url(#revenueGradient)" />
              <path
                d={path}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.map((p, i) => (
                <circle
                  key={p.label}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIndex === i ? 5.5 : 3.5}
                  fill="var(--chart-1)"
                  stroke="var(--card)"
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(i)}
                  onBlur={() => setHoveredIndex(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.label}: $${p.value.toLocaleString()}`}
                />
              ))}

              {points.map((p) => (
                <text
                  key={`label-${p.label}`}
                  x={p.x}
                  y={CHART_HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {p.label}
                </text>
              ))}
            </svg>

            {activePoint ? (
              <div
                className="pointer-events-none absolute rounded-xl border border-border/80 bg-popover/95 px-3 py-2 text-xs shadow-[var(--shadow-md)] backdrop-blur-sm"
                style={{
                  left: `${((activePoint.x - PADDING.left) / (CHART_WIDTH - PADDING.left - PADDING.right)) * 100}%`,
                  top: `${((activePoint.y - PADDING.top) / CHART_HEIGHT) * 100}%`,
                  transform: "translate(-50%, -120%)",
                }}
              >
                <p className="font-medium text-foreground">
                  {activePoint.label}, 2026
                </p>
                <p className="text-primary">
                  ${activePoint.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ) : null}
          </div>
          <p className="sr-only">
            Revenue ranges from ${Math.min(...data.map((d) => d.value)).toLocaleString()} to $
            {maxValue.toLocaleString()}.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
