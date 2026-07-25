import { z } from "zod";

import { uuidSchema } from "./common.schema.js";

export const REPORT_CATEGORIES = [
  "OVERVIEW",
  "REVENUE",
  "CLIENTS",
  "PROJECTS",
  "TASKS",
  "EMPLOYEES",
  "ATTENDANCE",
  "LEAVES",
  "INVOICES",
  "TEAM_PERFORMANCE",
  "AI_INSIGHTS",
] as const;

export const REPORT_DATE_RANGES = [
  "today",
  "this_week",
  "this_month",
  "this_quarter",
  "this_year",
  "custom",
] as const;

export const REPORT_EXPORT_FORMATS = ["PDF", "EXCEL", "CSV", "PRINT"] as const;
export const REPORT_VISIBILITIES = ["PRIVATE", "TEAM", "COMPANY"] as const;

export const reportCategorySchema = z.enum(REPORT_CATEGORIES);
export const reportDateRangeSchema = z.enum(REPORT_DATE_RANGES);
export const reportExportFormatSchema = z.enum(REPORT_EXPORT_FORMATS);
export const reportVisibilitySchema = z.enum(REPORT_VISIBILITIES);

export type ReportCategoryValue = z.infer<typeof reportCategorySchema>;
export type ReportDateRangeValue = z.infer<typeof reportDateRangeSchema>;
export type ReportExportFormatValue = z.infer<typeof reportExportFormatSchema>;
export type ReportVisibilityValue = z.infer<typeof reportVisibilitySchema>;

export const reportFiltersSchema = z.object({
  range: reportDateRangeSchema.optional().default("this_month"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  clientId: uuidSchema.optional(),
  employeeId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  teamId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  invoiceStatus: z.string().optional(),
  taskStatus: z.string().optional(),
  attendanceStatus: z.string().optional(),
  leaveStatus: z.string().optional(),
  category: reportCategorySchema.optional().default("OVERVIEW"),
});

export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;

export const analyticsQuerySchema = reportFiltersSchema;
export type AnalyticsQueryInput = ReportFiltersInput;

export const exportReportSchema = reportFiltersSchema.extend({
  format: reportExportFormatSchema,
});
export type ExportReportInput = z.infer<typeof exportReportSchema>;

export const createSavedReportSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional().nullable(),
  category: reportCategorySchema.optional().default("OVERVIEW"),
  visibility: reportVisibilitySchema.optional().default("PRIVATE"),
  filters: reportFiltersSchema.optional().default({}),
  isFavorite: z.boolean().optional().default(false),
});
export type CreateSavedReportInput = z.infer<typeof createSavedReportSchema>;

export const updateSavedReportSchema = createSavedReportSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
export type UpdateSavedReportInput = z.infer<typeof updateSavedReportSchema>;

export const savedReportIdParamsSchema = z.object({ id: uuidSchema });
export type SavedReportIdParamsInput = z.infer<typeof savedReportIdParamsSchema>;

export const chartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});
export type ChartPoint = z.infer<typeof chartPointSchema>;

export const kpiCardSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.union([z.number(), z.string()]),
  changePercent: z.number().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
  format: z.enum(["number", "currency", "percent", "text"]).optional(),
});
export type KpiCard = z.infer<typeof kpiCardSchema>;

export const analyticsDashboardDtoSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  range: reportDateRangeSchema,
  kpis: z.array(kpiCardSchema),
  revenueTrend: z.array(chartPointSchema),
  clientGrowth: z.array(chartPointSchema),
  projectStatus: z.array(chartPointSchema),
  taskStatus: z.array(chartPointSchema),
  attendanceBreakdown: z.array(chartPointSchema),
  leaveBreakdown: z.array(chartPointSchema),
  invoiceStatus: z.array(chartPointSchema),
  employeeProductivity: z.array(chartPointSchema),
  tables: z.object({
    topClients: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        revenue: z.number(),
        invoices: z.number(),
      }),
    ),
    atRiskProjects: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.string(),
        progress: z.number(),
        dueDate: z.string().nullable(),
      }),
    ),
    overdueInvoices: z.array(
      z.object({
        id: z.string(),
        number: z.string(),
        clientName: z.string(),
        total: z.number(),
        dueDate: z.string().nullable(),
      }),
    ),
  }),
});
export type AnalyticsDashboardDto = z.infer<typeof analyticsDashboardDtoSchema>;

export const aiInsightDtoSchema = z.object({
  summary: z.string(),
  bullets: z.array(z.string()),
  generatedAt: z.string().datetime(),
  provider: z.string().optional(),
});
export type AiInsightDto = z.infer<typeof aiInsightDtoSchema>;

export const savedReportDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  category: reportCategorySchema,
  visibility: reportVisibilitySchema,
  filters: z.record(z.unknown()),
  isFavorite: z.boolean(),
  ownerId: uuidSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SavedReportDto = z.infer<typeof savedReportDtoSchema>;

export const reportTemplateDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  category: reportCategorySchema,
  defaultFilters: z.record(z.unknown()),
  isSystem: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ReportTemplateDto = z.infer<typeof reportTemplateDtoSchema>;
