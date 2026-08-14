/**
 * Phase 2 notification verification: CustomerRequest lifecycle creates
 * Notification rows with correct recipient, entity, and titles.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-customer-requests-notifications.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { prisma, UserStatus } from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";
import { customerRequestsService } from "../src/modules/customer-requests/customer-requests.service.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.p2.notify.${RUN_ID}`;

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

  const requestIds = requests.map((r) => r.id);
  if (requestIds.length) {
    const notifications = await prisma.notification.findMany({
      where: {
        entityType: "CustomerRequest",
        entityId: { in: requestIds },
      },
      select: { id: true },
    });
    const notificationIds = notifications.map((n) => n.id);
    if (notificationIds.length) {
      await prisma.notificationQueue.deleteMany({
        where: { notificationId: { in: notificationIds } },
      });
      await prisma.notificationAudit.deleteMany({
        where: { notificationId: { in: notificationIds } },
      });
      await prisma.notificationReply.deleteMany({
        where: { notificationId: { in: notificationIds } },
      });
      await prisma.notification.deleteMany({
        where: { id: { in: notificationIds } },
      });
    }

    await prisma.customerRequestAttachment.deleteMany({
      where: { requestId: { in: requestIds } },
    });
  }

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

  await prisma.customerRequest.deleteMany({
    where: { id: { in: requestIds } },
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
    firstName: "Notify",
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

async function waitForNotifications(params: {
  entityId: string;
  title: string;
  userId?: string;
  minCount?: number;
  timeoutMs?: number;
}) {
  const minCount = params.minCount ?? 1;
  const timeoutMs = params.timeoutMs ?? 8000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const rows = await prisma.notification.findMany({
      where: {
        entityType: "CustomerRequest",
        entityId: params.entityId,
        title: params.title,
        deletedAt: null,
        ...(params.userId ? { userId: params.userId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    if (rows.length >= minCount) {
      return rows;
    }
    await delay(150);
  }

  const leftover = await prisma.notification.findMany({
    where: {
      entityType: "CustomerRequest",
      entityId: params.entityId,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
    },
  });
  assert.fail(
    `Timed out waiting for notification title="${params.title}" entity=${params.entityId}. Found: ${JSON.stringify(leftover)}`,
  );
}

async function main() {
  console.log(`[p2-notify] RUN_ID=${RUN_ID}`);
  await cleanup();

  const client = await createClientUser("client");
  const admin = await getAdminActor();

  const adminUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { code: UserRole.ADMIN },
    },
    select: { id: true },
  });
  const superAdminUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { code: UserRole.SUPER_ADMIN },
    },
    select: { id: true },
  });
  assert.ok(
    adminUsers.length + superAdminUsers.length > 0,
    "Need ADMIN or SUPER_ADMIN recipients",
  );

  // Submit → staff notification
  const created = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Notify lifecycle ${RUN_ID}`,
      description: "Notification verification",
      requirements: "Verify rows",
      submit: true,
    },
    client,
  );
  assert.equal(created.status, "SUBMITTED");

  const staffRows = await waitForNotifications({
    entityId: created.id,
    title: "New customer work request",
    minCount: 1,
  });
  for (const row of staffRows) {
    assert.equal(row.entityType, "CustomerRequest");
    assert.equal(row.entityId, created.id);
    assert.ok(row.createdAt instanceof Date);
    assert.match(row.linkUrl ?? "", /\/customer-requests\//);
    const isAdminRecipient =
      adminUsers.some((u) => u.id === row.userId) ||
      superAdminUsers.some((u) => u.id === row.userId);
    assert.ok(isAdminRecipient, "submit notify must target ADMIN/SUPER_ADMIN");
    assert.notEqual(row.userId, client.userId);
  }
  console.log(
    `[p2-notify] submit→staff OK (${staffRows.length} notification row(s))`,
  );

  // Clarification → customer
  await customerRequestsService.startReview(created.id, {}, admin);
  await customerRequestsService.requestClarification(
    created.id,
    { message: "Please clarify hosting" },
    admin,
  );
  const clarifyRows = await waitForNotifications({
    entityId: created.id,
    title: "Clarification requested",
    userId: client.userId,
  });
  assert.equal(clarifyRows[0]?.userId, client.userId);
  assert.match(clarifyRows[0]?.linkUrl ?? "", /\/requests\//);
  console.log("[p2-notify] clarification→customer OK");

  // Resubmit + approve → customer
  await customerRequestsService.update(
    created.id,
    { additionalNotes: "Hosting clarified" },
    client,
  );
  await customerRequestsService.submit(created.id, client);
  await waitForNotifications({
    entityId: created.id,
    title: "Customer responded to clarification",
    minCount: 1,
  });
  await customerRequestsService.startReview(created.id, {}, admin);
  await customerRequestsService.approve(
    created.id,
    { agreedAmount: "1000", staffNotes: "Looks good" },
    admin,
  );
  const approveRows = await waitForNotifications({
    entityId: created.id,
    title: "Project approved and accepted",
    userId: client.userId,
  });
  assert.equal(approveRows[0]?.entityId, created.id);
  console.log("[p2-notify] approve→customer OK");

  // Reject path (separate request)
  const rejectable = await customerRequestsService.create(
    {
      type: "GENERAL_SERVICE",
      title: `Notify reject ${RUN_ID}`,
      description: "reject path",
      submit: true,
    },
    client,
  );
  await waitForNotifications({
    entityId: rejectable.id,
    title: "New customer work request",
    minCount: 1,
  });
  await customerRequestsService.startReview(rejectable.id, {}, admin);
  await customerRequestsService.reject(
    rejectable.id,
    { reason: "Out of scope for Phase 2" },
    admin,
  );
  const rejectRows = await waitForNotifications({
    entityId: rejectable.id,
    title: "Request rejected",
    userId: client.userId,
  });
  assert.equal(rejectRows[0]?.entityId, rejectable.id);
  assert.ok(rejectRows[0]?.createdAt);
  console.log("[p2-notify] reject→customer OK");

  // Scope check: creator notifications belong to linked client company user
  const creatorCompany = await prisma.user.findUniqueOrThrow({
    where: { id: client.userId },
    select: { companyId: true },
  });
  assert.equal(creatorCompany.companyId, client.companyId);
  console.log("[p2-notify] recipient company scope OK");

  await cleanup();
  console.log("[p2-notify] PASS");
}

main()
  .catch(async (error) => {
    console.error("[p2-notify] FAIL", error);
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
