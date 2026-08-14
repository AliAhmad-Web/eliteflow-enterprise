import {
  Prisma,
  type InvoiceKind,
  type InvoiceStatus,
  type PaymentModel,
  type QuoteStatus,
  prisma,
} from "@enterprise/database";
import type {
  CalculatedScheduleItem,
  ListQuotesQueryInput,
} from "@enterprise/shared";

import type { QuoteWithRelations } from "./quotes.types.js";

const listInclude = {
  client: { select: { id: true, companyName: true } },
  project: { select: { id: true, name: true } },
  customerRequest: {
    select: {
      id: true,
      title: true,
      expectedBudget: true,
      agreedAmount: true,
      createdById: true,
    },
  },
} satisfies Prisma.QuoteInclude;

const detailInclude = {
  ...listInclude,
  items: true,
  paymentSchedule: {
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          paymentStatus: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.QuoteInclude;

const SORT_FIELD_MAP = {
  quoteNumber: "quoteNumber",
  status: "status",
  issueDate: "issueDate",
  expiryDate: "expiryDate",
  total: "total",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const satisfies Record<
  ListQuotesQueryInput["sortBy"],
  keyof Prisma.QuoteOrderByWithRelationInput
>;

export interface QuoteAccessScope {
  all: boolean;
  createdByRequestUserId?: string | null;
  clientCompanyId?: string | null;
}

export class QuotesRepository {
  async findMany(
    query: ListQuotesQueryInput,
    scope: QuoteAccessScope,
  ): Promise<{ items: QuoteWithRelations[]; total: number }> {
    const where = this.buildWhere(query, scope);
    const sortField = SORT_FIELD_MAP[query.sortBy];
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: detailInclude,
        orderBy: { [sortField]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return { items: items as QuoteWithRelations[], total };
  }

  async findById(
    id: string,
    scope: QuoteAccessScope,
  ): Promise<QuoteWithRelations | null> {
    const quote = await prisma.quote.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.scopeFilter(scope),
      },
      include: detailInclude,
    });
    return quote as QuoteWithRelations | null;
  }

  async nextQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;
    const latest = await prisma.quote.findFirst({
      where: { quoteNumber: { startsWith: prefix } },
      orderBy: { quoteNumber: "desc" },
      select: { quoteNumber: true },
    });

    let sequence = 1;
    if (latest?.quoteNumber) {
      const parsed = Number.parseInt(latest.quoteNumber.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, "0")}`;
  }

  async create(input: {
    clientId: string;
    projectId: string;
    customerRequestId: string | null;
    title: string;
    description: string | null;
    notes: string | null;
    paymentModel: PaymentModel;
    currency: string;
    taxRate: number;
    discountAmount: number;
    subtotal: number;
    taxAmount: number;
    total: number;
    issueDate: Date;
    expiryDate: Date;
    createdById: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      sortOrder: number;
    }>;
    schedule: CalculatedScheduleItem[];
  }): Promise<QuoteWithRelations> {
    const quoteNumber = await this.nextQuoteNumber();

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        title: input.title,
        description: input.description,
        notes: input.notes,
        clientId: input.clientId,
        projectId: input.projectId,
        customerRequestId: input.customerRequestId,
        status: "DRAFT",
        paymentModel: input.paymentModel,
        currency: input.currency,
        taxRate: input.taxRate,
        discountAmount: input.discountAmount,
        subtotal: input.subtotal,
        taxAmount: input.taxAmount,
        total: input.total,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        createdById: input.createdById,
        updatedById: input.createdById,
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
          })),
        },
        paymentSchedule: {
          create: input.schedule.map((item) => ({
            kind: item.kind,
            label: item.label,
            percent: item.percent,
            amount: item.amount,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: detailInclude,
    });

    return quote as QuoteWithRelations;
  }

  async updateDraft(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      notes?: string | null;
      paymentModel?: PaymentModel;
      currency?: string;
      taxRate?: number;
      discountAmount?: number;
      subtotal?: number;
      taxAmount?: number;
      total?: number;
      issueDate?: Date;
      expiryDate?: Date;
      updatedById: string;
      items?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        sortOrder: number;
      }>;
      schedule?: CalculatedScheduleItem[];
    },
  ): Promise<QuoteWithRelations> {
    await prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          notes: input.notes,
          paymentModel: input.paymentModel,
          currency: input.currency,
          taxRate: input.taxRate,
          discountAmount: input.discountAmount,
          subtotal: input.subtotal,
          taxAmount: input.taxAmount,
          total: input.total,
          issueDate: input.issueDate,
          expiryDate: input.expiryDate,
          updatedById: input.updatedById,
        },
      });

      if (input.items) {
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });
        await tx.quoteItem.createMany({
          data: input.items.map((item) => ({
            quoteId: id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
          })),
        });
      }

      if (input.schedule) {
        await tx.paymentScheduleItem.deleteMany({ where: { quoteId: id } });
        await tx.paymentScheduleItem.createMany({
          data: input.schedule.map((item) => ({
            quoteId: id,
            kind: item.kind,
            label: item.label,
            percent: item.percent,
            amount: item.amount,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            sortOrder: item.sortOrder,
          })),
        });
      }
    });

    return (await this.findById(id, { all: true }))!;
  }

  async updateStatus(
    id: string,
    data: {
      status: QuoteStatus;
      sentAt?: Date | null;
      approvedAt?: Date | null;
      approvedById?: string | null;
      rejectedAt?: Date | null;
      rejectedById?: string | null;
      rejectionReason?: string | null;
      cancelledAt?: Date | null;
      updatedById: string;
    },
  ): Promise<QuoteWithRelations> {
    const quote = await prisma.quote.update({
      where: { id },
      data,
      include: detailInclude,
    });
    return quote as QuoteWithRelations;
  }

  async syncRequestAgreedAmount(
    customerRequestId: string,
    agreedAmount: number,
  ): Promise<void> {
    await prisma.customerRequest.update({
      where: { id: customerRequestId },
      data: { agreedAmount },
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
      const parsed = Number.parseInt(latest.invoiceNumber.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) sequence = parsed + 1;
    }
    return `${prefix}${String(sequence).padStart(4, "0")}`;
  }

  async createInvoicesForSchedule(input: {
    quote: QuoteWithRelations;
    scheduleItemIds: string[];
    actorId: string;
  }): Promise<QuoteWithRelations> {
    const items = (input.quote.paymentSchedule ?? []).filter((item) =>
      input.scheduleItemIds.includes(item.id),
    );

    let invoiceNumber = await this.nextInvoiceNumber();

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.invoice && item.invoice.deletedAt == null) {
          continue;
        }
        const issueDate = new Date();
        const dueDate = item.dueDate ?? addDays(issueDate, 14);
        const kind = toInvoiceKind(item.kind);
        const amount = Number(item.amount);

        await tx.invoice.create({
          data: {
            invoiceNumber,
            clientId: input.quote.clientId,
            projectId: input.quote.projectId,
            quoteId: input.quote.id,
            paymentScheduleItemId: item.id,
            invoiceKind: kind,
            status: "DRAFT" satisfies InvoiceStatus,
            paymentStatus: "UNPAID",
            issueDate,
            dueDate,
            currency: input.quote.currency,
            taxRate: 0,
            discountAmount: 0,
            subtotal: amount,
            taxAmount: 0,
            total: amount,
            notes: item.label,
            createdById: input.actorId,
            updatedById: input.actorId,
            items: {
              create: {
                description: item.label,
                quantity: 1,
                unitPrice: amount,
                lineTotal: amount,
                sortOrder: 0,
              },
            },
            paymentHistory: {
              create: {
                status: "DRAFT",
                amount: null,
                note: `Generated from quote ${input.quote.quoteNumber}`,
                actorId: input.actorId,
              },
            },
          },
        });
        invoiceNumber = incrementDocumentNumber(invoiceNumber);
      }
    });

    return (await this.findById(input.quote.id, { all: true }))!;
  }

  async findCustomerRequest(id: string) {
    return prisma.customerRequest.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        clientId: true,
        createdById: true,
        status: true,
        title: true,
        description: true,
        expectedBudget: true,
        agreedAmount: true,
        currency: true,
        convertedProjectId: true,
        targetProjectId: true,
      },
    });
  }

  async findProject(id: string) {
    return prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        clientId: true,
      },
    });
  }

  private buildWhere(
    query: ListQuotesQueryInput,
    scope: QuoteAccessScope,
  ): Prisma.QuoteWhereInput {
    const where: Prisma.QuoteWhereInput = {
      deletedAt: null,
      ...this.scopeFilter(scope),
    };

    if (query.status) where.status = query.status;
    if (query.customerRequestId) where.customerRequestId = query.customerRequestId;
    if (query.projectId) where.projectId = query.projectId;

    if (query.search) {
      const term = query.search;
      where.OR = [
        { quoteNumber: { contains: term, mode: "insensitive" } },
        { title: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
        { client: { companyName: { contains: term, mode: "insensitive" } } },
        { project: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    return where;
  }

  private scopeFilter(scope: QuoteAccessScope): Prisma.QuoteWhereInput {
    if (scope.all) return {};

    const clauses: Prisma.QuoteWhereInput[] = [];
    if (scope.clientCompanyId) {
      clauses.push({ clientId: scope.clientCompanyId });
    }
    if (scope.createdByRequestUserId) {
      clauses.push({
        customerRequest: { createdById: scope.createdByRequestUserId },
      });
    }

    if (clauses.length === 0) {
      return { id: "00000000-0000-0000-0000-000000000000" };
    }
    if (clauses.length === 1) return clauses[0]!;
    return { OR: clauses };
  }
}

function incrementDocumentNumber(value: string): string {
  const match = value.match(/^(.*-)(\d+)$/);
  if (!match) return value;
  const next = Number.parseInt(match[2]!, 10) + 1;
  return `${match[1]}${String(next).padStart(match[2]!.length, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toInvoiceKind(
  kind: CalculatedScheduleItem["kind"] | string,
): InvoiceKind {
  if (kind === "ADVANCE") return "ADVANCE";
  if (kind === "FINAL") return "FINAL";
  return "MILESTONE";
}

export const quotesRepository = new QuotesRepository();
