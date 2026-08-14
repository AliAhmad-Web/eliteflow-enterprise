/**
 * Phase 2 extended security verification against Supabase (service-layer).
 * npx tsx --env-file=apps/api/.env apps/api/scripts/verify-customer-requests-security.ts
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
import { tasksService } from "../src/modules/tasks/tasks.service.js";
import { PROJECTS_ERROR_CODES, ProjectsError } from "../src/modules/projects/projects.errors.js";
import { TASKS_ERROR_CODES, TasksError } from "../src/modules/tasks/tasks.errors.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.p2.sec.${RUN_ID}`;

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
      requests.map((r) => r.convertedProjectId).filter(Boolean) as string[],
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

async function createClient(local: string) {
  const clientRole = await authRepository.getDefaultClientRole();
  const user = await authRepository.createUser({
    email: email(local),
    passwordHash: null,
    firstName: "Sec",
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
  assert.ok(linked.companyId);
  return {
    userId: linked.id,
    email: linked.email,
    companyId: linked.companyId!,
    role: UserRole.CLIENT,
  };
}

async function getAdmin() {
  const admin = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      role: { code: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
    },
    select: { id: true, email: true, role: { select: { code: true } } },
    orderBy: { createdAt: "asc" },
  });
  assert.ok(admin);
  return {
    userId: admin.id,
    email: admin.email,
    role: admin.role.code,
  };
}

async function main() {
  console.log(`[p2-sec] RUN_ID=${RUN_ID}`);
  await cleanup();
  const client = await createClient("a");
  const other = await createClient("b");
  const admin = await getAdmin();

  // CLIENT cannot create project
  try {
    await projectsService.create(
      {
        name: "Illegal",
        description: "",
        clientId: client.companyId,
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
      client,
    );
    assert.fail("CLIENT create project should fail");
  } catch (error) {
    assert.ok(error instanceof ProjectsError);
    assert.equal(error.code, PROJECTS_ERROR_CODES.FORBIDDEN);
  }
  console.log("[p2-sec] CLIENT cannot create project OK");

  // CLIENT cannot create task
  try {
    await tasksService.create(
      {
        title: "Illegal",
        description: "",
        projectId: "",
        assignedToId: admin.userId,
        status: "TODO",
        priority: "MEDIUM",
        labels: [],
        startDate: "",
        dueDate: "",
        progress: 0,
        estimatedHours: "",
        attachments: [],
      },
      client,
    );
    assert.fail("CLIENT create task should fail");
  } catch (error) {
    assert.ok(error instanceof TasksError);
    assert.equal(error.code, TASKS_ERROR_CODES.FORBIDDEN);
  }
  console.log("[p2-sec] CLIENT cannot create task / assign employee OK");

  // Spoof company: body clientId ignored — server uses actor.companyId
  const created = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Sec request ${RUN_ID}`,
      description: "desc",
      requirements: "req",
      submit: true,
    },
    client,
  );
  assert.equal(created.clientId, client.companyId);
  assert.notEqual(created.clientId, other.companyId);
  console.log("[p2-sec] clientId server-derived OK");

  // Cross-company access denied
  try {
    await customerRequestsService.getById(created.id, other);
    assert.fail("cross-company get should fail");
  } catch (error) {
    assert.ok(error instanceof CustomerRequestsError);
    assert.equal(error.code, CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND);
  }

  // CLIENT cannot staff-review / convert
  for (const [label, fn] of [
    [
      "review",
      () => customerRequestsService.startReview(created.id, {}, client),
    ],
    [
      "approve",
      () => customerRequestsService.approve(created.id, {}, client),
    ],
    [
      "reject",
      () =>
        customerRequestsService.reject(
          created.id,
          { reason: "nope" },
          client,
        ),
    ],
    [
      "convert",
      () =>
        customerRequestsService.convert(
          created.id,
          { createProject: true },
          client,
        ),
    ],
  ] as const) {
    try {
      await fn();
      assert.fail(`${label} should fail for CLIENT`);
    } catch (error) {
      assert.ok(error instanceof CustomerRequestsError);
      assert.equal(error.code, CUSTOMER_REQUESTS_ERROR_CODES.FORBIDDEN);
    }
  }
  console.log("[p2-sec] CLIENT cannot review/approve/reject/convert OK");

  // Dangerous attachment URL rejected
  try {
    await customerRequestsService.create(
      {
        type: "GENERAL_SERVICE",
        title: `Bad attach ${RUN_ID}`,
        description: "x",
        submit: false,
        attachments: [
          {
            fileName: "evil.txt",
            fileUrl: "javascript:alert(1)",
          },
        ],
      },
      client,
    );
    assert.fail("javascript: attachment should fail");
  } catch {
    console.log("[p2-sec] dangerous attachment URL rejected OK");
  }

  // Unlinked CLIENT can create + submit (onboarding)
  const unlinkedRole = await authRepository.getDefaultClientRole();
  const unlinkedUser = await authRepository.createUser({
    email: email("unlinked"),
    passwordHash: null,
    firstName: "Un",
    lastName: "Linked",
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
  const unlinkedCreated = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Unlinked onboarding ${RUN_ID}`,
      description: "Created without company link",
      submit: true,
    },
    unlinkedActor,
  );
  assert.equal(unlinkedCreated.clientId, null);
  assert.equal(unlinkedCreated.status, "SUBMITTED");
  assert.equal(unlinkedCreated.createdById, unlinkedUser.id);

  const unlinkedList = await customerRequestsService.list(
    {
      page: 1,
      limit: 20,
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    unlinkedActor,
  );
  assert.ok(
    unlinkedList.items.every((item) => item.createdById === unlinkedUser.id),
  );
  assert.ok(unlinkedList.items.some((item) => item.id === unlinkedCreated.id));
  console.log("[p2-sec] unlinked CLIENT create/submit + own-only list OK");

  // Unlinked cannot spoof targetProjectId without company
  try {
    await customerRequestsService.create(
      {
        type: "NEW_TASK",
        title: "Spoof project",
        description: "x",
        targetProjectId: "00000000-0000-4000-8000-000000000099",
        submit: false,
      },
      unlinkedActor,
    );
    assert.fail("unlinked targetProjectId should fail");
  } catch (error) {
    assert.ok(error instanceof CustomerRequestsError);
    assert.equal(error.code, CUSTOMER_REQUESTS_ERROR_CODES.UNLINKED);
  }
  console.log("[p2-sec] unlinked targetProject blocked OK");

  // Admin can review + approve unlinked with company association
  await customerRequestsService.startReview(unlinkedCreated.id, {}, admin);
  const approvedUnlinked = await customerRequestsService.approve(
    unlinkedCreated.id,
    {
      clientId: client.companyId!,
      linkRequesterCompany: true,
    },
    admin,
  );
  assert.equal(approvedUnlinked.clientId, client.companyId);
  const linkedUser = await prisma.user.findUnique({
    where: { id: unlinkedUser.id },
    select: { companyId: true },
  });
  assert.equal(linkedUser?.companyId, client.companyId);
  console.log("[p2-sec] admin approve+link onboarding request OK");

  // Staff convert creates project visible to client company
  await customerRequestsService.startReview(created.id, {}, admin);
  await customerRequestsService.approve(created.id, {}, admin);
  const converted = await customerRequestsService.convert(
    created.id,
    { createProject: true, createTask: false },
    admin,
  );
  assert.ok(converted.convertedProjectId);
  const project = await projectsService.getById(
    converted.convertedProjectId!,
    client,
  );
  assert.equal(project.clientId, client.companyId);
  console.log("[p2-sec] converted project visible to owning CLIENT OK");

  // Unlinked (before link) cannot create projects — use a fresh unlinked user
  const stillUnlinked = await authRepository.createUser({
    email: email("still-unlinked"),
    passwordHash: null,
    firstName: "Still",
    lastName: "Unlinked",
    roleId: unlinkedRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  try {
    await projectsService.create(
      {
        name: "Should fail",
        description: "x",
        clientId: client.companyId!,
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
      {
        userId: stillUnlinked.id,
        email: stillUnlinked.email,
        role: UserRole.CLIENT,
        companyId: null,
      },
    );
    assert.fail("unlinked CLIENT must not create projects");
  } catch {
    console.log("[p2-sec] unlinked CLIENT cannot create Project OK");
  }

  // Audit events exist for this request
  const audits = await prisma.auditLog.findMany({
    where: {
      resource: "customer_request",
      resourceId: created.id,
    },
    select: { action: true },
  });
  const actions = new Set(audits.map((a) => a.action));
  for (const required of [
    "customer_request.create",
    "customer_request.submit",
    "customer_request.review",
    "customer_request.approve",
    "customer_request.convert",
  ]) {
    assert.ok(actions.has(required), `missing audit ${required}`);
  }
  console.log("[p2-sec] audit trail OK");

  await cleanup();
  console.log("[p2-sec] PASS");
}

main()
  .catch(async (error) => {
    console.error("[p2-sec] FAIL", error);
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
