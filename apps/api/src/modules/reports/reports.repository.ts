import {
  prisma,
  type Prisma,
  type ReportCategory,
  type ReportVisibility,
} from "@enterprise/database";

export class ReportsRepository {
  listTemplates() {
    return prisma.reportTemplate.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  listSavedReports(where: Prisma.SavedReportWhereInput) {
    return prisma.savedReport.findMany({
      where: { deletedAt: null, ...where },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    });
  }

  getSavedReport(id: string) {
    return prisma.savedReport.findFirst({
      where: { id, deletedAt: null },
    });
  }

  createSavedReport(data: {
    name: string;
    description?: string | null;
    category: ReportCategory;
    visibility: ReportVisibility;
    filters: Prisma.InputJsonValue;
    isFavorite: boolean;
    ownerId: string;
  }) {
    return prisma.savedReport.create({
      data: {
        ...data,
        createdById: data.ownerId,
        updatedById: data.ownerId,
      },
    });
  }

  updateSavedReport(
    id: string,
    data: Prisma.SavedReportUncheckedUpdateInput,
  ) {
    return prisma.savedReport.update({ where: { id }, data });
  }

  softDeleteSavedReport(id: string, updatedById: string) {
    return prisma.savedReport.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById },
    });
  }

  // --- ERP aggregations ---

  countClients(where: Prisma.ClientWhereInput) {
    return prisma.client.count({ where: { deletedAt: null, ...where } });
  }

  countProjects(where: Prisma.ProjectWhereInput) {
    return prisma.project.count({ where: { deletedAt: null, ...where } });
  }

  countTasks(where: Prisma.TaskWhereInput) {
    return prisma.task.count({ where: { deletedAt: null, ...where } });
  }

  countInvoices(where: Prisma.InvoiceWhereInput) {
    return prisma.invoice.count({ where: { deletedAt: null, ...where } });
  }

  sumInvoiceTotal(where: Prisma.InvoiceWhereInput) {
    return prisma.invoice.aggregate({
      where: { deletedAt: null, ...where },
      _sum: { total: true },
      _count: true,
    });
  }

  groupProjectsByStatus(where: Prisma.ProjectWhereInput) {
    return prisma.project.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...where },
      _count: { _all: true },
    });
  }

  groupTasksByStatus(where: Prisma.TaskWhereInput) {
    return prisma.task.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...where },
      _count: { _all: true },
    });
  }

  groupInvoicesByStatus(where: Prisma.InvoiceWhereInput) {
    return prisma.invoice.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...where },
      _count: { _all: true },
      _sum: { total: true },
    });
  }

  groupClientsByStatus() {
    return prisma.client.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
  }

  groupAttendanceByStatus(where: Prisma.AttendanceWhereInput) {
    return prisma.attendance.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...where },
      _count: { _all: true },
    });
  }

  groupLeavesByStatus(where: Prisma.LeaveRequestWhereInput) {
    return prisma.leaveRequest.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...where },
      _count: { _all: true },
    });
  }

  listInvoicesInRange(where: Prisma.InvoiceWhereInput) {
    return prisma.invoice.findMany({
      where: { deletedAt: null, ...where },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        status: true,
        issueDate: true,
        dueDate: true,
        clientId: true,
        client: { select: { id: true, companyName: true } },
      },
      orderBy: { issueDate: "asc" },
    });
  }

  listClientsCreatedInRange(from: Date, to: Date, extra?: Prisma.ClientWhereInput) {
    return prisma.client.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: from, lte: to },
        ...extra,
      },
      select: { id: true, createdAt: true, status: true, companyName: true },
      orderBy: { createdAt: "asc" },
    });
  }

  listAtRiskProjects(where: Prisma.ProjectWhereInput) {
    return prisma.project.findMany({
      where: {
        deletedAt: null,
        status: { in: ["IN_PROGRESS", "ON_HOLD"] },
        ...where,
      },
      select: {
        id: true,
        name: true,
        status: true,
        progress: true,
        dueDate: true,
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });
  }

  listOverdueInvoices(where: Prisma.InvoiceWhereInput, now: Date) {
    return prisma.invoice.findMany({
      where: {
        deletedAt: null,
        status: { in: ["SENT", "PENDING", "OVERDUE"] },
        dueDate: { lt: now },
        ...where,
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        dueDate: true,
        client: { select: { companyName: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });
  }

  listPerformanceScores(where: Prisma.PerformanceReviewWhereInput) {
    return prisma.performanceReview.findMany({
      where: { deletedAt: null, ...where },
      select: {
        productivityScore: true,
        employee: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { productivityScore: "desc" },
      take: 12,
    });
  }

  countEmployees(where: Prisma.EmployeeProfileWhereInput = {}) {
    return prisma.employeeProfile.count({
      where: { deletedAt: null, ...where },
    });
  }

  countAttendance(where: Prisma.AttendanceWhereInput) {
    return prisma.attendance.count({ where: { deletedAt: null, ...where } });
  }

  avgProductivity(where: Prisma.PerformanceReviewWhereInput = {}) {
    return prisma.performanceReview.aggregate({
      where: { deletedAt: null, ...where },
      _avg: { productivityScore: true },
    });
  }
}

export const reportsRepository = new ReportsRepository();
