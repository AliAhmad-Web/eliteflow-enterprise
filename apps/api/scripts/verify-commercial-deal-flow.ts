/**
 * Commercial source-of-truth: $500 requested budget must never become the
 * live deal after a $1,000 final agreement. Covers quote, invoice, advance,
 * payment submit/verify.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-commercial-deal-flow.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma, UserStatus } from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";
import { customerRequestsService } from "../src/modules/customer-requests/customer-requests.service.js";
import {
  INVOICES_ERROR_CODES,
  InvoicesError,
} from "../src/modules/invoices/invoices.errors.js";
import { invoicesService } from "../src/modules/invoices/invoices.service.js";
import {
  PAYMENTS_ERROR_CODES,
  PaymentsError,
} from "../src/modules/payments/payments.errors.js";
import { paymentsService } from "../src/modules/payments/payments.service.js";
import { quotesService } from "../src/modules/quotes/quotes.service.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.deal.${RUN_ID}`;

function email(local: string) {
  return `${PREFIX}.${local}@eliteflow.test`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true, companyId: true },
  });
  const userIds = users.map((u) => u.id);
  const companyIds = [
    ...new Set(users.map((u) => u.companyId).filter(Boolean) as string[]),
  ];
  const quotes = await prisma.quote.findMany({
    where: {
      OR: [{ createdById: { in: userIds } }, { clientId: { in: companyIds } }],
    },
    select: { id: true, projectId: true },
  });
  const quoteIds = quotes.map((q) => q.id);
  if (quoteIds.length) {
    const quotePayments = await prisma.payment.findMany({
      where: { quoteId: { in: quoteIds } },
      select: { id: true },
    });
    const paymentIds = quotePayments.map((item) => item.id);
    if (paymentIds.length) {
      await prisma.paymentWebhookEvent.deleteMany({
        where: { paymentId: { in: paymentIds } },
      });
      await prisma.paymentRefund.deleteMany({
        where: { paymentId: { in: paymentIds } },
      });
      await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    }
    await prisma.invoice.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await prisma.paymentScheduleItem.deleteMany({
      where: { quoteId: { in: quoteIds } },
    });
    await prisma.quoteItem.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
  }

  const requests = await prisma.customerRequest.findMany({
    where: {
      OR: [
        { createdById: { in: userIds } },
        { clientId: { in: companyIds } },
      ],
    },
    select: { id: true, convertedProjectId: true, convertedTaskId: true },
  });
  const projectIds = [
    ...new Set(
      [
        ...quotes.map((q) => q.projectId),
        ...requests.map((r) => r.convertedProjectId),
      ].filter(Boolean) as string[],
    ),
  ];
  if (projectIds.length) {
    await prisma.invoice.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.projectAttachment.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.projectMilestone.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }
  await prisma.customerRequestAttachment.deleteMany({
    where: { requestId: { in: requests.map((r) => r.id) } },
  });
  await prisma.customerRequest.deleteMany({
    where: { id: { in: requests.map((r) => r.id) } },
  });
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: { companyId: null },
    });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  if (companyIds.length) {
    await prisma.client.deleteMany({ where: { id: { in: companyIds } } });
  }
}

async function main() {
  console.log(`[deal-flow] RUN_ID=${RUN_ID}`);
  await cleanup();

  const clientRole = await authRepository.getDefaultClientRole();
  const user = await authRepository.createUser({
    email: email("cust"),
    passwordHash: null,
    firstName: "Deal",
    lastName: "Customer",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  await ensurePortalCompanyLink(user.id, { userId: user.id });
  const linked = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { id: true, email: true, companyId: true },
  });
  const client = {
    userId: linked.id,
    email: linked.email,
    companyId: linked.companyId!,
    role: UserRole.CLIENT,
  };
  const adminRow = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      role: { code: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
    },
    select: { id: true, email: true, role: { select: { code: true } } },
    orderBy: { createdAt: "asc" },
  });
  assert.ok(adminRow, "Need an admin");
  const admin = {
    userId: adminRow.id,
    email: adminRow.email,
    role: adminRow.role.code,
  };

  const request = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Deal flow ${RUN_ID}`,
      description: "Requested at 500",
      requirements: "Build",
      preferredDeadline: "2030-06-01",
      expectedBudget: "500",
      currency: "USD",
      priority: "MEDIUM",
      additionalNotes: null,
      submit: true,
    },
    client,
  );
  await customerRequestsService.startReview(
    request.id,
    { staffNotes: "Reviewing" },
    admin,
  );
  const approvedRequest = await customerRequestsService.approve(
    request.id,
    { agreedAmount: "1000", staffNotes: "Final deal 1000" },
    admin,
  );
  assert.equal(approvedRequest.expectedBudget, 500);
  assert.equal(approvedRequest.agreedAmount, 1000);
  assert.equal(approvedRequest.commercialAmount, 1000);

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: approvedRequest.convertedProjectId! },
    select: { budget: true },
  });
  assert.equal(Number(project.budget), 1000);

  const quote = await quotesService.create(
    {
      customerRequestId: request.id,
      title: approvedRequest.title,
      issueDate: today(),
      expiryDate: plusDays(14),
      currency: "USD",
      dealAmount: "1000",
      paymentModel: "SPLIT_30_70",
      allowedPaymentModels: ["SPLIT_30_70", "SPLIT_35_65", "SPLIT_40_60"],
    },
    admin,
  );
  assert.equal(quote.total, 1000);
  assert.equal(quote.requestedBudget, 500);
  assert.equal(quote.advanceRequired, 300);

  await quotesService.send(quote.id, admin);
  const accepted = await quotesService.approve(quote.id, client);
  assert.equal(accepted.status, "APPROVED");
  assert.equal(accepted.dealAmount, 1000);
  assert.equal(accepted.advanceRequired, 300);
  assert.equal(accepted.remainingAmount, 1000);
  assert.notEqual(accepted.dealAmount, accepted.requestedBudget);

  const advance = accepted.paymentSchedule.find((item) => item.kind === "ADVANCE");
  assert.ok(advance?.invoiceId);
  const invoice = await invoicesService.getById(advance.invoiceId!, client);
  assert.equal(invoice.total, 300);
  assert.equal(invoice.status, "SENT");

  try {
    await invoicesService.update(
      invoice.id,
      { status: "PAID" as never },
      client,
    );
    assert.fail("client must not mark PAID");
  } catch (error) {
    assert.ok(error instanceof InvoicesError);
    assert.equal(error.code, INVOICES_ERROR_CODES.FORBIDDEN);
  }

  const submitted = await paymentsService.submitBankTransfer(
    {
      invoiceId: invoice.id,
      amount: 300,
      customerReference: `ADV-${RUN_ID}`,
      paidAt: today(),
    },
    client,
  );
  assert.equal(submitted.status, "PENDING_VERIFICATION");
  const pendingQuote = await quotesService.getById(quote.id, client);
  assert.equal(pendingQuote.paidAmount, 0);
  assert.equal(pendingQuote.remainingAmount, 1000);

  await paymentsService.verify(submitted.id, { notes: "Advance received" }, admin);
  const after = await quotesService.getById(quote.id, client);
  assert.equal(after.dealAmount, 1000);
  assert.equal(after.paidAmount, 300);
  assert.equal(after.remainingAmount, 700);
  assert.equal(after.overallPaymentStatus, "PARTIALLY_PAID");
  assert.equal(after.requestedBudget, 500);

  const paidInvoice = await invoicesService.getById(invoice.id, admin);
  assert.equal(paidInvoice.paymentStatus, "PAID");
  assert.equal(paidInvoice.paidAmount, 300);

  try {
    await paymentsService.submitBankTransfer(
      {
        invoiceId: invoice.id,
        amount: 300,
        customerReference: `DUP-${RUN_ID}`,
        paidAt: today(),
      },
      client,
    );
    assert.fail("should not pay a fully paid advance again");
  } catch (error) {
    assert.ok(error instanceof PaymentsError);
    assert.ok(
      error.code === PAYMENTS_ERROR_CODES.INVOICE_NOT_PAYABLE ||
        error.code === PAYMENTS_ERROR_CODES.AMOUNT_INVALID,
    );
  }

  await cleanup();
  console.log("[deal-flow] PASS $500 requested → $1000 deal → $300 advance verified");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch(() => undefined);
    await prisma.$disconnect();
  });
