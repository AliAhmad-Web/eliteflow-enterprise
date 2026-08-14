import type { Request, Response } from "express";

import { prisma } from "@enterprise/database";
import type {
  BankTransferSubmitInput,
  CreatePaymentRefundInput,
  DecidePaymentRefundInput,
  InitiateProviderPaymentInput,
  ListPaymentsQueryInput,
  PakistanPaymentMethodValue,
  RejectPaymentInput,
  UpdatePaymentMethodConfigInput,
  VerifyPaymentInput,
  WalletPaymentNoticeInput,
} from "@enterprise/shared";

import { successResponse } from "../../shared/utils/api-response.js";
import { extractRequestContext } from "../auth/auth.utils.js";
import { PAYMENTS_ERROR_CODES, PaymentsError } from "./payments.errors.js";
import { paymentsService, type PaymentActor } from "./payments.service.js";
import { toPaymentRefundDto } from "./payments.types.js";

type PaymentIdParams = { id: string };

async function getActor(req: Request): Promise<PaymentActor> {
  if (!req.auth) {
    throw new PaymentsError(
      "Authentication required",
      401,
      PAYMENTS_ERROR_CODES.FORBIDDEN,
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

export class PaymentsController {
  async list(req: Request, res: Response): Promise<void> {
    const result = await paymentsService.list(
      req.query as unknown as ListPaymentsQueryInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Payments retrieved successfully"));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as PaymentIdParams;
    const result = await paymentsService.getById(params.id, await getActor(req));
    res.json(successResponse(result, "Payment retrieved successfully"));
  }

  async listMethods(_req: Request, res: Response): Promise<void> {
    const result = await paymentsService.listMethods();
    res.json(successResponse(result, "Payment methods retrieved successfully"));
  }

  async updateMethod(req: Request, res: Response): Promise<void> {
    const method = (req.params as { method: PakistanPaymentMethodValue }).method;
    const result = await paymentsService.updateMethod(
      method,
      req.body as UpdatePaymentMethodConfigInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Payment method updated successfully"));
  }

  async submitBankTransfer(req: Request, res: Response): Promise<void> {
    const result = await paymentsService.submitBankTransfer(
      req.body as BankTransferSubmitInput,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "Bank transfer submitted"));
  }

  async submitWalletNotice(req: Request, res: Response): Promise<void> {
    const result = await paymentsService.submitWalletNotice(
      req.body as WalletPaymentNoticeInput,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "Payment submitted for verification"));
  }

  async initiateJazzCash(req: Request, res: Response): Promise<void> {
    const result = await paymentsService.initiateJazzCash(
      req.body as InitiateProviderPaymentInput,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "JazzCash checkout initiated"));
  }

  async initiateEasyPaisa(req: Request, res: Response): Promise<void> {
    const result = await paymentsService.initiateEasyPaisa(
      req.body as InitiateProviderPaymentInput,
      await getActor(req),
    );
    res.status(201).json(successResponse(result, "EasyPaisa checkout initiated"));
  }

  async jazzCashCheckout(req: Request, res: Response): Promise<void> {
    const params = req.params as PaymentIdParams;
    const { html } = await paymentsService.checkoutHtml(
      params.id,
      await getActor(req),
      "JAZZCASH",
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }

  async easyPaisaCheckout(req: Request, res: Response): Promise<void> {
    const params = req.params as PaymentIdParams;
    const { html } = await paymentsService.checkoutHtml(
      params.id,
      await getActor(req),
      "EASYPAISA",
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }

  async verify(req: Request, res: Response): Promise<void> {
    const params = req.params as PaymentIdParams;
    const result = await paymentsService.verify(
      params.id,
      (req.body ?? {}) as VerifyPaymentInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Payment verified"));
  }

  async reject(req: Request, res: Response): Promise<void> {
    const params = req.params as PaymentIdParams;
    const result = await paymentsService.reject(
      params.id,
      req.body as RejectPaymentInput,
      await getActor(req),
    );
    res.json(successResponse(result, "Payment rejected"));
  }

  async createRefund(req: Request, res: Response): Promise<void> {
    const params = req.params as PaymentIdParams;
    const refund = await paymentsService.createRefund(
      params.id,
      req.body as CreatePaymentRefundInput,
      await getActor(req),
    );
    res
      .status(201)
      .json(successResponse(toPaymentRefundDto(refund), "Refund recorded"));
  }

  async decideRefund(req: Request, res: Response): Promise<void> {
    const params = req.params as { id: string; refundId: string };
    const refund = await paymentsService.decideRefund(
      params.id,
      params.refundId,
      req.body as DecidePaymentRefundInput,
      await getActor(req),
    );
    res.json(successResponse(toPaymentRefundDto(refund), "Refund updated"));
  }

  async jazzCashCallback(req: Request, res: Response): Promise<void> {
    const payload = { ...(req.query as object), ...(req.body as object) };
    const result = await paymentsService.handleJazzCashCallback(payload);
    if (wantsHtml(req)) {
      res.redirect(303, result.redirectUrl);
      return;
    }
    res.json(successResponse(result, "JazzCash callback processed"));
  }

  async easyPaisaCallback(req: Request, res: Response): Promise<void> {
    const payload = { ...(req.query as object), ...(req.body as object) };
    const result = await paymentsService.handleEasyPaisaCallback(payload);
    if (wantsHtml(req)) {
      res.redirect(303, result.redirectUrl);
      return;
    }
    res.json(successResponse(result, "EasyPaisa callback processed"));
  }
}

function wantsHtml(req: Request): boolean {
  const accept = req.get("accept") ?? "";
  return accept.includes("text/html") || req.method === "GET";
}

export const paymentsController = new PaymentsController();
