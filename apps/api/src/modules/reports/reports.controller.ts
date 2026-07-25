import type { Request, Response } from "express";

import type {
  AnalyticsQueryInput,
  CreateSavedReportInput,
  ExportReportInput,
  SavedReportIdParamsInput,
  UpdateSavedReportInput,
} from "@enterprise/shared";
import { prisma } from "@enterprise/database";

import { successResponse } from "../../shared/utils/api-response.js";
import { REPORTS_ERROR_CODES, ReportsError } from "./reports.errors.js";
import { reportsService, type ReportsActor } from "./reports.service.js";

async function getActor(req: Request): Promise<ReportsActor> {
  if (!req.auth) {
    throw new ReportsError(
      "Authentication required",
      401,
      REPORTS_ERROR_CODES.FORBIDDEN,
    );
  }

  let companyId: string | null = null;
  if (req.auth.role === "CLIENT") {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { companyId: true },
    });
    companyId = user?.companyId ?? null;
  }

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    companyId,
    permissions: req.auth.permissions,
  };
}

export class ReportsController {
  async analytics(req: Request, res: Response) {
    const result = await reportsService.getAnalytics(
      req.query as unknown as AnalyticsQueryInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Analytics retrieved"));
  }

  async insights(req: Request, res: Response) {
    const result = await reportsService.getInsights(
      req.query as unknown as AnalyticsQueryInput,
      await getActor(req),
    );
    res.json(successResponse(result, "AI insights retrieved"));
  }

  async templates(req: Request, res: Response) {
    const result = await reportsService.listTemplates(await getActor(req));
    res.json(successResponse(result, "Templates retrieved"));
  }

  async listSaved(req: Request, res: Response) {
    const result = await reportsService.listSaved(await getActor(req));
    res.json(successResponse(result, "Saved reports retrieved"));
  }

  async createSaved(req: Request, res: Response) {
    const result = await reportsService.createSaved(
      req.body as CreateSavedReportInput,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "Saved report created"));
  }

  async updateSaved(req: Request, res: Response) {
    const params = req.params as unknown as SavedReportIdParamsInput;
    const result = await reportsService.updateSaved(
      params.id,
      req.body as UpdateSavedReportInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Saved report updated"));
  }

  async deleteSaved(req: Request, res: Response) {
    const params = req.params as unknown as SavedReportIdParamsInput;
    const result = await reportsService.deleteSaved(
      params.id,
      await getActor(req),
    );
    res.json(successResponse(result, "Saved report deleted"));
  }

  async export(req: Request, res: Response) {
    const result = await reportsService.exportReport(
      req.body as ExportReportInput,
      await getActor(req),
    );
    res.setHeader("Content-Type", result.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.body);
  }
}

export const reportsController = new ReportsController();
