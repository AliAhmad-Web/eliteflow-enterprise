/**
 * Phase 3 verification: quotes, deal amount, payment schedules, invoices, IDOR/RBAC.
 *
 * Run from repo root (with DATABASE_URL):
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-quotes-phase3.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma, UserStatus } from "@enterprise/database";
import {
  UserRole,
  calculatePaymentSchedule,
} from "@enterprise/shared";

import { ROLE_PERMISSION_MAP } from "../../../packages/database/prisma/seed/data/role-permissions.data.js";
import { authRepository } from "../src/modules/auth/auth.repository.js";
import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";
import { customerRequestsService } from "../src/modules/customer-requests/customer-requests.service.js";
import { InvoicesError, INVOICES_ERROR_CODES } from "../src/modules/invoices/invoices.errors.js";
import { invoicesService } from "../src/modules/invoices/invoices.service.js";
import { QUOTES_ERROR_CODES, QuotesError } from "../src/modules/quotes/quotes.errors.js";
import { quotesService } from "../src/modules/quotes/quotes.service.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.p3.quote.${RUN_ID}`;

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
      OR: [
        { createdById: { in: userIds } },
        { clientId: { in: companyIds } },
      ],
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
  const taskIds = [
    ...new Set(requests.map((r) => r.convertedTaskId).filter(Boolean) as string[]),
  ];

  if (taskIds.length) {
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  }
  if (projectIds.length) {
    await prisma.invoice.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.quote.deleteMany({ where: { projectId: { in: projectIds } } });
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

async function createClientUser(local: string) {
  const clientRole = await authRepository.getDefaultClientRole();
  const user = await authRepository.createUser({
    email: email(local),
    passwordHash: null,
    firstName: "Verify",
    lastName: local,
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  await ensurePortalCompanyLink(user.id, { userId: user.id });
  const linked = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { id: true, email: true, companyId: true },
  });
  assert.ok(linked.companyId, "client should be linked");
  return {
    userId: linked.id,
    email: linked.email,
    companyId: linked.companyId!,
    role: UserRole.CLIENT,
  };
}

async function getAdminActor() {
  const admin = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      role: { code: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
    },
    select: {
      id: true,
      email: true,
      role: { select: { code: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  assert.ok(admin, "Need at least one ADMIN/SUPER_ADMIN in DB");
  return {
    userId: admin.id,
    email: admin.email,
    role: admin.role.code,
  };
}

async function expectError(
  fn: () => Promise<unknown>,
  code: string,
  label: string,
) {
  try {
    await fn();
    assert.fail(`${label}: expected error ${code}`);
  } catch (error) {
    const actual =
      error instanceof QuotesError || error instanceof InvoicesError
        ? error.code
        : null;
    assert.equal(actual, code, `${label}: wrong code (${String(actual)})`);
  }
}

async function main() {
  console.log(`[phase3] RUN_ID=${RUN_ID}`);
  await cleanup();

  const clientPerms = ROLE_PERMISSION_MAP.CLIENT;
  assert.ok(clientPerms.includes("quotes:read"));
  assert.ok(clientPerms.includes("quotes:approve"));
  assert.ok(!clientPerms.includes("quotes:write"));
  assert.ok(!clientPerms.includes("invoices:write"));
  console.log("[phase3] RBAC map OK");

  const split = calculatePaymentSchedule({
    dealAmount: 1000,
    paymentModel: "SPLIT_30_70",
  });
  assert.equal(split[0]?.amount, 300);
  assert.equal(split[1]?.amount, 700);

  const custom = calculatePaymentSchedule({
    dealAmount: 1000,
    paymentModel: "CUSTOM",
    customItems: [
      { kind: "ADVANCE", label: "Advance", percent: 30 },
      { kind: "MILESTONE", label: "Milestone 1", amount: 250 },
      { kind: "MILESTONE", label: "Milestone 2", amount: 250 },
      { kind: "FINAL", label: "Final", amount: 200 },
    ],
  });
  assert.deepEqual(
    custom.map((item) => item.amount),
    [300, 250, 250, 200],
  );
  console.log("[phase3] payment model calculations OK");

  const clientA = await createClientUser("a");
  const clientB = await createClientUser("b");
  const admin = await getAdminActor();

  const draft = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Phase3 Quote ${RUN_ID}`,
      description: "Portal build",
      requirements: "Auth and billing",
      preferredDeadline: "2030-01-15",
      expectedBudget: "550",
      currency: "USD",
      priority: "HIGH",
      additionalNotes: null,
      submit: true,
    },
    clientA,
  );

  await customerRequestsService.startReview(
    draft.id,
    { staffNotes: "Reviewing" },
    admin,
  );
  const approved = await customerRequestsService.approve(
    draft.id,
    { agreedAmount: "800", staffNotes: "Accepted" },
    admin,
  );
  assert.equal(approved.expectedBudget, 550);
  assert.equal(approved.agreedAmount, 800);
  assert.ok(approved.convertedProjectId, "approval should convert to a project");
  const projectId = approved.convertedProjectId!;

  const quote = await quotesService.create(
    {
      customerRequestId: draft.id,
      title: approved.title,
      issueDate: today(),
      expiryDate: plusDays(14),
      currency: "USD",
      dealAmount: "1000",
      paymentModel: "SPLIT_30_70",
    },
    admin,
  );
  assert.equal(quote.projectId, projectId);
  assert.equal(quote.total, 1000);
  assert.equal(quote.requestedBudget, 550);
  assert.equal(quote.status, "DRAFT");
  assert.equal(quote.paymentSchedule.length, 2);
  assert.equal(quote.paymentSchedule[0]?.amount, 300);
  assert.equal(quote.paymentSchedule[1]?.amount, 700);
  console.log("[phase3] quote creation + project relationship OK");

  const visible = await quotesService.getById(quote.id, clientA);
  assert.equal(visible.id, quote.id);
  assert.equal(visible.total, 1000);

  await expectError(
    () => quotesService.getById(quote.id, clientB),
    QUOTES_ERROR_CODES.NOT_FOUND,
    "client B IDOR quote get",
  );
  await expectError(
    () =>
      quotesService.create(
        {
          customerRequestId: draft.id,
          title: "Spoof",
          issueDate: today(),
          expiryDate: plusDays(14),
          dealAmount: "1",
          paymentModel: "UPFRONT_100",
        },
        clientA,
      ),
    QUOTES_ERROR_CODES.FORBIDDEN,
    "client cannot create quote",
  );
  console.log("[phase3] quote IDOR + RBAC OK");

  const sent = await quotesService.send(quote.id, admin);
  assert.equal(sent.status, "SENT");

  await expectError(
    () => quotesService.approve(quote.id, clientB),
    QUOTES_ERROR_CODES.NOT_FOUND,
    "client B cannot approve A's quote",
  );
  await expectError(
    () => quotesService.approve(quote.id, admin),
    QUOTES_ERROR_CODES.FORBIDDEN,
    "admin cannot customer-approve",
  );

  const accepted = await quotesService.approve(quote.id, clientA);
  assert.equal(accepted.status, "APPROVED");
  assert.equal(accepted.total, 1000);

  const refreshed = await customerRequestsService.getById(draft.id, admin);
  assert.equal(refreshed.expectedBudget, 550);
  assert.equal(refreshed.agreedAmount, 1000);
  assert.equal(refreshed.commercialAmount, 1000);
  console.log("[phase3] approval + agreed amount integrity OK");

  await expectError(
    () =>
      quotesService.update(
        quote.id,
        { dealAmount: "50" },
        admin,
      ),
    QUOTES_ERROR_CODES.INVALID_TRANSITION,
    "approved quote amount locked",
  );

  const invoiced = await quotesService.generateInvoices(quote.id, {}, admin);
  assert.equal(invoiced.paymentSchedule.filter((item) => item.invoiceId).length, 2);
  const advance = invoiced.paymentSchedule[0]!;
  const finalItem = invoiced.paymentSchedule[1]!;
  assert.ok(advance.invoiceId);
  assert.ok(finalItem.invoiceId);

  const advanceInvoice = await invoicesService.getById(advance.invoiceId!, admin);
  assert.equal(advanceInvoice.quoteId, quote.id);
  assert.equal(advanceInvoice.projectId, projectId);
  assert.equal(advanceInvoice.invoiceKind, "ADVANCE");
  assert.equal(advanceInvoice.paymentStatus, "UNPAID");
  assert.equal(advanceInvoice.total, 300);
  assert.equal(advanceInvoice.status, "DRAFT");

  const clientAdvance = await invoicesService.getById(
    advance.invoiceId!,
    clientA,
  );
  assert.equal(clientAdvance.id, advanceInvoice.id);
  await expectError(
    () => invoicesService.getById(advance.invoiceId!, clientB),
    INVOICES_ERROR_CODES.NOT_FOUND,
    "client B IDOR invoice get",
  );

  await expectError(
    () =>
      invoicesService.update(
        advanceInvoice.id,
        { status: "PAID" as never },
        clientA,
      ),
    INVOICES_ERROR_CODES.FORBIDDEN,
    "customer cannot mark PAID",
  );
  await expectError(
    () =>
      invoicesService.update(
        advanceInvoice.id,
        { status: "PAID" as never },
        admin,
      ),
    INVOICES_ERROR_CODES.FORBIDDEN,
    "frontend/admin cannot mark PAID",
  );

  const issued = await invoicesService.issue(advanceInvoice.id, admin);
  assert.equal(issued.status, "SENT");
  assert.equal(issued.paymentStatus, "UNPAID");
  console.log("[phase3] invoice generation + PAID lock OK");

  const customQuote = await quotesService.create(
    {
      projectId,
      title: `Custom schedule ${RUN_ID}`,
      issueDate: today(),
      expiryDate: plusDays(21),
      currency: "USD",
      dealAmount: "1000",
      paymentModel: "CUSTOM",
      schedule: [
        { kind: "ADVANCE", label: "Advance", percent: 30 },
        { kind: "MILESTONE", label: "Milestone 1", amount: 250 },
        { kind: "MILESTONE", label: "Milestone 2", amount: 250 },
        { kind: "FINAL", label: "Final", amount: 200 },
      ],
    },
    admin,
  );
  assert.deepEqual(
    customQuote.paymentSchedule.map((item) => item.amount),
    [300, 250, 250, 200],
  );
  assert.equal(customQuote.projectId, projectId);
  console.log("[phase3] custom 30/25/25/20 schedule OK");

  await cleanup();
  console.log("[phase3] PASS");
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
