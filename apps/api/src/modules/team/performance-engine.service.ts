import {
  NotificationCategory,
  NotificationPriority,
  PerformanceRating,
  PerformanceScoreSource,
  prisma,
  type EmployeeStatus,
  type GoalStatus,
  type PerformanceMonthlyReportStatus,
} from "@enterprise/database";
import type {
  PerformanceComponentScore,
  PerformanceDashboardDto,
  PerformanceInsightDto,
  PerformanceMonthlyReportDto,
  PerformanceScoreSnapshotDto,
  PerformanceScoringConfigDto,
  PerformanceWeights,
  UpdatePerformanceScoringConfigInput,
} from "@enterprise/shared";
import { notificationDispatcher } from "../notifications/index.js";
import { TEAM_ERROR_CODES, TeamError } from "./team.errors.js";
import {
  collectPerformanceMetrics,
  type PerformanceMetricCatalog,
  type PerformancePredictions,
  type PerformanceRecommendations,
  type PerformanceScoreBreakdown,
} from "./performance-metrics.js";
import { toEmployeeDto } from "./team.types.js";

const DEFAULT_WEIGHTS: PerformanceWeights = {
  attendance: 15,
  taskCompletion: 25,
  deadlinePerformance: 15,
  productivity: 15,
  projectContribution: 10,
  teamCollaboration: 10,
  discipline: 5,
  learning: 5,
};

const SCORABLE_EMPLOYEE_STATUSES: EmployeeStatus[] = ["ACTIVE", "ON_LEAVE"];

const DEFAULT_ENABLED: Record<keyof PerformanceWeights, boolean> = {
  attendance: true,
  taskCompletion: true,
  deadlinePerformance: true,
  productivity: true,
  projectContribution: true,
  teamCollaboration: true,
  discipline: true,
  learning: true,
};

const METRIC_LABELS: Record<keyof PerformanceWeights, string> = {
  attendance: "Attendance",
  taskCompletion: "Task Completion",
  deadlinePerformance: "Deadline Performance",
  productivity: "Productivity",
  projectContribution: "Project Contribution",
  teamCollaboration: "Team Collaboration",
  discipline: "Discipline",
  learning: "Learning & Improvement",
};

