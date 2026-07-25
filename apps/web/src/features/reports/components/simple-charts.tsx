"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ChartPoint } from "@enterprise/shared";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;
const PADDING = { top: 20, right: 16, bottom: 28, left: 48 };

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

interface ChartCardProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

function ChartCard({ title, className, children }: ChartCardProps) {
  return (
    <Card className={cn("h-full border-border/50 content-auto", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="chart-responsive pb-5">{children}</CardContent>
    </Card>
  );
}

function GridLines() {
  return (
    <>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y =
          PADDING.top + (CHART_HEIGHT - PADDING.top - PADDING.bottom) * ratio;
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
    </>
  );
}

function useChartGeometry(data: ChartPoint[]) {
  return useMemo(() => {
    const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const max = Math.max(...data.map((d) => d.value), 1);
    const step = innerW / Math.max(data.length - 1, 1);

    const points = data.map((d, i) => ({
      x: PADDING.left + i * step,
      y: PADDING.top + innerH - (d.value / max) * innerH,
      ...d,
    }));

    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const area = `${line} L ${points[points.length - 1]?.x ?? 0} ${PADDING.top + innerH} L ${points[0]?.x ?? 0} ${PADDING.top + innerH} Z`;

    return { points, line, area, max, innerH };
  }, [data]);
}

interface LineChartProps {
  data: ChartPoint[];
  title?: string;
  color?: string;
  className?: string;
  valueFormatter?: (value: number) => string;
}

export function LineChart({
  data,
  title = "Trend",
  color = CHART_COLORS[0],
  className,
  valueFormatter = (v) => v.toLocaleString(),
}: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { points, line, max } = useChartGeometry(data);
  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  if (data.length === 0) {
    return (
      <ChartCard title={title} className={className}>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No chart data available.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title} className={className}>
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`${title} line chart`}
        >
          <GridLines />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle
              key={`${p.label}-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 4}
              fill={color}
              stroke="var(--card)"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              tabIndex={0}
              role="button"
              aria-label={`${p.label}: ${valueFormatter(p.value)}`}
            />
          ))}
          {points.map((p, i) => (
            <text
              key={`label-${p.label}-${i}`}
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
            className="pointer-events-none absolute rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
            style={{
              left: `${((activePoint.x - PADDING.left) / (CHART_WIDTH - PADDING.left - PADDING.right)) * 100}%`,
              top: `${((activePoint.y - PADDING.top) / CHART_HEIGHT) * 100}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <p className="font-medium text-foreground">{activePoint.label}</p>
            <p className="text-primary">{valueFormatter(activePoint.value)}</p>
          </div>
        ) : null}
      </div>
      <p className="sr-only">
        Values range from {Math.min(...data.map((d) => d.value)).toLocaleString()}{" "}
        to {max.toLocaleString()}.
      </p>
    </ChartCard>
  );
}

interface AreaChartProps {
  data: ChartPoint[];
  title?: string;
  color?: string;
  className?: string;
  valueFormatter?: (value: number) => string;
}

export function AreaChart({
  data,
  title = "Trend",
  color = CHART_COLORS[0],
  className,
  valueFormatter = (v) => v.toLocaleString(),
}: AreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { points, line, area, max } = useChartGeometry(data);
  const gradientId = useMemo(
    () => `area-gradient-${title.replace(/\s+/g, "-").toLowerCase()}`,
    [title],
  );
  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  if (data.length === 0) {
    return (
      <ChartCard title={title} className={className}>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No chart data available.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title} className={className}>
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`${title} area chart`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <GridLines />
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle
              key={`${p.label}-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 4}
              fill={color}
              stroke="var(--card)"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              tabIndex={0}
              role="button"
              aria-label={`${p.label}: ${valueFormatter(p.value)}`}
            />
          ))}
          {points.map((p, i) => (
            <text
              key={`label-${p.label}-${i}`}
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
            className="pointer-events-none absolute rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
            style={{
              left: `${((activePoint.x - PADDING.left) / (CHART_WIDTH - PADDING.left - PADDING.right)) * 100}%`,
              top: `${((activePoint.y - PADDING.top) / CHART_HEIGHT) * 100}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <p className="font-medium text-foreground">{activePoint.label}</p>
            <p className="text-primary">{valueFormatter(activePoint.value)}</p>
          </div>
        ) : null}
      </div>
      <p className="sr-only">
        Values range from {Math.min(...data.map((d) => d.value)).toLocaleString()}{" "}
        to {max.toLocaleString()}.
      </p>
    </ChartCard>
  );
}

interface BarChartProps {
  data: ChartPoint[];
  title?: string;
  className?: string;
  valueFormatter?: (value: number) => string;
}

export function BarChart({
  data,
  title = "Breakdown",
  className,
  valueFormatter = (v) => v.toLocaleString(),
}: BarChartProps) {
  const geometry = useMemo(() => {
    const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const max = Math.max(...data.map((d) => d.value), 1);
    const gap = 8;
    const barWidth = Math.max(
      (innerW - gap * Math.max(data.length - 1, 0)) / Math.max(data.length, 1),
      12,
    );

    const bars = data.map((d, i) => {
      const height = (d.value / max) * innerH;
      const x = PADDING.left + i * (barWidth + gap);
      const y = PADDING.top + innerH - height;
      return { ...d, x, y, width: barWidth, height };
    });

    return { bars, max, innerH };
  }, [data]);

  if (data.length === 0) {
    return (
      <ChartCard title={title} className={className}>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No chart data available.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title} className={className}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${title} bar chart`}
      >
        <GridLines />
        {geometry.bars.map((bar, i) => (
          <g key={`${bar.label}-${i}`}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={4}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              aria-label={`${bar.label}: ${valueFormatter(bar.value)}`}
            />
            <text
              x={bar.x + bar.width / 2}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>
    </ChartCard>
  );
}

interface PieChartProps {
  data: ChartPoint[];
  title?: string;
  className?: string;
}

export function PieChart({
  data,
  title = "Distribution",
  className,
}: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;

  const arcs = useMemo(() => {
    return data.reduce<
      Array<
        ChartPoint & {
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
        color: CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0],
      });

      return acc;
    }, []);
  }, [data, total, circumference]);

  if (data.length === 0) {
    return (
      <ChartCard title={title} className={className}>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No chart data available.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title} className={className}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label={`${title} pie chart showing ${total} total`}
          >
            {arcs.map((arc, index) => (
              <circle
                key={`${arc.label}-${index}`}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth="20"
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{total}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>

        <ul
          className="w-full space-y-3 sm:max-w-[200px]"
          aria-label={`${title} legend`}
        >
          {data.map((segment, index) => (
            <li
              key={`${segment.label}-${index}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      CHART_COLORS[index % CHART_COLORS.length],
                  }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">{segment.label}</span>
              </div>
              <span className="font-semibold text-foreground">
                {segment.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
