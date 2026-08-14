import type {
  Invoice,
  InvoiceItem,
  InvoicePaymentHistory,
  User,
} from "@enterprise/database";
import type { InvoiceDto } from "@enterprise/shared";
import { Prisma } from "@enterprise/database";

type InvoiceWithRelations = Invoice & {
  client: { id: string; companyName: string };
  project: { id: string; name: string } | null;
  quote?: { id: string; quoteNumber: string } | null;
  items?: InvoiceItem[];
  paymentHistory?: (InvoicePaymentHistory & {
    actor: Pick<User, "id" | "firstName" | "lastName"> | null;
  })[];
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toMoney(value: Prisma.Decimal): number {
  return Number(value);
}

export function toInvoiceDto(invoice: InvoiceWithRelations): InvoiceDto {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    clientName: invoice.client.companyName,
    projectId: invoice.projectId,
    projectName: invoice.project?.name ?? null,
    quoteId: invoice.quoteId,
    quoteNumber: invoice.quote?.quoteNumber ?? null,
    paymentScheduleItemId: invoice.paymentScheduleItemId,
    invoiceKind: invoice.invoiceKind,
    status: invoice.status,
    paymentStatus: invoice.paymentStatus,
    issueDate: toDateOnly(invoice.issueDate),
    dueDate: toDateOnly(invoice.dueDate),
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    currency: invoice.currency,
    taxRate: toMoney(invoice.taxRate),
    discountAmount: toMoney(invoice.discountAmount),
    subtotal: toMoney(invoice.subtotal),
    taxAmount: toMoney(invoice.taxAmount),
    total: toMoney(invoice.total),
    paidAmount: toMoney(invoice.paidAmount),
    remainingAmount: Math.max(
      0,
      Math.round((toMoney(invoice.total) - toMoney(invoice.paidAmount)) * 100) /
        100,
    ),
    notes: invoice.notes,
    createdById: invoice.createdById,
    updatedById: invoice.updatedById,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    items: (invoice.items ?? [])
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
    paymentHistory: invoice.paymentHistory
      ?.slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .map((entry) => ({
        id: entry.id,
        status: entry.status,
        amount: entry.amount != null ? toMoney(entry.amount) : null,
        note: entry.note,
        actorId: entry.actorId,
        actorFirstName: entry.actor?.firstName ?? null,
        actorLastName: entry.actor?.lastName ?? null,
        createdAt: entry.createdAt.toISOString(),
      })),
  };
}

export type { InvoiceWithRelations };
