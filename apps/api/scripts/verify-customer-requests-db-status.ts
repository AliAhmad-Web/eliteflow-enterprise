/**
 * Phase 2 DB/RBAC status check (Supabase). Read-only.
 * npx tsx --env-file=apps/api/.env apps/api/scripts/verify-customer-requests-db-status.ts
 */
import { prisma } from "@enterprise/database";

async function main() {
  const migrations = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null }>
  >`
    SELECT migration_name, finished_at
    FROM _prisma_migrations
    WHERE migration_name LIKE '%customer_requests%'
    ORDER BY finished_at DESC
  `;

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('customer_requests', 'customer_request_attachments')
    ORDER BY table_name
  `;

  const perms = await prisma.permission.findMany({
    where: { key: { startsWith: "customer-requests:" } },
    select: { key: true },
    orderBy: { key: "asc" },
  });

  const clientRole = await prisma.role.findUnique({
    where: { code: "CLIENT" },
    include: {
      rolePermissions: { include: { permission: { select: { key: true } } } },
    },
  });
  const clientKeys =
    clientRole?.rolePermissions.map((rp) => rp.permission.key).sort() ?? [];

  const adminRole = await prisma.role.findUnique({
    where: { code: "ADMIN" },
    include: {
      rolePermissions: { include: { permission: { select: { key: true } } } },
    },
  });
  const adminKeys =
    adminRole?.rolePermissions.map((rp) => rp.permission.key).sort() ?? [];

  console.log(
    JSON.stringify(
      {
        migrations,
        tables,
        permissions: perms.map((p) => p.key),
        clientHasCreate: clientKeys.includes("customer-requests:create"),
        clientHasRead: clientKeys.includes("customer-requests:read"),
        clientHasReview: clientKeys.includes("customer-requests:review"),
        clientHasProjectsWrite: clientKeys.includes("projects:write"),
        clientHasTasksWrite: clientKeys.includes("tasks:write"),
        clientHasInvoicesWrite: clientKeys.includes("invoices:write"),
        adminHasReview: adminKeys.includes("customer-requests:review"),
      },
      null,
      2,
    ),
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
