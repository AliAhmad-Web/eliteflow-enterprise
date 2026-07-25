import {
  REPORTS_API_PREFIX,
  type AiInsight,
  type AnalyticsDashboard,
  type AnalyticsQueryInput,
  type CreateSavedReportInput,
  type ExportReportInput,
  type ReportTemplateListResponse,
  type SavedReport,
  type SavedReportListResponse,
  type UpdateSavedReportInput,
} from "@enterprise/shared";

import { apiRequest, authenticatedFetch } from "@/services/api/api-client";
import { ApiClientError } from "@/services/api/api-error";

function toQueryString(query: AnalyticsQueryInput): string {
  const params = new URLSearchParams();

  params.set("range", query.range ?? "this_month");
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.category) params.set("category", query.category);
  if (query.clientId) params.set("clientId", query.clientId);
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.departmentId) params.set("departmentId", query.departmentId);
  if (query.teamId) params.set("teamId", query.teamId);
  if (query.projectId) params.set("projectId", query.projectId);
  if (query.invoiceStatus) params.set("invoiceStatus", query.invoiceStatus);
  if (query.taskStatus) params.set("taskStatus", query.taskStatus);
  if (query.attendanceStatus) {
    params.set("attendanceStatus", query.attendanceStatus);
  }
  if (query.leaveStatus) params.set("leaveStatus", query.leaveStatus);

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function extractFilename(
  disposition: string | null,
  fallback: string,
): string {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

function defaultExportFilename(format: ExportReportInput["format"]): string {
  switch (format) {
    case "CSV":
      return "report.csv";
    case "EXCEL":
      return "report.xls";
    case "PDF":
      return "report.html";
    case "PRINT":
      return "report.html";
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function openHtmlForPrint(html: string, shouldPrint: boolean): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new ApiClientError(
      "Could not open print window",
      "REPORTS_PRINT_ERROR",
      500,
    );
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  if (shouldPrint) {
    printWindow.focus();
    printWindow.print();
  }
}

export const reportsService = {
  getAnalytics(query: AnalyticsQueryInput) {
    return apiRequest<AnalyticsDashboard>(
      `${REPORTS_API_PREFIX}/analytics${toQueryString(query)}`,
      { auth: true },
    );
  },

  getInsights(query: AnalyticsQueryInput) {
    return apiRequest<AiInsight>(
      `${REPORTS_API_PREFIX}/insights${toQueryString(query)}`,
      { auth: true },
    );
  },

  listTemplates() {
    return apiRequest<ReportTemplateListResponse>(
      `${REPORTS_API_PREFIX}/templates`,
      { auth: true },
    );
  },

  listSaved() {
    return apiRequest<SavedReportListResponse>(`${REPORTS_API_PREFIX}/saved`, {
      auth: true,
    });
  },

  createSaved(input: CreateSavedReportInput) {
    return apiRequest<SavedReport>(`${REPORTS_API_PREFIX}/saved`, {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  updateSaved(id: string, input: UpdateSavedReportInput) {
    return apiRequest<SavedReport>(`${REPORTS_API_PREFIX}/saved/${id}`, {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  deleteSaved(id: string) {
    return apiRequest<{ id: string; message: string }>(
      `${REPORTS_API_PREFIX}/saved/${id}`,
      {
        method: "DELETE",
        auth: true,
      },
    );
  },

  async exportReport(input: ExportReportInput): Promise<void> {
    const response = await authenticatedFetch(`${REPORTS_API_PREFIX}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new ApiClientError(
        "Failed to export report",
        "REPORTS_EXPORT_ERROR",
        response.status,
      );
    }

    const contentType = response.headers.get("Content-Type") ?? "";
    const disposition = response.headers.get("Content-Disposition");
    const fallback = defaultExportFilename(input.format);

    if (input.format === "PRINT" || contentType.includes("text/html")) {
      const html = await response.text();
      openHtmlForPrint(html, input.format === "PRINT");
      return;
    }

    const blob = await response.blob();
    const filename = extractFilename(disposition, fallback);
    triggerBlobDownload(blob, filename);
  },
};
