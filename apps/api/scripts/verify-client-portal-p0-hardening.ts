/**
 * P0 hardening verification: scoped CLIENT file upload ACL, task feedback,
 * offline payment notice, and cross-client isolation.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-client-portal-p0-hardening.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { ClientStatus, prisma, UserStatus } from "@enterprise/database";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { filesService } from "../src/modules/files/files.service.js";
import { invoicesService } from "../src/modules/invoices/invoices.service.js";
import { tasksService } from "../src/modules/tasks/tasks.service.js";
import { communicationService } from "../src/modules/communication/communication.service.js";
import { FILES_ERROR_CODES } from "../src/modules/files/files.errors.js";

const RUN = randomUUID().slice(0, 8);
const PREFIX = `verify.p0.hard.${RUN}`;

function email(local: string) {
  return `${PREFIX}.${local}@eliteflow.test`;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  });
  const clients = await prisma.client.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  });
  const clientIds = clients.map((c) => c.id);
  if (clientIds.length) {
    await prisma.managedFile.deleteMany({
      where: { clientId: { in: clientIds } },
    }).catch(() => undefined);
    await prisma.taskComment.deleteMany({
      where: { task: { project: { clientId: { in: clientIds } } } },
    }).catch(() => undefined);
    await prisma.task.deleteMany({
      where: { project: { clientId: { in: clientIds } } },
    });
    await prisma.invoicePaymentHistory.deleteMany({
      where: { invoice: { clientId: { in: clientIds } } },
    });
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { clientId: { in: clientIds } } },
    });
    await prisma.invoice.deleteMany({ where: { clientId: { in: clientIds } } });
    await prisma.project.deleteMany({ where: { clientId: { in: clientIds } } });
    await prisma.comment.deleteMany({
      where: {
        OR: [
          { entityType: "PROJECT", entityId: { in: clientIds } },
          { entityType: "CLIENT", entityId: { in: clientIds } },
        ],
      },
    }).catch(() => undefined);
  }
  if (users.length) {
    await prisma.user.deleteMany({
      where: { id: { in: users.map((u) => u.id) } },
    });
  }
  if (clientIds.length) {
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  }
}

async function main() {
  await cleanup();

  const clientRole = await prisma.role.findUnique({ where: { code: "CLIENT" } });
  assert.ok(clientRole);

  const uploadPerm = await prisma.permission.findUnique({
    where: { key: "files:upload" },
  });
  assert.ok(uploadPerm, "files:upload permission must exist");
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: clientRole.id,
        permissionId: uploadPerm.id,
      },
    },
    update: {},
    create: { roleId: clientRole.id, permissionId: uploadPerm.id },
  });

  const companyA = await prisma.client.create({
    data: {
      companyName: `Hard A ${RUN}`,
      contactName: "A",
      email: email("co-a"),
      status: ClientStatus.ACTIVE,
    },
  });
  const companyB = await prisma.client.create({
    data: {
      companyName: `Hard B ${RUN}`,
      contactName: "B",
      email: email("co-b"),
      status: ClientStatus.ACTIVE,
    },
  });

  const userA = await authRepository.createUser({
    email: email("user-a"),
    passwordHash: null,
    firstName: "Hard",
    lastName: "A",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const userB = await authRepository.createUser({
    email: email("user-b"),
    passwordHash: null,
    firstName: "Hard",
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
      name: `Hard Project A ${RUN}`,
      clientId: companyA.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 30,
    },
  });
  const projectB = await prisma.project.create({
    data: {
      name: `Hard Project B ${RUN}`,
      clientId: companyB.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 40,
    },
  });
  const taskA = await prisma.task.create({
    data: {
      title: `Hard Task A ${RUN}`,
      projectId: projectA.id,
      status: "TODO",
      priority: "MEDIUM",
    },
  });
  const invoiceA = await prisma.invoice.create({
    data: {
      invoiceNumber: `HARD-A-${RUN}`,
      clientId: companyA.id,
      status: "SENT",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      taxRate: 0,
      discountAmount: 0,
      subtotal: 50,
      taxAmount: 0,
      total: 50,
    },
  });

  const actorA = {
    userId: userA.id,
    role: "CLIENT",
    email: userA.email,
    companyId: companyA.id,
    permissions: ["files:upload", "files:read", "tasks:read", "invoices:read", "communication:write", "communication:read"],
  };
  const actorB = {
    userId: userB.id,
    role: "CLIENT",
    email: userB.email,
    companyId: companyB.id,
    permissions: ["files:upload", "files:read", "tasks:read", "invoices:read", "communication:write", "communication:read"],
  };

  // Cross-client project upload must 403
  let crossUploadDenied = false;
  try {
    await filesService.uploadFiles(
      [
        {
          originalname: "secret.txt",
          mimetype: "text/plain",
          size: 5,
          buffer: Buffer.from("hello"),
        },
      ],
      { projectId: projectB.id, clientId: companyB.id },
      actorA,
    );
  } catch (error) {
    crossUploadDenied =
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === FILES_ERROR_CODES.FORBIDDEN;
  }
  assert.equal(crossUploadDenied, true, "cross-client upload must be denied");

  // Own-company upload allowed
  const uploaded = await filesService.uploadFiles(
    [
      {
        originalname: "brief.txt",
        mimetype: "text/plain",
        size: 12,
        buffer: Buffer.from("client brief"),
      },
    ],
    { projectId: projectA.id, clientId: companyA.id },
    actorA,
  );
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0]!.clientId, companyA.id);
  assert.equal(uploaded[0]!.projectId, projectA.id);

  // Task feedback allowed for own task
  const comment = await tasksService.addComment(
    taskA.id,
    { body: "Please revise the hero section" },
    { userId: userA.id, role: "CLIENT", email: userA.email },
  );
  assert.ok(comment.id);

  // Entity comment on own project
  const projectComment = await communicationService.createComment(
    {
      entityType: "PROJECT",
      entityId: projectA.id,
      body: "Change request: update brand colors",
    },
    {
      userId: userA.id,
      role: "CLIENT",
      email: userA.email,
      companyId: companyA.id,
      permissions: actorA.permissions,
    },
  );
  assert.ok(projectComment.id);

  // Cross-client entity comment denied
  let crossCommentDenied = false;
  try {
    await communicationService.createComment(
      {
        entityType: "PROJECT",
        entityId: projectB.id,
        body: "should fail",
      },
      {
        userId: userA.id,
        role: "CLIENT",
        email: userA.email,
        companyId: companyA.id,
        permissions: actorA.permissions,
      },
    );
  } catch {
    crossCommentDenied = true;
  }
  assert.equal(crossCommentDenied, true);

  // Offline payment notice
  const noticed = await invoicesService.reportPaymentNotice(
    invoiceA.id,
    { note: "Paid via bank transfer ref HARD-001" },
    { userId: userA.id, role: "CLIENT", email: userA.email },
  );
  assert.ok(
    (noticed.paymentHistory ?? []).some((h) =>
      (h.note ?? "").includes("Offline payment notice"),
    ),
  );

  // B still cannot see A's invoice
  let crossInvoiceDenied = false;
  try {
    await invoicesService.getById(invoiceA.id, {
      userId: userB.id,
      role: "CLIENT",
      email: userB.email,
    });
  } catch {
    crossInvoiceDenied = true;
  }
  assert.equal(crossInvoiceDenied, true);

  await cleanup();
  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "client_upload_own_project",
          "cross_client_upload_denied",
          "client_task_feedback",
          "client_project_feedback",
          "cross_client_comment_denied",
          "offline_payment_notice",
          "cross_client_invoice_denied",
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
      // ignore
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
