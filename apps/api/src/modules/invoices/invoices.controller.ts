import type { Request, Response } from "express";

import type {
  CreateInvoiceInput,
  InvoiceIdParamsInput,
  InvoicePaymentNoticeInput,
  ListInvoicesQueryInput,
  UpdateInvoiceInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { InvoicesError, INVOICES_ERROR_CODES } from "./invoices.errors.js";
import { invoicesService, type InvoiceActor } from "./invoices.service.js";

function getActor(req: Request): InvoiceActor {
  if (!req.auth) {
    throw new InvoicesError(
      "Authentication required",
      401,
      INVOICES_ERROR_CODES.FORBIDDEN,
    );
  }

  const context = extractRequestContext(req);

  return {
    userId: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export class InvoicesController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListInvoicesQueryInput;
    const result = await invoicesService.list(query, getActor(req));
    res.json(successResponse(result, "Invoices retrieved successfully"));
  }

  async stats(req: Request, res: Response): Promise<void> {
    const result = await invoicesService.getStats(getActor(req));
    res.json(successResponse(result, "Invoice stats retrieved successfully"));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as InvoiceIdParamsInput;
    const result = await invoicesService.getById(params.id, getActor(req));
    res.json(successResponse(result, "Invoice retrieved successfully"));
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateInvoiceInput;
    const result = await invoicesService.create(body, getActor(req));
    res
      .status(201)
      .json(successResponse(result, "Invoice created successfully"));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as InvoiceIdParamsInput;
    const body = req.body as UpdateInvoiceInput;
    const result = await invoicesService.update(
      params.id,
      body,
      getActor(req),
    );
    res.json(successResponse(result, "Invoice updated successfully"));
  }

  async remove(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as InvoiceIdParamsInput;
    const result = await invoicesService.remove(params.id, getActor(req));
    res.json(
      successResponse(
        { id: result.id, message: "Invoice deleted successfully" },
        "Invoice deleted successfully",
      ),
    );
  }

  async pdf(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as InvoiceIdParamsInput;
    const result = await invoicesService.getPdf(params.id, getActor(req));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }

  async reportPaymentNotice(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as InvoiceIdParamsInput;
    const body = req.body as InvoicePaymentNoticeInput;
    const result = await invoicesService.reportPaymentNotice(
      params.id,
      body,
      getActor(req),
    );
    res.json(
      successResponse(
        result,
        "Payment notice submitted. EliteFlow will verify offline payment.",
      ),
    );
  }
}

export const invoicesController = new InvoicesController();
