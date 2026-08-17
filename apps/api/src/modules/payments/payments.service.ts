import { createHash } from "node:crypto";

import {
  NotificationCategory,
  NotificationPriority,
  type PakistanPaymentMethod,
  prisma,
} from "@enterprise/database";
import {
  UserRole,
  canTransitionPaymentStatus,
  invoicePaymentStatusFromTotals,
  roundMoney,
  type BankTransferSubmitInput,
  type CreatePaymentRefundInput,
  type DecidePaymentRefundInput,
  type HostedCheckoutDto,
  type InitiateProviderPaymentInput,
  type ListPaymentsQueryInput,
  type PaymentDto,
  type PaymentExecutionStatusValue,
  type PaymentListResponse,
  type PaymentMethodConfigDto,
  type RejectPaymentInput,
  type UpdatePaymentMethodConfigInput,
  type VerifyPaymentInput,
  type WalletPaymentNoticeInput,
} from "@enterprise/shared";

import { filesService } from "../files/files.service.js";
import { notificationDispatcher } from "../notifications/notification.dispatcher.js";
import {
  PAYMENT_AUDIT_ACTIONS,
  logPaymentAuditEvent,
} from "./payments.audit.js";
import { PAYMENTS_ERROR_CODES, PaymentsError } from "./payments.errors.js";
import {
  paymentsRepository,
  type PaymentAccessScope,
} from "./payments.repository.js";
import { toPaymentDto, toPaymentMethodConfigDto } from "./payments.types.js";
import {
  buildEasyPaisaHostedFields,
  easyPaisaHostedUrl,
  formatEasyPaisaAmount,
  getEasyPaisaCredentials,
  isEasyPaisaCancelledStatus,
  isEasyPaisaExpiredStatus,
  isEasyPaisaPendingStatus,
  isEasyPaisaSuccessStatus,
  sanitizeEasyPaisaFields,
  verifyEasyPaisaHash,
} from "./providers/easypaisa.js";
import {
  buildJazzCashHostedFields,
  buildJazzCashTxnRef,
  getJazzCashCredentials,
  isJazzCashCancelledCode,
  isJazzCashExpiredCode,
  isJazzCashPendingCode,
  isJazzCashSuccessCode,
  jazzCashHostedUrl,
  sanitizeJazzCashFields,
  toJazzCashAmountPaisa,
  verifyJazzCashSecureHash,
} from "./providers/jazzcash.js";

export interface PaymentActor {
  userId: string;
  role: string;
  email: string;
  companyId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function isAdmin(actor: PaymentActor): boolean {
  const role = String(actor.role ?? "").toUpperCase();
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

function isClient(actor: PaymentActor): boolean {
  return String(actor.role ?? "").toUpperCase() === UserRole.CLIENT;
}

function publicApiBase(): string {
  const url =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.API_PUBLIC_URL?.replace(/\/$/, "");
  if (!url) {
    throw new PaymentsError(
      "APP_URL or API_PUBLIC_URL must be set for payment callbacks",
      503,
      PAYMENTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    );
  }
  return url;
}

function frontendBase(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, "") ||
    process.env.WEB_APP_URL?.replace(/\/$/, "") ||
    process.env.CORS_ORIGIN?.split(",")[0]?.trim().replace(/\/$/, "") ||
    "https://eliteflow-web.vercel.app"
  );
}

function payloadHash(fields: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

function asFields(body: unknown): Record<string, string> {
  const source =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;
    fields[key] = String(value);
  }
  return fields;
}

