import type { Request, Response } from "express";

import { prisma } from "@enterprise/database";
import type {
  CreateQuoteInput,
  GenerateQuoteInvoicesInput,
  ListQuotesQueryInput,
  QuoteIdParamsInput,
  RejectQuoteInput,
  SelectQuotePaymentModelInput,
  UpdateQuoteInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { QUOTES_ERROR_CODES, QuotesError } from "./quotes.errors.js";
import { quotesService, type QuoteActor } from "./quotes.service.js";

async function getActor(req: Request): Promise<QuoteActor> {
  if (!req.auth) {
    throw new QuotesError(
      "Authentication required",
      401,
      QUOTES_ERROR_CODES.FORBIDDEN,
    );
  }

  const context = extractRequestContext(req);
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
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export class QuotesController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListQuotesQueryInput;
    const result = await quotesService.list(query, await getActor(req));
    res.json(successResponse(result, "Quotes retrieved successfully"));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as QuoteIdParamsInput;
    const result = await quotesService.getById(params.id, await getActor(req));
    res.json(successResponse(result, "Quote retrieved successfully"));
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateQuoteInput;
    const result = await quotesService.create(body, await getActor(req));
    res.status(201).json(successResponse(result, "Quote created successfully"));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as QuoteIdParamsInput;
    const body = req.body as UpdateQuoteInput;
    const result = await quotesService.update(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Quote updated successfully"));
  }

  async send(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as QuoteIdParamsInput;
    const result = await quotesService.send(params.id, await getActor(req));
    res.json(successResponse(result, "Quote sent successfully"));
  }

  async approve(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as QuoteIdParamsInput;
    const result = await quotesService.approve(params.id, await getActor(req));
    res.json(successResponse(result, "Quote approved successfully"));
  }

  async selectPaymentModel(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as QuoteIdParamsInput;
    const body = req.body as SelectQuotePaymentModelInput;
    const result = await quotesService.selectPaymentModel(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Payment option updated"));
  }

  async reject(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as QuoteIdParamsInput;
    const body = req.body as RejectQuoteInput;
    const result = await quotesService.reject(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Quote rejected successfully"));
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as QuoteIdParamsInput;
    const result = await quotesService.cancel(params.id, await getActor(req));
    res.json(successResponse(result, "Quote cancelled successfully"));
  }

  async generateInvoices(req: Request, res: Response): Promise<void> {
    const params = req.params as unknown as QuoteIdParamsInput;
    const body = (req.body ?? {}) as GenerateQuoteInvoicesInput;
    const result = await quotesService.generateInvoices(
      params.id,
      body,
      await getActor(req),
    );
    res.json(successResponse(result, "Invoices generated successfully"));
  }
}

export const quotesController = new QuotesController();
