import {
  Prisma,
  type PakistanPaymentMethod,
  type PaymentExecutionStatus,
  prisma,
} from "@enterprise/database";
import type { ListPaymentsQueryInput } from "@enterprise/shared";
import {
  IN_FLIGHT_PAYMENT_STATUSES,
  PAYMENT_SETTLED_STATUSES,
} from "@enterprise/shared";

import type { PaymentWithRelations } from "./payments.types.js";

const listInclude = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      paidAmount: true,
      paymentStatus: true,
    },
  },
  client: { select: { id: true, companyName: true } },
  project: { select: { id: true, name: true } },
  quote: { select: { id: true, quoteNumber: true } },
} satisfies Prisma.PaymentInclude;

const detailInclude = {
  ...listInclude,
  verifiedBy: { select: { id: true, firstName: true, lastName: true } },
  refunds: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.PaymentInclude;

export interface PaymentAccessScope {
  all: boolean;
  clientCompanyId?: string | null;
}

export class PaymentsRepository {
  async findMany(
    query: ListPaymentsQueryInput,
    scope: PaymentAccessScope,
  ): Promise<{ items: PaymentWithRelations[]; total: number }> {
    const where = this.buildWhere(query, scope);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: listInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.payment.count({ where }),
    ]);
    return { items: items as PaymentWithRelations[], total };
  }

  async findById(
    id: string,
    scope: PaymentAccessScope,
  ): Promise<PaymentWithRelations | null> {
    const payment = await prisma.payment.findFirst({
      where: { id, ...this.scopeFilter(scope) },
      include: detailInclude,
    });
    return payment as PaymentWithRelations | null;
  }

  async findByProviderTxn(
    providerTxnId: string,
  ): Promise<PaymentWithRelations | null> {
    const payment = await prisma.payment.findUnique({
      where: { providerTxnId },
      include: detailInclude,
    });
    return payment as PaymentWithRelations | null;
  }

  async findOverdueHosted() {
    return prisma.payment.findMany({
      where: {
        status: { in: ["INITIATED", "PENDING"] },
        expiresAt: { lte: new Date() },
      },
      select: { id: true, invoiceId: true, status: true },
    });
  }

  async findInFlight(invoiceId: string) {
    return prisma.payment.findFirst({
      where: {
        invoiceId,
        status: { in: [...IN_FLIGHT_PAYMENT_STATUSES] },
      },
    });
  }

  async nextPaymentNumber(): Promise<string> {
    return this.nextNumber("PAY", async (prefix) => {
      const latest = await prisma.payment.findFirst({
        where: { paymentNumber: { startsWith: prefix } },
        orderBy: { paymentNumber: "desc" },
        select: { paymentNumber: true },
      });
      return latest?.paymentNumber ?? null;
    });
  }

  async nextRefundNumber(): Promise<string> {
    return this.nextNumber("REF", async (prefix) => {
      const latest = await prisma.paymentRefund.findFirst({
        where: { refundNumber: { startsWith: prefix } },
        orderBy: { refundNumber: "desc" },
        select: { refundNumber: true },
      });
      return latest?.refundNumber ?? null;
    });
  }

  async create(data: Prisma.PaymentUncheckedCreateInput) {
    return prisma.payment.create({
      data,
      include: detailInclude,
    }) as Promise<PaymentWithRelations>;
  }

  async update(
    id: string,
    data: Prisma.PaymentUncheckedUpdateInput,
  ): Promise<PaymentWithRelations> {
    return prisma.payment.update({
      where: { id },
      data,
      include: detailInclude,
    }) as Promise<PaymentWithRelations>;
  }

  async listMethodConfigs() {
    return prisma.paymentMethodConfig.findMany({
      orderBy: { method: "asc" },
    });
  }

  async getMethodConfig(method: PakistanPaymentMethod) {
    return prisma.paymentMethodConfig.findUnique({ where: { method } });
  }

  async upsertMethodConfig(
    method: PakistanPaymentMethod,
    data: Prisma.PaymentMethodConfigUncheckedUpdateInput,
    actorId: string,
  ) {
    return prisma.paymentMethodConfig.update({
      where: { method },
      data: { ...data, updatedById: actorId },
    });
  }

  async getInvoiceForPayment(invoiceId: string) {
    return prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      include: {
        client: { select: { id: true, companyName: true } },
        project: { select: { id: true, name: true } },
        quote: { select: { id: true, quoteNumber: true } },
      },
    });
  }

  async settledAndRefunded(invoiceId: string): Promise<{
    settled: number;
    refunded: number;
    hasInFlight: boolean;
    hasFailed: boolean;
    hasExpired: boolean;
    hasRefunded: boolean;
  }> {
    const [settledAgg, refundAgg, inFlight, failed, expired, refundedPayments, completedRefunds] =
      await Promise.all([
      prisma.payment.aggregate({
        where: {
          invoiceId,
          status: { in: [...PAYMENT_SETTLED_STATUSES] },
        },
        _sum: { amount: true },
      }),
      prisma.paymentRefund.aggregate({
        where: {
          status: "COMPLETED",
          payment: {
            invoiceId,
            status: { in: [...PAYMENT_SETTLED_STATUSES] },
          },
        },
        _sum: { amount: true },
      }),
      prisma.payment.count({
        where: {
          invoiceId,
          status: { in: [...IN_FLIGHT_PAYMENT_STATUSES] },
        },
      }),
      prisma.payment.count({
        where: { invoiceId, status: "FAILED" },
      }),
      prisma.payment.count({
        where: { invoiceId, status: "EXPIRED" },
      }),
      prisma.payment.count({
        where: { invoiceId, status: "REFUNDED" },
      }),
      prisma.paymentRefund.count({
        where: { status: "COMPLETED", payment: { invoiceId } },
      }),
    ]);
    return {
      settled: Number(settledAgg._sum.amount ?? 0),
      refunded: Number(refundAgg._sum.amount ?? 0),
      hasInFlight: inFlight > 0,
      hasFailed: failed > 0,
      hasExpired: expired > 0,
      hasRefunded: refundedPayments > 0 || completedRefunds > 0,
    };
  }

  async applyInvoiceTotals(
    invoiceId: string,
    paidAmount: number,
    paymentStatus:
      | "UNPAID"
      | "PENDING"
      | "PARTIALLY_PAID"
      | "PAID"
      | "FAILED"
      | "EXPIRED"
      | "REFUNDED",
    markCommercialPaid: boolean,
    currentCommercialStatus: string,
  ) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount,
        paymentStatus,
        ...(markCommercialPaid
          ? { status: "PAID" as const }
          : currentCommercialStatus === "PAID"
            ? { status: "SENT" as const }
            : {}),
      },
    });
  }

  async recordWebhookEvent(input: {
    provider: PakistanPaymentMethod;
    eventKey: string;
    paymentId?: string | null;
    accepted: boolean;
    reason?: string;
    payloadHash?: string;
  }) {
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { eventKey: input.eventKey },
    });
    if (existing) {
      return null;
    }
    try {
      return await prisma.paymentWebhookEvent.create({
        data: {
          provider: input.provider,
          eventKey: input.eventKey,
          paymentId: input.paymentId ?? null,
          accepted: input.accepted,
          reason: input.reason ?? null,
          payloadHash: input.payloadHash ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return null;
      }
      throw error;
    }
  }

  async getUserCompanyId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    return user?.companyId ?? null;
  }

  private async nextNumber(
    prefixCode: string,
    latest: (prefix: string) => Promise<string | null>,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${prefixCode}-${year}-`;
    const current = await latest(prefix);
    let sequence = 1;
    if (current) {
      const parsed = Number.parseInt(current.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) sequence = parsed + 1;
    }
    return `${prefix}${String(sequence).padStart(4, "0")}`;
  }

  private buildWhere(
    query: ListPaymentsQueryInput,
    scope: PaymentAccessScope,
  ): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {
      ...this.scopeFilter(scope),
    };
    if (query.status) where.status = query.status as PaymentExecutionStatus;
    if (query.method) where.method = query.method;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.quoteId) where.quoteId = query.quoteId;
    if (query.search) {
      where.OR = [
        { paymentNumber: { contains: query.search, mode: "insensitive" } },
        { customerReference: { contains: query.search, mode: "insensitive" } },
        { providerTxnId: { contains: query.search, mode: "insensitive" } },
        { invoice: { invoiceNumber: { contains: query.search, mode: "insensitive" } } },
        { client: { companyName: { contains: query.search, mode: "insensitive" } } },
      ];
    }
    return where;
  }

  private scopeFilter(scope: PaymentAccessScope): Prisma.PaymentWhereInput {
    if (scope.all) return {};
    if (scope.clientCompanyId) {
      return { clientId: scope.clientCompanyId };
    }
    return { id: "00000000-0000-0000-0000-000000000000" };
  }
}

export const paymentsRepository = new PaymentsRepository();