export class PaymentsService {
  async list(
    query: ListPaymentsQueryInput,
    actor: PaymentActor,
  ): Promise<PaymentListResponse> {
    await this.expireOverdueHosted();
    const scope = await this.resolveScope(actor);
    const { items, total } = await paymentsRepository.findMany(query, scope);
    return {
      items: items.map(toPaymentDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getById(id: string, actor: PaymentActor): Promise<PaymentDto> {
    await this.expireOverdueHosted();
    const scope = await this.resolveScope(actor);
    const payment = await paymentsRepository.findById(id, scope);
    if (!payment) {
      throw new PaymentsError(
        "Payment not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    return toPaymentDto(payment);
  }

  async listMethods(): Promise<PaymentMethodConfigDto[]> {
    const rows = await paymentsRepository.listMethodConfigs();
    return rows.map(toPaymentMethodConfigDto);
  }

  async updateMethod(
    method: PakistanPaymentMethod,
    input: UpdatePaymentMethodConfigInput,
    actor: PaymentActor,
  ): Promise<PaymentMethodConfigDto> {
    this.assertAdmin(actor);
    const existing = await paymentsRepository.getMethodConfig(method);
    if (!existing) {
      throw new PaymentsError(
        "Payment method not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    const updated = await paymentsRepository.upsertMethodConfig(
      method,
      {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.displayName !== undefined
          ? { displayName: input.displayName }
          : {}),
        ...(input.instructions !== undefined
          ? { instructions: input.instructions }
          : {}),
        ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
        ...(input.accountTitle !== undefined
          ? { accountTitle: input.accountTitle }
          : {}),
        ...(input.accountNumber !== undefined
          ? { accountNumber: input.accountNumber }
          : {}),
        ...(input.iban !== undefined ? { iban: input.iban } : {}),
        ...(input.merchantPublicId !== undefined
          ? { merchantPublicId: input.merchantPublicId }
          : {}),
      },
      actor.userId,
    );
    await logPaymentAuditEvent({
      userId: actor.userId,
      action: PAYMENT_AUDIT_ACTIONS.METHOD_UPDATED,
      resourceId: method,
      metadata: { enabled: updated.enabled },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return toPaymentMethodConfigDto(updated);
  }

  async submitBankTransfer(
    input: BankTransferSubmitInput,
    actor: PaymentActor,
  ): Promise<PaymentDto> {
    this.assertClient(actor);
    await this.assertMethodEnabled("BANK_TRANSFER");
    const invoice = await this.loadPayableInvoice(input.invoiceId, actor);
    const amount = this.assertPayableAmount(invoice, input.amount);
    await this.assertNoInFlight(invoice.id);
    if (input.proofFileId) {
      await this.assertProofFile(input.proofFileId, actor);
    }

    const paymentNumber = await paymentsRepository.nextPaymentNumber();
    const created = await paymentsRepository.create({
      paymentNumber,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      quoteId: invoice.quoteId,
      paymentScheduleItemId: invoice.paymentScheduleItemId,
      method: "BANK_TRANSFER",
      amount,
      currency: invoice.currency,
      status: "PENDING_VERIFICATION",
      customerReference: input.customerReference.trim(),
      proofFileId: input.proofFileId ?? null,
      paidAtCustomer: new Date(input.paidAt),
      notes: input.notes?.trim() || null,
      submittedById: actor.userId,
      submittedAt: new Date(),
    });

    await this.recalculateInvoice(invoice.id);
    await logPaymentAuditEvent({
      userId: actor.userId,
      action: PAYMENT_AUDIT_ACTIONS.SUBMITTED,
      resourceId: created.id,
      metadata: {
        method: "BANK_TRANSFER",
        invoiceId: invoice.id,
        amount,
        hasProof: Boolean(input.proofFileId),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    if (input.proofFileId) {
      await logPaymentAuditEvent({
        userId: actor.userId,
        action: PAYMENT_AUDIT_ACTIONS.PROOF_UPLOADED,
        resourceId: created.id,
        metadata: { proofFileId: input.proofFileId },
      });
    }
    this.notifyAdmins(
      invoice.invoiceKind === "ADVANCE"
        ? "Advance payment requires verification"
        : invoice.invoiceKind === "FINAL"
          ? "Final payment requires verification"
          : "Bank transfer submitted",
      `${actor.email} submitted ${paymentNumber} for ${invoice.invoiceNumber}. Review the payment proof and confirm the money was received before verifying.`,
      created.id,
      actor.userId,
    );
    this.notifyCustomerUser(
      actor.userId,
      "Payment submitted",
      `Your payment ${paymentNumber} for ${invoice.invoiceNumber} was submitted and is pending verification.`,
      created.id,
      actor.userId,
    );
    return toPaymentDto(created);
  }

  async submitWalletNotice(
    input: WalletPaymentNoticeInput,
    actor: PaymentActor,
  ): Promise<PaymentDto> {
    this.assertClient(actor);
    await this.assertMethodEnabled(input.method);
    const invoice = await this.loadPayableInvoice(input.invoiceId, actor);
    const amount = this.assertPayableAmount(invoice, input.amount);
    await this.assertNoInFlight(invoice.id);
    if (input.proofFileId) {
      await this.assertProofFile(input.proofFileId, actor);
    }

    const paymentNumber = await paymentsRepository.nextPaymentNumber();
    const created = await paymentsRepository.create({
      paymentNumber,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      quoteId: invoice.quoteId,
      paymentScheduleItemId: invoice.paymentScheduleItemId,
      method: input.method,
      amount,
      currency: invoice.currency,
      status: "PENDING_VERIFICATION",
      customerReference: input.customerReference.trim(),
      providerTxnId: input.customerReference.trim(),
      proofFileId: input.proofFileId ?? null,
      paidAtCustomer: input.paidAt ? new Date(input.paidAt) : null,
      notes: input.notes?.trim() || null,
      submittedById: actor.userId,
      submittedAt: new Date(),
    });

    await this.recalculateInvoice(invoice.id);
    await logPaymentAuditEvent({
      userId: actor.userId,
      action: PAYMENT_AUDIT_ACTIONS.SUBMITTED,
      resourceId: created.id,
      metadata: { method: input.method, invoiceId: invoice.id, amount },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    this.notifyAdmins(
      invoice.invoiceKind === "ADVANCE"
        ? "Advance payment requires verification"
        : `${input.method} payment submitted`,
      `${actor.email} submitted ${paymentNumber} for ${invoice.invoiceNumber}. Review the payment proof and confirm the money was received before verifying.`,
      created.id,
      actor.userId,
    );
    this.notifyCustomerUser(
      actor.userId,
      "Payment submitted",
      `Your payment ${paymentNumber} for ${invoice.invoiceNumber} was submitted and is pending verification.`,
      created.id,
      actor.userId,
    );
    return toPaymentDto(created);
  }

  async initiateJazzCash(
    input: InitiateProviderPaymentInput,
    actor: PaymentActor,
  ): Promise<{ payment: PaymentDto; checkout: HostedCheckoutDto }> {
    return this.initiateHosted(input, actor, "JAZZCASH");
  }

  async initiateEasyPaisa(
    input: InitiateProviderPaymentInput,
    actor: PaymentActor,
  ): Promise<{ payment: PaymentDto; checkout: HostedCheckoutDto }> {
    return this.initiateHosted(input, actor, "EASYPAISA");
  }

  async checkoutHtml(
    id: string,
    actor: PaymentActor,
    provider: "JAZZCASH" | "EASYPAISA",
  ): Promise<{ html: string }> {
    const payment = await this.getById(id, actor);
    if (payment.method !== provider) {
      throw new PaymentsError(
        "Payment method mismatch",
        409,
        PAYMENTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }
    if (
      payment.status !== "INITIATED" &&
      payment.status !== "PENDING"
    ) {
      throw new PaymentsError(
        "This payment is no longer awaiting checkout",
        409,
        PAYMENTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }

    const built =
      provider === "JAZZCASH"
        ? this.buildJazzCashCheckout(payment)
        : this.buildEasyPaisaCheckout(payment);

    await paymentsRepository.update(payment.id, { status: "PENDING" });
    const inputs = Object.entries(built.fields)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting</title></head><body><p>Redirecting to ${provider === "JAZZCASH" ? "JazzCash" : "EasyPaisa"}…</p><form id="pay" method="POST" action="${escapeHtml(built.actionUrl)}">${inputs}</form><script>document.getElementById('pay').submit();</script></body></html>`;
    return { html };
  }

  async verify(
    id: string,
    input: VerifyPaymentInput,
    actor: PaymentActor,
  ): Promise<PaymentDto> {
    this.assertAdmin(actor);
    const payment = await paymentsRepository.findById(id, { all: true });
    if (!payment) {
      throw new PaymentsError(
        "Payment not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (
      payment.status !== "PENDING_VERIFICATION" &&
      payment.status !== "PENDING"
    ) {
      throw new PaymentsError(
        "Only submitted or pending payments can be verified by an administrator",
        409,
        PAYMENTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }
    this.assertTransition(payment.status, "VERIFIED");
    const updated = await paymentsRepository.update(id, {
      status: "VERIFIED",
      verifiedById: actor.userId,
      verifiedAt: new Date(),
      paidAt: new Date(),
      verificationNotes: input.notes?.trim() || null,
    });
    const invoice = await this.recalculateInvoice(payment.invoiceId);
    await logPaymentAuditEvent({
      userId: actor.userId,
      action: PAYMENT_AUDIT_ACTIONS.VERIFIED,
      resourceId: id,
      metadata: { invoiceId: payment.invoiceId, amount: Number(payment.amount) },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    if (invoice.paymentStatus === "PAID") {
      await logPaymentAuditEvent({
        userId: actor.userId,
        action: PAYMENT_AUDIT_ACTIONS.INVOICE_PAID,
        resourceId: payment.invoiceId,
        metadata: { paymentId: id },
      });
      await this.startProjectIfAdvanceSettled(invoice);
    }
    const remaining = roundMoney(
      Math.max(0, Number(invoice.total) - Number(invoice.paidAmount)),
    );
    const remainingLabel = `${invoice.currency} ${remaining.toFixed(2)}`;
    const isAdvance =
      invoice.invoiceKind === "ADVANCE" ||
      (await this.isFirstInstallment(invoice.id));
    const quoteOutstanding = invoice.quoteId
      ? await this.quoteOutstandingBalance(invoice.quoteId)
      : remaining;
    const isFinalSettlement =
      !isAdvance &&
      invoice.paymentStatus === "PAID" &&
      quoteOutstanding <= 0.009;
    const customerId = payment.submittedById;
    if (customerId) {
      if (isAdvance && invoice.paymentStatus === "PAID") {
        this.notifyCustomerUser(
          customerId,
          "Advance Payment Received",
          "Your payment has been verified successfully. Your project is now ready to start.",
          payment.id,
          actor.userId,
        );
      } else if (isFinalSettlement) {
        this.notifyCustomerUser(
          customerId,
          "Final payment verified",
          "Final payment verified. Your project payment is now complete.",
          payment.id,
          actor.userId,
        );
      } else {
        this.notifyCustomerUser(
          customerId,
          "Payment verified",
          `Your payment was verified. Remaining balance: ${remainingLabel}.`,
          payment.id,
          actor.userId,
        );
      }
    }
    this.notifyAdmins(
      isAdvance && invoice.paymentStatus === "PAID"
        ? "Advance payment received"
        : isFinalSettlement
          ? "Final payment verified"
          : "Payment verified",
      `Payment ${payment.paymentNumber} verified. Remaining on invoice ${invoice.invoiceNumber}: ${remainingLabel}.`,
      payment.id,
      actor.userId,
    );
    return toPaymentDto(updated);
  }

  async reject(
    id: string,
    input: RejectPaymentInput,
    actor: PaymentActor,
  ): Promise<PaymentDto> {
    this.assertAdmin(actor);
    const payment = await paymentsRepository.findById(id, { all: true });
    if (!payment) {
      throw new PaymentsError(
        "Payment not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    this.assertTransition(payment.status, "REJECTED");
    const updated = await paymentsRepository.update(id, {
      status: "REJECTED",
      verifiedById: actor.userId,
      verifiedAt: new Date(),
      rejectionReason: input.reason.trim(),
    });
    await this.recalculateInvoice(payment.invoiceId);
    await logPaymentAuditEvent({
      userId: actor.userId,
      action: PAYMENT_AUDIT_ACTIONS.REJECTED,
      resourceId: id,
      metadata: { reason: input.reason.trim() },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    if (payment.submittedById) {
      this.notifyCustomerUser(
        payment.submittedById,
        "Payment rejected",
        `Your payment ${payment.paymentNumber} was rejected: ${input.reason.trim().substring(0, 180)}`,
        payment.id,
        actor.userId,
      );
    }
    this.notifyAdmins(
      "Payment rejected",
      `Payment ${payment.paymentNumber} was rejected.`,
      payment.id,
      actor.userId,
    );
    return toPaymentDto(updated);
  }

  async createRefund(
    paymentId: string,
    input: CreatePaymentRefundInput,
    actor: PaymentActor,
  ) {
    this.assertAdmin(actor);
    const payment = await paymentsRepository.findById(paymentId, { all: true });
    if (!payment) {
      throw new PaymentsError(
        "Payment not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (payment.status !== "VERIFIED" && payment.status !== "PAID") {
      throw new PaymentsError(
        "Only verified payments can be refunded",
        409,
        PAYMENTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }
    const amount = roundMoney(input.amount);
    if (amount > Number(payment.amount) + 0.001) {
      throw new PaymentsError(
        "Refund amount cannot exceed the payment amount",
        400,
        PAYMENTS_ERROR_CODES.AMOUNT_INVALID,
      );
    }
    const refundNumber = await paymentsRepository.nextRefundNumber();
    const refund = await prisma.paymentRefund.create({
      data: {
        refundNumber,
        paymentId,
        amount,
        reason: input.reason.trim(),
        notes: input.notes?.trim() || null,
        status: "PENDING",
        requestedById: actor.userId,
      },
    });
    return refund;
  }

  async decideRefund(
    paymentId: string,
    refundId: string,
    input: DecidePaymentRefundInput,
    actor: PaymentActor,
  ) {
    this.assertAdmin(actor);
    const refund = await prisma.paymentRefund.findFirst({
      where: { id: refundId, paymentId },
    });
    if (!refund) {
      throw new PaymentsError(
        "Refund not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (refund.status !== "PENDING") {
      throw new PaymentsError(
        "Refund is not pending",
        409,
        PAYMENTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }
    if (input.decision === "REJECT") {
      return prisma.paymentRefund.update({
        where: { id: refundId },
        data: {
          status: "REJECTED",
          authorizedById: actor.userId,
          authorizedAt: new Date(),
          notes: input.notes?.trim() || refund.notes,
        },
      });
    }

    const payment = await paymentsRepository.findById(paymentId, { all: true });
    if (!payment) {
      throw new PaymentsError(
        "Payment not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    const full = roundMoney(Number(refund.amount)) >= roundMoney(Number(payment.amount));
    if (full) {
      this.assertTransition(payment.status, "REFUNDED");
      await paymentsRepository.update(paymentId, { status: "REFUNDED" });
    }
    const updated = await prisma.paymentRefund.update({
      where: { id: refundId },
      data: {
        status: "COMPLETED",
        authorizedById: actor.userId,
        authorizedAt: new Date(),
        completedAt: new Date(),
        notes: input.notes?.trim() || refund.notes,
      },
    });
    await this.recalculateInvoice(payment.invoiceId);
    await logPaymentAuditEvent({
      userId: actor.userId,
      action: PAYMENT_AUDIT_ACTIONS.REFUNDED,
      resourceId: paymentId,
      metadata: { refundId, amount: Number(refund.amount), full },
    });
    return updated;
  }

  async handleJazzCashCallback(raw: unknown): Promise<{
    accepted: boolean;
    reason: string;
    paymentId?: string;
    redirectUrl: string;
  }> {
    const fields = asFields(raw);
    const txnRef = fields.pp_TxnRefNo?.trim();
    const eventKey = `JAZZCASH:${txnRef ?? "unknown"}:${fields.pp_ResponseCode ?? ""}:${payloadHash(fields).slice(0, 16)}`;
    const credentials = getJazzCashCredentials();

    const ledger = await paymentsRepository.recordWebhookEvent({
      provider: "JAZZCASH",
      eventKey,
      accepted: false,
      payloadHash: payloadHash(fields),
    });
    if (!ledger) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        metadata: { provider: "JAZZCASH", reason: "replay" },
      });
      return {
        accepted: false,
        reason: "replay",
        redirectUrl: `${frontendBase()}/payments?callback=replay`,
      };
    }

    if (!credentials) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        metadata: { provider: "JAZZCASH", reason: "not_configured" },
      });
      return {
        accepted: false,
        reason: "not_configured",
        redirectUrl: `${frontendBase()}/payments?callback=error`,
      };
    }

    if (!verifyJazzCashSecureHash(fields, credentials.integritySalt)) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        metadata: { provider: "JAZZCASH", reason: "invalid_hash" },
      });
      return {
        accepted: false,
        reason: "invalid_hash",
        redirectUrl: `${frontendBase()}/payments?callback=invalid`,
      };
    }

    const payment = txnRef
      ? await paymentsRepository.findByProviderTxn(txnRef)
      : null;
    if (!payment) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        metadata: { provider: "JAZZCASH", reason: "unknown_payment", txnRef },
      });
      return {
        accepted: false,
        reason: "unknown_payment",
        redirectUrl: `${frontendBase()}/payments?callback=unknown`,
      };
    }

    await logPaymentAuditEvent({
      action: PAYMENT_AUDIT_ACTIONS.CALLBACK_RECEIVED,
      resourceId: payment.id,
      metadata: sanitizeJazzCashFields(fields),
    });

    if (this.isTerminalSettled(payment.status)) {
      return {
        accepted: true,
        reason: "already_settled",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=paid`,
      };
    }

    if (isJazzCashPendingCode(fields.pp_ResponseCode)) {
      await paymentsRepository.update(payment.id, {
        status: "PENDING",
        providerMetadata: sanitizeJazzCashFields(fields),
      });
      await this.recalculateInvoice(payment.invoiceId);
      return {
        accepted: false,
        reason: "pending",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=pending`,
      };
    }

    if (!isJazzCashSuccessCode(fields.pp_ResponseCode)) {
      const outcome = isJazzCashExpiredCode(fields.pp_ResponseCode)
        ? "EXPIRED"
        : "FAILED";
      const reason = isJazzCashCancelledCode(fields.pp_ResponseCode)
        ? "cancelled"
        : isJazzCashExpiredCode(fields.pp_ResponseCode)
          ? "expired"
          : "declined";
      await paymentsRepository.update(payment.id, {
        status: outcome,
        failureReason:
          fields.pp_ResponseMessage?.slice(0, 500) ||
          (reason === "cancelled"
            ? "JazzCash checkout cancelled"
            : reason === "expired"
              ? "JazzCash transaction expired"
              : "JazzCash declined"),
        providerMetadata: sanitizeJazzCashFields(fields),
      });
      await this.recalculateInvoice(payment.invoiceId);
      await logPaymentAuditEvent({
        action:
          outcome === "EXPIRED"
            ? PAYMENT_AUDIT_ACTIONS.EXPIRED
            : PAYMENT_AUDIT_ACTIONS.FAILED,
        resourceId: payment.id,
        metadata: { code: fields.pp_ResponseCode, reason },
      });
      return {
        accepted: false,
        reason,
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=${reason}`,
      };
    }

    if (
      fields.pp_TxnCurrency &&
      fields.pp_TxnCurrency.toUpperCase() !== "PKR"
    ) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        resourceId: payment.id,
        metadata: { reason: "currency_mismatch", received: fields.pp_TxnCurrency },
      });
      return {
        accepted: false,
        reason: "currency_mismatch",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=invalid`,
      };
    }

    const expectedPaisa = toJazzCashAmountPaisa(Number(payment.amount));
    if (fields.pp_Amount !== expectedPaisa) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        resourceId: payment.id,
        metadata: {
          reason: "amount_mismatch",
          expected: expectedPaisa,
          received: fields.pp_Amount,
        },
      });
      return {
        accepted: false,
        reason: "amount_mismatch",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=invalid`,
      };
    }

    if (payment.status === "VERIFIED" || payment.status === "PAID") {
      return {
        accepted: true,
        reason: "already_settled",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=paid`,
      };
    }

    this.assertTransition(payment.status, "VERIFIED");
    await paymentsRepository.update(payment.id, {
      status: "VERIFIED",
      verifiedAt: new Date(),
      paidAt: new Date(),
      providerMetadata: sanitizeJazzCashFields(fields),
    });
    const invoice = await this.recalculateInvoice(payment.invoiceId);
    await prisma.paymentWebhookEvent.update({
      where: { id: ledger.id },
      data: { accepted: true, paymentId: payment.id, reason: "verified" },
    });
    await logPaymentAuditEvent({
      action: PAYMENT_AUDIT_ACTIONS.VERIFIED,
      resourceId: payment.id,
      metadata: { provider: "JAZZCASH" },
    });
    if (invoice.paymentStatus === "PAID") {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.INVOICE_PAID,
        resourceId: payment.invoiceId,
        metadata: { paymentId: payment.id, provider: "JAZZCASH" },
      });
    }
    return {
      accepted: true,
      reason: "verified",
      paymentId: payment.id,
      redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=paid`,
    };
  }

  async handleEasyPaisaCallback(raw: unknown): Promise<{
    accepted: boolean;
    reason: string;
    paymentId?: string;
    redirectUrl: string;
  }> {
    const fields = asFields(raw);
    const orderRef =
      fields.orderRefNum?.trim() ||
      fields.orderRef?.trim() ||
      fields.orderId?.trim();
    const eventKey = `EASYPAISA:${orderRef ?? "unknown"}:${fields.status ?? fields.transactionStatus ?? ""}:${payloadHash(fields).slice(0, 16)}`;
    const credentials = getEasyPaisaCredentials();

    const ledger = await paymentsRepository.recordWebhookEvent({
      provider: "EASYPAISA",
      eventKey,
      accepted: false,
      payloadHash: payloadHash(fields),
    });
    if (!ledger) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        metadata: { provider: "EASYPAISA", reason: "replay" },
      });
      return {
        accepted: false,
        reason: "replay",
        redirectUrl: `${frontendBase()}/payments?callback=replay`,
      };
    }

    if (!credentials) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        metadata: { provider: "EASYPAISA", reason: "not_configured" },
      });
      return {
        accepted: false,
        reason: "not_configured",
        redirectUrl: `${frontendBase()}/payments?callback=error`,
      };
    }

    const receivedHash =
      fields.merchantHashedReq || fields.hashValue || fields.hash;
    const hashOk = receivedHash
      ? verifyEasyPaisaHash(
          {
            amount: fields.amount ?? "",
            autoRedirect: fields.autoRedirect,
            emailAddr: fields.emailAddr,
            mobileNum: fields.mobileNum,
            orderRefNum: orderRef ?? "",
            paymentMethod: fields.paymentMethod,
            postBackURL: fields.postBackURL ?? "",
            storeId: fields.storeId || credentials.storeId,
          },
          receivedHash,
          credentials,
        )
      : false;

    if (receivedHash && !hashOk) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        metadata: { provider: "EASYPAISA", reason: "invalid_hash" },
      });
      return {
        accepted: false,
        reason: "invalid_hash",
        redirectUrl: `${frontendBase()}/payments?callback=invalid`,
      };
    }

    const payment = orderRef
      ? await prisma.payment.findFirst({
          where: {
            OR: [
              { providerTxnId: orderRef },
              { paymentNumber: orderRef },
            ],
          },
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                total: true,
                paidAmount: true,
                paymentStatus: true,
              },
            },
          },
        })
      : null;

    if (!payment) {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
        metadata: { provider: "EASYPAISA", reason: "unknown_payment", orderRef },
      });
      return {
        accepted: false,
        reason: "unknown_payment",
        redirectUrl: `${frontendBase()}/payments?callback=unknown`,
      };
    }

    await logPaymentAuditEvent({
      action: PAYMENT_AUDIT_ACTIONS.CALLBACK_RECEIVED,
      resourceId: payment.id,
      metadata: sanitizeEasyPaisaFields(fields),
    });

    if (this.isTerminalSettled(payment.status)) {
      return {
        accepted: true,
        reason: "already_settled",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=paid`,
      };
    }

    const status = fields.status || fields.transactionStatus || fields.desc;
    if (isEasyPaisaPendingStatus(status)) {
      await paymentsRepository.update(payment.id, {
        status: "PENDING",
        providerMetadata: sanitizeEasyPaisaFields(fields),
      });
      await this.recalculateInvoice(payment.invoiceId);
      return {
        accepted: false,
        reason: "pending",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=pending`,
      };
    }
    if (isEasyPaisaCancelledStatus(status) || isEasyPaisaExpiredStatus(status)) {
      if (!hashOk) {
        await paymentsRepository.update(payment.id, {
          status: "PENDING_VERIFICATION",
          providerMetadata: sanitizeEasyPaisaFields(fields),
        });
        await this.recalculateInvoice(payment.invoiceId);
        return {
          accepted: false,
          reason: "unverified_callback",
          paymentId: payment.id,
          redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=pending`,
        };
      }
      const outcome = isEasyPaisaExpiredStatus(status) ? "EXPIRED" : "FAILED";
      const reason = isEasyPaisaExpiredStatus(status) ? "expired" : "cancelled";
      await paymentsRepository.update(payment.id, {
        status: outcome,
        failureReason: (status || reason).slice(0, 500),
        providerMetadata: sanitizeEasyPaisaFields(fields),
      });
      await this.recalculateInvoice(payment.invoiceId);
      await logPaymentAuditEvent({
        action:
          outcome === "EXPIRED"
            ? PAYMENT_AUDIT_ACTIONS.EXPIRED
            : PAYMENT_AUDIT_ACTIONS.FAILED,
        resourceId: payment.id,
        metadata: { status, reason },
      });
      return {
        accepted: false,
        reason,
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=${reason}`,
      };
    }
    if (!isEasyPaisaSuccessStatus(status) && !fields.auth_token) {
      if (!hashOk) {
        await paymentsRepository.update(payment.id, {
          status: "PENDING_VERIFICATION",
          providerMetadata: sanitizeEasyPaisaFields(fields),
        });
        await this.recalculateInvoice(payment.invoiceId);
        return {
          accepted: false,
          reason: "unverified_callback",
          paymentId: payment.id,
          redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=pending`,
        };
      }
      await paymentsRepository.update(payment.id, {
        status: "FAILED",
        failureReason: (status || "EasyPaisa declined").slice(0, 500),
        providerMetadata: sanitizeEasyPaisaFields(fields),
      });
      await this.recalculateInvoice(payment.invoiceId);
      return {
        accepted: false,
        reason: "declined",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=failed`,
      };
    }

    if (fields.auth_token && !isEasyPaisaSuccessStatus(status)) {
      await paymentsRepository.update(payment.id, {
        status: "PENDING_VERIFICATION",
        providerMetadata: sanitizeEasyPaisaFields(fields),
      });
      await this.recalculateInvoice(payment.invoiceId);
      return {
        accepted: false,
        reason: "handshake",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=pending`,
      };
    }

    if (fields.amount) {
      const expected = formatEasyPaisaAmount(Number(payment.amount));
      if (Number(fields.amount) !== Number(expected)) {
        await logPaymentAuditEvent({
          action: PAYMENT_AUDIT_ACTIONS.CALLBACK_REJECTED,
          resourceId: payment.id,
          metadata: {
            reason: "amount_mismatch",
            expected,
            received: fields.amount,
          },
        });
        return {
          accepted: false,
          reason: "amount_mismatch",
          paymentId: payment.id,
          redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=invalid`,
        };
      }
    }

    if (!receivedHash) {
      await paymentsRepository.update(payment.id, {
        status: "PENDING_VERIFICATION",
        providerMetadata: sanitizeEasyPaisaFields(fields),
      });
      await this.recalculateInvoice(payment.invoiceId);
      return {
        accepted: false,
        reason: "unverified_callback",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=pending`,
      };
    }

    if (payment.status === "VERIFIED" || payment.status === "PAID") {
      return {
        accepted: true,
        reason: "already_settled",
        paymentId: payment.id,
        redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=paid`,
      };
    }

    this.assertTransition(payment.status, "VERIFIED");
    await paymentsRepository.update(payment.id, {
      status: "VERIFIED",
      verifiedAt: new Date(),
      paidAt: new Date(),
      providerTxnId: fields.transactionId || payment.providerTxnId,
      providerMetadata: sanitizeEasyPaisaFields(fields),
    });
    const invoice = await this.recalculateInvoice(payment.invoiceId);
    await prisma.paymentWebhookEvent.update({
      where: { id: ledger.id },
      data: { accepted: true, paymentId: payment.id, reason: "verified" },
    });
    await logPaymentAuditEvent({
      action: PAYMENT_AUDIT_ACTIONS.VERIFIED,
      resourceId: payment.id,
      metadata: { provider: "EASYPAISA" },
    });
    if (invoice.paymentStatus === "PAID") {
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.INVOICE_PAID,
        resourceId: payment.invoiceId,
        metadata: { paymentId: payment.id, provider: "EASYPAISA" },
      });
    }
    return {
      accepted: true,
      reason: "verified",
      paymentId: payment.id,
      redirectUrl: `${frontendBase()}/payments/${payment.id}?callback=paid`,
    };
  }

  private async initiateHosted(
    input: InitiateProviderPaymentInput,
    actor: PaymentActor,
    method: "JAZZCASH" | "EASYPAISA",
  ): Promise<{ payment: PaymentDto; checkout: HostedCheckoutDto }> {
    this.assertClient(actor);
    await this.assertMethodEnabled(method);
    const invoice = await this.loadPayableInvoice(input.invoiceId, actor);
    if (invoice.currency.toUpperCase() !== "PKR") {
      throw new PaymentsError(
        `${method === "JAZZCASH" ? "JazzCash" : "EasyPaisa"} only accepts PKR invoices`,
        409,
        PAYMENTS_ERROR_CODES.CURRENCY_UNSUPPORTED,
      );
    }
    const remaining = await this.remainingAmount(invoice.id, Number(invoice.total));
    if (remaining <= 0) {
      throw new PaymentsError(
        "This invoice has no remaining balance",
        409,
        PAYMENTS_ERROR_CODES.INVOICE_NOT_PAYABLE,
      );
    }
    await this.assertNoInFlight(invoice.id);

    if (method === "JAZZCASH" && !getJazzCashCredentials()) {
      throw new PaymentsError(
        "JazzCash merchant credentials are not configured",
        503,
        PAYMENTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      );
    }
    if (method === "EASYPAISA" && !getEasyPaisaCredentials()) {
      throw new PaymentsError(
        "EasyPaisa merchant credentials are not configured",
        503,
        PAYMENTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      );
    }

    const paymentNumber = await paymentsRepository.nextPaymentNumber();
    const txnRef =
      method === "JAZZCASH"
        ? buildJazzCashTxnRef(paymentNumber)
        : paymentNumber;
    const created = await paymentsRepository.create({
      paymentNumber,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      quoteId: invoice.quoteId,
      paymentScheduleItemId: invoice.paymentScheduleItemId,
      method,
      amount: remaining,
      currency: invoice.currency,
      status: "INITIATED",
      providerTxnId: txnRef,
      submittedById: actor.userId,
      submittedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.recalculateInvoice(invoice.id);
    await logPaymentAuditEvent({
      userId: actor.userId,
      action: PAYMENT_AUDIT_ACTIONS.INITIATED,
      resourceId: created.id,
      metadata: { method, invoiceId: invoice.id, amount: remaining },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    const checkoutPath =
      method === "JAZZCASH"
        ? `/api/v1/payments/${created.id}/jazzcash/checkout`
        : `/api/v1/payments/${created.id}/easypaisa/checkout`;
    const built =
      method === "JAZZCASH"
        ? this.buildJazzCashCheckout(toPaymentDto(created))
        : this.buildEasyPaisaCheckout(toPaymentDto(created));

    return {
      payment: toPaymentDto(created),
      checkout: {
        paymentId: created.id,
        paymentNumber,
        provider: method,
        actionUrl: built.actionUrl,
        method: "POST",
        checkoutPath,
        configured: true,
      },
    };
  }

  private buildJazzCashCheckout(payment: PaymentDto): {
    actionUrl: string;
    fields: Record<string, string>;
  } {
    const credentials = getJazzCashCredentials();
    if (!credentials) {
      throw new PaymentsError(
        "JazzCash merchant credentials are not configured",
        503,
        PAYMENTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      );
    }
    return {
      actionUrl: jazzCashHostedUrl(credentials.sandbox),
      fields: buildJazzCashHostedFields({
        credentials,
        txnRefNo: payment.providerTxnId || buildJazzCashTxnRef(payment.paymentNumber),
        amount: payment.amount,
        billReference: payment.invoiceNumber || payment.paymentNumber,
        description: payment.invoiceNumber || payment.paymentNumber,
        returnUrl: `${publicApiBase()}/api/v1/payments/callbacks/jazzcash`,
      }),
    };
  }

  private buildEasyPaisaCheckout(payment: PaymentDto): {
    actionUrl: string;
    fields: Record<string, string>;
  } {
    const credentials = getEasyPaisaCredentials();
    if (!credentials) {
      throw new PaymentsError(
        "EasyPaisa merchant credentials are not configured",
        503,
        PAYMENTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      );
    }
    return {
      actionUrl: easyPaisaHostedUrl(credentials.sandbox),
      fields: buildEasyPaisaHostedFields({
        credentials,
        amount: payment.amount,
        orderRefNum: payment.paymentNumber,
        postBackURL: `${publicApiBase()}/api/v1/payments/callbacks/easypaisa`,
      }),
    };
  }

  private async loadPayableInvoice(invoiceId: string, actor: PaymentActor) {
    const invoice = await paymentsRepository.getInvoiceForPayment(invoiceId);
    if (!invoice) {
      throw new PaymentsError(
        "Invoice not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    if (isClient(actor)) {
      const companyId =
        actor.companyId ??
        (await paymentsRepository.getUserCompanyId(actor.userId));
      if (!companyId || invoice.clientId !== companyId) {
        throw new PaymentsError(
          "Invoice not found",
          404,
          PAYMENTS_ERROR_CODES.NOT_FOUND,
        );
      }
    }
    if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
      throw new PaymentsError(
        "This invoice cannot accept payments",
        409,
        PAYMENTS_ERROR_CODES.INVOICE_NOT_PAYABLE,
      );
    }
    if (invoice.paymentStatus === "PAID") {
      throw new PaymentsError(
        "This invoice is already paid",
        409,
        PAYMENTS_ERROR_CODES.INVOICE_NOT_PAYABLE,
      );
    }
    await this.assertInstallmentPayable(invoice);
    return invoice;
  }

  /**
   * First installment (advance / upfront) is payable after quote approve.
   * Later installments (final / milestone) become payable only when project is COMPLETED.
   */
  private async assertInstallmentPayable(invoice: {
    id: string;
    invoiceKind: string;
    projectId: string | null;
    project: { status: string } | null;
    paymentScheduleItem: { kind: string; sortOrder: number } | null;
  }): Promise<void> {
    const scheduleItem = invoice.paymentScheduleItem;
    const isFirst =
      scheduleItem?.sortOrder === 0 ||
      scheduleItem?.kind === "ADVANCE" ||
      invoice.invoiceKind === "ADVANCE";
    if (isFirst) {
      return;
    }

    const projectStatus =
      invoice.project?.status ??
      (invoice.projectId
        ? (
            await prisma.project.findFirst({
              where: { id: invoice.projectId },
              select: { status: true },
            })
          )?.status
        : null);

    if (projectStatus !== "COMPLETED") {
      throw new PaymentsError(
        "Final payment becomes available after the project is marked completed",
        409,
        PAYMENTS_ERROR_CODES.INVOICE_NOT_PAYABLE,
      );
    }
  }

  private async remainingAmount(invoiceId: string, total: number): Promise<number> {
    const totals = await paymentsRepository.settledAndRefunded(invoiceId);
    return roundMoney(Math.max(0, total - (totals.settled - totals.refunded)));
  }

  private assertPayableAmount(
    invoice: { id: string; total: unknown; paidAmount: unknown },
    requested: number,
  ): number {
    const remaining = roundMoney(
      Math.max(0, Number(invoice.total) - Number(invoice.paidAmount ?? 0)),
    );
    const amount = roundMoney(requested);
    if (amount <= 0) {
      throw new PaymentsError(
        "Payment amount must be greater than zero",
        400,
        PAYMENTS_ERROR_CODES.AMOUNT_INVALID,
      );
    }
    if (amount > remaining + 0.009) {
      throw new PaymentsError(
        "Payment amount cannot exceed the remaining invoice balance",
        400,
        PAYMENTS_ERROR_CODES.AMOUNT_INVALID,
      );
    }
    return amount;
  }

  private async assertNoInFlight(invoiceId: string): Promise<void> {
    await this.expireOverdueHosted();
    const existing = await paymentsRepository.findInFlight(invoiceId);
    if (existing) {
      throw new PaymentsError(
        "A payment is already in progress for this invoice",
        409,
        PAYMENTS_ERROR_CODES.IN_FLIGHT_EXISTS,
      );
    }
  }

  private async assertMethodEnabled(method: PakistanPaymentMethod): Promise<void> {
    const config = await paymentsRepository.getMethodConfig(method);
    if (!config?.enabled) {
      throw new PaymentsError(
        "This payment method is not available",
        409,
        PAYMENTS_ERROR_CODES.METHOD_DISABLED,
      );
    }
  }

  private async assertProofFile(fileId: string, actor: PaymentActor) {
    await filesService.assertManagedFileForAttachment(
      {
        userId: actor.userId,
        role: actor.role,
        email: actor.email,
        companyId: actor.companyId,
        permissions: [],
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      fileId,
    );
  }

  private async recalculateInvoice(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new PaymentsError(
        "Invoice not found",
        404,
        PAYMENTS_ERROR_CODES.NOT_FOUND,
      );
    }
    const totals = await paymentsRepository.settledAndRefunded(invoiceId);
    const paidAmount = roundMoney(Math.max(0, totals.settled - totals.refunded));
    const paymentStatus = invoicePaymentStatusFromTotals(
      Number(invoice.total),
      paidAmount,
      totals.hasInFlight,
      {
        hasRefunded: totals.hasRefunded,
        hasFailed: totals.hasFailed,
        hasExpired: totals.hasExpired,
      },
    );
    return paymentsRepository.applyInvoiceTotals(
      invoiceId,
      paidAmount,
      paymentStatus,
      paymentStatus === "PAID",
      invoice.status,
    );
  }

  private isTerminalSettled(status: PaymentExecutionStatusValue | string): boolean {
    return status === "VERIFIED" || status === "PAID" || status === "REFUNDED";
  }

  private async expireOverdueHosted(): Promise<void> {
    const overdue = await paymentsRepository.findOverdueHosted();
    const invoiceIds = new Set<string>();
    for (const row of overdue) {
      if (!canTransitionPaymentStatus(row.status, "EXPIRED")) continue;
      await paymentsRepository.update(row.id, {
        status: "EXPIRED",
        failureReason: "Hosted checkout expired",
      });
      invoiceIds.add(row.invoiceId);
      await logPaymentAuditEvent({
        action: PAYMENT_AUDIT_ACTIONS.EXPIRED,
        resourceId: row.id,
      });
    }
    for (const invoiceId of invoiceIds) {
      await this.recalculateInvoice(invoiceId);
    }
  }

  private assertTransition(
    from: PaymentExecutionStatusValue,
    to: PaymentExecutionStatusValue,
  ): void {
    if (!canTransitionPaymentStatus(from, to)) {
      throw new PaymentsError(
        `Cannot transition payment from ${from} to ${to}`,
        409,
        PAYMENTS_ERROR_CODES.INVALID_TRANSITION,
      );
    }
  }

  private assertAdmin(actor: PaymentActor): void {
    if (!isAdmin(actor)) {
      throw new PaymentsError(
        "Only administrators can perform this action",
        403,
        PAYMENTS_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private assertClient(actor: PaymentActor): void {
    if (!isClient(actor)) {
      throw new PaymentsError(
        "Only the customer can submit this payment",
        403,
        PAYMENTS_ERROR_CODES.FORBIDDEN,
      );
    }
  }

  private async isFirstInstallment(invoiceId: string): Promise<boolean> {
    const item = await prisma.paymentScheduleItem.findFirst({
      where: { invoice: { id: invoiceId } },
      select: { sortOrder: true, kind: true },
    });
    return item?.sortOrder === 0 || item?.kind === "ADVANCE";
  }

  /** Sum of unpaid schedule invoice balances for a quote (canonical remaining). */
  private async quoteOutstandingBalance(quoteId: string): Promise<number> {
    const invoices = await prisma.invoice.findMany({
      where: { quoteId, deletedAt: null, status: { not: "CANCELLED" } },
      select: { total: true, paidAmount: true },
    });
    return roundMoney(
      invoices.reduce(
        (sum, row) =>
          sum + Math.max(0, Number(row.total) - Number(row.paidAmount ?? 0)),
        0,
      ),
    );
  }

  private async startProjectIfAdvanceSettled(invoice: {
    id: string;
    projectId: string | null;
    invoiceKind: string;
    paymentStatus: string;
  }): Promise<void> {
    if (invoice.paymentStatus !== "PAID" || !invoice.projectId) return;
    const first = await this.isFirstInstallment(invoice.id);
    if (!first && invoice.invoiceKind !== "ADVANCE") return;
    await prisma.project.updateMany({
      where: { id: invoice.projectId, status: "NOT_STARTED" },
      data: { status: "IN_PROGRESS" },
    });
  }

  private notifyAdmins(
    title: string,
    body: string,
    paymentId: string,
    actorId: string,
  ): void {
    void notificationDispatcher.notify({
      title,
      body,
      category: NotificationCategory.INVOICE,
      priority: NotificationPriority.HIGH,
      linkUrl: `/payments/${paymentId}`,
      entityType: "Payment",
      entityId: paymentId,
      audience: { type: "ROLE", roleCode: "ADMIN" },
      createdById: actorId,
    });
  }

  private notifyCustomerUser(
    userId: string,
    title: string,
    body: string,
    paymentId: string,
    actorId: string,
  ): void {
    void notificationDispatcher.notify({
      title,
      body,
      category: NotificationCategory.INVOICE,
      priority: NotificationPriority.HIGH,
      linkUrl: `/payments/${paymentId}`,
      entityType: "Payment",
      entityId: paymentId,
      audience: { type: "INDIVIDUAL", userId },
      createdById: actorId,
    });
  }

  private async resolveScope(actor: PaymentActor): Promise<PaymentAccessScope> {
    if (
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.EMPLOYEE
    ) {
      return { all: true };
    }
    if (isClient(actor)) {
      const companyId =
        actor.companyId !== undefined
          ? actor.companyId
          : await paymentsRepository.getUserCompanyId(actor.userId);
      return { all: false, clientCompanyId: companyId ?? null };
    }
    return { all: false };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const paymentsService = new PaymentsService();
