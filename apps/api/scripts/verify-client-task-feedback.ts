/**
 * Client Portal task feedback verification (service-layer + RBAC isolation).
 *
 * Confirms CLIENT can comment on company-scoped tasks, cannot cross companies,
 * validation rejects empty/oversized bodies, staff comments still work, and
 * audit events are written.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-client-task-feedback.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ClientStatus, prisma, UserStatus } from "@enterprise/database";
import { createTaskCommentSchema } from "@enterprise/shared";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { tasksService } from "../src/modules/tasks/tasks.service.js";
import { TASK_AUDIT_ACTIONS } from "../src/modules/tasks/tasks.audit.js";
import { TASKS_ERROR_CODES } from "../src/modules/tasks/tasks.errors.js";

const RUN = randomUUID().slice(0, 8);
const PREFIX = `verify.task.fb.${RUN}`;

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
  const userIds = users.map((u) => u.id);

  if (clientIds.length) {
    await prisma.taskComment
      .deleteMany({
        where: { task: { project: { clientId: { in: clientIds } } } },
      })
      .catch(() => undefined);
    await prisma.taskActivityLog
      .deleteMany({
        where: { task: { project: { clientId: { in: clientIds } } } },
      })
      .catch(() => undefined);
    await prisma.task.deleteMany({
      where: { project: { clientId: { in: clientIds } } },
    });
    await prisma.project.deleteMany({ where: { clientId: { in: clientIds } } });
  }

  if (userIds.length) {
    await prisma.auditLog
      .deleteMany({ where: { userId: { in: userIds } } })
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (clientIds.length) {
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  }
}

async function main() {
  await cleanup();

  const clientRole = await prisma.role.findUnique({ where: { code: "CLIENT" } });
  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  const employeeRole = await prisma.role.findUnique({
    where: { code: "EMPLOYEE" },
  });
  assert.ok(clientRole && adminRole && employeeRole);

  const companyA = await prisma.client.create({
    data: {
      companyName: `${PREFIX} Co A`,
      contactName: "Contact A",
      email: email("co-a"),
      status: ClientStatus.ACTIVE,
    },
  });
  const companyB = await prisma.client.create({
    data: {
      companyName: `${PREFIX} Co B`,
      contactName: "Contact B",
      email: email("co-b"),
      status: ClientStatus.ACTIVE,
    },
  });

  const userA = await authRepository.createUser({
    email: email("client-a"),
    passwordHash: null,
    firstName: "Client",
    lastName: "A",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const userB = await authRepository.createUser({
    email: email("client-b"),
    passwordHash: null,
    firstName: "Client",
    lastName: "B",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const admin = await authRepository.createUser({
    email: email("admin"),
    passwordHash: null,
    firstName: "Admin",
    lastName: "User",
    roleId: adminRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  const employee = await authRepository.createUser({
    email: email("employee"),
    passwordHash: null,
    firstName: "Emp",
    lastName: "User",
    roleId: employeeRole.id,
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
      name: `${PREFIX} Project A`,
      clientId: companyA.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 10,
    },
  });
  const projectB = await prisma.project.create({
    data: {
      name: `${PREFIX} Project B`,
      clientId: companyB.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      progress: 10,
    },
  });

  const taskA = await prisma.task.create({
    data: {
      title: `${PREFIX} Task A`,
      projectId: projectA.id,
      status: "TODO",
      priority: "MEDIUM",
      assignedToId: employee.id,
    },
  });
  const taskB = await prisma.task.create({
    data: {
      title: `${PREFIX} Task B`,
      projectId: projectB.id,
      status: "TODO",
      priority: "MEDIUM",
    },
  });
  const taskUnassigned = await prisma.task.create({
    data: {
      title: `${PREFIX} Unassigned`,
      projectId: projectA.id,
      status: "TODO",
      priority: "LOW",
    },
  });

  const actorClientA = {
    userId: userA.id,
    role: "CLIENT",
    email: userA.email,
  };
  const actorAdmin = {
    userId: admin.id,
    role: "ADMIN",
    email: admin.email,
  };
  const actorEmployee = {
    userId: employee.id,
    role: "EMPLOYEE",
    email: employee.email,
  };

  // 1) CLIENT can submit feedback on own-company task
  const feedback = await tasksService.addComment(
    taskA.id,
    { body: "Please revise the deliverable timeline" },
    actorClientA,
  );
  assert.ok(feedback.id);
  assert.equal(feedback.body.includes("revise"), true);

  // 2) Feedback appears on task detail
  const reloaded = await tasksService.getById(taskA.id, actorClientA);
  assert.ok((reloaded.comments ?? []).some((c) => c.id === feedback.id));

  // 3) Cross-company task → not found (isolation)
  let crossDenied = false;
  let crossCode: string | undefined;
  try {
    await tasksService.addComment(
      taskB.id,
      { body: "should not work" },
      actorClientA,
    );
  } catch (error) {
    crossDenied = true;
    if (error && typeof error === "object" && "code" in error) {
      crossCode = String((error as { code: string }).code);
    }
  }
  assert.equal(crossDenied, true);
  assert.equal(crossCode, TASKS_ERROR_CODES.NOT_FOUND);

  // 3b) Unlinked CLIENT → 403 (distinct from scoped 404)
  const unlinkedUser = await authRepository.createUser({
    email: email("client-unlinked"),
    passwordHash: null,
    firstName: "Client",
    lastName: "Unlinked",
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  let unlinkedDenied = false;
  let unlinkedCode: string | undefined;
  try {
    await tasksService.addComment(
      taskA.id,
      { body: "unlinked should fail" },
      {
        userId: unlinkedUser.id,
        role: "CLIENT",
        email: unlinkedUser.email,
      },
    );
  } catch (error) {
    unlinkedDenied = true;
    if (error && typeof error === "object" && "code" in error) {
      unlinkedCode = String((error as { code: string }).code);
    }
  }
  assert.equal(unlinkedDenied, true);
  assert.equal(unlinkedCode, TASKS_ERROR_CODES.FORBIDDEN);

  // 4) Schema rejects empty / oversized; ignores spoof fields beyond body
  assert.equal(createTaskCommentSchema.safeParse({ body: "" }).success, false);
  assert.equal(
    createTaskCommentSchema.safeParse({ body: "   " }).success,
    false,
  );
  assert.equal(
    createTaskCommentSchema.safeParse({ body: "x".repeat(4001) }).success,
    false,
  );
  const spoofParse = createTaskCommentSchema.safeParse({
    body: "legit body",
    companyId: companyB.id,
    clientId: companyB.id,
  });
  assert.equal(spoofParse.success, true);

  // 5) ADMIN can still comment
  const adminComment = await tasksService.addComment(
    taskA.id,
    { body: "Admin acknowledged client feedback" },
    actorAdmin,
  );
  assert.ok(adminComment.id);

  // 6) EMPLOYEE can comment on assigned task
  const empComment = await tasksService.addComment(
    taskA.id,
    { body: "Employee update on assigned task" },
    actorEmployee,
  );
  assert.ok(empComment.id);

  // 7) EMPLOYEE cannot access unassigned task (scoped to assignee → 404)
  let empDenied = false;
  let empCode: string | undefined;
  try {
    await tasksService.addComment(
      taskUnassigned.id,
      { body: "not mine" },
      actorEmployee,
    );
  } catch (error) {
    empDenied = true;
    if (error && typeof error === "object" && "code" in error) {
      empCode = String((error as { code: string }).code);
    }
  }
  assert.equal(empDenied, true);
  assert.equal(empCode, TASKS_ERROR_CODES.NOT_FOUND);

  // 8) Audit event for CLIENT feedback
  const audits = await prisma.auditLog.findMany({
    where: {
      userId: userA.id,
      action: TASK_AUDIT_ACTIONS.COMMENT,
      resourceId: taskA.id,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  assert.ok(audits.length >= 1);
  const meta = audits[0]!.metadata as Record<string, unknown> | null;
  assert.equal(meta?.fromClient, true);
  assert.equal(meta?.companyId, companyA.id);

  // 9) Route allows CLIENT via TASKS_READ (static contract)
  const routesPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/modules/tasks/tasks.routes.ts",
  );
  const routesSrc = fs.readFileSync(routesPath, "utf8");
  const commentsBlock = routesSrc.slice(
    routesSrc.indexOf("/:id/comments"),
    routesSrc.indexOf("/:id/activity"),
  );
  assert.match(commentsBlock, /UserRole\.CLIENT/);
  assert.match(commentsBlock, /PERMISSIONS\.TASKS_READ/);
  assert.doesNotMatch(commentsBlock, /PERMISSIONS\.TASKS_WRITE/);

  console.log("PASS verify-client-task-feedback");
  await cleanup();
}

main()
  .catch(async (err) => {
    console.error(err);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
