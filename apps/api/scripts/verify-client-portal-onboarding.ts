/**
 * P0 verification: CLIENT portal company onboarding + admin link/unlink
 * + project/invoice isolation by companyId.
 *
 * Run from repo root (with DATABASE_URL):
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-client-portal-onboarding.ts
 *
 * Cleanup: deletes only users/clients created with the VERIFY_P0_ prefix emails.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { ClientStatus, prisma, UserStatus } from "@enterprise/database";

import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";
import { clientsService } from "../src/modules/clients/clients.service.js";
import { projectsService } from "../src/modules/projects/projects.service.js";
import { invoicesService } from "../src/modules/invoices/invoices.service.js";
import { toSafeUser } from "../src/modules/auth/auth.types.js";
import { authRepository } from "../src/modules/auth/auth.repository.js";
import { CLIENTS_ERROR_CODES } from "../src/modules/clients/clients.errors.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.p0.portal.${RUN_ID}`;

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

  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { email: { startsWith: PREFIX } },
        { id: { in: companyIds } },
      ],
    },
    select: { id: true },
  });
  const allClientIds = [...new Set(clients.map((c) => c.id))];

  if (allClientIds.length) {
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { clientId: { in: allClientIds } } },
    });
    await prisma.invoice.deleteMany({
      where: { clientId: { in: allClientIds } },
    });
    await prisma.projectMember.deleteMany({
      where: { project: { clientId: { in: allClientIds } } },
    });
    await prisma.project.deleteMany({
      where: { clientId: { in: allClientIds } },
    });
  }

  if (users.length) {
    await prisma.user.deleteMany({
      where: { id: { in: users.map((u) => u.id) } },
    });
  }

  if (allClientIds.length) {
    await prisma.client.deleteMany({ where: { id: { in: allClientIds } } });
  }
}

async function main() {
  await cleanup();

  const clientRole = await prisma.role.findUnique({ where: { code: "CLIENT" } });
  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  assert.ok(clientRole, "CLIENT role required");
  assert.ok(adminRole, "ADMIN role required");

  // --- 1) New CLIENT signup path: ensurePortalCompanyLink creates Client + companyId
  const signupUser = await authRepository.createUser({
    email: email("signup"),
    passwordHash: null,
    firstName: "Portal",
    lastName: "Signup",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });

  const linkResult = await ensurePortalCompanyLink(signupUser.id, {
    userId: signupUser.id,
  });
  assert.ok(linkResult, "ensurePortalCompanyLink should return for CLIENT");
  assert.equal(linkResult.createdClient, true);
  assert.ok(linkResult.companyId);

  const afterSignup = await authRepository.findUserById(signupUser.id);
  assert.ok(afterSignup);
  const safe = toSafeUser(afterSignup);
  assert.equal(safe.companyId, linkResult.companyId);
  assert.equal(safe.companyName, linkResult.companyName);
  assert.ok(safe.companyId, "SafeUser.companyId must be set after onboarding");

  // Idempotent second call
  const again = await ensurePortalCompanyLink(signupUser.id);
  assert.ok(again?.alreadyLinked);

  // --- 2) Email match links instead of creating duplicate Client
  const crm = await prisma.client.create({
    data: {
      companyName: "CRM Co",
      contactName: "CRM Contact",
      email: email("crm-match"),
      status: ClientStatus.ACTIVE,
    },
  });
  const matchUser = await authRepository.createUser({
    email: email("crm-match"),
    passwordHash: null,
    firstName: "Match",
    lastName: "User",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const matched = await ensurePortalCompanyLink(matchUser.id);
  assert.ok(matched);
  assert.equal(matched.linkedByEmail, true);
  assert.equal(matched.createdClient, false);
  assert.equal(matched.companyId, crm.id);

  const clientsWithEmail = await prisma.client.count({
    where: { email: email("crm-match"), deletedAt: null },
  });
  assert.equal(clientsWithEmail, 1, "must not create duplicate Client by email");

  // --- 3) Admin link / unlink / duplicate prevention
  const admin = await authRepository.createUser({
    email: email("admin"),
    passwordHash: null,
    firstName: "Admin",
    lastName: "Linker",
    roleId: adminRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });

  const otherClient = await prisma.client.create({
    data: {
      companyName: "Other Co",
      contactName: "Other",
      email: email("other-co"),
      status: ClientStatus.ACTIVE,
    },
  });

  const unlinkedUser = await authRepository.createUser({
    email: email("unlinked"),
    passwordHash: null,
    firstName: "Unlinked",
    lastName: "Client",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });

  const unlinkedList = await clientsService.listUnlinkedPortalUsers({
    search: email("unlinked"),
    page: 1,
    limit: 20,
  });
  assert.ok(
    unlinkedList.items.some((u) => u.id === unlinkedUser.id),
    "unlinked CLIENT must appear in unlinked list",
  );

  const actor = { userId: admin.id, ipAddress: "127.0.0.1", userAgent: "verify" };
  const linked = await clientsService.linkPortalUser(
    otherClient.id,
    { userId: unlinkedUser.id },
    actor,
  );
  assert.equal(linked.companyId, otherClient.id);

  let duplicateDenied = false;
  try {
    await clientsService.linkPortalUser(
      otherClient.id,
      { userId: unlinkedUser.id },
      actor,
    );
  } catch (error) {
    duplicateDenied =
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code ===
        CLIENTS_ERROR_CODES.PORTAL_USER_ALREADY_LINKED;
  }
  assert.equal(duplicateDenied, true, "duplicate link must be rejected");

  // Already linked to another company cannot be silently reassigned
  const secondClient = await prisma.client.create({
    data: {
      companyName: "Second Co",
      contactName: "Second",
      email: email("second-co"),
      status: ClientStatus.ACTIVE,
    },
  });
  let crossCompanyDenied = false;
  try {
    await clientsService.linkPortalUser(
      secondClient.id,
      { userId: unlinkedUser.id },
      actor,
    );
  } catch (error) {
    crossCompanyDenied =
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code ===
        CLIENTS_ERROR_CODES.PORTAL_USER_LINKED_ELSEWHERE;
  }
  assert.equal(
    crossCompanyDenied,
    true,
    "link to a different company must be rejected without unlink",
  );

  // Non-CLIENT cannot be linked
  let nonClientDenied = false;
  try {
    await clientsService.linkPortalUser(
      otherClient.id,
      { userId: admin.id },
      actor,
    );
  } catch (error) {
    nonClientDenied =
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code ===
        CLIENTS_ERROR_CODES.PORTAL_USER_NOT_CLIENT;
  }
  assert.equal(nonClientDenied, true, "ADMIN must not be linkable as portal user");

  // Confirm linked access, then unlink and confirm data access disappears
  const linkedProject = await prisma.project.create({
    data: {
      name: `P0 Linked Project ${RUN_ID}`,
      clientId: otherClient.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 5,
    },
  });
  const linkedActor = {
    userId: unlinkedUser.id,
    role: "CLIENT",
    email: unlinkedUser.email,
  };
  const beforeUnlinkProjects = await projectsService.list(
    {
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    },
    linkedActor,
  );
  assert.ok(
    beforeUnlinkProjects.items.some((p) => p.id === linkedProject.id),
    "linked CLIENT must see company project",
  );

  await clientsService.unlinkPortalUser(otherClient.id, unlinkedUser.id, actor);
  const afterUnlink = await authRepository.findUserById(unlinkedUser.id);
  assert.equal(afterUnlink?.companyId ?? null, null);
  assert.equal(toSafeUser(afterUnlink!).companyId, null);

  const afterUnlinkProjects = await projectsService.list(
    {
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    },
    linkedActor,
  );
  assert.equal(
    afterUnlinkProjects.items.some((p) => p.id === linkedProject.id),
    false,
    "unlinked CLIENT must not see previous company projects",
  );
  let afterUnlinkDirectDenied = false;
  try {
    await projectsService.getById(linkedProject.id, linkedActor);
  } catch {
    afterUnlinkDirectDenied = true;
  }
  assert.equal(
    afterUnlinkDirectDenied,
    true,
    "unlinked CLIENT must not fetch previous company project by id",
  );

  // --- 4) Isolation: CLIENT A sees own projects/invoices; not CLIENT B
  const companyA = await prisma.client.create({
    data: {
      companyName: "Company A",
      contactName: "A",
      email: email("company-a"),
      status: ClientStatus.ACTIVE,
    },
  });
  const companyB = await prisma.client.create({
    data: {
      companyName: "Company B",
      contactName: "B",
      email: email("company-b"),
      status: ClientStatus.ACTIVE,
    },
  });

  const userA = await authRepository.createUser({
    email: email("user-a"),
    passwordHash: null,
    firstName: "User",
    lastName: "A",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const userB = await authRepository.createUser({
    email: email("user-b"),
    passwordHash: null,
    firstName: "User",
    lastName: "B",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  await prisma.user.update({
    where: { id: userA.id },
    data: { companyId: companyA.id },
  });
  await prisma.user.update({
    where: { id: userB.id },
    data: { companyId: companyB.id },
  });

  const projectA = await prisma.project.create({
    data: {
      name: `P0 Project A ${RUN_ID}`,
      clientId: companyA.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 10,
    },
  });
  const projectB = await prisma.project.create({
    data: {
      name: `P0 Project B ${RUN_ID}`,
      clientId: companyB.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 10,
    },
  });

  const invoiceA = await prisma.invoice.create({
    data: {
      invoiceNumber: `P0-A-${RUN_ID}`,
      clientId: companyA.id,
      status: "SENT",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      taxRate: 0,
      discountAmount: 0,
      subtotal: 100,
      taxAmount: 0,
      total: 100,
    },
  });
  const invoiceB = await prisma.invoice.create({
    data: {
      invoiceNumber: `P0-B-${RUN_ID}`,
      clientId: companyB.id,
      status: "SENT",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      taxRate: 0,
      discountAmount: 0,
      subtotal: 200,
      taxAmount: 0,
      total: 200,
    },
  });

  const clientActorA = {
    userId: userA.id,
    role: "CLIENT",
    email: userA.email,
  };
  const clientActorB = {
    userId: userB.id,
    role: "CLIENT",
    email: userB.email,
  };

  const projectsForA = await projectsService.list(
    {
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    },
    clientActorA,
  );
  assert.ok(projectsForA.items.some((p) => p.id === projectA.id));
  assert.equal(
    projectsForA.items.some((p) => p.id === projectB.id),
    false,
    "CLIENT A must not see CLIENT B project in list",
  );

  let crossProjectDenied = false;
  try {
    await projectsService.getById(projectB.id, clientActorA);
  } catch {
    crossProjectDenied = true;
  }
  assert.equal(crossProjectDenied, true, "CLIENT A must not get project B by id");

  const invoicesForA = await invoicesService.list(
    {
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    },
    clientActorA,
  );
  assert.ok(invoicesForA.items.some((i) => i.id === invoiceA.id));
  assert.equal(
    invoicesForA.items.some((i) => i.id === invoiceB.id),
    false,
    "CLIENT A must not see CLIENT B invoice in list",
  );

  let crossInvoiceDenied = false;
  try {
    await invoicesService.getById(invoiceB.id, clientActorA);
  } catch {
    crossInvoiceDenied = true;
  }
  assert.equal(crossInvoiceDenied, true, "CLIENT A must not get invoice B by id");

  // Own access still works
  const ownProject = await projectsService.getById(projectA.id, clientActorA);
  assert.equal(ownProject.id, projectA.id);
  const ownInvoice = await invoicesService.getById(invoiceA.id, clientActorA);
  assert.equal(ownInvoice.id, invoiceA.id);

  // B isolation sanity
  const projectsForB = await projectsService.list(
    {
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    },
    clientActorB,
  );
  assert.ok(projectsForB.items.some((p) => p.id === projectB.id));
  assert.equal(projectsForB.items.some((p) => p.id === projectA.id), false);

  // --- 5) Admin CRM still works
  const adminList = await clientsService.list({
    search: PREFIX,
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 50,
  });
  assert.ok(adminList.items.length >= 2);

  await cleanup();
  console.log(
    JSON.stringify(
      {
        ok: true,
        runId: RUN_ID,
        checks: [
          "signup_auto_create_company",
          "safe_user_company_fields",
          "email_match_no_duplicate",
          "admin_link_unlink",
          "duplicate_link_rejected",
          "cross_company_link_rejected",
          "non_client_link_rejected",
          "unlink_removes_company_data_access",
          "project_isolation",
          "invoice_isolation",
          "admin_clients_list",
        ],
      },
      null,
      2,
    ),
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    try {
      await cleanup();
    } catch {
      // ignore cleanup errors after failure
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
