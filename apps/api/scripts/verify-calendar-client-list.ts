/**
 * Integration: CalendarService.listEvents for CLIENT without companyId must
 * return empty items (not throw Prisma UUID error).
 *
 * Run: npx tsx apps/api/scripts/verify-calendar-client-list.ts
 */
import assert from "node:assert/strict";
import { prisma } from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { calendarService } from "../src/modules/calendar/calendar.service.js";

async function main() {
  const clientUser = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      companyId: null,
      role: { code: UserRole.CLIENT },
    },
    select: {
      id: true,
      email: true,
      companyId: true,
      role: {
        select: {
          rolePermissions: {
            select: { permission: { select: { key: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  assert.ok(clientUser, "Need at least one CLIENT user with null companyId");

  const permissions = clientUser.role.rolePermissions.map(
    (rp) => rp.permission.key,
  );
  assert.ok(
    permissions.includes("calendar:read") || permissions.includes("*"),
    "CLIENT must have calendar:read",
  );

  const result = await calendarService.listEvents(
    {
      view: "month",
      from: new Date(Date.UTC(2026, 7, 1)).toISOString(),
      to: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)).toISOString(),
      search: "",
      page: 1,
      limit: 50,
    },
    {
      userId: clientUser.id,
      role: UserRole.CLIENT,
      email: clientUser.email,
      companyId: null,
      permissions,
    },
  );

  assert.ok(Array.isArray(result.items));
  assert.equal(typeof result.pagination.total, "number");
  console.log(
    `verify-calendar-client-list: OK user=${clientUser.email} items=${result.items.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
