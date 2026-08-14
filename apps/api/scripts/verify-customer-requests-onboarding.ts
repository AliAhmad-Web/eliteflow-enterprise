/**
 * Phase 2 onboarding: unlinked CLIENT can create/submit customer requests;
 * company association happens during admin approve / portal link.
 *
 * Run from repo root:
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-customer-requests-onboarding.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma, UserStatus } from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { clientsService } from "../src/modules/clients/clients.service.js";
import {
  CUSTOMER_REQUESTS_ERROR_CODES,
  CustomerRequestsError,
} from "../src/modules/customer-requests/customer-requests.errors.js";
import { customerRequestsService } from "../src/modules/customer-requests/customer-requests.service.js";
import { projectsService } from "../src/modules/projects/projects.service.js";
import { invoicesService } from "../src/modules/invoices/invoices.service.js";
import { tasksService } from "../src/modules/tasks/tasks.service.js";

const RUN_ID = randomUUID().slice(0, 8);
const email = (label: string) => `${label}.${RUN_ID}@onboarding.test`;

async function main() {
  console.log(`[p2-onboard] start ${RUN_ID}`);

  const clientRole = await authRepository.getDefaultClientRole();
  assert.ok(clientRole, "CLIENT role missing");

  const adminRole = await prisma.role.findFirst({
    where: { code: UserRole.ADMIN },
  });
  assert.ok(adminRole, "ADMIN role missing");

  const adminUser = await authRepository.createUser({
    email: email("admin"),
    passwordHash: null,
    firstName: "Admin",
    lastName: "Onboard",
    roleId: adminRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const admin = {
    userId: adminUser.id,
    email: adminUser.email,
    role: UserRole.ADMIN,
  };

  const company = await prisma.client.create({
    data: {
      companyName: `Onboard Co ${RUN_ID}`,
      contactName: "Contact",
      email: email("company"),
      status: "ACTIVE",
    },
  });

  const otherCompany = await prisma.client.create({
    data: {
      companyName: `Other Co ${RUN_ID}`,
      contactName: "Other",
      email: email("other-co"),
      status: "ACTIVE",
    },
  });

  const linkedUser = await authRepository.createUser({
    email: email("linked"),
    passwordHash: null,
    firstName: "Linked",
    lastName: "Client",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  await prisma.user.update({
    where: { id: linkedUser.id },
    data: { companyId: company.id },
  });
  const linked = {
    userId: linkedUser.id,
    email: linkedUser.email,
    role: UserRole.CLIENT,
    companyId: company.id,
  };

  const unlinkedUser = await authRepository.createUser({
    email: email("unlinked"),
    passwordHash: null,
    firstName: "New",
    lastName: "Customer",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const unlinked = {
    userId: unlinkedUser.id,
    email: unlinkedUser.email,
    role: UserRole.CLIENT,
    companyId: null as string | null,
  };

  // 1) Unlinked create + submit
  const draft = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Draft ${RUN_ID}`,
      description: "onboarding draft",
      submit: false,
    },
    unlinked,
  );
  assert.equal(draft.clientId, null);
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.createdById, unlinkedUser.id);

  const submitted = await customerRequestsService.submit(draft.id, unlinked);
  assert.equal(submitted.status, "SUBMITTED");
  assert.equal(submitted.clientId, null);
  console.log("[p2-onboard] unlinked create+submit OK");

  // 2) Unlinked only sees own requests
  const otherReq = await customerRequestsService.create(
    {
      type: "GENERAL_SERVICE",
      title: `Linked only ${RUN_ID}`,
      description: "secret",
      submit: true,
    },
    linked,
  );
  const list = await customerRequestsService.list(
    {
      page: 1,
      limit: 50,
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    unlinked,
  );
  assert.ok(list.items.every((i) => i.createdById === unlinkedUser.id));
  assert.ok(!list.items.some((i) => i.id === otherReq.id));
  try {
    await customerRequestsService.getById(otherReq.id, unlinked);
    assert.fail("unlinked must not read another company's request");
  } catch (error) {
    assert.ok(error instanceof CustomerRequestsError);
    assert.equal(error.code, CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND);
  }
  console.log("[p2-onboard] unlinked isolation OK");

  // 3) Spoofed clientId in body is ignored (schema strips / never accepted)
  const spoof = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Spoof ${RUN_ID}`,
      description: "x",
      submit: false,
      // @ts-expect-error intentional spoof attempt
      clientId: otherCompany.id,
    },
    unlinked,
  );
  assert.equal(spoof.clientId, null);
  console.log("[p2-onboard] clientId spoof ignored OK");

  // 4) Unlinked cannot create Project / Task / Invoice (RBAC mutate denied)
  try {
    await projectsService.create(
      {
        name: "nope",
        description: "x",
        clientId: company.id,
        status: "NOT_STARTED",
        priority: "MEDIUM",
        startDate: "",
        dueDate: "",
        progress: 0,
        budget: "",
        memberIds: [],
        milestones: [],
        attachments: [],
      },
      unlinked,
    );
    assert.fail("unlinked must not create project");
  } catch {
    console.log("[p2-onboard] unlinked cannot create project OK");
  }
  try {
    await tasksService.create(
      {
        title: "nope",
        description: "x",
        projectId: "00000000-0000-4000-8000-000000000001",
        assignedToId: "",
        status: "TODO",
        priority: "MEDIUM",
        labels: [],
        startDate: "",
        dueDate: "",
        progress: 0,
        estimatedHours: "",
        attachments: [],
      },
      unlinked,
    );
    assert.fail("unlinked must not create task");
  } catch {
    console.log("[p2-onboard] unlinked cannot create task OK");
  }
  try {
    await invoicesService.create(
      {
        clientId: company.id,
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        currency: "USD",
        taxRate: "0",
        items: [{ description: "x", quantity: 1, unitPrice: 1 }],
      } as never,
      unlinked as never,
    );
    assert.fail("unlinked must not create invoice");
  } catch {
    console.log("[p2-onboard] unlinked cannot create invoice OK");
  }

  // 5) Admin review workflow on unlinked request
  await customerRequestsService.startReview(submitted.id, {}, admin);
  await customerRequestsService.requestClarification(
    submitted.id,
    { message: "Please add timeline details" },
    admin,
  );
  await customerRequestsService.submit(submitted.id, unlinked);
  await customerRequestsService.startReview(submitted.id, {}, admin);
  const approved = await customerRequestsService.approve(
    submitted.id,
    { clientId: company.id, linkRequesterCompany: true },
    admin,
  );
  assert.equal(approved.clientId, company.id);
  assert.equal(approved.status, "APPROVED");

  const relinked = await prisma.user.findUnique({
    where: { id: unlinkedUser.id },
    select: { companyId: true },
  });
  assert.equal(relinked?.companyId, company.id);
  console.log("[p2-onboard] admin clarify/resubmit/approve+link OK");

  // 6) Linked workflow still works
  const linkedDraft = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Linked flow ${RUN_ID}`,
      description: "already linked",
      submit: true,
    },
    {
      ...unlinked,
      companyId: company.id,
    },
  );
  assert.equal(linkedDraft.clientId, company.id);
  console.log("[p2-onboard] linked CLIENT create still OK");

  // 7) Portal link backfill path
  const pendingUser = await authRepository.createUser({
    email: email("pending-link"),
    passwordHash: null,
    firstName: "Pending",
    lastName: "Link",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const pendingActor = {
    userId: pendingUser.id,
    email: pendingUser.email,
    role: UserRole.CLIENT,
    companyId: null as string | null,
  };
  const pendingReq = await customerRequestsService.create(
    {
      type: "GENERAL_SERVICE",
      title: `Pending link ${RUN_ID}`,
      description: "awaiting CRM link",
      submit: true,
    },
    pendingActor,
  );
  assert.equal(pendingReq.clientId, null);
  await clientsService.linkPortalUser(
    company.id,
    { userId: pendingUser.id },
    admin,
  );
  const afterLink = await prisma.customerRequest.findUnique({
    where: { id: pendingReq.id },
    select: { clientId: true },
  });
  assert.equal(afterLink?.clientId, company.id);
  console.log("[p2-onboard] CRM portal-user link backfills requests OK");

  // Cleanup seeded rows
  await prisma.customerRequest.deleteMany({
    where: {
      OR: [
        { createdById: { in: [unlinkedUser.id, linkedUser.id, pendingUser.id] } },
        { title: { contains: RUN_ID } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [unlinkedUser.id, linkedUser.id, pendingUser.id, adminUser.id],
      },
    },
  });
  await prisma.client.deleteMany({
    where: { id: { in: [company.id, otherCompany.id] } },
  });

  console.log("[p2-onboard] PASS");
}

main().catch((error) => {
  console.error("[p2-onboard] FAIL", error);
  process.exitCode = 1;
});
