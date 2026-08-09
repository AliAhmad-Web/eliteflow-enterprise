import type { Prisma } from "@enterprise/database";
import { prisma } from "@enterprise/database";
import type {
  AiInsightDto,
  AnalyticsDashboardDto,
  AnalyticsQueryInput,
  ChartPoint,
  CreateSavedReportInput,
  ExportReportInput,
  KpiCard,
  ReportTemplateListResponse,
  SavedReportListResponse,
  UpdateSavedReportInput,
} from "@enterprise/shared";
import { UserRole } from "@enterprise/shared";

import { recordSaasReportGeneration } from "../../shared/services/saas-metrics.service.js";
import { emptyUuidIdScope } from "../../shared/utils/prisma-empty-scope.js";
import { getAiProvider } from "../ai/providers/index.js";
import {
  REPORTS_AUDIT_ACTIONS,
  logReportsAuditEvent,
} from "./reports.audit.js";
import { REPORTS_ERROR_CODES, ReportsError } from "./reports.errors.js";
import { reportsRepository } from "./reports.repository.js";
import { toSavedReportDto, toTemplateDto } from "./reports.types.js";

export interface ReportsActor {
  userId: string;
  role: string;
  email: string;
  companyId?: string | null;
  permissions: string[];
}

function isAdmin(actor: ReportsActor): boolean {
  return actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN;
}

function isClient(actor: ReportsActor): boolean {
  return actor.role === UserRole.CLIENT;
}

function hasPermission(actor: ReportsActor, key: string): boolean {
  return actor.permissions.includes(key) || actor.permissions.includes("*");
}

function assertRead(actor: ReportsActor): void {
  if (!hasPermission(actor, "reports:read")) {
    throw new ReportsError(
      "Permission denied",
      403,
      REPORTS_ERROR_CODES.FORBIDDEN,
    );
  }
}

