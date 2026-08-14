/**
 * Phase 2 continuation verification: revision / additional scope / reopen /
 * next phase / maintenance, project linkage, IDOR, state machine, no duplicate project.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-customer-requests-continuation.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma, UserStatus } from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";
import {
  CUSTOMER_REQUESTS_ERROR_CODES,
  CustomerRequestsError,
} from "../src/modules/customer-requests/customer-requests.errors.js";
import { customerRequestsService } from "../src/modules/customer-requests/customer-requests.service.js";
import { projectsService } from "../src/modules/projects/projects.service.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.p2.cont.${RUN_ID}`;

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
    select: {
      id: true,
      convertedProjectId: true,
      convertedTaskId: true,
      targetProjectId: true,
    },
  });

  const projectIds = [
    ...new Set(
      [
        ...requests.map((r) => r.convertedProjectId),
        ...requests.map((r) => r.targetProjectId),
      ].filter(Boolean) as string[],
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

async function seedApprovedProject(
  client: Awaited<ReturnType<typeof createClientUser>>,
  admin: Awaited<ReturnType<typeof getAdminActor>>,
  title: string,
) {
  const created = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title,
      description: "Original intake",
      requirements: "Phase 1 scope",
      expectedBudget: "500",
      submit: true,
    },
    client,
  );
  const approved = await customerRequestsService.approve(
    created.id,
    { agreedAmount: "800", staffNotes: "Accepted" },
    admin,
  );
  assert.equal(approved.status, "CONVERTED");
  assert.ok(approved.convertedProjectId);
  return {
    intakeId: approved.id,
    projectId: approved.convertedProjectId!,
  };
}

async function main() {
  console.log(`[continuation] RUN_ID=${RUN_ID}`);
  await cleanup();

  const clientA = await createClientUser("a");
  const clientB = await createClientUser("b");
  const admin = await getAdminActor();

  const seeded = await seedApprovedProject(
    clientA,
    admin,
    `Website ${RUN_ID}`,
  );
  const projectCountBefore = await prisma.project.count({
    where: { clientId: clientA.companyId, deletedAt: null },
  });

  const types = [
    "REVISION",
    "ADDITIONAL_SCOPE",
    "NEXT_PHASE",
    "MAINTENANCE",
  ] as const;

  for (const type of types) {
    const created = await customerRequestsService.create(
      {
        type,
        title: `${type} ${RUN_ID}`,
        description: `Need ${type.toLowerCase()}`,
        requirements: "Details",
        additionalNotes: "Reason / context",
        preferredDeadline: "2031-06-01",
        expectedBudget: "250",
        targetProjectId: seeded.projectId,
        submit: true,
      },
      clientA,
    );
    assert.equal(created.status, "SUBMITTED");
    assert.equal(created.type, type);
    assert.equal(created.isContinuation, true);
    assert.equal(created.targetProjectId, seeded.projectId);
    assert.equal(created.parentRequestId, seeded.intakeId);
    assert.equal(created.clientId, clientA.companyId);
    assert.equal(created.createdById, clientA.userId);
    assert.equal(created.commercialAmount, null);

    await expectError(
      () =>
        customerRequestsService.approve(
          created.id,
          { staffNotes: "nope" },
          clientA,
        ),
      CUSTOMER_REQUESTS_ERROR_CODES.FORBIDDEN,
      `${type} client approve`,
    );

    const reviewed = await customerRequestsService.startReview(
      created.id,
      {},
      admin,
    );
    assert.equal(reviewed.status, "UNDER_REVIEW");

    const clarified = await customerRequestsService.requestClarification(
      created.id,
      { message: `Please clarify ${type}` },
      admin,
    );
    assert.equal(clarified.status, "CLARIFICATION_REQUESTED");

    await customerRequestsService.update(
      created.id,
      { clarificationResponse: `Customer reply for ${type}` },
      clientA,
    );
    const responded = await customerRequestsService.submit(created.id, clientA);
    assert.equal(responded.status, "CUSTOMER_RESPONDED");

    const approved = await customerRequestsService.approve(
      created.id,
      { staffNotes: "Approved change" },
      admin,
    );
    assert.equal(approved.status, "CONVERTED");
    assert.equal(approved.convertedProjectId, seeded.projectId);
    assert.equal(approved.targetProjectId, seeded.projectId);
    assert.equal(approved.commercialAmount, null);
    assert.equal(approved.expectedBudget, 250);
    console.log(`[continuation] ${type} OK`);
  }

  const projectCountAfter = await prisma.project.count({
    where: { clientId: clientA.companyId, deletedAt: null },
  });
  assert.equal(
    projectCountAfter,
    projectCountBefore,
    "continuation must not create extra projects",
  );

  // Spoof another customer's project
  const seededB = await seedApprovedProject(clientB, admin, `B site ${RUN_ID}`);
  await expectError(
    () =>
      customerRequestsService.create(
        {
          type: "REVISION",
          title: `Spoof ${RUN_ID}`,
          description: "hack",
          targetProjectId: seededB.projectId,
          submit: true,
        },
        clientA,
      ),
    CUSTOMER_REQUESTS_ERROR_CODES.PROJECT_NOT_FOUND,
    "spoof projectId",
  );

  const bChange = await customerRequestsService.create(
    {
      type: "REVISION",
      title: `B revision ${RUN_ID}`,
      description: "B only",
      targetProjectId: seededB.projectId,
      submit: true,
    },
    clientB,
  );
  await expectError(
    () => customerRequestsService.getById(bChange.id, clientA),
    CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
    "IDOR get continuation",
  );
  await expectError(
    () =>
      customerRequestsService.update(
        bChange.id,
        { title: "hacked" },
        clientA,
      ),
    CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND,
    "IDOR update continuation",
  );

  const listA = await customerRequestsService.list(
    {
      page: 1,
      limit: 50,
      search: "",
      kind: "continuation",
      relatedProjectId: seeded.projectId,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    clientA,
  );
  assert.ok(listA.items.every((item) => item.isContinuation));
  assert.ok(listA.items.every((item) => item.targetProjectId === seeded.projectId));
  assert.ok(!listA.items.some((item) => item.id === bChange.id));
  console.log("[continuation] IDOR / list scope OK");

  // Invalid transition: approve from DRAFT
  const draftChange = await customerRequestsService.create(
    {
      type: "REVISION",
      title: `Draft change ${RUN_ID}`,
      description: "draft",
      targetProjectId: seeded.projectId,
      submit: false,
    },
    clientA,
  );
  await expectError(
    () =>
      customerRequestsService.approve(draftChange.id, {}, admin),
    CUSTOMER_REQUESTS_ERROR_CODES.INVALID_TRANSITION,
    "approve from draft",
  );
  console.log("[continuation] invalid transitions OK");

  // Reject path
  const rejectable = await customerRequestsService.create(
    {
      type: "ADDITIONAL_SCOPE",
      title: `Reject change ${RUN_ID}`,
      description: "nope",
      targetProjectId: seeded.projectId,
      submit: true,
    },
    clientA,
  );
  const rejected = await customerRequestsService.reject(
    rejectable.id,
    { reason: "Out of current capacity" },
    admin,
  );
  assert.equal(rejected.status, "REJECTED");
  assert.equal(rejected.convertedProjectId, null);
  console.log("[continuation] reject OK");

  // Reopen: project must be closed
  await expectError(
    () =>
      customerRequestsService.create(
        {
          type: "REOPEN_PROJECT",
          title: `Reopen early ${RUN_ID}`,
          description: "still active",
          additionalNotes: "Want it reopened",
          targetProjectId: seeded.projectId,
          submit: true,
        },
        clientA,
      ),
    CUSTOMER_REQUESTS_ERROR_CODES.PROJECT_NOT_ELIGIBLE,
    "reopen active project",
  );

  await projectsService.update(
    seeded.projectId,
    { status: "COMPLETED" },
    admin,
  );

  const reopen = await customerRequestsService.create(
    {
      type: "REOPEN_PROJECT",
      title: `Reopen ${RUN_ID}`,
      description: "Need follow-up edits",
      additionalNotes: "Client asked to reopen",
      targetProjectId: seeded.projectId,
      submit: true,
    },
    clientA,
  );
  assert.equal(reopen.type, "REOPEN_PROJECT");
  assert.equal(reopen.targetProjectId, seeded.projectId);

  const reopened = await customerRequestsService.approve(
    reopen.id,
    { staffNotes: "Reopen approved" },
    admin,
  );
  assert.equal(reopened.status, "CONVERTED");
  assert.equal(reopened.convertedProjectId, seeded.projectId);

  const project = await projectsService.getById(seeded.projectId, admin);
  assert.equal(project.status, "IN_PROGRESS");
  assert.equal(project.id, seeded.projectId);

  const projectAfterReopen = await prisma.project.count({
    where: { clientId: clientA.companyId, deletedAt: null },
  });
  assert.equal(
    projectAfterReopen,
    projectCountBefore,
    "reopen must not create a duplicate project",
  );
  console.log("[continuation] reopen OK");

  // Customer-centric: no manual company association for change requests.
  const unlinkedRole = await authRepository.getDefaultClientRole();
  const unlinkedUser = await authRepository.createUser({
    email: email("unlinked"),
    passwordHash: null,
    firstName: "Verify",
    lastName: "unlinked",
    roleId: unlinkedRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const unlinkedActor = {
    userId: unlinkedUser.id,
    email: unlinkedUser.email,
    companyId: null as string | null,
    role: UserRole.CLIENT,
  };
  const unlinkedIntake = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Unlinked intake ${RUN_ID}`,
      description: "No company picker",
      submit: true,
    },
    unlinkedActor,
  );
  assert.equal(unlinkedIntake.clientId, null);
  const unlinkedApproved = await customerRequestsService.approve(
    unlinkedIntake.id,
    { agreedAmount: "400", staffNotes: "Accept" },
    admin,
  );
  assert.ok(unlinkedApproved.convertedProjectId);
  assert.ok(unlinkedApproved.clientId);

  await prisma.user.update({
    where: { id: unlinkedUser.id },
    data: { companyId: null },
  });
  const changeWithoutCompany = await customerRequestsService.create(
    {
      type: "REVISION",
      title: `Unlinked change ${RUN_ID}`,
      description: "Ownership from original request, not a company picker",
      targetProjectId: unlinkedApproved.convertedProjectId!,
      submit: true,
    },
    { ...unlinkedActor, companyId: null },
  );
  assert.equal(
    changeWithoutCompany.targetProjectId,
    unlinkedApproved.convertedProjectId,
  );
  assert.equal(changeWithoutCompany.clientId, unlinkedApproved.clientId);
  assert.equal(changeWithoutCompany.parentRequestId, unlinkedApproved.id);
  const autoLinked = await prisma.user.findUniqueOrThrow({
    where: { id: unlinkedUser.id },
    select: { companyId: true },
  });
  assert.equal(autoLinked.companyId, unlinkedApproved.clientId);
  console.log("[continuation] no manual company association OK");

  await cleanup();
  console.log("[continuation] PASS");
}

main()
  .catch(async (error) => {
    console.error("[continuation] FAIL", error);
    try {
      await cleanup();
    } catch {
      // ignore
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
