/**
 * Phase 2 verification: CustomerRequest intake, isolation, transitions, conversion, RBAC.
 *
 * Run from repo root (with DATABASE_URL):
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-customer-requests-phase2.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma, UserStatus } from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { ROLE_PERMISSION_MAP } from "../../../packages/database/prisma/seed/data/role-permissions.data.js";
import { authRepository } from "../src/modules/auth/auth.repository.js";
import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";
import {
  CUSTOMER_REQUESTS_ERROR_CODES,
  CustomerRequestsError,
} from "../src/modules/customer-requests/customer-requests.errors.js";
import { customerRequestsService } from "../src/modules/customer-requests/customer-requests.service.js";
import { projectsService } from "../src/modules/projects/projects.service.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.p2.req.${RUN_ID}`;

function email(local: string) {
  return `${PREFIX}.${local}@eliteflow.test`;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true, companyId: true },
  });
  const companyIds = [
    ...new Set(users.map((u) => u.companyId).filter(Boolean) as string[]),
  ];

  const requests = await prisma.customerRequest.findMany({
    where: {
      OR: [
        { createdById: { in: users.map((u) => u.id) } },
        { clientId: { in: companyIds } },
      ],
    },
    select: { id: true, convertedProjectId: true, convertedTaskId: true },
  });

  const projectIds = [
    ...new Set(
      requests
        .map((r) => r.convertedProjectId)
        .filter(Boolean) as string[],
    ),
  ];
  const taskIds = [
    ...new Set(
      requests.map((r) => r.convertedTaskId).filter(Boolean) as string[],
    ),
  ];

  if (taskIds.length) {
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  }
  if (projectIds.length) {
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
    assert.ok(
      error instanceof CustomerRequestsError,
      `${label}: expected CustomerRequestsError`,
    );
    assert.equal(error.code, code, `${label}: wrong code`);
  }
}

async function main() {
  console.log(`[phase2] RUN_ID=${RUN_ID}`);
  await cleanup();

  // RBAC seed map must not grant ERP write to CLIENT
  const clientPerms = ROLE_PERMISSION_MAP.CLIENT;
  assert.ok(clientPerms.includes("customer-requests:create"));
  assert.ok(clientPerms.includes("customer-requests:read"));
  assert.ok(!clientPerms.includes("customer-requests:review"));
  assert.ok(!clientPerms.includes("projects:write"));
  assert.ok(!clientPerms.includes("tasks:write"));
  assert.ok(!clientPerms.includes("invoices:write"));
  console.log("[phase2] RBAC map OK");

  const clientA = await createClientUser("a");
  const clientB = await createClientUser("b");
  const admin = await getAdminActor();

  // Create + submit
  const draft = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Phase2 Draft ${RUN_ID}`,
      description: "Build a portal",
      requirements: "Auth, dashboard",
      preferredDeadline: "2030-01-15",
      expectedBudget: "5000",
      currency: "USD",
      priority: "HIGH",
      additionalNotes: "Please review",
      submit: false,
    },
    clientA,
  );
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.clientId, clientA.companyId);

  await expectError(
    () =>
      customerRequestsService.update(
        draft.id,
        { clarificationResponse: "Too early" },
        clientA,
      ),
    CUSTOMER_REQUESTS_ERROR_CODES.INVALID_TRANSITION,
    "draft clarification reply",
  );

  const submitted = await customerRequestsService.submit(draft.id, clientA);
  assert.equal(submitted.status, "SUBMITTED");
  console.log("[phase2] create/submit OK");

  const clarifyFromSubmitted = await customerRequestsService.create(
    {
      type: "GENERAL_SERVICE",
      title: `Clarify from submitted ${RUN_ID}`,
      description: "Needs more budget detail",
      submit: true,
    },
    clientA,
  );
  const directClarify = await customerRequestsService.requestClarification(
    clarifyFromSubmitted.id,
    { message: "Please consider increasing the budget to $800." },
    admin,
  );
  assert.equal(directClarify.status, "CLARIFICATION_REQUESTED");
  assert.equal(
    directClarify.clarificationMessage,
    "Please consider increasing the budget to $800.",
  );
  console.log("[phase2] clarification from SUBMITTED OK");

  // Spoof clientId ignored — create always uses actor company
  const reqB = await customerRequestsService.create(
    {
      type: "GENERAL_SERVICE",
      title: `Owned by B ${RUN_ID}`,
      description: "B work",
      submit: true,
    },
    clientB,
  );
  assert.equal(reqB.clientId, clientB.companyId);

  // IDOR: A cannot read B
  await expectError(
    () => customerRequestsService.getById(reqB.id, clientA),
    CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
    "IDOR get",
  );
  await expectError(
    () =>
      customerRequestsService.update(
        reqB.id,
        { title: "hacked" },
        clientA,
      ),
    CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
    "IDOR update",
  );
  await expectError(
    () => customerRequestsService.submit(reqB.id, clientA),
    CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
    "IDOR submit",
  );
  await expectError(
    () => customerRequestsService.withdraw(reqB.id, clientA),
    CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
    "IDOR withdraw",
  );
  console.log("[phase2] IDOR isolation OK");

  // CLIENT cannot review/convert
  await expectError(
    () =>
      customerRequestsService.startReview(draft.id, {}, clientA),
    CUSTOMER_REQUESTS_ERROR_CODES.FORBIDDEN,
    "client review",
  );
  await expectError(
    () =>
      customerRequestsService.convert(draft.id, { createProject: true }, clientA),
    CUSTOMER_REQUESTS_ERROR_CODES.FORBIDDEN,
    "client convert",
  );
  console.log("[phase2] CLIENT staff-action deny OK");

  // Staff lifecycle
  const underReview = await customerRequestsService.startReview(
    draft.id,
    { staffNotes: "Looking" },
    admin,
  );
  assert.equal(underReview.status, "UNDER_REVIEW");

  const clarified = await customerRequestsService.requestClarification(
    draft.id,
    { message: "Need hosting preference" },
    admin,
  );
  assert.equal(clarified.status, "CLARIFICATION_REQUESTED");
  assert.equal(clarified.clarificationMessage, "Need hosting preference");
  assert.equal(clarified.clarificationResponse, null);
  assert.ok(
    (clarified.clarificationHistory ?? []).some(
      (entry) =>
        entry.from === "admin" && entry.message.includes("hosting preference"),
    ),
    "admin clarification should be stored in history",
  );

  await expectError(
    () =>
      customerRequestsService.update(
        draft.id,
        { clarificationResponse: "Hacked reply" },
        clientB,
      ),
    CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
    "IDOR clarification reply",
  );

  const updated = await customerRequestsService.update(
    draft.id,
    {
      additionalNotes: "Prefer Vercel hosting",
      clarificationResponse:
        "Yes, we can increase the budget to $800. Please proceed.",
    },
    clientA,
  );
  assert.equal(updated.additionalNotes, "Prefer Vercel hosting");
  assert.equal(
    updated.clarificationResponse,
    "Yes, we can increase the budget to $800. Please proceed.",
  );
  assert.equal(updated.clarificationMessage, "Need hosting preference");
  assert.ok(
    (updated.clarificationHistory ?? []).some(
      (entry) =>
        entry.from === "admin" && entry.message.includes("hosting preference"),
    ),
    "previous admin clarification must remain in history",
  );
  assert.ok(
    (updated.clarificationHistory ?? []).some(
      (entry) =>
        entry.from === "customer" && entry.message.includes("Please proceed"),
    ),
    "customer reply should be stored in history",
  );

  const resubmitted = await customerRequestsService.submit(draft.id, clientA);
  assert.equal(resubmitted.status, "SUBMITTED");
  assert.equal(
    resubmitted.clarificationResponse,
    "Yes, we can increase the budget to $800. Please proceed.",
  );

  const adminView = await customerRequestsService.getById(draft.id, admin);
  assert.equal(
    adminView.clarificationResponse,
    "Yes, we can increase the budget to $800. Please proceed.",
  );
  assert.equal(adminView.clarificationMessage, "Need hosting preference");
  assert.ok(
    (adminView.clarificationHistory ?? []).some(
      (entry) => entry.from === "admin",
    ),
  );
  assert.ok(
    (adminView.clarificationHistory ?? []).some(
      (entry) => entry.from === "customer",
    ),
  );
  console.log("[phase2] customer clarification reply OK");

  const approved = await customerRequestsService.approve(
    draft.id,
    { staffNotes: "Approved" },
    admin,
  );
  assert.equal(approved.status, "CONVERTED");
  assert.equal(approved.clientId, clientA.companyId);
  assert.ok(approved.convertedProjectId);

  const project = await projectsService.getById(
    approved.convertedProjectId!,
    admin,
  );
  assert.equal(project.clientId, clientA.companyId);
  assert.equal(project.name, draft.title);

  const customerProject = await projectsService.getById(
    approved.convertedProjectId!,
    clientA,
  );
  assert.equal(customerProject.id, approved.convertedProjectId);

  // Double convert blocked (status no longer APPROVED)
  try {
    await customerRequestsService.convert(
      draft.id,
      { createProject: true },
      admin,
    );
    assert.fail("double convert: expected error");
  } catch (error) {
    assert.ok(error instanceof CustomerRequestsError);
    assert.ok(
      error.code === CUSTOMER_REQUESTS_ERROR_CODES.ALREADY_CONVERTED ||
        error.code === CUSTOMER_REQUESTS_ERROR_CODES.INVALID_TRANSITION,
      `unexpected double-convert code: ${error.code}`,
    );
  }
  console.log("[phase2] clarification/approve/convert OK");

  // Withdraw path
  const withdrawable = await customerRequestsService.create(
    {
      type: "NEW_TASK",
      title: `Withdraw me ${RUN_ID}`,
      description: "temp",
      submit: true,
    },
    clientA,
  );
  const cancelled = await customerRequestsService.withdraw(
    withdrawable.id,
    clientA,
  );
  assert.equal(cancelled.status, "CANCELLED");
  console.log("[phase2] withdraw OK");

  // Reject path
  const rejectable = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Reject me ${RUN_ID}`,
      description: "nope",
      submit: true,
    },
    clientA,
  );
  await customerRequestsService.startReview(rejectable.id, {}, admin);
  const rejected = await customerRequestsService.reject(
    rejectable.id,
    { reason: "Out of scope" },
    admin,
  );
  assert.equal(rejected.status, "REJECTED");
  console.log("[phase2] reject OK");

  // List scoped
  const listA = await customerRequestsService.list(
    { page: 1, limit: 50, search: "", sortBy: "createdAt", sortOrder: "desc" },
    clientA,
  );
  assert.ok(listA.items.every((i) => i.clientId === clientA.companyId));
  assert.ok(!listA.items.some((i) => i.id === reqB.id));
  console.log("[phase2] list scope OK");

  await cleanup();
  console.log("[phase2] PASS");
}

main()
  .catch(async (error) => {
    console.error("[phase2] FAIL", error);
    try {
      await cleanup();
    } catch {
      // ignore cleanup errors
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
