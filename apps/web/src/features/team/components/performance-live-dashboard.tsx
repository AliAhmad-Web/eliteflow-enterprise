"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  RefreshCw,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import type {
  PerformanceDashboardDto,
  PerformanceScoringConfigDto,
  PerformanceWeights,
  UpdatePerformanceScoringConfigInput,
} from "@enterprise/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  LineChart,
} from "@/features/reports/components/simple-charts";

import { teamService } from "../services/team.service";
import { TEAM_QUERY_KEYS } from "../types/team.types";

const WEIGHT_LABELS: Record<keyof PerformanceWeights, string> = {
  attendance: "Attendance",
  taskCompletion: "Task Completion",
  deadlinePerformance: "Deadline Performance",
  productivity: "Productivity",
  projectContribution: "Project Contribution",
  teamCollaboration: "Team Collaboration",
  discipline: "Discipline",
  learning: "Learning & Improvement",
};

function severityClass(severity: string) {
  switch (severity) {
    case "critical":
      return "border-red-500/40 bg-red-500/10 text-red-200";
    case "warning":
      return "border-amber-500/40 bg-amber-500/10 text-amber-100";
    case "success":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
    default:
      return "border-border/50 bg-card text-foreground";
  }
}

export function PerformanceLiveDashboard({
  canManage,
  isSuperAdmin,
}: {
  canManage: boolean;
  isSuperAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [showConfig, setShowConfig] = useState(false);
  const [draftWeights, setDraftWeights] = useState<PerformanceWeights | null>(
    null,
  );
  const [thresholds, setThresholds] = useState<{
    alertThreshold: number;
    minScoreThreshold: number;
    promotionMinScore: number;
    bonusMinScore: number;
  } | null>(null);

  const dashboardQuery = useQuery({
    queryKey: TEAM_QUERY_KEYS.performanceDashboard(),
    queryFn: () => teamService.getPerformanceDashboard(),
  });

  const configQuery = useQuery({
    queryKey: TEAM_QUERY_KEYS.performanceConfig(),
    queryFn: () => teamService.getPerformanceConfig(),
    enabled: isSuperAdmin,
  });

  const monthlyQuery = useQuery({
    queryKey: TEAM_QUERY_KEYS.performanceMonthly(),
    queryFn: () => teamService.listMonthlyPerformanceReports(),
    enabled: canManage,
  });

  const recalc = useMutation({
    mutationFn: () => teamService.recalculatePerformance({}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: TEAM_QUERY_KEYS.performance(),
      });
    },
  });

  const saveConfig = useMutation({
    mutationFn: (input: UpdatePerformanceScoringConfigInput) =>
      teamService.updatePerformanceConfig(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: TEAM_QUERY_KEYS.performanceConfig(),
      });
      setShowConfig(false);
    },
  });

  const approveReport = useMutation({
    mutationFn: (id: string) =>
      teamService.approveMonthlyReport(id, { status: "APPROVED" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: TEAM_QUERY_KEYS.performanceMonthly(),
      });
    },
  });

  const generateMonthly = useMutation({
    mutationFn: () => teamService.generateMonthlyReports(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: TEAM_QUERY_KEYS.performanceMonthly(),
      });
    },
  });

  const data = dashboardQuery.data;
  const config = configQuery.data;

  function openConfig(cfg: PerformanceScoringConfigDto) {
    setDraftWeights({ ...cfg.weights });
    setThresholds({
      alertThreshold: cfg.alertThreshold,
      minScoreThreshold: cfg.minScoreThreshold,
      promotionMinScore: cfg.promotionMinScore,
      bonusMinScore: cfg.bonusMinScore,
    });
    setShowConfig(true);
  }

  if (dashboardQuery.isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Computing live performance analytics…
        </CardContent>
      </Card>
    );
  }

  if (dashboardQuery.isError || !data) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-between gap-3 py-6">
          <p className="text-sm text-muted-foreground">
            Could not load live performance dashboard.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void dashboardQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            Enterprise 360° AI Performance Engine
          </h3>
          <p className="text-sm text-muted-foreground">
            Fully automatic scoring from live platform activity. Managers approve
            AI recommendations — no manual score editing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Button
              size="sm"
              variant="outline"
              disabled={recalc.isPending}
              onClick={() => recalc.mutate()}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Recalculate
            </Button>
          ) : null}
          {isSuperAdmin && config ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openConfig(config)}
            >
              <Settings2 className="mr-1.5 size-3.5" />
              Scoring weights
            </Button>
          ) : null}
          {canManage ? (
            <Button
              size="sm"
              variant="outline"
              disabled={generateMonthly.isPending}
              onClick={() => generateMonthly.mutate()}
            >
              Generate AI reviews
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<TrendingUp className="size-4" />}
          label="Overall score"
          value={`${data.overallAverage.toFixed(1)}`}
          hint={`${data.scoredEmployees} employees scored`}
        />
        <MetricCard
          icon={<Users className="size-4" />}
          label="Goal progress"
          value={`${data.goalProgressAverage.toFixed(0)}%`}
          hint="Auto-updated from linked tasks"
        />
        <MetricCard
          icon={<Award className="size-4" />}
          label="KPI completion"
          value={`${data.kpiCompletionRate.toFixed(0)}%`}
          hint="Completed goals this period"
        />
        <MetricCard
          icon={<AlertTriangle className="size-4" />}
          label="Needs attention"
          value={`${data.needsAttention.length}`}
          hint="Below alert threshold"
        />
      </div>

      {data.pillarAverages ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["Attendance", data.pillarAverages.attendance],
              ["Productivity", data.pillarAverages.productivity],
              ["Discipline", data.pillarAverages.discipline],
              ["Collaboration", data.pillarAverages.collaboration],
              ["Leadership", data.pillarAverages.leadership],
            ] as const
          ).map(([label, value]) => (
            <Card key={label} className="border-border/50">
              <CardContent className="space-y-1 p-6 pt-6 sm:p-6 sm:pt-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="text-xl font-semibold">{value.toFixed(0)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Burnout risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.burnoutRisks?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No elevated risks.</p>
            ) : (
              data.burnoutRisks?.map((r) => (
                <div
                  key={r.employeeId}
                  className="flex items-center justify-between rounded-lg border border-amber-500/30 px-3 py-2 text-sm"
                >
                  <span>{r.name}</span>
                  <span className="font-medium text-amber-200">{r.risk}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Attrition risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.attritionRisks?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No elevated risks.</p>
            ) : (
              data.attritionRisks?.map((r) => (
                <div
                  key={r.employeeId}
                  className="flex items-center justify-between rounded-lg border border-red-500/30 px-3 py-2 text-sm"
                >
                  <span>{r.name}</span>
                  <span className="font-medium text-red-200">{r.risk}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChart data={data.weeklyTrend} title="Weekly trend" />
        <AreaChart data={data.monthlyTrend} title="Monthly trend" />
        <LineChart data={data.productivityTrend} title="Productivity trend" />
        <AreaChart data={data.attendanceTrend} title="Attendance trend" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Top performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scores yet.</p>
            ) : (
              data.topPerformers.map((p) => (
                <div
                  key={p.employeeId}
                  className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-muted-foreground">
                      {p.department ?? "Unassigned"}
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-300">
                    {p.score}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Employees needing attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.needsAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No employees below threshold.
              </p>
            ) : (
              data.needsAttention.map((p) => (
                <div
                  key={p.employeeId}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.name}</p>
                    <span className="text-amber-200">{p.score}</span>
                  </div>
                  <p className="text-muted-foreground">{p.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankCard
          title="Department rankings"
          rows={data.departmentRankings.map((r) => ({
            name: r.department,
            score: r.averageScore,
            count: r.count,
          }))}
        />
        <RankCard
          title="Team rankings"
          rows={data.teamRankings.map((r) => ({
            name: r.team,
            score: r.averageScore,
            count: r.count,
          }))}
        />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            AI performance insights
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {data.recentInsights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Insights appear after the next recalculation.
            </p>
          ) : (
            data.recentInsights.slice(0, 10).map((insight, idx) => (
              <div
                key={insight.id ?? `${insight.message}-${idx}`}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  severityClass(insight.severity),
                )}
              >
                {insight.message}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canManage && monthlyQuery.data?.items?.length ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Monthly AI reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthlyQuery.data.items.slice(0, 6).map((report) => (
              <div
                key={report.id}
                className="rounded-lg border border-border/50 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {report.year}-{String(report.month).padStart(2, "0")} ·{" "}
                      Score {report.overallScore}
                    </p>
                    <p className="text-muted-foreground">{report.summary}</p>
                  </div>
                  {report.status === "PENDING_APPROVAL" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approveReport.isPending}
                      onClick={() => approveReport.mutate(report.id)}
                    >
                      Approve
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {report.status}
                    </span>
                  )}
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <ListBlock title="Strengths" items={report.strengths} />
                  <ListBlock title="Weaknesses" items={report.weaknesses} />
                  <ListBlock
                    title="AI recommendations"
                    items={report.aiRecommendations}
                  />
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Readiness
                    </p>
                    <p>
                      Promotion: {report.promotionReady ? "Yes" : "No"} · Salary
                      review: {report.salaryReviewSuggested ? "Suggested" : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {showConfig && draftWeights && thresholds ? (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Scoring configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(draftWeights) as (keyof PerformanceWeights)[]).map(
                (key) => (
                  <label key={key} className="space-y-1 text-sm">
                    <span className="text-muted-foreground">
                      {WEIGHT_LABELS[key]}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={draftWeights[key]}
                      onChange={(e) =>
                        setDraftWeights((prev) =>
                          prev
                            ? {
                                ...prev,
                                [key]: Number(e.target.value),
                              }
                            : prev,
                        )
                      }
                    />
                  </label>
                ),
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Alert threshold</span>
                <Input
                  type="number"
                  value={thresholds.alertThreshold}
                  onChange={(e) =>
                    setThresholds((t) =>
                      t
                        ? { ...t, alertThreshold: Number(e.target.value) }
                        : t,
                    )
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Min score</span>
                <Input
                  type="number"
                  value={thresholds.minScoreThreshold}
                  onChange={(e) =>
                    setThresholds((t) =>
                      t
                        ? { ...t, minScoreThreshold: Number(e.target.value) }
                        : t,
                    )
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Promotion min</span>
                <Input
                  type="number"
                  value={thresholds.promotionMinScore}
                  onChange={(e) =>
                    setThresholds((t) =>
                      t
                        ? { ...t, promotionMinScore: Number(e.target.value) }
                        : t,
                    )
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Bonus min</span>
                <Input
                  type="number"
                  value={thresholds.bonusMinScore}
                  onChange={(e) =>
                    setThresholds((t) =>
                      t
                        ? { ...t, bonusMinScore: Number(e.target.value) }
                        : t,
                    )
                  }
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Weights must sum to 100. Current total:{" "}
              {Object.values(draftWeights).reduce((a, b) => a + b, 0)}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={saveConfig.isPending}
                onClick={() =>
                  saveConfig.mutate({
                    weights: draftWeights,
                    ...thresholds,
                  })
                }
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConfig(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <SnapshotStrip data={data} />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="space-y-1 p-6 pt-6 sm:p-6 sm:pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function RankCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; score: number; count: number }>;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rankings yet.</p>
        ) : (
          rows.slice(0, 6).map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between text-sm"
            >
              <span>
                {row.name}{" "}
                <span className="text-muted-foreground">({row.count})</span>
              </span>
              <span className="font-medium">{row.score}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-muted-foreground">—</p>
      ) : (
        <ul className="list-disc space-y-0.5 pl-4">
          {items.slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SnapshotStrip({ data }: { data: PerformanceDashboardDto }) {
  if (data.snapshots.length === 0) return null;
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Live employee scores</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {data.snapshots.slice(0, 9).map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-border/40 px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {s.employee?.user
                  ? `${s.employee.user.firstName} ${s.employee.user.lastName}`
                  : s.employeeId.slice(0, 8)}
              </p>
              <span
                className={cn(
                  "font-semibold",
                  s.overallScore >= 80
                    ? "text-emerald-300"
                    : s.overallScore < 50
                      ? "text-amber-200"
                      : "text-foreground",
                )}
              >
                {s.overallScore}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Δ {s.trendDelta >= 0 ? "+" : ""}
              {s.trendDelta} · {s.derivedRating.replaceAll("_", " ")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
