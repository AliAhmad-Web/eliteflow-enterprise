import type { PrismaClient } from "../../../src/generated/client";

import { INVOICE_SEED_DATA } from "./data/invoices.data";
import { seedLog } from "./utils/logger";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateTotals(input: {
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  taxRate: number;
  discountAmount: string;
}) {
  const discountAmount = Math.max(0, Number(input.discountAmount) || 0);
  const items = input.items.map((item, index) => {
    const lineTotal = roundMoney(item.quantity * item.unitPrice);
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal,
      sortOrder: index,
    };
  });
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const cappedDiscount = roundMoney(Math.min(discountAmount, subtotal));
  const taxable = roundMoney(Math.max(0, subtotal - cappedDiscount));
  const taxAmount = roundMoney(taxable * (input.taxRate / 100));
  const total = roundMoney(taxable + taxAmount);

  return {
    items,
    subtotal,
    discountAmount: cappedDiscount,
    taxRate: input.taxRate,
    taxAmount,
    total,
  };
}

export async function seedInvoices(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding invoices...");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@eliteflow.dev" },
  });

  let index = 0;
  for (const invoice of INVOICE_SEED_DATA) {
    index += 1;
    const client = await prisma.client.findFirst({
      where: { email: invoice.clientEmail, deletedAt: null },
    });

    if (!client) {
      seedLog(`  ⚠ Client missing for invoice seed #${index}`);
      continue;
    }

    const project = invoice.projectName
      ? await prisma.project.findFirst({
          where: {
            name: invoice.projectName,
            clientId: client.id,
            deletedAt: null,
          },
        })
      : null;

    const totals = calculateTotals({
      items: invoice.items,
      taxRate: invoice.taxRate,
      discountAmount: invoice.discountAmount,
    });

    const year = new Date(invoice.issueDate).getFullYear();
    const invoiceNumber =
      invoice.invoiceNumber ?? `INV-${year}-${String(index).padStart(4, "0")}`;

    const existing = await prisma.invoice.findFirst({
      where: { invoiceNumber },
    });

    const itemCreates = totals.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      sortOrder: item.sortOrder,
    }));

    if (existing) {
      await prisma.$transaction(
        async (tx) => {
          await tx.invoiceItem.deleteMany({
            where: { invoiceId: existing.id },
          });
          await tx.invoicePaymentHistory.deleteMany({
            where: { invoiceId: existing.id },
          });

          await tx.invoice.update({
            where: { id: existing.id },
            data: {
              clientId: client.id,
              projectId: project?.id ?? null,
              status: invoice.status,
              issueDate: new Date(invoice.issueDate),
              dueDate: new Date(invoice.dueDate),
              currency: invoice.currency ?? "USD",
              taxRate: totals.taxRate,
              discountAmount: totals.discountAmount,
              subtotal: totals.subtotal,
              taxAmount: totals.taxAmount,
              total: totals.total,
              notes: invoice.notes ?? null,
              deletedAt: null,
              createdById: admin?.id ?? existing.createdById,
              updatedById: admin?.id ?? null,
              items: { create: itemCreates },
              paymentHistory: {
                create: {
                  status: invoice.status,
                  amount: invoice.status === "PAID" ? totals.total : null,
                  note: "Invoice seed refreshed",
                  actorId: admin?.id ?? null,
                },
              },
            },
          });
        },
        { timeout: 120_000, maxWait: 20_000 },
      );
      seedLog(`  ✓ Updated invoice ${invoiceNumber}`);
      continue;
    }

    await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: client.id,
        projectId: project?.id ?? null,
        status: invoice.status,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        currency: invoice.currency ?? "USD",
        taxRate: totals.taxRate,
        discountAmount: totals.discountAmount,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes: invoice.notes ?? null,
        createdById: admin?.id ?? null,
        updatedById: admin?.id ?? null,
        items: { create: itemCreates },
        paymentHistory: {
          create: {
            status: invoice.status,
            amount: invoice.status === "PAID" ? totals.total : null,
            note: "Invoice created from seed",
            actorId: admin?.id ?? null,
          },
        },
      },
    });
    seedLog(`  ✓ Created invoice ${invoiceNumber}`);
  }
}
