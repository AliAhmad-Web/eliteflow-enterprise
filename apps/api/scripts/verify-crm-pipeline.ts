/**
 * CRM MVP verification: pipeline board, stage sync, activities, RBAC permission keys.
 *
 * Run from repo root:
 *   npx tsx apps/api/scripts/verify-crm-pipeline.ts
 *
 * Requires DATABASE_URL. Creates a temporary client then soft-deletes it.
 * Does not delete production business/audit history beyond that temp row's activities.
 */
import assert from "node:assert/strict";

import { prisma } from "@enterprise/database";
import { PERMISSIONS, UserRole } from "@enterprise/shared";

import { clientsService } from "../src/modules/clients/clients.service.js";

async function roleHasPermission(
  roleCode: string,
  permissionKey: string,
): Promise<boolean> {
  const role = await prisma.role.findFirst({
    where: { code: roleCode },
    select: {
      rolePermissions: {
        select: { permission: { select: { key: true } } },
      },
    },
  });
  if (!role) return false;
  const keys = role.rolePermissions.map((rp) => rp.permission.key);
  return keys.includes("*") || keys.includes(permissionKey);
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      role: { code: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
    },
    select: { id: true, email: true, role: { select: { code: true } } },
    orderBy: { createdAt: "asc" },
  });
  assert.ok(admin, "Need an ADMIN/SUPER_ADMIN user for CRM verification");

  const actor = {
    userId: admin.id,
    ipAddress: "127.0.0.1",
    userAgent: "verify-crm-pipeline",
  };

  // RBAC: pipeline/activity routes reuse CLIENTS_READ / CLIENTS_WRITE (no new permission keys).
  assert.equal(
    await roleHasPermission(UserRole.ADMIN, PERMISSIONS.CLIENTS_READ),
    true,
    "ADMIN must have clients:read",
  );
  assert.equal(
    await roleHasPermission(UserRole.ADMIN, PERMISSIONS.CLIENTS_WRITE),
    true,
    "ADMIN must have clients:write",
  );
  assert.equal(
    await roleHasPermission(UserRole.CLIENT, PERMISSIONS.CLIENTS_WRITE),
    false,
    "CLIENT must not have clients:write",
  );

  const stamp = Date.now();
  const created = await clientsService.create(
    {
      companyName: `CRM Verify Co ${stamp}`,
      contactName: "CRM Verifier",
      email: `crm.verify.${stamp}@example.com`,
      phone: "",
      website: "",
      addressLine1: "",
      city: "",
      country: "",
      status: "LEAD",
      pipelineStage: "NEW",
      notes: "verify-crm-pipeline temp",
    },
    admin.id,
    actor,
  );

  assert.equal(created.status, "LEAD");
  assert.equal(created.pipelineStage, "NEW");

  try {
    const board = await clientsService.getPipelineBoard();
    assert.ok(Array.isArray(board.columns));
    assert.equal(board.columns.length, 7);
    assert.ok(board.total >= 1);
    const newCol = board.columns.find((column) => column.stage === "NEW");
    assert.ok(newCol);
    assert.ok(newCol.clients.some((client) => client.id === created.id));

    const contacted = await clientsService.updatePipelineStage(
      created.id,
      "CONTACTED",
      actor,
    );
    assert.equal(contacted.pipelineStage, "CONTACTED");
    assert.equal(contacted.status, "LEAD");

    const won = await clientsService.updatePipelineStage(
      created.id,
      "WON",
      actor,
    );
    assert.equal(won.pipelineStage, "WON");
    assert.equal(won.status, "ACTIVE");

    const lost = await clientsService.updatePipelineStage(
      created.id,
      "LOST",
      actor,
    );
    assert.equal(lost.pipelineStage, "LOST");
    assert.equal(lost.status, "INACTIVE");

    const activity = await clientsService.createActivity(
      created.id,
      {
        type: "CALL",
        title: "Verification call",
        body: "Logged by verify-crm-pipeline",
      },
      actor,
    );
    assert.equal(activity.type, "CALL");
    assert.equal(activity.clientId, created.id);

    const listed = await clientsService.listActivities(created.id, {
      page: 1,
      limit: 20,
    });
    assert.ok(listed.items.some((item) => item.id === activity.id));
    assert.ok(
      listed.items.some((item) => item.type === "STATUS_CHANGE"),
      "pipeline status sync should create STATUS_CHANGE activities",
    );

    await clientsService.deleteActivity(created.id, activity.id, actor);
    const afterDelete = await clientsService.listActivities(created.id, {
      page: 1,
      limit: 20,
    });
    assert.ok(!afterDelete.items.some((item) => item.id === activity.id));

    console.log(
      `verify-crm-pipeline: OK admin=${admin.email} client=${created.id} boardTotal=${board.total}`,
    );
  } finally {
    await clientsService.remove(created.id, actor);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
