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
import { FILES_ERROR_CODES, FilesError } from "../src/modules/files/files.errors.js";
import { filesService } from "../src/modules/files/files.service.js";
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
import {
  PROJECTS_ERROR_CODES,
  ProjectsError,
} from "../src/modules/projects/projects.errors.js";
import { projectsService } from "../src/modules/projects/projects.service.js";
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

async function waitForNotification(title: string, entityId?: string) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const row = await prisma.notification.findFirst({
      where: { title, ...(entityId ? { entityId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    if (row) return row;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for notification: ${title}`);
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
      await prisma.notification.deleteMany({
        where: { entityId: { in: paymentIds } },
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
  if (userIds.length) {
    await prisma.notification.deleteMany({
      where: { OR: [{ userId: { in: userIds } }, { createdById: { in: userIds } }] },
    });
    await prisma.managedFile.deleteMany({
      where: { createdById: { in: userIds } },
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

  await runAdvanceUnlockFlow(admin);
  await cleanup();
  console.log(
    "[deal-flow] PASS $1500 requested → $1800 deal → $540 proof → verify unlocks $1260 remaining",
  );
}

async function runAdvanceUnlockFlow(admin: {
  userId: string;
  email: string;
  role: string;
}) {
  const clientRole = await authRepository.getDefaultClientRole();
  const user = await authRepository.createUser({
    email: email("adv"),
    passwordHash: null,
    firstName: "Advance",
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

  const stranger = await authRepository.createUser({
    email: email("other"),
    passwordHash: null,
    firstName: "Other",
    lastName: "Customer",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  await ensurePortalCompanyLink(stranger.id, { userId: stranger.id });
  const strangerLinked = await prisma.user.findUniqueOrThrow({
    where: { id: stranger.id },
    select: { id: true, email: true, companyId: true },
  });
  const otherClient = {
    userId: strangerLinked.id,
    email: strangerLinked.email,
    companyId: strangerLinked.companyId!,
    role: UserRole.CLIENT,
  };

  const request = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Advance unlock ${RUN_ID}`,
      description: "Requested at 1500",
      requirements: "Build",
      preferredDeadline: "2030-06-01",
      expectedBudget: "1500",
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
    { agreedAmount: "1800", staffNotes: "Final deal 1800" },
    admin,
  );
  assert.equal(approvedRequest.agreedAmount, 1800);
  assert.notEqual(approvedRequest.agreedAmount, approvedRequest.expectedBudget);

  const quote = await quotesService.create(
    {
      customerRequestId: request.id,
      title: approvedRequest.title,
      issueDate: today(),
      expiryDate: plusDays(14),
      currency: "USD",
      dealAmount: "1800",
      paymentModel: "SPLIT_30_70",
      allowedPaymentModels: ["SPLIT_30_70", "SPLIT_35_65", "SPLIT_40_60"],
    },
    admin,
  );
  assert.equal(quote.total, 1800);
  assert.equal(quote.advanceRequired, 540);
  await quotesService.send(quote.id, admin);
  const sent = await quotesService.getById(quote.id, client);
  assert.equal(sent.commercialStage, "DEAL_APPROVED");
  assert.equal(sent.workspaceUnlocked, false);

  const accepted = await quotesService.approve(quote.id, client);
  assert.equal(accepted.commercialStage, "ADVANCE_REQUIRED");
  assert.equal(accepted.advanceRequired, 540);
  assert.equal(accepted.remainingAmount, 1800);
  assert.equal(accepted.workspaceUnlocked, false);

  const listed = await projectsService.list(
    { search: "", sortBy: "createdAt", sortOrder: "desc", page: 1, limit: 10 },
    client,
  );
  assert.equal(listed.pagination.total, 0);

  try {
    await projectsService.getById(accepted.projectId, client);
    assert.fail("customer must not open the project before advance verification");
  } catch (error) {
    assert.ok(error instanceof ProjectsError);
    assert.equal(error.code, PROJECTS_ERROR_CODES.NOT_FOUND);
  }

  const advance = accepted.paymentSchedule.find((item) => item.kind === "ADVANCE");
  assert.ok(advance?.invoiceId);
  const invoice = await invoicesService.getById(advance.invoiceId!, client);
  assert.equal(invoice.total, 540);

  const proof = await prisma.managedFile.create({
    data: {
      name: `advance-proof-${RUN_ID}.png`,
      originalName: `advance-proof-${RUN_ID}.png`,
      mimeType: "image/png",
      extension: "png",
      sizeBytes: BigInt(256),
      category: "IMAGE",
      storageKey: `test-proofs/${RUN_ID}/advance.png`,
      storageProvider: "local",
      tags: ["payment-proof"],
      createdById: client.userId,
      clientId: client.companyId,
    },
  });

  const submitted = await paymentsService.submitBankTransfer(
    {
      invoiceId: invoice.id,
      amount: 540,
      customerReference: `TXN-${RUN_ID}`,
      paidAt: today(),
      proofFileId: proof.id,
    },
    client,
  );
  assert.equal(submitted.status, "PENDING_VERIFICATION");
  assert.equal(submitted.customerReference, `TXN-${RUN_ID}`);
  assert.equal(submitted.proofFileId, proof.id);

  const pendingQuote = await quotesService.getById(quote.id, client);
  assert.ok(
    pendingQuote.commercialStage === "PAYMENT_PROOF_SUBMITTED" ||
      pendingQuote.commercialStage === "PENDING_VERIFICATION",
  );
  assert.equal(pendingQuote.workspaceUnlocked, false);
  assert.equal(pendingQuote.paidAmount, 0);

  const adminView = await paymentsService.getById(submitted.id, admin);
  assert.equal(adminView.customerReference, `TXN-${RUN_ID}`);
  assert.equal(adminView.proofFileId, proof.id);
  assert.equal(adminView.amount, 540);

  const proofMeta = await filesService.getFile(proof.id, {
    userId: admin.userId,
    email: admin.email,
    role: admin.role,
    permissions: ["*"],
    companyId: null,
  });
  assert.equal(proofMeta.id, proof.id);

  const adminNotice = await waitForNotification(
    "Advance payment requires verification",
    submitted.id,
  );
  assert.equal(adminNotice.entityId, submitted.id);

  try {
    await paymentsService.verify(submitted.id, { notes: "self" }, client);
    assert.fail("customer must not verify their own payment");
  } catch (error) {
    assert.ok(error instanceof PaymentsError);
    assert.equal(error.code, PAYMENTS_ERROR_CODES.FORBIDDEN);
  }

  try {
    await paymentsService.getById(submitted.id, otherClient);
    assert.fail("cross-customer payment access must be blocked");
  } catch (error) {
    assert.ok(error instanceof PaymentsError);
    assert.equal(error.code, PAYMENTS_ERROR_CODES.NOT_FOUND);
  }

  try {
    await filesService.getFile(proof.id, {
      userId: otherClient.userId,
      email: otherClient.email,
      role: otherClient.role,
      permissions: [],
      companyId: otherClient.companyId,
    });
    assert.fail("cross-customer proof access must be blocked");
  } catch (error) {
    assert.ok(error instanceof FilesError);
    assert.ok(
      error.code === FILES_ERROR_CODES.FORBIDDEN ||
        error.code === FILES_ERROR_CODES.NOT_FOUND,
    );
  }

  await paymentsService.reject(
    submitted.id,
    { reason: "Amount not received in the bank account" },
    admin,
  );
  const afterReject = await quotesService.getById(quote.id, client);
  assert.equal(afterReject.workspaceUnlocked, false);
  const rejectedProject = await prisma.project.findUniqueOrThrow({
    where: { id: accepted.projectId },
    select: { status: true },
  });
  assert.equal(rejectedProject.status, "NOT_STARTED");
  await waitForNotification("Payment rejected", submitted.id);

  const resubmitted = await paymentsService.submitBankTransfer(
    {
      invoiceId: invoice.id,
      amount: 540,
      customerReference: `TXN2-${RUN_ID}`,
      paidAt: today(),
      proofFileId: proof.id,
    },
    client,
  );
  assert.equal(resubmitted.status, "PENDING_VERIFICATION");
  assert.notEqual(resubmitted.id, submitted.id);

  const verified = await paymentsService.verify(
    resubmitted.id,
    { notes: "Advance received in bank" },
    admin,
  );
  assert.ok(verified.status === "VERIFIED" || verified.status === "PAID");

  const after = await quotesService.getById(quote.id, client);
  assert.equal(after.dealAmount, 1800);
  assert.equal(after.paidAmount, 540);
  assert.equal(after.remainingAmount, 1260);
  assert.equal(after.workspaceUnlocked, true);
  assert.ok(
    after.commercialStage === "PAYMENT_VERIFIED" ||
      after.commercialStage === "PROJECT_STARTED",
  );

  const paidInvoice = await invoicesService.getById(invoice.id, admin);
  assert.equal(paidInvoice.paymentStatus, "PAID");
  assert.equal(paidInvoice.paidAmount, 540);

  const started = await prisma.project.findUniqueOrThrow({
    where: { id: accepted.projectId },
    select: { status: true },
  });
  assert.equal(started.status, "IN_PROGRESS");

  const unlockedList = await projectsService.list(
    { search: "", sortBy: "createdAt", sortOrder: "desc", page: 1, limit: 10 },
    client,
  );
  assert.ok(unlockedList.pagination.total >= 1);
  const opened = await projectsService.getById(accepted.projectId, client);
  assert.equal(opened.status, "IN_PROGRESS");

  const customerNotice = await waitForNotification(
    "Advance Payment Received",
    resubmitted.id,
  );
  assert.match(
    customerNotice.body,
    /Your payment has been verified successfully\. Your project is now ready to start\./,
  );
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
