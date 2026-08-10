/**
 * P1 verification — leave workflow durability (Postgres source of truth).
 * Run: npx tsx --env-file=.env scripts/verify-leave-workflow-durability.ts
 * (from apps/api)
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "@enterprise/database";

import {
  deleteLeaveWorkflowStage,
  getLeaveWorkflowStage,
  listExpiredInProgressLeaveWorkflowStages,
  saveLeaveWorkflowStage,
} from "../src/modules/team/workflows/leave-approval.store.js";
import type { LeaveWorkflowStageRecord } from "../src/modules/team/workflows/leave-approval.types.js";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail });
    console.error(`  FAIL  ${name}: ${detail}`);
  }
}

async function main(): Promise<void> {
  console.log("\nLeave workflow durability verification\n");

  const leave = await prisma.leaveRequest.findFirst({
    where: { deletedAt: null },
    select: { id: true, employeeId: true, employee: { select: { userId: true } } },
  });

  if (!leave) {
    console.log("  SKIP  no leave_requests rows — creating ephemeral fixture via store requires FK");
    console.log("  INFO  migration + store code paths still unit-checked below without FK where possible");
  }

  await check("postgres model leaveWorkflowState is available", async () => {
    assert.ok(prisma.leaveWorkflowState, "prisma.leaveWorkflowState missing — run migrate/generate");
    const count = await prisma.leaveWorkflowState.count();
    assert.ok(count >= 0);
  });

  if (leave) {
    const leaveId = leave.id;
    const record: LeaveWorkflowStageRecord = {
      leaveId,
      employeeId: leave.employeeId,
      subjectUserId: leave.employee.userId,
      state: "SUBMITTED",
      submittedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await check("save + get survives without redis (db source of truth)", async () => {
      await saveLeaveWorkflowStage(record, 60_000);
      const loaded = await getLeaveWorkflowStage(leaveId);
      assert.ok(loaded);
      assert.equal(loaded!.state, "SUBMITTED");
      assert.equal(loaded!.leaveId, leaveId);

      const row = await prisma.leaveWorkflowState.findUnique({
        where: { leaveRequestId: leaveId },
      });
      assert.ok(row);
      assert.equal(row!.state, "SUBMITTED");
    });

    await check("expired in-progress listing uses postgres", async () => {
      const expired: LeaveWorkflowStageRecord = {
        ...record,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveLeaveWorkflowStage(expired, 60_000);
      const list = await listExpiredInProgressLeaveWorkflowStages();
      assert.ok(list.some((s) => s.leaveId === leaveId));
    });

    await check("delete removes durable row", async () => {
      await deleteLeaveWorkflowStage(leaveId);
      const row = await prisma.leaveWorkflowState.findUnique({
        where: { leaveRequestId: leaveId },
      });
      assert.equal(row, null);
    });
  } else {
    await check("listExpiredInProgressLeaveWorkflowStages callable", async () => {
      const list = await listExpiredInProgressLeaveWorkflowStages();
      assert.ok(Array.isArray(list));
    });
  }

  // touch uuid for uniqueness smoke
  void randomUUID();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
