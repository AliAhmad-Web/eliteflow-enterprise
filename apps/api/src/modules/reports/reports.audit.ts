import { prisma, Prisma } from "@enterprise/database";
import { sanitizeAuditMetadata } from "@enterprise/shared";

import { logger } from "../../shared/security/logger.js";

interface ReportsAuditInput {
  userId?: string | null;
  action: string;
  category?: string;
  format?: string;
  savedReportId?: string;
  metadata?: Record<string, unknown>;
}

export async function logReportsAuditEvent(
  input: ReportsAuditInput,
): Promise<void> {
  try {
    const metadata = sanitizeAuditMetadata(input.metadata);
    await prisma.reportAudit.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        category: input.category as never,
        format: input.format as never,
        savedReportId: input.savedReportId ?? null,
        metadata: metadata
          ? (metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (error) {
    logger.error("[reports] Failed to write audit log:", error);
  }
}

export const REPORTS_AUDIT_ACTIONS = {
  VIEW_ANALYTICS: "reports.analytics.view",
  VIEW_INSIGHTS: "reports.insights.view",
  EXPORT: "reports.export",
  SAVED_CREATE: "reports.saved.create",
  SAVED_UPDATE: "reports.saved.update",
  SAVED_DELETE: "reports.saved.delete",
} as const;