function assertExport(actor: ReportsActor): void {
  assertRead(actor);
  if (!hasPermission(actor, "reports:export") && !isAdmin(actor)) {
    throw new ReportsError(
      "Export permission denied",
      403,
      REPORTS_ERROR_CODES.FORBIDDEN,
    );
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function resolveRange(query: AnalyticsQueryInput): { from: Date; to: Date } {
  if (query.range === "custom" && query.from && query.to) {
    return { from: new Date(query.from), to: new Date(query.to) };
  }

  const now = new Date();
  const to = endOfUtcDay(now);
  let from: Date;

  switch (query.range) {
    case "today":
      from = startOfUtcDay(now);
      break;
    case "this_week": {
      const day = now.getUTCDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + mondayOffset);
      from = startOfUtcDay(monday);
      break;
    }
    case "this_quarter": {
      const q = Math.floor(now.getUTCMonth() / 3) * 3;
      from = new Date(Date.UTC(now.getUTCFullYear(), q, 1));
      break;
    }
    case "this_year":
      from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      break;
    case "this_month":
    case "custom":
    default:
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      break;
  }

  return { from, to };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function bucketByMonth(
  items: Array<{ date: Date; value: number }>,
  from: Date,
  to: Date,
): ChartPoint[] {
  const map = new Map<string, number>();
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= end) {
    map.set(monthKey(cursor), 0);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const item of items) {
    const key = monthKey(item.date);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + item.value);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function trendFrom(change: number): "up" | "down" | "flat" {
  if (change > 0.5) return "up";
  if (change < -0.5) return "down";
  return "flat";
}

export class ReportsService {
  private async scope(actor: ReportsActor): Promise<{
    clientWhere: Prisma.ClientWhereInput;
    projectWhere: Prisma.ProjectWhereInput;
    taskWhere: Prisma.TaskWhereInput;
    invoiceWhere: Prisma.InvoiceWhereInput;
    employeeWhere: Prisma.EmployeeProfileWhereInput;
    attendanceWhere: Prisma.AttendanceWhereInput;
    leaveWhere: Prisma.LeaveRequestWhereInput;
    performanceWhere: Prisma.PerformanceReviewWhereInput;
  }> {
    if (isAdmin(actor)) {
      return {
        clientWhere: {},
        projectWhere: {},
        taskWhere: {},
        invoiceWhere: {},
        employeeWhere: {},
        attendanceWhere: {},
        leaveWhere: {},
        performanceWhere: {},
      };
    }

    if (isClient(actor)) {
      const companyId = actor.companyId;
      const none = emptyUuidIdScope();
      if (!companyId) {
        return {
          clientWhere: none,
          projectWhere: none,
          taskWhere: none,
          invoiceWhere: none,
          employeeWhere: none,
          attendanceWhere: none,
          leaveWhere: none,
          performanceWhere: none,
        };
      }
      return {
        clientWhere: { id: companyId },
        projectWhere: { clientId: companyId },
        taskWhere: { project: { clientId: companyId } },
        invoiceWhere: { clientId: companyId },
        // Clients never see HR entities — use UUID-safe empty filters.
        employeeWhere: none,
        attendanceWhere: none,
        leaveWhere: none,
        performanceWhere: none,
      };
    }

    // Employee — own + assigned projects/tasks + own HR
    const memberships = await prisma.projectMember.findMany({
      where: { userId: actor.userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);
    const profile = await prisma.employeeProfile.findFirst({
      where: { userId: actor.userId, deletedAt: null },
      select: { id: true },
    });
    const none = emptyUuidIdScope();

    return {
      clientWhere: {},
      projectWhere: projectIds.length
        ? { OR: [{ id: { in: projectIds } }, { createdById: actor.userId }] }
        : { createdById: actor.userId },
      taskWhere: {
        OR: [
          { assignedToId: actor.userId },
          { createdById: actor.userId },
          ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
        ],
      },
      invoiceWhere: projectIds.length
        ? { projectId: { in: projectIds } }
        : none,
      employeeWhere: profile ? { id: profile.id } : { userId: actor.userId },
      attendanceWhere: profile
        ? { employeeId: profile.id }
        : none,
      leaveWhere: profile ? { employeeId: profile.id } : none,
      performanceWhere: profile
        ? { employeeId: profile.id }
        : none,
    };
  }

  async getAnalytics(
    query: AnalyticsQueryInput,
    actor: ReportsActor,
  ): Promise<AnalyticsDashboardDto> {
    assertRead(actor);
    const { from, to } = resolveRange(query);
    const scope = await this.scope(actor);
    const prevDuration = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - prevDuration);
    const prevTo = new Date(from.getTime() - 1);

    const applyFilters = <T extends Record<string, unknown>>(base: T) => {
      const next = { ...base } as T & Record<string, unknown>;
      if (query.clientId) {
        Object.assign(next, {
          ...( "clientId" in base || true ? { clientId: query.clientId } : {}),
        });
      }
      if (query.projectId) Object.assign(next, { projectId: query.projectId });
      return next;
    };

    const invoiceRange: Prisma.InvoiceWhereInput = {
      ...scope.invoiceWhere,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.invoiceStatus
        ? { status: query.invoiceStatus as never }
        : {}),
      issueDate: { gte: from, lte: to },
    };

    const invoicePrev: Prisma.InvoiceWhereInput = {
      ...scope.invoiceWhere,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      issueDate: { gte: prevFrom, lte: prevTo },
    };

    const projectWhere: Prisma.ProjectWhereInput = {
      ...scope.projectWhere,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.projectId ? { id: query.projectId } : {}),
      createdAt: { lte: to },
    };

    const taskWhere: Prisma.TaskWhereInput = {
      ...scope.taskWhere,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.employeeId ? { assignedToId: query.employeeId } : {}),
      ...(query.taskStatus ? { status: query.taskStatus as never } : {}),
      createdAt: { lte: to },
    };

    const attendanceWhere: Prisma.AttendanceWhereInput = {
      ...scope.attendanceWhere,
      ...(query.employeeId
        ? { employee: { userId: query.employeeId } }
        : {}),
      ...(query.attendanceStatus
        ? { status: query.attendanceStatus as never }
        : {}),
      date: { gte: from, lte: to },
    };

    const leaveWhere: Prisma.LeaveRequestWhereInput = {
      ...scope.leaveWhere,
      ...(query.leaveStatus ? { status: query.leaveStatus as never } : {}),
      startDate: { lte: to },
      endDate: { gte: from },
    };

    const [
      revenueNow,
      revenuePrev,
      clientsActive,
      clientsInactive,
      clientsCreated,
      projectGroups,
      taskGroups,
      invoiceGroups,
      attendanceGroups,
      leaveGroups,
      invoices,
      atRisk,
      overdue,
      productivity,
      avgProd,
      presentCount,
      attendanceTotal,
      tasksCompleted,
      tasksTotal,
    ] = await Promise.all([
      reportsRepository.sumInvoiceTotal({
        ...invoiceRange,
        status: { in: ["PAID", "SENT", "PENDING", "OVERDUE"] },
      }),
      reportsRepository.sumInvoiceTotal({
        ...invoicePrev,
        status: { in: ["PAID", "SENT", "PENDING", "OVERDUE"] },
      }),
      reportsRepository.countClients({
        ...scope.clientWhere,
        status: "ACTIVE",
        ...(query.clientId ? { id: query.clientId } : {}),
      }),
      reportsRepository.countClients({
        ...scope.clientWhere,
        status: "INACTIVE",
        ...(query.clientId ? { id: query.clientId } : {}),
      }),
      reportsRepository.listClientsCreatedInRange(from, to, {
        ...scope.clientWhere,
        ...(query.clientId ? { id: query.clientId } : {}),
      }),
      reportsRepository.groupProjectsByStatus(projectWhere),
      reportsRepository.groupTasksByStatus(taskWhere),
      reportsRepository.groupInvoicesByStatus({
        ...scope.invoiceWhere,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        issueDate: { gte: from, lte: to },
      }),
      reportsRepository.groupAttendanceByStatus(attendanceWhere),
      reportsRepository.groupLeavesByStatus(leaveWhere),
      reportsRepository.listInvoicesInRange(invoiceRange),
      reportsRepository.listAtRiskProjects({
        ...scope.projectWhere,
        ...(query.clientId ? { clientId: query.clientId } : {}),
      }),
      reportsRepository.listOverdueInvoices(
        {
          ...scope.invoiceWhere,
          ...(query.clientId ? { clientId: query.clientId } : {}),
        },
        to,
      ),
      reportsRepository.listPerformanceScores(scope.performanceWhere),
      reportsRepository.avgProductivity(scope.performanceWhere),
      reportsRepository.countAttendance({
        ...attendanceWhere,
        status: { in: ["PRESENT", "REMOTE", "LATE", "HALF_DAY"] },
      }),
      reportsRepository.countAttendance(attendanceWhere),
      reportsRepository.countTasks({
        ...taskWhere,
        status: "COMPLETED",
      }),
      reportsRepository.countTasks(taskWhere),
    ]);

    void applyFilters;

    const revenueValue = Number(revenueNow._sum.total ?? 0);
    const revenuePrevValue = Number(revenuePrev._sum.total ?? 0);
    const revenueChange = pctChange(revenueValue, revenuePrevValue);
    const paidSum = invoiceGroups
      .filter((g) => g.status === "PAID")
      .reduce((s, g) => s + Number(g._sum.total ?? 0), 0);
    const billedSum = invoiceGroups.reduce(
      (s, g) => s + Number(g._sum.total ?? 0),
      0,
    );
    const collectionRate =
      billedSum > 0 ? Math.round((paidSum / billedSum) * 1000) / 10 : 0;
    const completionRate =
      tasksTotal > 0
        ? Math.round((tasksCompleted / tasksTotal) * 1000) / 10
        : 0;
    const attendancePct =
      attendanceTotal > 0
        ? Math.round((presentCount / attendanceTotal) * 1000) / 10
        : 0;

    const kpis: KpiCard[] = [
      {
        key: "revenue",
        label: "Revenue",
        value: revenueValue,
        changePercent: revenueChange,
        trend: trendFrom(revenueChange),
        format: "currency",
      },
      {
        key: "clients_active",
        label: "Active Clients",
        value: clientsActive,
        format: "number",
      },
      {
        key: "task_completion",
        label: "Task Completion",
        value: completionRate,
        format: "percent",
      },
      {
        key: "collection_rate",
        label: "Invoice Collection",
        value: collectionRate,
        format: "percent",
      },
      {
        key: "attendance",
        label: "Attendance",
        value: attendancePct,
        format: "percent",
      },
      {
        key: "productivity",
        label: "Avg Productivity",
        value: Math.round(Number(avgProd._avg.productivityScore ?? 0)),
        format: "number",
      },
    ];

    const revenueTrend = bucketByMonth(
      invoices.map((inv) => ({
        date: inv.issueDate,
        value: Number(inv.total),
      })),
      from,
      to,
    );

    const clientGrowth = bucketByMonth(
      clientsCreated.map((c) => ({ date: c.createdAt, value: 1 })),
      from,
      to,
    );

    const clientById = new Map<
      string,
      { name: string; revenue: number; invoices: number }
    >();
    for (const inv of invoices) {
      const id = inv.clientId;
      const current = clientById.get(id) ?? {
        name: inv.client?.companyName ?? "Unknown",
        revenue: 0,
        invoices: 0,
      };
      current.revenue += Number(inv.total);
      current.invoices += 1;
      clientById.set(id, current);
    }

    const result: AnalyticsDashboardDto = {
      from: from.toISOString(),
      to: to.toISOString(),
      range: query.range,
      kpis,
      revenueTrend,
      clientGrowth,
      projectStatus: projectGroups.map((g) => ({
        label: g.status,
        value: g._count._all,
      })),
      taskStatus: taskGroups.map((g) => ({
        label: g.status,
        value: g._count._all,
      })),
      attendanceBreakdown: attendanceGroups.map((g) => ({
        label: g.status,
        value: g._count._all,
      })),
      leaveBreakdown: leaveGroups.map((g) => ({
        label: g.status,
        value: g._count._all,
      })),
      invoiceStatus: invoiceGroups.map((g) => ({
        label: g.status,
        value: Number(g._sum.total ?? 0),
      })),
      employeeProductivity: productivity.map((p) => ({
        label: p.employee?.user
          ? `${p.employee.user.firstName} ${p.employee.user.lastName}`
          : "Employee",
        value: p.productivityScore,
      })),
      tables: {
        topClients: [...clientById.entries()]
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8),
        atRiskProjects: atRisk.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          progress: p.progress,
          dueDate: p.dueDate?.toISOString().slice(0, 10) ?? null,
        })),
        overdueInvoices: overdue.map((inv) => ({
          id: inv.id,
          number: inv.invoiceNumber,
          clientName: inv.client?.companyName ?? "Unknown",
          total: Number(inv.total),
          dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? null,
        })),
      },
    };

    // unused intentionally silenced
    void clientsInactive;

    await logReportsAuditEvent({
      userId: actor.userId,
      action: REPORTS_AUDIT_ACTIONS.VIEW_ANALYTICS,
      category: query.category,
      metadata: { range: query.range },
    });

    return result;
  }

  async getInsights(
    query: AnalyticsQueryInput,
    actor: ReportsActor,
  ): Promise<AiInsightDto> {
    assertRead(actor);
    const analytics = await this.getAnalytics(query, actor);

    const metricLines = analytics.kpis
      .map((k) => `${k.label}: ${k.value}${k.changePercent !== undefined ? ` (${k.changePercent}%)` : ""}`)
      .join("\n");
    const context = [
      `Date range: ${analytics.from} to ${analytics.to}`,
      metricLines,
      `At-risk projects: ${analytics.tables.atRiskProjects.length}`,
      `Overdue invoices: ${analytics.tables.overdueInvoices.length}`,
      `Project statuses: ${analytics.projectStatus.map((p) => `${p.label}=${p.value}`).join(", ")}`,
      `Task statuses: ${analytics.taskStatus.map((p) => `${p.label}=${p.value}`).join(", ")}`,
    ].join("\n");

    const fallbackBullets: string[] = [];
    for (const kpi of analytics.kpis) {
      if (kpi.changePercent !== undefined && Math.abs(kpi.changePercent) >= 1) {
        fallbackBullets.push(
          `${kpi.label} ${kpi.changePercent >= 0 ? "increased" : "dropped"} by ${Math.abs(kpi.changePercent)}%.`,
        );
      }
    }
    if (analytics.tables.atRiskProjects.length) {
      fallbackBullets.push(
        `${analytics.tables.atRiskProjects.length} project(s) appear at risk.`,
      );
    }
    if (analytics.tables.overdueInvoices.length) {
      fallbackBullets.push(
        `${analytics.tables.overdueInvoices.length} invoice(s) are overdue.`,
      );
    }
    if (!fallbackBullets.length) {
      fallbackBullets.push("Metrics are stable for the selected period.");
    }

    let summary = fallbackBullets.slice(0, 3).join(" ");
    let providerName = "heuristic";
    const bullets = fallbackBullets.slice(0, 6);

    try {
      const provider = getAiProvider();
      providerName = provider.name;
      const ai = await provider.generate({
        mode: "ANALYZE",
        prompt: `Analyze these EliteFlow ERP metrics and produce a short executive summary (2-3 sentences) then up to 5 bullet business insights. Be factual and concise.\n\n${context}`,
      });
      if (ai.content?.trim()) {
        summary = ai.content.trim().slice(0, 2000);
        const lines = ai.content
          .split("\n")
          .map((l) => l.replace(/^[-*•]\s*/, "").trim())
          .filter((l) => l.length > 12)
          .slice(0, 6);
        if (lines.length) bullets.splice(0, bullets.length, ...lines);
      }
    } catch {
      // Keep heuristic insights when AI provider fails
    }

    await logReportsAuditEvent({
      userId: actor.userId,
      action: REPORTS_AUDIT_ACTIONS.VIEW_INSIGHTS,
      category: "AI_INSIGHTS",
    });

    return {
      summary,
      bullets,
      generatedAt: new Date().toISOString(),
      provider: providerName,
    };
  }

  async listTemplates(actor: ReportsActor): Promise<ReportTemplateListResponse> {
    assertRead(actor);
    const items = await reportsRepository.listTemplates();
    return { items: items.map(toTemplateDto) };
  }

  async listSaved(actor: ReportsActor): Promise<SavedReportListResponse> {
    assertRead(actor);
    const where: Prisma.SavedReportWhereInput = isAdmin(actor)
      ? {
          OR: [
            { ownerId: actor.userId },
            { visibility: { in: ["TEAM", "COMPANY"] } },
          ],
        }
      : {
          OR: [
            { ownerId: actor.userId },
            { visibility: "COMPANY" },
          ],
        };
    const items = await reportsRepository.listSavedReports(where);
    return { items: items.map(toSavedReportDto) };
  }

  async createSaved(input: CreateSavedReportInput, actor: ReportsActor) {
    assertRead(actor);
    const report = await reportsRepository.createSavedReport({
      name: input.name,
      description: input.description,
      category: input.category,
      visibility: input.visibility,
      filters: input.filters as never,
      isFavorite: input.isFavorite,
      ownerId: actor.userId,
    });
    await logReportsAuditEvent({
      userId: actor.userId,
      action: REPORTS_AUDIT_ACTIONS.SAVED_CREATE,
      savedReportId: report.id,
      category: report.category,
    });
    return toSavedReportDto(report);
  }

  async updateSaved(
    id: string,
    input: UpdateSavedReportInput,
    actor: ReportsActor,
  ) {
    assertRead(actor);
    const existing = await reportsRepository.getSavedReport(id);
    if (!existing) {
      throw new ReportsError(
        "Saved report not found",
        404,
        REPORTS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (existing.ownerId !== actor.userId && !isAdmin(actor)) {
      throw new ReportsError(
        "Permission denied",
        403,
        REPORTS_ERROR_CODES.FORBIDDEN,
      );
    }
    const updated = await reportsRepository.updateSavedReport(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.visibility !== undefined
        ? { visibility: input.visibility }
        : {}),
      ...(input.filters !== undefined
        ? { filters: input.filters as never }
        : {}),
      ...(input.isFavorite !== undefined
        ? { isFavorite: input.isFavorite }
        : {}),
      updatedById: actor.userId,
    });
    await logReportsAuditEvent({
      userId: actor.userId,
      action: REPORTS_AUDIT_ACTIONS.SAVED_UPDATE,
      savedReportId: id,
    });
    return toSavedReportDto(updated);
  }

  async deleteSaved(id: string, actor: ReportsActor) {
    assertRead(actor);
    const existing = await reportsRepository.getSavedReport(id);
    if (!existing) {
      throw new ReportsError(
        "Saved report not found",
        404,
        REPORTS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (existing.ownerId !== actor.userId && !isAdmin(actor)) {
      throw new ReportsError(
        "Permission denied",
        403,
        REPORTS_ERROR_CODES.FORBIDDEN,
      );
    }
    await reportsRepository.softDeleteSavedReport(id, actor.userId);
    await logReportsAuditEvent({
      userId: actor.userId,
      action: REPORTS_AUDIT_ACTIONS.SAVED_DELETE,
      savedReportId: id,
    });
    return { id };
  }

  async exportReport(
    input: ExportReportInput,
    actor: ReportsActor,
  ): Promise<{ contentType: string; filename: string; body: string | Buffer }> {
    assertExport(actor);
    recordSaasReportGeneration();
    const analytics = await this.getAnalytics(input, actor);

    await logReportsAuditEvent({
      userId: actor.userId,
      action: REPORTS_AUDIT_ACTIONS.EXPORT,
      category: input.category,
      format: input.format,
    });

    const rows: string[][] = [
      ["KPI", "Value", "Change %"],
      ...analytics.kpis.map((k) => [
        k.label,
        String(k.value),
        k.changePercent !== undefined ? String(k.changePercent) : "",
      ]),
      [],
      ["Revenue Trend"],
      ["Month", "Amount"],
      ...analytics.revenueTrend.map((p) => [p.label, String(p.value)]),
      [],
      ["Top Clients"],
      ["Client", "Revenue", "Invoices"],
      ...analytics.tables.topClients.map((c) => [
        c.name,
        String(c.revenue),
        String(c.invoices),
      ]),
      [],
      ["Overdue Invoices"],
      ["Number", "Client", "Total", "Due"],
      ...analytics.tables.overdueInvoices.map((i) => [
        i.number,
        i.clientName,
        String(i.total),
        i.dueDate ?? "",
      ]),
    ];

    const stamp = new Date().toISOString().slice(0, 10);

    if (input.format === "CSV") {
      const csv = rows
        .map((r) =>
          r
            .map((cell) => {
              const value = cell.replace(/"/g, '""');
              return `"${value}"`;
            })
            .join(","),
        )
        .join("\n");
      return {
        contentType: "text/csv; charset=utf-8",
        filename: `eliteflow-report-${stamp}.csv`,
        body: `\uFEFF${csv}`,
      };
    }

    if (input.format === "EXCEL") {
      const escapeXml = (value: string) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const xmlRows = rows
        .map((row) => {
          if (row.length === 0) {
            return `<Row></Row>`;
          }
          const cells = row
            .map((cell) => {
              const numeric = cell !== "" && !Number.isNaN(Number(cell));
              const type = numeric ? "Number" : "String";
              const data = numeric ? cell : escapeXml(cell);
              return `<Cell><Data ss:Type="${type}">${data}</Data></Cell>`;
            })
            .join("");
          return `<Row>${cells}</Row>`;
        })
        .join("");

      const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Analytics">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`;

      return {
        contentType: "application/vnd.ms-excel; charset=utf-8",
        filename: `eliteflow-report-${stamp}.xls`,
        body: workbook,
      };
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>EliteFlow Report</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}@media print{button{display:none}}</style>
</head><body>
<h1>EliteFlow Analytics Report</h1>
<p>${analytics.from.slice(0, 10)} → ${analytics.to.slice(0, 10)}</p>
<button onclick="window.print()">Print</button>
<h2>KPIs</h2>
<table><tr><th>Metric</th><th>Value</th><th>Change</th></tr>
${analytics.kpis.map((k) => `<tr><td>${k.label}</td><td>${k.value}</td><td>${k.changePercent ?? ""}</td></tr>`).join("")}
</table>
<h2>Top Clients</h2>
<table><tr><th>Client</th><th>Revenue</th><th>Invoices</th></tr>
${analytics.tables.topClients.map((c) => `<tr><td>${c.name}</td><td>${c.revenue}</td><td>${c.invoices}</td></tr>`).join("")}
</table>
<h2>Overdue Invoices</h2>
<table><tr><th>Number</th><th>Client</th><th>Total</th><th>Due</th></tr>
${analytics.tables.overdueInvoices.map((i) => `<tr><td>${i.number}</td><td>${i.clientName}</td><td>${i.total}</td><td>${i.dueDate ?? ""}</td></tr>`).join("")}
</table>
</body></html>`;

    return {
      contentType: "text/html; charset=utf-8",
      filename: `eliteflow-report-${stamp}.html`,
      body: html,
    };
  }
}

export const reportsService = new ReportsService();
