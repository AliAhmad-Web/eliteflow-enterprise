import type {
  AnalyticsDashboardDto,
  AiInsightDto,
  ReportTemplateDto,
  SavedReportDto,
} from "../schemas/reports.schema.js";

export type AnalyticsDashboard = AnalyticsDashboardDto;
export type AiInsight = AiInsightDto;
export type SavedReport = SavedReportDto;
export type ReportTemplate = ReportTemplateDto;

export type SavedReportListResponse = { items: SavedReport[] };
export type ReportTemplateListResponse = { items: ReportTemplate[] };
