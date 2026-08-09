/**
 * One-shot backfill: ensure existing CLIENT users with null/dangling companyId
 * get a Client CRM link (email match or create).
 *
 * Dry-run by default. Apply with --apply
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/backfill-client-portal-links.ts
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/backfill-client-portal-links.ts --apply
 */
import { prisma } from "@enterprise/database";

import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";

const apply = process.argv.includes("--apply");

async function main() {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { code: "CLIENT" },
      OR: [
        { companyId: null },
        { company: { is: null } },
        { company: { deletedAt: { not: null } } },
      ],
    },
    select: {
      id: true,
      email: true,
      companyId: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        candidates: users.length,
        sample: users.slice(0, 10).map((u) => ({
          id: u.id,
          email: u.email,
          companyId: u.companyId,
        })),
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("Re-run with --apply to link/create companies.");
    return;
  }

  const results: Array<Record<string, unknown>> = [];
  for (const user of users) {
    const result = await ensurePortalCompanyLink(user.id, { userId: "backfill" });
    results.push({
      userId: user.id,
      email: user.email,
      result,
    });
  }

  console.log(JSON.stringify({ applied: results.length, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
