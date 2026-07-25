import type {
  ReportCategory,
  ReportVisibility,
  SavedReport,
  ReportTemplate,
} from "@enterprise/database";
import type {
  ReportTemplateDto,
  SavedReportDto,
} from "@enterprise/shared";

export function toSavedReportDto(report: SavedReport): SavedReportDto {
  return {
    id: report.id,
    name: report.name,
    description: report.description,
    category: report.category,
    visibility: report.visibility,
    filters:
      typeof report.filters === "object" && report.filters !== null
        ? (report.filters as Record<string, unknown>)
        : {},
    isFavorite: report.isFavorite,
    ownerId: report.ownerId,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function toTemplateDto(template: ReportTemplate): ReportTemplateDto {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    defaultFilters:
      typeof template.defaultFilters === "object" &&
      template.defaultFilters !== null
        ? (template.defaultFilters as Record<string, unknown>)
        : {},
    isSystem: template.isSystem,
    createdAt: template.createdAt.toISOString(),
  };
}

export type { ReportCategory, ReportVisibility };