type InsightDraft = {
  severity: PerformanceInsightDto["severity"];
  category: string;
  message: string;
  metricKey?: string | null;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function dateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function ratingFromScore(score: number): PerformanceRating {
  if (score >= 90) return PerformanceRating.EXCELLENT;
  if (score >= 80) return PerformanceRating.GOOD;
  if (score >= 65) return PerformanceRating.AVERAGE;
  if (score >= 50) return PerformanceRating.BELOW_AVERAGE;
  return PerformanceRating.POOR;
}

function asWeights(value: unknown): PerformanceWeights {
  const raw = (value ?? {}) as Partial<PerformanceWeights>;
  return {
    attendance: Number(raw.attendance ?? DEFAULT_WEIGHTS.attendance),
    taskCompletion: Number(raw.taskCompletion ?? DEFAULT_WEIGHTS.taskCompletion),
    deadlinePerformance: Number(
      raw.deadlinePerformance ?? DEFAULT_WEIGHTS.deadlinePerformance,
    ),
    productivity: Number(raw.productivity ?? DEFAULT_WEIGHTS.productivity),
    projectContribution: Number(
      raw.projectContribution ?? DEFAULT_WEIGHTS.projectContribution,
    ),
    teamCollaboration: Number(
      raw.teamCollaboration ?? DEFAULT_WEIGHTS.teamCollaboration,
    ),
    discipline: Number(raw.discipline ?? DEFAULT_WEIGHTS.discipline),
    learning: Number(raw.learning ?? DEFAULT_WEIGHTS.learning),
  };
}

function asEnabled(value: unknown): Record<string, boolean> {
  const raw = (value ?? {}) as Record<string, boolean>;
  return { ...DEFAULT_ENABLED, ...raw };
}

function parseComponents(value: unknown): PerformanceComponentScore[] {
  if (!Array.isArray(value)) return [];
  return value as PerformanceComponentScore[];
}

function parseInsights(value: unknown): PerformanceInsightDto[] {
  if (!Array.isArray(value)) return [];
  return value as PerformanceInsightDto[];
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export class PerformanceEngineService {
  async getOrCreateConfig(): Promise<PerformanceScoringConfigDto> {
    let row = await prisma.performanceScoringConfig.findUnique({
      where: { key: "default" },
    });
    if (!row) {
      row = await prisma.performanceScoringConfig.create({
        data: {
          key: "default",
          weights: DEFAULT_WEIGHTS,
          enabledMetrics: DEFAULT_ENABLED,
        },
      });
    }
    return this.toConfigDto(row);
  }

  async updateConfig(
    input: UpdatePerformanceScoringConfigInput,
    updatedById: string,
  ): Promise<PerformanceScoringConfigDto> {
    await this.getOrCreateConfig();
    if (input.weights) {
      const total = Object.values(input.weights).reduce((a, b) => a + b, 0);
      if (Math.abs(total - 100) > 0.5) {
        throw new TeamError(
          "Performance weights must sum to 100",
          400,
          TEAM_ERROR_CODES.VALIDATION,
        );
      }
    }
    const row = await prisma.performanceScoringConfig.update({
      where: { key: "default" },
      data: {
        ...(input.weights !== undefined ? { weights: input.weights } : {}),
        ...(input.enabledMetrics !== undefined
          ? { enabledMetrics: input.enabledMetrics }
          : {}),
        ...(input.minScoreThreshold !== undefined
          ? { minScoreThreshold: input.minScoreThreshold }
          : {}),
        ...(input.alertThreshold !== undefined
          ? { alertThreshold: input.alertThreshold }
          : {}),
        ...(input.promotionMinScore !== undefined
          ? { promotionMinScore: input.promotionMinScore }
          : {}),
        ...(input.bonusMinScore !== undefined
          ? { bonusMinScore: input.bonusMinScore }
          : {}),
        ...(input.lookbackDays !== undefined
          ? { lookbackDays: input.lookbackDays }
          : {}),
        updatedById,
      },
    });
    return this.toConfigDto(row);
  }

  async recalculateAll(options?: {
    employeeId?: string;
    lookbackDays?: number;
  }): Promise<{ processed: number; alerts: number }> {
    const config = await this.getOrCreateConfig();
    const lookback = options?.lookbackDays ?? config.lookbackDays;
    const periodEnd = startOfUtcDay(new Date());
    const periodStart = addDays(periodEnd, -(lookback - 1));

    const employees = await prisma.employeeProfile.findMany({
      where: {
        deletedAt: null,
        status: { in: SCORABLE_EMPLOYEE_STATUSES },
        ...(options?.employeeId ? { id: options.employeeId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        department: { select: { id: true, name: true } },
        primaryTeam: { select: { id: true, name: true } },
        manager: { select: { id: true } },
      },
    });

    let alerts = 0;
    for (const employee of employees) {
      const result = await this.computeAndPersistEmployee(
        employee,
        periodStart,
        periodEnd,
        config,
      );
      if (result.alerted) alerts += 1;
      await this.syncGoalProgress(employee.id, employee.userId);
    }

    await this.assignRanks(periodStart, periodEnd);
    return { processed: employees.length, alerts };
  }

  private async assignRanks(periodStart: Date, periodEnd: Date): Promise<void> {
    const snapshots = await prisma.performanceScoreSnapshot.findMany({
      where: { periodStart, periodEnd },
      include: {
        employee: { select: { id: true, departmentId: true } },
      },
      orderBy: { overallScore: "desc" },
    });

    for (let i = 0; i < snapshots.length; i += 1) {
      await prisma.performanceScoreSnapshot.update({
        where: { id: snapshots[i]!.id },
        data: { organizationRank: i + 1 },
      });
    }

    const byDept = new Map<string, typeof snapshots>();
    for (const snap of snapshots) {
      const deptId = snap.employee.departmentId ?? "none";
      const list = byDept.get(deptId) ?? [];
      list.push(snap);
      byDept.set(deptId, list);
    }
    for (const list of byDept.values()) {
      list.sort((a, b) => b.overallScore - a.overallScore);
      for (let i = 0; i < list.length; i += 1) {
        await prisma.performanceScoreSnapshot.update({
          where: { id: list[i]!.id },
          data: { departmentRank: i + 1 },
        });
      }
    }
  }

  private async notifySuperAdmins(input: {
    title: string;
    body: string;
    entityId: string;
  }): Promise<void> {
    const admins = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { code: "SUPER_ADMIN" },
      },
      select: { id: true },
      take: 20,
    });
    for (const admin of admins) {
      void notificationDispatcher.notify({
        title: input.title,
        body: input.body,
        category: NotificationCategory.TEAM,
        priority: NotificationPriority.HIGH,
        linkUrl: `/team?tab=performance`,
        entityType: "EmployeeProfile",
        entityId: input.entityId,
        audience: { type: "INDIVIDUAL", userId: admin.id },
      });
    }
  }

  async getDashboard(scope?: {
    employeeUserId?: string;
    manageAll?: boolean;
    skipAutoRecalc?: boolean;
  }): Promise<PerformanceDashboardDto> {
    const config = await this.getOrCreateConfig();
    const periodEnd = startOfUtcDay(new Date());
    const periodStart = addDays(periodEnd, -(config.lookbackDays - 1));

    const employeeWhere = {
      deletedAt: null,
      status: { in: SCORABLE_EMPLOYEE_STATUSES },
      ...(scope?.manageAll || !scope?.employeeUserId
        ? {}
        : { userId: scope.employeeUserId }),
    };

    const snapshots = await prisma.performanceScoreSnapshot.findMany({
      where: {
        periodStart,
        periodEnd,
        employee: employeeWhere,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
            department: true,
            primaryTeam: { select: { id: true, name: true } },
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { overallScore: "desc" },
    });

    if (snapshots.length === 0 && (scope?.manageAll || !scope?.employeeUserId) && !scope?.skipAutoRecalc) {
      await this.recalculateAll({ lookbackDays: config.lookbackDays });
      return this.getDashboard({ ...scope, skipAutoRecalc: true });
    }

    const scored = snapshots.map((s) => this.toSnapshotDto(s));
    const employeeLabel = (s: PerformanceScoreSnapshotDto) => {
      const u = s.employee?.user;
      if (!u) return s.employeeId.slice(0, 4);
      return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`;
    };
    const employeeName = (s: PerformanceScoreSnapshotDto) => {
      const u = s.employee?.user;
      if (!u) return "Employee";
      return `${u.firstName} ${u.lastName}`.trim();
    };
    const overallAverage =
      scored.length === 0
        ? 0
        : scored.reduce((a, s) => a + s.overallScore, 0) / scored.length;

    const goals = await prisma.employeeGoal.findMany({
      where: { deletedAt: null, employee: employeeWhere },
      select: { progress: true, status: true },
    });
    const goalProgressAverage =
      goals.length === 0
        ? 0
        : goals.reduce((a, g) => a + g.progress, 0) / goals.length;
    const kpiCompletionRate =
      goals.length === 0
        ? 0
        : (goals.filter((g) => g.status === "COMPLETED").length / goals.length) *
          100;

    const weeklyTrend = await this.buildTrendSeries(employeeWhere, 7, 7);
    const monthlyTrend = await this.buildTrendSeries(employeeWhere, 30, 6);
    const productivityTrend = scored.slice(0, 12).map((s) => ({
      label: employeeLabel(s),
      value:
        s.componentScores.find((c) => c.key === "productivity")?.score ??
        s.overallScore,
    }));
    const attendanceTrend = scored.slice(0, 12).map((s) => ({
      label: employeeLabel(s),
      value:
        s.componentScores.find((c) => c.key === "attendance")?.score ??
        s.overallScore,
    }));

    const topPerformers = scored.slice(0, 5).map((s) => ({
      employeeId: s.employeeId,
      name: employeeName(s),
      score: s.overallScore,
      department: s.employee?.department?.name ?? null,
    }));

    const needsAttention = scored
      .filter((s) => s.overallScore < config.alertThreshold)
      .slice(0, 8)
      .map((s) => ({
        employeeId: s.employeeId,
        name: employeeName(s),
        score: s.overallScore,
        reason:
          s.insights[0]?.message ??
          `Score below threshold (${config.alertThreshold})`,
      }));

    const deptMap = new Map<string, { sum: number; count: number }>();
    const teamMap = new Map<string, { sum: number; count: number }>();
    for (const s of scored) {
      const dept = s.employee?.department?.name ?? "Unassigned";
      const team = s.employee?.primaryTeam?.name ?? "Unassigned";
      const d = deptMap.get(dept) ?? { sum: 0, count: 0 };
      d.sum += s.overallScore;
      d.count += 1;
      deptMap.set(dept, d);
      const t = teamMap.get(team) ?? { sum: 0, count: 0 };
      t.sum += s.overallScore;
      t.count += 1;
      teamMap.set(team, t);
    }

    const insights = await prisma.performanceInsight.findMany({
      where: {
        employee: employeeWhere,
        acknowledged: false,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const avgPillar = (key: string) => {
      const values = scored
        .map((s) => {
          const breakdown = s.scoreBreakdown as Record<string, number> | null | undefined;
          if (breakdown && typeof breakdown[key] === "number") return breakdown[key]!;
          return s.componentScores.find((c) => c.key === key)?.score;
        })
        .filter((v): v is number => typeof v === "number");
      if (values.length === 0) return 0;
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    };

    const burnoutRisks = scored
      .filter((s) => (s.predictions?.burnoutRisk ?? 0) >= 55)
      .sort((a, b) => (b.predictions?.burnoutRisk ?? 0) - (a.predictions?.burnoutRisk ?? 0))
      .slice(0, 6)
      .map((s) => ({
        employeeId: s.employeeId,
        name: employeeName(s),
        risk: s.predictions?.burnoutRisk ?? 0,
      }));

    const attritionRisks = scored
      .filter((s) => (s.predictions?.attritionRisk ?? 0) >= 55)
      .sort(
        (a, b) =>
          (b.predictions?.attritionRisk ?? 0) - (a.predictions?.attritionRisk ?? 0),
      )
      .slice(0, 6)
      .map((s) => ({
        employeeId: s.employeeId,
        name: employeeName(s),
        risk: s.predictions?.attritionRisk ?? 0,
      }));

    return {
      overallAverage: Math.round(overallAverage * 10) / 10,
      scoredEmployees: scored.length,
      weeklyTrend,
      monthlyTrend,
      productivityTrend,
      attendanceTrend,
      goalProgressAverage: Math.round(goalProgressAverage * 10) / 10,
      kpiCompletionRate: Math.round(kpiCompletionRate * 10) / 10,
      pillarAverages: {
        attendance: avgPillar("attendance"),
        productivity: avgPillar("productivity"),
        discipline: avgPillar("discipline"),
        collaboration: avgPillar("collaboration"),
        leadership: avgPillar("leadership"),
      },
      topPerformers,
      needsAttention,
      burnoutRisks,
      attritionRisks,
      departmentRankings: [...deptMap.entries()]
        .map(([department, v]) => ({
          department,
          averageScore: Math.round((v.sum / v.count) * 10) / 10,
          count: v.count,
        }))
        .sort((a, b) => b.averageScore - a.averageScore),
      teamRankings: [...teamMap.entries()]
        .map(([team, v]) => ({
          team,
          averageScore: Math.round((v.sum / v.count) * 10) / 10,
          count: v.count,
        }))
        .sort((a, b) => b.averageScore - a.averageScore),
      recentInsights: insights.map((i) => ({
        id: i.id,
        severity: i.severity as PerformanceInsightDto["severity"],
        category: i.category,
        message: i.message,
        metricKey: i.metricKey,
        createdAt: i.createdAt.toISOString(),
      })),
      snapshots: scored,
    };
  }

  async listInsights(employeeId?: string) {
    return prisma.performanceInsight.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        acknowledged: false,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async listMonthlyReports(employeeId?: string) {
    return prisma.performanceMonthlyReport.findMany({
      where: employeeId ? { employeeId } : {},
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
            department: true,
            primaryTeam: { select: { id: true, name: true } },
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  async generateMonthlyReports(forDate = new Date()): Promise<number> {
    const config = await this.getOrCreateConfig();
    const year = forDate.getUTCFullYear();
    const month = forDate.getUTCMonth() + 1;
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));

    const employees = await prisma.employeeProfile.findMany({
      where: { deletedAt: null, status: { in: SCORABLE_EMPLOYEE_STATUSES } },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    let created = 0;
    for (const employee of employees) {
      const computed = await this.collectMetrics(
        employee.id,
        employee.userId,
        periodStart,
        periodEnd,
        config,
      );
      const strengths = computed.components
        .filter((c) => c.enabled && c.score >= 80)
        .map((c) => `Strong ${c.label.toLowerCase()} (${c.score})`);
      const weaknesses = computed.components
        .filter((c) => c.enabled && c.score < 60)
        .map((c) => `${c.label} needs attention (${c.score})`);
      const improvements = computed.insights
        .filter((i) => i.severity === "warning" || i.severity === "critical")
        .map((i) => i.message)
        .slice(0, 5);
      const recommendations = [
        ...computed.insights
          .filter((i) => i.severity === "success" || i.severity === "info")
          .map((i) => i.message)
          .slice(0, 3),
        computed.overall >= config.promotionMinScore
          ? "Consider promotion discussion based on sustained high performance."
          : "Continue coaching on lowest-scoring metrics next month.",
        computed.overall >= config.bonusMinScore
          ? "Eligible for performance bonus review."
          : "Not currently eligible for bonus recommendation.",
      ];

      await prisma.performanceMonthlyReport.upsert({
        where: {
          employeeId_year_month: { employeeId: employee.id, year, month },
        },
        create: {
          employeeId: employee.id,
          year,
          month,
          overallScore: computed.overall,
          summary: `${employee.user.firstName} ${employee.user.lastName} scored ${computed.overall}/100 for ${year}-${String(month).padStart(2, "0")}.`,
          strengths,
          weaknesses,
          improvements,
          aiRecommendations: recommendations,
          promotionReady: computed.overall >= config.promotionMinScore,
          salaryReviewSuggested: computed.overall >= config.bonusMinScore,
          status: "PENDING_APPROVAL" as PerformanceMonthlyReportStatus,
          componentScores: computed.components,
        },
        update: {
          overallScore: computed.overall,
          summary: `${employee.user.firstName} ${employee.user.lastName} scored ${computed.overall}/100 for ${year}-${String(month).padStart(2, "0")}.`,
          strengths,
          weaknesses,
          improvements,
          aiRecommendations: recommendations,
          promotionReady: computed.overall >= config.promotionMinScore,
          salaryReviewSuggested: computed.overall >= config.bonusMinScore,
          componentScores: computed.components,
        },
      });
      created += 1;
    }
    return created;
  }

  /**
   * Generate AI period reports (weekly / monthly / quarterly / annual) for all employees.
   */
  async generatePeriodReports(
    periodType: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL" = "MONTHLY",
    forDate = new Date(),
  ): Promise<number> {
    const config = await this.getOrCreateConfig();
    const { periodStart, periodEnd, periodKey } = this.resolvePeriodBounds(
      periodType,
      forDate,
    );

    const employees = await prisma.employeeProfile.findMany({
      where: { deletedAt: null, status: { in: SCORABLE_EMPLOYEE_STATUSES } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    let created = 0;
    for (const employee of employees) {
      const computed = await this.collectMetrics(
        employee.id,
        employee.userId,
        periodStart,
        periodEnd,
        config,
      );
      const strengths = computed.components
        .filter((c) => c.enabled && c.score >= 80)
        .map((c) => `Strong ${c.label.toLowerCase()} (${c.score})`);
      const weaknesses = computed.components
        .filter((c) => c.enabled && c.score < 60)
        .map((c) => `${c.label} needs attention (${c.score})`);
      const improvements = computed.insights
        .filter((i) => i.severity === "warning" || i.severity === "critical")
        .map((i) => i.message)
        .slice(0, 5);
      const recommendations = [
        ...computed.recommendations.trainingPrograms.map(
          (t) => `Training: ${t}`,
        ),
        computed.recommendations.promotionReady
          ? "Promotion recommended."
          : "Continue development path.",
        computed.recommendations.bonusSuggested
          ? "Bonus eligibility suggested."
          : "Not currently bonus-eligible.",
        computed.recommendations.salaryReviewSuggested
          ? "Salary review suggested."
          : "Salary review not indicated.",
      ];

      await prisma.performancePeriodReport.upsert({
        where: {
          employeeId_periodType_periodKey: {
            employeeId: employee.id,
            periodType,
            periodKey,
          },
        },
        create: {
          employeeId: employee.id,
          periodType,
          periodKey,
          periodStart,
          periodEnd,
          overallScore: computed.overall,
          scoreBreakdown: computed.breakdown,
          metrics: computed.metrics,
          predictions: computed.predictions,
          summary: `${employee.user.firstName} ${employee.user.lastName} scored ${computed.overall}/100 for ${periodType.toLowerCase()} ${periodKey}.`,
          strengths,
          weaknesses,
          improvements,
          aiRecommendations: recommendations,
          trainingSuggestions: computed.recommendations.trainingPrograms,
          promotionReady: computed.recommendations.promotionReady,
          salaryReviewSuggested: computed.recommendations.salaryReviewSuggested,
          bonusSuggested: computed.recommendations.bonusSuggested,
          burnoutRisk: computed.predictions.burnoutRisk,
          attritionRisk: computed.predictions.attritionRisk,
          status: "PENDING_APPROVAL",
          componentScores: computed.components,
        },
        update: {
          periodStart,
          periodEnd,
          overallScore: computed.overall,
          scoreBreakdown: computed.breakdown,
          metrics: computed.metrics,
          predictions: computed.predictions,
          summary: `${employee.user.firstName} ${employee.user.lastName} scored ${computed.overall}/100 for ${periodType.toLowerCase()} ${periodKey}.`,
          strengths,
          weaknesses,
          improvements,
          aiRecommendations: recommendations,
          trainingSuggestions: computed.recommendations.trainingPrograms,
          promotionReady: computed.recommendations.promotionReady,
          salaryReviewSuggested: computed.recommendations.salaryReviewSuggested,
          bonusSuggested: computed.recommendations.bonusSuggested,
          burnoutRisk: computed.predictions.burnoutRisk,
          attritionRisk: computed.predictions.attritionRisk,
          componentScores: computed.components,
        },
      });
      created += 1;
    }
    return created;
  }

  private resolvePeriodBounds(
    periodType: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL",
    forDate: Date,
  ): { periodStart: Date; periodEnd: Date; periodKey: string } {
    const y = forDate.getUTCFullYear();
    const m = forDate.getUTCMonth();
    switch (periodType) {
      case "WEEKLY": {
        const end = startOfUtcDay(forDate);
        const start = addDays(end, -6);
        const week = Math.ceil(
          ((end.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7,
        );
        return {
          periodStart: start,
          periodEnd: end,
          periodKey: `${y}-W${String(week).padStart(2, "0")}`,
        };
      }
      case "MONTHLY": {
        const periodStart = new Date(Date.UTC(y, m, 1));
        const periodEnd = new Date(Date.UTC(y, m + 1, 0));
        return {
          periodStart,
          periodEnd,
          periodKey: `${y}-${String(m + 1).padStart(2, "0")}`,
        };
      }
      case "QUARTERLY": {
        const q = Math.floor(m / 3);
        const periodStart = new Date(Date.UTC(y, q * 3, 1));
        const periodEnd = new Date(Date.UTC(y, q * 3 + 3, 0));
        return { periodStart, periodEnd, periodKey: `${y}-Q${q + 1}` };
      }
      case "ANNUAL": {
        return {
          periodStart: new Date(Date.UTC(y, 0, 1)),
          periodEnd: new Date(Date.UTC(y, 11, 31)),
          periodKey: `${y}`,
        };
      }
      default: {
        const _exhaustive: never = periodType;
        return _exhaustive;
      }
    }
  }

  async approveMonthlyReport(
    id: string,
    input: { managerNotes?: string | null; status?: "APPROVED" | "ADJUSTED" },
    approvedById: string,
  ): Promise<PerformanceMonthlyReportDto> {
    const row = await prisma.performanceMonthlyReport.update({
      where: { id },
      data: {
        status: input.status ?? "APPROVED",
        managerNotes: input.managerNotes ?? null,
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                role: { select: { code: true, name: true } },
              },
            },
            department: true,
            primaryTeam: { select: { id: true, name: true } },
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    return this.toMonthlyDto(row);
  }

  async syncGoalProgress(employeeId: string, userId: string): Promise<void> {
    const goals = await prisma.employeeGoal.findMany({
      where: { employeeId, deletedAt: null, autoProgress: true },
    });
    for (const goal of goals) {
      const taskIds = goal.linkedTaskIds ?? [];
      if (taskIds.length === 0) continue;
      const tasks = await prisma.task.findMany({
        where: {
          id: { in: taskIds },
          OR: [{ assignedToId: userId }, { createdById: userId }],
        },
        select: { id: true, status: true, progress: true },
      });
      if (tasks.length === 0) continue;
      const completed = tasks.filter((t) => t.status === "COMPLETED").length;
      const progress = clamp((completed / tasks.length) * 100);
      let status: GoalStatus = goal.status;
      if (progress >= 100) status = "COMPLETED";
      else if (progress > 0) status = "IN_PROGRESS";
      else status = "NOT_STARTED";
      await prisma.employeeGoal.update({
        where: { id: goal.id },
        data: { progress, status },
      });
    }
  }

  private async computeAndPersistEmployee(
    employee: {
      id: string;
      userId: string;
      managerId: string | null;
      user: { firstName: string; lastName: string };
      department: { name: string } | null;
    },
    periodStart: Date,
    periodEnd: Date,
    config: PerformanceScoringConfigDto,
  ): Promise<{ alerted: boolean }> {
    const previous = await prisma.performanceScoreSnapshot.findFirst({
      where: {
        employeeId: employee.id,
        NOT: { periodStart, periodEnd },
      },
      orderBy: { computedAt: "desc" },
    });

    const computed = await this.collectMetrics(
      employee.id,
      employee.userId,
      periodStart,
      periodEnd,
      config,
    );
    const trendDelta = previous
      ? computed.overall - previous.overallScore
      : 0;

    await prisma.performanceScoreSnapshot.upsert({
      where: {
        employeeId_periodStart_periodEnd: {
          employeeId: employee.id,
          periodStart,
          periodEnd,
        },
      },
      create: {
        employeeId: employee.id,
        periodStart,
        periodEnd,
        overallScore: computed.overall,
        componentScores: computed.components,
        scoreBreakdown: computed.breakdown,
        metrics: computed.metrics,
        predictions: computed.predictions,
        recommendations: computed.recommendations,
        derivedRating: computed.rating,
        insights: computed.insights,
        trendDelta,
        source: PerformanceScoreSource.AUTO,
        computedAt: new Date(),
      },
      update: {
        overallScore: computed.overall,
        componentScores: computed.components,
        scoreBreakdown: computed.breakdown,
        metrics: computed.metrics,
        predictions: computed.predictions,
        recommendations: computed.recommendations,
        derivedRating: computed.rating,
        insights: computed.insights,
        trendDelta,
        source: PerformanceScoreSource.AUTO,
        computedAt: new Date(),
      },
    });

    await prisma.performanceInsight.deleteMany({
      where: {
        employeeId: employee.id,
        acknowledged: false,
        createdAt: { lt: addDays(new Date(), -1) },
      },
    });
    if (computed.insights.length > 0) {
      await prisma.performanceInsight.createMany({
        data: computed.insights.map((i) => ({
          employeeId: employee.id,
          severity: i.severity,
          category: i.category,
          message: i.message.slice(0, 500),
          metricKey: i.metricKey ?? null,
          expiresAt: addDays(new Date(), 14),
        })),
      });
    }

    // Keep a hybrid auto review row for the current period for legacy list APIs.
    const periodLabel = `${dateOnlyIso(periodStart)} → ${dateOnlyIso(periodEnd)}`;
    const existingReview = await prisma.performanceReview.findFirst({
      where: {
        employeeId: employee.id,
        periodStart,
        periodEnd,
        deletedAt: null,
        source: { in: [PerformanceScoreSource.AUTO, PerformanceScoreSource.HYBRID] },
      },
    });
    if (existingReview) {
      await prisma.performanceReview.update({
        where: { id: existingReview.id },
        data: {
          rating: computed.rating,
          productivityScore: computed.overall,
          autoScore: computed.overall,
          source:
            existingReview.managerAdjustment != null
              ? PerformanceScoreSource.HYBRID
              : PerformanceScoreSource.AUTO,
          componentScores: computed.components,
          insights: computed.insights,
          kpiSummary: computed.insights.map((i) => i.message).join(" · ").slice(0, 5000),
        },
      });
    } else {
      await prisma.performanceReview.create({
        data: {
          employeeId: employee.id,
          periodLabel,
          periodStart,
          periodEnd,
          rating: computed.rating,
          productivityScore: computed.overall,
          autoScore: computed.overall,
          source: PerformanceScoreSource.AUTO,
          componentScores: computed.components,
          insights: computed.insights,
          kpiSummary: computed.insights.map((i) => i.message).join(" · ").slice(0, 5000),
        },
      });
    }

    let alerted = false;
    const notifyTargets = new Set<string>();
    if (employee.managerId) notifyTargets.add(employee.managerId);

    if (computed.overall < config.alertThreshold) {
      alerted = true;
      for (const userId of notifyTargets) {
        void notificationDispatcher.notify({
          title: "Performance below threshold",
          body: `${employee.user.firstName} ${employee.user.lastName} scored ${computed.overall}/100.`,
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.HIGH,
          linkUrl: `/team?tab=performance`,
          entityType: "EmployeeProfile",
          entityId: employee.id,
          audience: { type: "INDIVIDUAL", userId },
        });
      }
      void this.notifySuperAdmins({
        title: "Performance alert",
        body: `${employee.user.firstName} ${employee.user.lastName} scored ${computed.overall}/100.`,
        entityId: employee.id,
      });
    }

    if (computed.predictions.burnoutRisk >= 70) {
      void this.notifySuperAdmins({
        title: "Burnout risk detected",
        body: `${employee.user.firstName} ${employee.user.lastName}: burnout risk ${computed.predictions.burnoutRisk}.`,
        entityId: employee.id,
      });
    }
    if (computed.predictions.attritionRisk >= 70) {
      void this.notifySuperAdmins({
        title: "Attrition risk detected",
        body: `${employee.user.firstName} ${employee.user.lastName}: attrition risk ${computed.predictions.attritionRisk}.`,
        entityId: employee.id,
      });
    }

    const attendanceComp = computed.components.find((c) => c.key === "attendance");
    if (attendanceComp && attendanceComp.score < 60) {
      for (const userId of notifyTargets) {
        void notificationDispatcher.notify({
          title: "Attendance decrease detected",
          body: `${employee.user.firstName} ${employee.user.lastName}: attendance score ${attendanceComp.score}.`,
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.NORMAL,
          linkUrl: `/team?tab=performance`,
          entityType: "EmployeeProfile",
          entityId: employee.id,
          audience: { type: "INDIVIDUAL", userId },
        });
      }
    }

    const deadlineComp = computed.components.find(
      (c) => c.key === "deadlinePerformance",
    );
    if (deadlineComp && deadlineComp.score < 55) {
      for (const userId of notifyTargets) {
        void notificationDispatcher.notify({
          title: "Repeated missed deadlines",
          body: `${employee.user.firstName} ${employee.user.lastName}: deadline score ${deadlineComp.score}.`,
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.HIGH,
          linkUrl: `/team?tab=performance`,
          entityType: "EmployeeProfile",
          entityId: employee.id,
          audience: { type: "INDIVIDUAL", userId },
        });
      }
    }

    const productivityComp = computed.components.find(
      (c) => c.key === "productivity",
    );
    if (
      previous &&
      productivityComp &&
      previous.overallScore - computed.overall >= 15
    ) {
      for (const userId of notifyTargets) {
        void notificationDispatcher.notify({
          title: "Productivity drop",
          body: `${employee.user.firstName} ${employee.user.lastName} dropped ${previous.overallScore - computed.overall} points.`,
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.NORMAL,
          linkUrl: `/team?tab=performance`,
          entityType: "EmployeeProfile",
          entityId: employee.id,
          audience: { type: "INDIVIDUAL", userId },
        });
      }
    }

    if (computed.overall >= config.promotionMinScore) {
      for (const userId of notifyTargets) {
        void notificationDispatcher.notify({
          title: "Promotion recommendation",
          body: `${employee.user.firstName} ${employee.user.lastName} is eligible for promotion review (score ${computed.overall}).`,
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.NORMAL,
          linkUrl: `/team?tab=performance`,
          entityType: "EmployeeProfile",
          entityId: employee.id,
          audience: { type: "INDIVIDUAL", userId },
        });
      }
    }

    const completedGoals = await prisma.employeeGoal.count({
      where: {
        employeeId: employee.id,
        deletedAt: null,
        status: "COMPLETED",
        updatedAt: { gte: periodStart },
      },
    });
    if (completedGoals > 0) {
      for (const userId of notifyTargets) {
        void notificationDispatcher.notify({
          title: "Goals achieved",
          body: `${employee.user.firstName} ${employee.user.lastName} completed ${completedGoals} goal(s) this period.`,
          category: NotificationCategory.TEAM,
          priority: NotificationPriority.LOW,
          linkUrl: `/team?tab=performance`,
          entityType: "EmployeeProfile",
          entityId: employee.id,
          audience: { type: "INDIVIDUAL", userId },
        });
      }
    }

    return { alerted };
  }

  private async collectMetrics(
    employeeId: string,
    userId: string,
    periodStart: Date,
    periodEnd: Date,
    config: PerformanceScoringConfigDto,
  ): Promise<{
    overall: number;
    rating: PerformanceRating;
    components: PerformanceComponentScore[];
    insights: InsightDraft[];
    breakdown: PerformanceScoreBreakdown;
    metrics: PerformanceMetricCatalog;
    predictions: PerformancePredictions;
    recommendations: PerformanceRecommendations;
  }> {
    const managedCount = await prisma.employeeProfile.count({
      where: { managerId: userId, deletedAt: null },
    });
    const collected = await collectPerformanceMetrics(
      employeeId,
      userId,
      periodStart,
      periodEnd,
      { isManager: managedCount > 0 },
    );

    const weights = config.weights;
    const enabled = config.enabledMetrics;
    const b = collected.breakdown;
    const m = collected.metrics;

    const rawScores: Record<keyof PerformanceWeights, number> = {
      attendance: b.attendance,
      taskCompletion:
        m.tasksAssigned === 0
          ? 70
          : Math.round((m.tasksCompleted / m.tasksAssigned) * 100),
      deadlinePerformance: m.deadlineAccuracy,
      productivity: b.productivity,
      projectContribution: Math.min(
        100,
        m.projectsJoined * 15 + m.projectTasksCompleted * 8,
      ),
      teamCollaboration: b.collaboration,
      discipline: b.discipline,
      learning: b.innovation,
    };

    const components: PerformanceComponentScore[] = (
      Object.keys(weights) as (keyof PerformanceWeights)[]
    ).map((key) => {
      const isEnabled = enabled[key] !== false;
      const weight = isEnabled ? weights[key] : 0;
      const score = rawScores[key];
      return {
        key,
        label: METRIC_LABELS[key],
        score,
        weight,
        weighted: isEnabled ? (score * weight) / 100 : 0,
        enabled: isEnabled,
      };
    });

    const weightSum = components.reduce(
      (a, c) => a + (c.enabled ? c.weight : 0),
      0,
    );
    const overall =
      weightSum === 0
        ? 0
        : clamp(
            (components.reduce((a, c) => a + c.weighted, 0) / weightSum) * 100,
          );

    const insights: InsightDraft[] = [];
    if (m.attendancePresentDays + m.attendanceAbsentDays > 0) {
      const total =
        m.attendancePresentDays + m.attendanceAbsentDays + m.attendanceLateDays;
      const rate = total
        ? Math.round((m.attendancePresentDays / total) * 100)
        : 0;
      insights.push({
        severity: rate < 80 ? "warning" : "success",
        category: "attendance",
        metricKey: "attendance",
        message:
          rate < 80
            ? `Attendance dropped this period (${rate}% present).`
            : `Maintained ${rate}% attendance consistency.`,
      });
    }
    if (m.attendanceLateDays >= 3) {
      insights.push({
        severity: "warning",
        category: "discipline",
        metricKey: "discipline",
        message: `${m.attendanceLateDays} late arrivals recorded.`,
      });
    }
    if (m.tasksAssigned > 0) {
      const pct = Math.round((m.tasksCompleted / m.tasksAssigned) * 100);
      insights.push({
        severity: pct >= 90 ? "success" : "info",
        category: "tasks",
        metricKey: "taskCompletion",
        message: `Completed ${pct}% of assigned tasks.`,
      });
    }
    if (m.tasksOverdue >= 2) {
      insights.push({
        severity: "critical",
        category: "deadlines",
        metricKey: "deadlinePerformance",
        message: `Missed ${m.tasksOverdue} deadlines.`,
      });
    }
    if (b.productivity >= 80) {
      insights.push({
        severity: "success",
        category: "productivity",
        metricKey: "productivity",
        message: `Productivity improved — score ${b.productivity}.`,
      });
    } else if (b.productivity < 55) {
      insights.push({
        severity: "warning",
        category: "productivity",
        metricKey: "productivity",
        message: `Low productivity detected (${b.productivity}).`,
      });
    }
    if (collected.predictions.burnoutRisk >= 60) {
      insights.push({
        severity: "critical",
        category: "burnout",
        message: `Burnout risk elevated (${collected.predictions.burnoutRisk}).`,
      });
    }
    if (collected.predictions.attritionRisk >= 65) {
      insights.push({
        severity: "critical",
        category: "attrition",
        message: `Attrition risk elevated (${collected.predictions.attritionRisk}).`,
      });
    }
    if (collected.recommendations.promotionReady) {
      insights.push({
        severity: "success",
        category: "promotion",
        message: "Eligible for promotion.",
      });
    } else if (overall < config.minScoreThreshold) {
      insights.push({
        severity: "critical",
        category: "review",
        message: "Needs manager review.",
      });
    }
    if (m.aiConversations > 0) {
      insights.push({
        severity: "info",
        category: "learning",
        metricKey: "learning",
        message: `Used AI Assistant in ${m.aiConversations} conversation(s).`,
      });
    }
    for (const program of collected.recommendations.trainingPrograms.slice(0, 2)) {
      insights.push({
        severity: "info",
        category: "training",
        message: `Recommended training: ${program}.`,
      });
    }

    return {
      overall,
      rating: ratingFromScore(overall),
      components,
      insights,
      breakdown: collected.breakdown,
      metrics: collected.metrics,
      predictions: collected.predictions,
      recommendations: collected.recommendations,
    };
  }

  private async buildTrendSeries(
    employeeWhere: object,
    windowDays: number,
    points: number,
  ): Promise<Array<{ label: string; value: number }>> {
    const series: Array<{ label: string; value: number }> = [];
    const end = startOfUtcDay(new Date());
    for (let i = points - 1; i >= 0; i -= 1) {
      const periodEnd = addDays(end, -(i * windowDays));
      const periodStart = addDays(periodEnd, -(windowDays - 1));
      const agg = await prisma.performanceScoreSnapshot.aggregate({
        where: {
          periodEnd: { gte: periodStart, lte: periodEnd },
          employee: employeeWhere,
        },
        _avg: { overallScore: true },
      });
      series.push({
        label:
          windowDays >= 30
            ? `${periodEnd.getUTCMonth() + 1}/${periodEnd.getUTCDate()}`
            : `W${points - i}`,
        value: Math.round(agg._avg.overallScore ?? 0),
      });
    }
    return series;
  }

  private toConfigDto(row: {
    id: string;
    key: string;
    weights: unknown;
    enabledMetrics: unknown;
    minScoreThreshold: number;
    alertThreshold: number;
    promotionMinScore: number;
    bonusMinScore: number;
    lookbackDays: number;
    updatedAt: Date;
  }): PerformanceScoringConfigDto {
    return {
      id: row.id,
      key: row.key,
      weights: asWeights(row.weights),
      enabledMetrics: asEnabled(row.enabledMetrics),
      minScoreThreshold: row.minScoreThreshold,
      alertThreshold: row.alertThreshold,
      promotionMinScore: row.promotionMinScore,
      bonusMinScore: row.bonusMinScore,
      lookbackDays: row.lookbackDays,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  toSnapshotDto(row: {
    id: string;
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    overallScore: number;
    componentScores: unknown;
    scoreBreakdown?: unknown;
    metrics?: unknown;
    predictions?: unknown;
    recommendations?: unknown;
    departmentRank?: number | null;
    organizationRank?: number | null;
    derivedRating: PerformanceRating;
    insights: unknown;
    trendDelta: number;
    source: PerformanceScoreSource;
    computedAt: Date;
    employee?: Parameters<typeof toEmployeeDto>[0];
  }): PerformanceScoreSnapshotDto {
    return {
      id: row.id,
      employeeId: row.employeeId,
      periodStart: dateOnlyIso(row.periodStart),
      periodEnd: dateOnlyIso(row.periodEnd),
      overallScore: row.overallScore,
      componentScores: parseComponents(row.componentScores),
      scoreBreakdown: (row.scoreBreakdown as PerformanceScoreSnapshotDto["scoreBreakdown"]) ?? null,
      metrics: (row.metrics as PerformanceScoreSnapshotDto["metrics"]) ?? null,
      predictions: (row.predictions as PerformanceScoreSnapshotDto["predictions"]) ?? null,
      recommendations:
        (row.recommendations as PerformanceScoreSnapshotDto["recommendations"]) ??
        null,
      departmentRank: row.departmentRank ?? null,
      organizationRank: row.organizationRank ?? null,
      derivedRating: row.derivedRating,
      insights: parseInsights(row.insights),
      trendDelta: row.trendDelta,
      source: row.source,
      computedAt: row.computedAt.toISOString(),
      employee: row.employee ? toEmployeeDto(row.employee) : undefined,
    };
  }

  toMonthlyDto(row: {
    id: string;
    employeeId: string;
    year: number;
    month: number;
    overallScore: number;
    summary: string;
    strengths: unknown;
    weaknesses: unknown;
    improvements: unknown;
    aiRecommendations: unknown;
    promotionReady: boolean;
    salaryReviewSuggested: boolean;
    status: PerformanceMonthlyReportStatus;
    managerNotes: string | null;
    componentScores: unknown;
    createdAt: Date;
    employee?: Parameters<typeof toEmployeeDto>[0];
  }): PerformanceMonthlyReportDto {
    return {
      id: row.id,
      employeeId: row.employeeId,
      year: row.year,
      month: row.month,
      overallScore: row.overallScore,
      summary: row.summary,
      strengths: parseStringArray(row.strengths),
      weaknesses: parseStringArray(row.weaknesses),
      improvements: parseStringArray(row.improvements),
      aiRecommendations: parseStringArray(row.aiRecommendations),
      promotionReady: row.promotionReady,
      salaryReviewSuggested: row.salaryReviewSuggested,
      status: row.status,
      managerNotes: row.managerNotes,
      componentScores: parseComponents(row.componentScores),
      createdAt: row.createdAt.toISOString(),
      employee: row.employee ? toEmployeeDto(row.employee) : undefined,
    };
  }
}

export const performanceEngineService = new PerformanceEngineService();
