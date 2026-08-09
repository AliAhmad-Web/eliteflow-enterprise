/**
 * Verify Client Portal dashboard has no dummy CLIENT_* sources and that
 * company-scoped project/invoice/task isolation holds after unlink.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-client-portal-dashboard.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { ClientStatus, prisma, UserStatus } from "@enterprise/database";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { projectsService } from "../src/modules/projects/projects.service.js";
import { invoicesService } from "../src/modules/invoices/invoices.service.js";
import { tasksService } from "../src/modules/tasks/tasks.service.js";

const RUN = randomUUID().slice(0, 8);
const PREFIX = `verify.portal.dash.${RUN}`;

function email(local: string) {
  return `${PREFIX}.${local}@eliteflow.test`;
}

function assertNoDummySources() {
  const root = join(process.cwd(), "apps/web/src/features/dashboard");
  const files = [
    "data/role-dashboards.dummy.ts",
    "components/client-portal-dashboard.tsx",
    "components/portal-home-content.tsx",
  ];
  const banned = [
    "CLIENT_KPI_STATS",
    "CLIENT_PROJECTS",
    "CLIENT_INVOICES",
    "CLIENT_UPDATES",
    "Acme Redesign",
    "Invoice #1042",
    "Sample project update",
  ];
  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    for (const token of banned) {
      assert.equal(
        text.includes(token),
        false,
        `${rel} must not contain dummy token: ${token}`,
      );
    }
  }
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true, companyId: true },
  });
  const companyIds = [
    ...new Set(
      (
        await prisma.client.findMany({
          where: {
            OR: [
              { email: { startsWith: PREFIX } },
              { id: { in: users.map((u) => u.companyId).filter(Boolean) as string[] } },
            ],
          },
          select: { id: true },
        })
      ).map((c) => c.id),
    ),
  ];

  if (companyIds.length) {
    await prisma.task.deleteMany({
      where: { project: { clientId: { in: companyIds } } },
    });
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { clientId: { in: companyIds } } },
    });
    await prisma.invoice.deleteMany({
      where: { clientId: { in: companyIds } },
    });
    await prisma.projectMember.deleteMany({
      where: { project: { clientId: { in: companyIds } } },
    });
    await prisma.project.deleteMany({
      where: { clientId: { in: companyIds } },
    });
  }
  if (users.length) {
    await prisma.user.deleteMany({
      where: { id: { in: users.map((u) => u.id) } },
    });
  }
  if (companyIds.length) {
    await prisma.client.deleteMany({ where: { id: { in: companyIds } } });
  }
}

async function main() {
  assertNoDummySources();

  await cleanup();

  const clientRole = await prisma.role.findUnique({ where: { code: "CLIENT" } });
  assert.ok(clientRole);

  const companyA = await prisma.client.create({
    data: {
      companyName: `Dash Co A ${RUN}`,
      contactName: "A",
      email: email("co-a"),
      status: ClientStatus.ACTIVE,
    },
  });
  const companyB = await prisma.client.create({
    data: {
      companyName: `Dash Co B ${RUN}`,
      contactName: "B",
      email: email("co-b"),
      status: ClientStatus.ACTIVE,
    },
  });

  const userA = await authRepository.createUser({
    email: email("user-a"),
    passwordHash: null,
    firstName: "Dash",
    lastName: "A",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const userB = await authRepository.createUser({
    email: email("user-b"),
    passwordHash: null,
    firstName: "Dash",
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
      name: `Dash Project A ${RUN}`,
      clientId: companyA.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 40,
    },
  });
  const projectB = await prisma.project.create({
    data: {
      name: `Dash Project B ${RUN}`,
      clientId: companyB.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 55,
    },
  });
  const invoiceA = await prisma.invoice.create({
    data: {
      invoiceNumber: `DASH-A-${RUN}`,
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
      invoiceNumber: `DASH-B-${RUN}`,
      clientId: companyB.id,
      status: "OVERDUE",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      taxRate: 0,
      discountAmount: 0,
      subtotal: 250,
      taxAmount: 0,
      total: 250,
    },
  });
  const taskA = await prisma.task.create({
    data: {
      title: `Dash Task A ${RUN}`,
      projectId: projectA.id,
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date(),
    },
  });
  const taskB = await prisma.task.create({
    data: {
      title: `Dash Task B ${RUN}`,
      projectId: projectB.id,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date(),
    },
  });

  const actorA = { userId: userA.id, role: "CLIENT", email: userA.email };
  const actorB = { userId: userB.id, role: "CLIENT", email: userB.email };
  const listQuery = {
    search: "",
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
    page: 1,
    limit: 50,
  };

  const projectsA = await projectsService.list(listQuery, actorA);
  assert.ok(projectsA.items.some((p) => p.id === projectA.id));
  assert.equal(projectsA.items.some((p) => p.id === projectB.id), false);

  const invoicesA = await invoicesService.list(listQuery, actorA);
  assert.ok(invoicesA.items.some((i) => i.id === invoiceA.id));
  assert.equal(invoicesA.items.some((i) => i.id === invoiceB.id), false);

  const tasksA = await tasksService.list(
    { ...listQuery, sortBy: "dueDate" },
    actorA,
  );
  assert.ok(tasksA.items.some((t) => t.id === taskA.id));
  assert.equal(tasksA.items.some((t) => t.id === taskB.id), false);

  const statsA = await invoicesService.getStats(actorA);
  assert.ok(statsA.total >= 1);
  assert.ok(typeof statsA.paidAmount === "number");
  assert.ok(typeof statsA.outstandingAmount === "number");
  assert.ok(typeof statsA.overdue === "number");

  // After unlink, A loses company A data
  await prisma.user.update({
    where: { id: userA.id },
    data: { companyId: null },
  });
  const unlinkedActor = { userId: userA.id, role: "CLIENT", email: userA.email };
  const afterProjects = await projectsService.list(listQuery, unlinkedActor);
  assert.equal(afterProjects.items.some((p) => p.id === projectA.id), false);
  const afterTasks = await tasksService.list(
    { ...listQuery, sortBy: "dueDate" },
    unlinkedActor,
  );
  assert.equal(afterTasks.items.some((t) => t.id === taskA.id), false);

  // B still isolated
  const projectsB = await projectsService.list(listQuery, actorB);
  assert.ok(projectsB.items.some((p) => p.id === projectB.id));
  assert.equal(projectsB.items.some((p) => p.id === projectA.id), false);

  await cleanup();
  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "no_client_dummy_dashboard_sources",
          "project_isolation",
          "invoice_isolation",
          "task_isolation",
          "invoice_stats_fields",
          "unlink_hides_company_data",
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
