import type {
  Invoice,
  PaymentScheduleItem,
  Prisma,
  Quote,
  QuoteItem,
} from "@enterprise/database";
import type { QuoteDto } from "@enterprise/shared";

export type QuoteWithRelations = Quote & {
  client: { id: string; companyName: string };
  project: { id: string; name: string };
  customerRequest: {
    id: string;
    title: string;
    expectedBudget: Prisma.Decimal | null;
    agreedAmount: Prisma.Decimal | null;
    createdById: string;
  } | null;
  items?: QuoteItem[];
  paymentSchedule?: (PaymentScheduleItem & {
    invoice: Pick<
      Invoice,
      "id" | "invoiceNumber" | "status" | "paymentStatus" | "deletedAt"
    > | null;
  })[];
};

function toDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function toMoney(value: Prisma.Decimal): number {
  return Number(value);
}

export function toQuoteDto(quote: QuoteWithRelations): QuoteDto {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    description: quote.description,
    notes: quote.notes,
    clientId: quote.clientId,
    clientName: quote.client.companyName,
    customerRequestId: quote.customerRequestId,
    customerRequestTitle: quote.customerRequest?.title ?? null,
    requestedBudget:
      quote.customerRequest?.expectedBudget != null
        ? Number(quote.customerRequest.expectedBudget)
        : null,
    projectId: quote.projectId,
    projectName: quote.project.name,
    status: quote.status,
    paymentModel: quote.paymentModel,
    currency: quote.currency,
    taxRate: toMoney(quote.taxRate),
    discountAmount: toMoney(quote.discountAmount),
    subtotal: toMoney(quote.subtotal),
    taxAmount: toMoney(quote.taxAmount),
    total: toMoney(quote.total),
    issueDate: toDateOnly(quote.issueDate) ?? "",
    expiryDate: toDateOnly(quote.expiryDate) ?? "",
    sentAt: quote.sentAt?.toISOString() ?? null,
    approvedAt: quote.approvedAt?.toISOString() ?? null,
    rejectedAt: quote.rejectedAt?.toISOString() ?? null,
    rejectionReason: quote.rejectionReason,
    createdById: quote.createdById,
    updatedById: quote.updatedById,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    items: (quote.items ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: toMoney(item.quantity),
        unitPrice: toMoney(item.unitPrice),
        lineTotal: toMoney(item.lineTotal),
        sortOrder: item.sortOrder,
      })),
    paymentSchedule: (quote.paymentSchedule ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const invoice =
          item.invoice && item.invoice.deletedAt == null ? item.invoice : null;
        return {
          id: item.id,
          kind: item.kind,
          label: item.label,
          percent: toMoney(item.percent),
          amount: toMoney(item.amount),
          dueDate: toDateOnly(item.dueDate),
          sortOrder: item.sortOrder,
          invoiceId: invoice?.id ?? null,
          invoiceNumber: invoice?.invoiceNumber ?? null,
          invoiceStatus: invoice?.status ?? null,
          paymentStatus: invoice?.paymentStatus ?? null,
        };
      }),
  };
}
