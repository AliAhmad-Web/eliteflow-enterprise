/**
 * Phase 4 verification: Pakistan payments (Bank Transfer, JazzCash, EasyPaisa).
 *
 * Run from repo root (with DATABASE_URL):
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-payments-phase4.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma, UserStatus } from "@enterprise/database";
import {
  UserRole,
  canTransitionPaymentStatus,
  JAZZCASH_QR_IMAGE_PATH,
  EASYPAISA_QR_IMAGE_PATH,
} from "@enterprise/shared";

import { ROLE_PERMISSION_MAP } from "../../../packages/database/prisma/seed/data/role-permissions.data.js";
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
import {
  buildEasyPaisaMerchantHash,
} from "../src/modules/payments/providers/easypaisa.js";
import {
  buildJazzCashHostedFields,
  buildJazzCashSecureHash,
  getJazzCashCredentials,
} from "../src/modules/payments/providers/jazzcash.js";
import { quotesService } from "../src/modules/quotes/quotes.service.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.p4.pay.${RUN_ID}`;

process.env.JAZZCASH_MERCHANT_ID ||= "TESTMERCHANT";
process.env.JAZZCASH_PASSWORD ||= "TESTPASSWORD";
process.env.JAZZCASH_INTEGRITY_SALT ||= "TESTINTEGRITYSALT";
process.env.JAZZCASH_SANDBOX ||= "true";
process.env.EASYPAISA_STORE_ID ||= "12345";
process.env.EASYPAISA_HASH_KEY ||= "test-easypaisa-key";
process.env.EASYPAISA_HASH_ALGO ||= "hmac-sha256";
process.env.EASYPAISA_SANDBOX ||= "true";
process.env.APP_URL ||= "https://eliteflow-api.vercel.app";

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
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { submittedById: { in: userIds } },
        { clientId: { in: companyIds } },
        { quoteId: { in: quoteIds } },
      ],
    },
    select: { id: true },
  });
  const paymentIds = payments.map((p) => p.id);
  if (paymentIds.length) {
    await prisma.paymentWebhookEvent.deleteMany({
      where: { paymentId: { in: paymentIds } },
    });
    await prisma.paymentRefund.deleteMany({
      where: { paymentId: { in: paymentIds } },
    });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  }
  if (quoteIds.length) {
    await prisma.invoice.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await prisma.paymentScheduleItem.deleteMany({
      where: { quoteId: { in: quoteIds } },
    });
    await prisma.quoteItem.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
  }
  const requests = await prisma.customerRequest.findMany({
    where: {
      OR: [{ createdById: { in: userIds } }, { clientId: { in: companyIds } }],
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
    await prisma.payment.deleteMany({ where: { projectId: { in: projectIds } } });
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
    select: { id: true, email: true, role: { select: { code: true } } },
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
      error instanceof PaymentsError ||
      error instanceof InvoicesError
        ? error.code
        : null;
    assert.equal(actual, code, `${label}: wrong code (${String(actual)})`);
  }
}

async function issueAdvanceInvoice(
  client: Awaited<ReturnType<typeof createClientUser>>,
  admin: Awaited<ReturnType<typeof getAdminActor>>,
  currency: string,
) {
  const draft = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Phase4 ${currency} ${RUN_ID}`,
      description: "Payment verification",
      requirements: "Pay",
      preferredDeadline: "2030-01-15",
      expectedBudget: "550",
      currency,
      priority: "HIGH",
      additionalNotes: null,
      submit: true,
    },
    client,
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
  const quote = await quotesService.create(
    {
      customerRequestId: draft.id,
      title: approved.title,
      issueDate: today(),
      expiryDate: plusDays(14),
      currency,
      dealAmount: "1000",
      paymentModel: "SPLIT_30_70",
    },
    admin,
  );
  await quotesService.send(quote.id, admin);
  await quotesService.approve(quote.id, client);
  const invoiced = await quotesService.generateInvoices(quote.id, {}, admin);
  const invoiceId = invoiced.paymentSchedule[0]?.invoiceId;
  assert.ok(invoiceId);
  const issued = await invoicesService.issue(invoiceId, admin);
  return {
    quote,
    invoice: issued,
    projectId: quote.projectId,
    requestId: draft.id,
  };
}

async function main() {
  console.log(`[phase4] RUN_ID=${RUN_ID}`);
  await cleanup();

  assert.ok(ROLE_PERMISSION_MAP.CLIENT.includes("payments:pay"));
  assert.ok(!ROLE_PERMISSION_MAP.CLIENT.includes("payments:verify"));
  assert.ok(ROLE_PERMISSION_MAP.ADMIN.includes("payments:verify"));
  assert.equal(canTransitionPaymentStatus("PENDING_VERIFICATION", "VERIFIED"), true);
  assert.equal(canTransitionPaymentStatus("INITIATED", "PAID"), true);
  console.log("[phase4] RBAC + state machine OK");

  const clientA = await createClientUser("a");
  const clientB = await createClientUser("b");
  const admin = await getAdminActor();

  const usd = await issueAdvanceInvoice(clientA, admin, "USD");
  assert.equal(usd.invoice.total, 300);
  assert.equal(usd.invoice.paymentStatus, "UNPAID");

  await expectError(
    () =>
      paymentsService.initiateJazzCash({ invoiceId: usd.invoice.id }, clientA),
    PAYMENTS_ERROR_CODES.CURRENCY_UNSUPPORTED,
    "JazzCash hosted checkout rejects USD invoices",
  );

  await expectError(
    () =>
      invoicesService.update(
        usd.invoice.id,
        { status: "PAID" as never },
        clientA,
      ),
    INVOICES_ERROR_CODES.FORBIDDEN,
    "customer cannot mark invoice PAID",
  );

  await expectError(
    () =>
      paymentsService.submitBankTransfer(
        {
          invoiceId: usd.invoice.id,
          amount: 9999,
          customerReference: `TAMPER-${RUN_ID}`,
          paidAt: today(),
        },
        clientA,
      ),
    PAYMENTS_ERROR_CODES.AMOUNT_INVALID,
    "amount tampering denied",
  );

  const partial = await paymentsService.submitBankTransfer(
    {
      invoiceId: usd.invoice.id,
      amount: 100,
      customerReference: `BANK-PARTIAL-${RUN_ID}`,
      paidAt: today(),
      notes: "First installment",
    },
    clientA,
  );
  assert.equal(partial.status, "PENDING_VERIFICATION");
  assert.equal(partial.quoteId, usd.quote.id);
  assert.equal(partial.projectId, usd.projectId);
  assert.equal(partial.invoiceId, usd.invoice.id);

  await expectError(
    () =>
      paymentsService.submitBankTransfer(
        {
          invoiceId: usd.invoice.id,
          amount: 50,
          customerReference: `BANK-DUP-${RUN_ID}`,
          paidAt: today(),
        },
        clientA,
      ),
    PAYMENTS_ERROR_CODES.IN_FLIGHT_EXISTS,
    "duplicate in-flight denied",
  );

  await expectError(
    () => paymentsService.getById(partial.id, clientB),
    PAYMENTS_ERROR_CODES.NOT_FOUND,
    "client B IDOR payment get",
  );
  await expectError(
    () => paymentsService.verify(partial.id, {}, clientA),
    PAYMENTS_ERROR_CODES.FORBIDDEN,
    "customer cannot verify payment",
  );

  const verifiedPartial = await paymentsService.verify(
    partial.id,
    { notes: "Partial received" },
    admin,
  );
  assert.equal(verifiedPartial.status, "VERIFIED");
  const afterPartial = await invoicesService.getById(usd.invoice.id, admin);
  assert.equal(afterPartial.paymentStatus, "PARTIALLY_PAID");
  assert.equal(afterPartial.paidAmount, 100);
  assert.equal(afterPartial.remainingAmount, 200);
  console.log("[phase4] bank transfer partial + IDOR/RBAC OK");

  const rest = await paymentsService.submitBankTransfer(
    {
      invoiceId: usd.invoice.id,
      amount: 200,
      customerReference: `BANK-FINAL-${RUN_ID}`,
      paidAt: today(),
    },
    clientA,
  );
  const verifiedFull = await paymentsService.verify(rest.id, {}, admin);
  assert.equal(verifiedFull.status, "VERIFIED");
  const paidInvoice = await invoicesService.getById(usd.invoice.id, admin);
  assert.equal(paidInvoice.paymentStatus, "PAID");
  assert.equal(paidInvoice.status, "PAID");
  assert.equal(paidInvoice.paidAmount, 300);
  assert.equal(paidInvoice.remainingAmount, 0);
  console.log("[phase4] full verified payment marks invoice PAID OK");

  const refund = await paymentsService.createRefund(
    rest.id,
    { amount: 200, reason: "Scope reduced" },
    admin,
  );
  await paymentsService.decideRefund(
    rest.id,
    refund.id,
    { decision: "APPROVE" },
    admin,
  );
  const afterRefund = await invoicesService.getById(usd.invoice.id, admin);
  assert.equal(afterRefund.paymentStatus, "PARTIALLY_PAID");
  assert.equal(afterRefund.paidAmount, 100);
  console.log("[phase4] refund foundation OK");

  const pkr = await issueAdvanceInvoice(clientA, admin, "PKR");
  const jazz = await paymentsService.initiateJazzCash(
    { invoiceId: pkr.invoice.id },
    clientA,
  );
  assert.equal(jazz.payment.method, "JAZZCASH");
  assert.equal(jazz.payment.status, "INITIATED");
  assert.equal(jazz.payment.amount, 300);
  assert.ok(jazz.checkout.checkoutPath.includes("/jazzcash/checkout"));

  const credentials = getJazzCashCredentials();
  assert.ok(credentials);
  const hosted = buildJazzCashHostedFields({
    credentials,
    txnRefNo: jazz.payment.providerTxnId!,
    amount: jazz.payment.amount,
    billReference: jazz.payment.invoiceNumber || jazz.payment.paymentNumber,
    description: jazz.payment.invoiceNumber || jazz.payment.paymentNumber,
    returnUrl: `${process.env.APP_URL}/api/v1/payments/callbacks/jazzcash`,
  });
  const successFields = {
    ...hosted,
    pp_ResponseCode: "000",
    pp_ResponseMessage: "Success",
  };
  successFields.pp_SecureHash = buildJazzCashSecureHash(
    successFields,
    credentials.integritySalt,
  );
  const callback = await paymentsService.handleJazzCashCallback(successFields);
  assert.equal(callback.accepted, true);
  const jazzPaid = await invoicesService.getById(pkr.invoice.id, admin);
  assert.equal(jazzPaid.paymentStatus, "PAID");

  const replay = await paymentsService.handleJazzCashCallback(successFields);
  assert.equal(replay.reason, "replay");

  const declinedAfterPaid = {
    ...hosted,
    pp_ResponseCode: "101",
    pp_ResponseMessage: "Declined after success",
  };
  declinedAfterPaid.pp_SecureHash = buildJazzCashSecureHash(
    declinedAfterPaid,
    credentials.integritySalt,
  );
  const ignoredDecline = await paymentsService.handleJazzCashCallback(
    declinedAfterPaid,
  );
  assert.equal(ignoredDecline.reason, "already_settled");
  const stillPaid = await invoicesService.getById(pkr.invoice.id, admin);
  assert.equal(stillPaid.paymentStatus, "PAID");

  const badHash = { ...successFields, pp_SecureHash: "DEADBEEF" };
  const invalid = await paymentsService.handleJazzCashCallback(badHash);
  assert.equal(invalid.reason, "invalid_hash");
  console.log("[phase4] JazzCash initiate + verified callback + replay OK");

  const pkr2 = await issueAdvanceInvoice(clientA, admin, "PKR");
  const easy = await paymentsService.initiateEasyPaisa(
    { invoiceId: pkr2.invoice.id },
    clientA,
  );
  const easyCreds = {
    storeId: process.env.EASYPAISA_STORE_ID!,
    hashKey: process.env.EASYPAISA_HASH_KEY!,
    sandbox: true,
    algorithm: "hmac-sha256" as const,
  };
  const postBackURL = `${process.env.APP_URL}/api/v1/payments/callbacks/easypaisa`;
  const amount = "300.00";
  const hashFields = {
    amount,
    autoRedirect: "1",
    emailAddr: "",
    mobileNum: "",
    orderRefNum: easy.payment.paymentNumber,
    paymentMethod: "",
    postBackURL,
    storeId: easyCreds.storeId,
  };
  const easyCallback = await paymentsService.handleEasyPaisaCallback({
    ...hashFields,
    status: "SUCCESS",
    merchantHashedReq: buildEasyPaisaMerchantHash(hashFields, easyCreds),
  });
  assert.equal(easyCallback.accepted, true);
  const easyPaid = await invoicesService.getById(pkr2.invoice.id, admin);
  assert.equal(easyPaid.paymentStatus, "PAID");
  console.log("[phase4] EasyPaisa initiate + verified callback OK");

  const pkr3 = await issueAdvanceInvoice(clientA, admin, "PKR");
  const notice = await paymentsService.submitWalletNotice(
    {
      invoiceId: pkr3.invoice.id,
      method: "JAZZCASH",
      amount: 300,
      customerReference: `JC-TXN-${RUN_ID}`,
      paidAt: today(),
    },
    clientA,
  );
  assert.equal(notice.status, "PENDING_VERIFICATION");
  await expectError(
    () =>
      paymentsService.reject(notice.id, { reason: "Wrong account" }, clientA),
    PAYMENTS_ERROR_CODES.FORBIDDEN,
    "customer cannot reject",
  );
  const rejected = await paymentsService.reject(
    notice.id,
    { reason: "Reference not found" },
    admin,
  );
  assert.equal(rejected.status, "REJECTED");
  const stillUnpaid = await invoicesService.getById(pkr3.invoice.id, admin);
  assert.notEqual(stillUnpaid.paymentStatus, "PAID");
  console.log("[phase4] wallet notice + rejection OK");

  await expectError(
    () =>
      paymentsService.createRefund(
        rest.id,
        { amount: 10, reason: "Customer cannot refund" },
        clientA,
      ),
    PAYMENTS_ERROR_CODES.FORBIDDEN,
    "customer cannot refund",
  );

  const remainingRefund = await paymentsService.createRefund(
    partial.id,
    { amount: 100, reason: "Close remaining" },
    admin,
  );
  await paymentsService.decideRefund(
    partial.id,
    remainingRefund.id,
    { decision: "APPROVE" },
    admin,
  );
  const fullyRefunded = await invoicesService.getById(usd.invoice.id, admin);
  assert.equal(fullyRefunded.paymentStatus, "REFUNDED");
  assert.equal(fullyRefunded.paidAmount, 0);
  console.log("[phase4] full refund marks invoice REFUNDED OK");

  const pkrCancel = await issueAdvanceInvoice(clientA, admin, "PKR");
  const jazzCancel = await paymentsService.initiateJazzCash(
    { invoiceId: pkrCancel.invoice.id },
    clientA,
  );
  await expectError(
    () => paymentsService.verify(jazzCancel.payment.id, {}, admin),
    PAYMENTS_ERROR_CODES.INVALID_TRANSITION,
    "admin cannot verify unsubmitted hosted INITIATED payment",
  );
  const cancelFields = {
    ...buildJazzCashHostedFields({
      credentials: credentials!,
      txnRefNo: jazzCancel.payment.providerTxnId!,
      amount: jazzCancel.payment.amount,
      billReference:
        jazzCancel.payment.invoiceNumber || jazzCancel.payment.paymentNumber,
      description:
        jazzCancel.payment.invoiceNumber || jazzCancel.payment.paymentNumber,
      returnUrl: `${process.env.APP_URL}/api/v1/payments/callbacks/jazzcash`,
    }),
    pp_ResponseCode: "157",
    pp_ResponseMessage: "Cancelled by user",
  };
  cancelFields.pp_SecureHash = buildJazzCashSecureHash(
    cancelFields,
    credentials!.integritySalt,
  );
  const cancelled = await paymentsService.handleJazzCashCallback(cancelFields);
  assert.equal(cancelled.reason, "cancelled");
  const cancelledInvoice = await invoicesService.getById(
    pkrCancel.invoice.id,
    admin,
  );
  assert.equal(cancelledInvoice.paymentStatus, "FAILED");
  console.log("[phase4] JazzCash cancelled callback OK");

  const pkrExpire = await issueAdvanceInvoice(clientA, admin, "PKR");
  const jazzExpire = await paymentsService.initiateJazzCash(
    { invoiceId: pkrExpire.invoice.id },
    clientA,
  );
  await prisma.payment.update({
    where: { id: jazzExpire.payment.id },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  await paymentsService.list(
    {
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 10,
    },
    admin,
  );
  const expired = await paymentsService.getById(jazzExpire.payment.id, admin);
  assert.equal(expired.status, "EXPIRED");
  const expiredInvoice = await invoicesService.getById(
    pkrExpire.invoice.id,
    admin,
  );
  assert.equal(expiredInvoice.paymentStatus, "EXPIRED");
  console.log("[phase4] hosted checkout expiry OK");

  const easyCancelInvoice = await issueAdvanceInvoice(clientA, admin, "PKR");
  const easyCancelPay = await paymentsService.initiateEasyPaisa(
    { invoiceId: easyCancelInvoice.invoice.id },
    clientA,
  );
  const easyCancelHashFields = {
    amount: "300.00",
    autoRedirect: "1",
    emailAddr: "",
    mobileNum: "",
    orderRefNum: easyCancelPay.payment.paymentNumber,
    paymentMethod: "",
    postBackURL: `${process.env.APP_URL}/api/v1/payments/callbacks/easypaisa?run=${RUN_ID}`,
    storeId: process.env.EASYPAISA_STORE_ID!,
  };
  const easyCancelCb = await paymentsService.handleEasyPaisaCallback({
    ...easyCancelHashFields,
    status: "CANCELLED",
    merchantHashedReq: buildEasyPaisaMerchantHash(easyCancelHashFields, {
      storeId: process.env.EASYPAISA_STORE_ID!,
      hashKey: process.env.EASYPAISA_HASH_KEY!,
      sandbox: true,
      algorithm: "hmac-sha256",
    }),
  });
  assert.equal(easyCancelCb.reason, "cancelled");
  const easyCancelInv = await invoicesService.getById(
    easyCancelInvoice.invoice.id,
    admin,
  );
  assert.equal(easyCancelInv.paymentStatus, "FAILED");
  console.log("[phase4] EasyPaisa cancelled callback OK");

  const savedJazz = {
    merchantId: process.env.JAZZCASH_MERCHANT_ID,
    password: process.env.JAZZCASH_PASSWORD,
    salt: process.env.JAZZCASH_INTEGRITY_SALT,
  };
  delete process.env.JAZZCASH_MERCHANT_ID;
  delete process.env.JAZZCASH_PASSWORD;
  delete process.env.JAZZCASH_INTEGRITY_SALT;
  try {
    const methods = await paymentsService.listMethods();
    const jazz = methods.find((item) => item.method === "JAZZCASH");
    assert.equal(jazz?.providerReady, true);
    assert.equal(jazz?.qrImageUrl, JAZZCASH_QR_IMAGE_PATH);
    const pkrQr = await issueAdvanceInvoice(clientA, admin, "PKR");
    const qrPay = await paymentsService.submitWalletNotice(
      {
        invoiceId: pkrQr.invoice.id,
        method: "JAZZCASH",
        amount: 300,
        customerReference: `JC-QR-${RUN_ID}`,
        paidAt: today(),
      },
      clientA,
    );
    assert.equal(qrPay.status, "PENDING_VERIFICATION");
    assert.equal(qrPay.method, "JAZZCASH");
    await expectError(
      () => paymentsService.verify(qrPay.id, {}, clientA),
      PAYMENTS_ERROR_CODES.FORBIDDEN,
      "customer cannot verify JazzCash QR payment",
    );
    const qrVerified = await paymentsService.verify(qrPay.id, {}, admin);
    assert.equal(qrVerified.status, "VERIFIED");
    const qrInvoice = await invoicesService.getById(pkrQr.invoice.id, admin);
    assert.equal(qrInvoice.paymentStatus, "PAID");
    console.log("[phase4] JazzCash QR without merchant API credentials OK");
  } finally {
    if (savedJazz.merchantId) process.env.JAZZCASH_MERCHANT_ID = savedJazz.merchantId;
    if (savedJazz.password) process.env.JAZZCASH_PASSWORD = savedJazz.password;
    if (savedJazz.salt) process.env.JAZZCASH_INTEGRITY_SALT = savedJazz.salt;
  }

  const savedEasy = {
    storeId: process.env.EASYPAISA_STORE_ID,
    hashKey: process.env.EASYPAISA_HASH_KEY,
  };
  delete process.env.EASYPAISA_STORE_ID;
  delete process.env.EASYPAISA_HASH_KEY;
  try {
    const methods = await paymentsService.listMethods();
    const easyQr = methods.find((item) => item.method === "EASYPAISA");
    assert.equal(easyQr?.providerReady, true);
    assert.equal(easyQr?.qrImageUrl, EASYPAISA_QR_IMAGE_PATH);
    const pkrEasyQr = await issueAdvanceInvoice(clientA, admin, "PKR");
    const easyNotice = await paymentsService.submitWalletNotice(
      {
        invoiceId: pkrEasyQr.invoice.id,
        method: "EASYPAISA",
        amount: 300,
        customerReference: `EP-QR-${RUN_ID}`,
        paidAt: today(),
      },
      clientA,
    );
    assert.equal(easyNotice.status, "PENDING_VERIFICATION");
    assert.equal(easyNotice.method, "EASYPAISA");
    const pendingInvoice = await invoicesService.getById(
      pkrEasyQr.invoice.id,
      admin,
    );
    assert.notEqual(pendingInvoice.paymentStatus, "PAID");
    assert.equal(pendingInvoice.paidAmount, 0);
    await expectError(
      () => paymentsService.verify(easyNotice.id, {}, clientA),
      PAYMENTS_ERROR_CODES.FORBIDDEN,
      "customer cannot verify EasyPaisa QR payment",
    );
    const easyVerified = await paymentsService.verify(easyNotice.id, {}, admin);
    assert.equal(easyVerified.status, "VERIFIED");
    const easyQrInvoice = await invoicesService.getById(
      pkrEasyQr.invoice.id,
      admin,
    );
    assert.equal(easyQrInvoice.paymentStatus, "PAID");
    console.log("[phase4] EasyPaisa QR without Store ID / Hash Key OK");
  } finally {
    if (savedEasy.storeId) process.env.EASYPAISA_STORE_ID = savedEasy.storeId;
    if (savedEasy.hashKey) process.env.EASYPAISA_HASH_KEY = savedEasy.hashKey;
  }

  await cleanup();
  console.log("[phase4] PASS");
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
