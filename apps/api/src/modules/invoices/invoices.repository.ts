import {
  Prisma,
  type InvoiceStatus,
  prisma,
} from "@enterprise/database";
import {
  calculateInvoiceTotals,
  type CreateInvoiceInput,
  type ListInvoicesQueryInput,
  type UpdateInvoiceInput,
} from "@enterprise/shared";

import type { InvoiceWithRelations } from "./invoices.types.js";

const listInclude = {
  client: { select: { id: true, companyName: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.InvoiceInclude;

const detailInclude = {
  ...listInclude,
  items: true,
  paymentHistory: {
    include: {
      actor: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.InvoiceInclude;

const SORT_FIELD_MAP = {
  invoiceNumber: "invoiceNumber",
  status: "status",
  issueDate: "issueDate",
  dueDate: "dueDate",
  total: "total",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const satisfies Record<
  ListInvoicesQueryInput["sortBy"],
  keyof Prisma.InvoiceOrderByWithRelationInput
>;

function emptyToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.trim().length === 0 ? null : value.trim();
}

function parseDate(value: string): Date {
  return new Date(value);
}

export interface InvoiceAccessScope {
  all: boolean;
  clientCompanyId?: string | null;
}

export class InvoicesRepository {
  async findMany(
    query: ListInvoicesQueryInput,
    scope: InvoiceAccessScope,
  ): Promise<{ items: InvoiceWithRelations[]; total: number }> {
    const where = this.buildWhere(query, scope);
    const sortField = SORT_FIELD_MAP[query.sortBy];
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: listInclude,
        orderBy: { [sortField]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items: items as InvoiceWithRelations[], total };
  }

  async findById(
    id: string,
    scope: InvoiceAccessScope,
  ): Promise<InvoiceWithRelations | null> {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.scopeFilter(scope),
      },
      include: detailInclude,
    });

    return invoice as InvoiceWithRelations | null;
  }

  async create(
    input: CreateInvoiceInput,
    actorId: string | null,
  ): Promise<InvoiceWithRelations> {
    const totals = calculateInvoiceTotals({
      items: input.items,
      taxRate: input.taxRate,
      discountAmount: input.discountAmount,
    });
    const invoiceNumber = await this.nextInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: input.clientId,
        projectId: emptyToNull(input.projectId),
        status: input.status as InvoiceStatus,
        issueDate: parseDate(input.issueDate),
        dueDate: parseDate(input.dueDate),
        currency: input.currency || "USD",
        taxRate: totals.taxRate,
        discountAmount: totals.discountAmount,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes: emptyToNull(input.notes) ?? null,
        createdById: actorId,
        updatedById: actorId,
        items: {
          create: totals.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
          })),
        },
        paymentHistory: {
          create: {
            status: input.status as InvoiceStatus,
            amount: input.status === "PAID" ? totals.total : null,
            note: "Invoice created",
            actorId,
          },
        },
      },
      include: detailInclude,
    });

    return invoice as InvoiceWithRelations;
  }

  async update(
    id: string,
    input: UpdateInvoiceInput,
    actorId: string | null,
    previousStatus: InvoiceStatus,
  ): Promise<InvoiceWithRelations> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findFirstOrThrow({
        where: { id },
        include: { items: true },
      });

      const nextItems =
        input.items ??
        existing.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          sortOrder: item.sortOrder,
        }));

      const nextTaxRate =
        input.taxRate !== undefined ? input.taxRate : Number(existing.taxRate);
      const nextDiscount =
        input.discountAmount !== undefined
          ? input.discountAmount
          : String(existing.discountAmount);

      const totals = calculateInvoiceTotals({
        items: nextItems,
        taxRate: nextTaxRate,
        discountAmount: nextDiscount,
      });

      const nextStatus = (input.status ?? existing.status) as InvoiceStatus;

      const data: Prisma.InvoiceUpdateInput = {
        updatedBy: actorId ? { connect: { id: actorId } } : undefined,
        taxRate: totals.taxRate,
        discountAmount: totals.discountAmount,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
      };

      if (input.clientId !== undefined) {
        data.client = { connect: { id: input.clientId } };
      }
      if (input.projectId !== undefined) {
        data.project = emptyToNull(input.projectId)
          ? { connect: { id: input.projectId } }
          : { disconnect: true };
      }
      if (input.status !== undefined) {
        data.status = nextStatus;
      }
      if (input.issueDate !== undefined) {
        data.issueDate = parseDate(input.issueDate);
      }
      if (input.dueDate !== undefined) {
        data.dueDate = parseDate(input.dueDate);
      }
      if (input.currency !== undefined) {
        data.currency = input.currency;
      }
      if (input.notes !== undefined) {
        data.notes = emptyToNull(input.notes) ?? null;
      }

      await tx.invoice.update({ where: { id }, data });

      if (input.items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceItem.createMany({
          data: totals.items.map((item) => ({
            invoiceId: id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
          })),
        });
      }

      if (nextStatus !== previousStatus) {
        await tx.invoicePaymentHistory.create({
          data: {
            invoiceId: id,
            status: nextStatus,
            amount: nextStatus === "PAID" ? totals.total : null,
            note: `Status changed from ${previousStatus} to ${nextStatus}`,
            actorId,
          },
        });
      } else if (input.items || input.taxRate !== undefined || input.discountAmount !== undefined) {
        await tx.invoicePaymentHistory.create({
          data: {
            invoiceId: id,
            status: nextStatus,
            amount: null,
            note: "Invoice amounts updated",
            actorId,
          },
        });
      }
    });

    const updated = await prisma.invoice.findFirstOrThrow({
      where: { id },
      include: detailInclude,
    });

    return updated as InvoiceWithRelations;
  }

  async softDelete(id: string, actorId: string | null): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: actorId,
        },
      });

      await tx.invoicePaymentHistory.create({
        data: {
          invoiceId: id,
          status: "CANCELLED",
          note: "Invoice soft-deleted",
          actorId,
        },
      });
    });
  }

  async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latest = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });

    let sequence = 1;
    if (latest?.invoiceNumber) {
      const raw = latest.invoiceNumber.slice(prefix.length);
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, "0")}`;
  }

  async clientExists(clientId: string): Promise<boolean> {
    const count = await prisma.client.count({
      where: { id: clientId, deletedAt: null },
    });
    return count > 0;
  }

  async projectExists(projectId: string, clientId?: string): Promise<boolean> {
    const count = await prisma.project.count({
      where: {
        id: projectId,
        deletedAt: null,
        ...(clientId ? { clientId } : {}),
      },
    });
    return count > 0;
  }

  async getUserCompanyId(userId: string): Promise<string | null> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { companyId: true },
    });
    return user?.companyId ?? null;
  }

  async getStats(scope: InvoiceAccessScope): Promise<{
    total: number;
    draft: number;
    sent: number;
    pending: number;
    paid: number;
    overdue: number;
    cancelled: number;
    totalRevenue: number;
    outstandingAmount: number;
    paidAmount: number;
  }> {
    const base = {
      deletedAt: null as Date | null,
      ...this.scopeFilter(scope),
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total,
      draft,
      sent,
      pending,
      paid,
      overdue,
      cancelled,
      paidAgg,
      outstandingAgg,
      allAgg,
    ] = await Promise.all([
      prisma.invoice.count({ where: base }),
      prisma.invoice.count({ where: { ...base, status: "DRAFT" } }),
      prisma.invoice.count({ where: { ...base, status: "SENT" } }),
      prisma.invoice.count({ where: { ...base, status: "PENDING" } }),
      prisma.invoice.count({ where: { ...base, status: "PAID" } }),
      prisma.invoice.count({
        where: {
          ...base,
          OR: [
            { status: "OVERDUE" },
            {
              status: { in: ["SENT", "PENDING"] },
              dueDate: { lt: today },
            },
          ],
        },
      }),
      prisma.invoice.count({ where: { ...base, status: "CANCELLED" } }),
      prisma.invoice.aggregate({
        where: { ...base, status: "PAID" },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...base,
          status: { in: ["SENT", "PENDING", "OVERDUE"] },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { ...base, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
    ]);

    return {
      total,
      draft,
      sent,
      pending,
      paid,
      overdue,
      cancelled,
      totalRevenue: Number(allAgg._sum.total ?? 0),
      outstandingAmount: Number(outstandingAgg._sum.total ?? 0),
      paidAmount: Number(paidAgg._sum.total ?? 0),
    };
  }

  private buildWhere(
    query: ListInvoicesQueryInput,
    scope: InvoiceAccessScope,
  ): Prisma.InvoiceWhereInput {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...this.scopeFilter(scope),
    };

    if (query.status) {
      where.status = query.status as InvoiceStatus;
    }
    if (query.clientId) {
      where.clientId = query.clientId;
    }
    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.search) {
      const term = query.search;
      where.OR = [
        { invoiceNumber: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
        { client: { companyName: { contains: term, mode: "insensitive" } } },
        { project: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    return where;
  }

  private scopeFilter(scope: InvoiceAccessScope): Prisma.InvoiceWhereInput {
    if (scope.all) {
      return {};
    }

    if (scope.clientCompanyId) {
      return { clientId: scope.clientCompanyId };
    }

    return { id: "00000000-0000-0000-0000-000000000000" };
  }
}

export const invoicesRepository = new InvoicesRepository();
