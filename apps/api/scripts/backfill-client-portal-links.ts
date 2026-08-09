/**
 * Production-safe CLIENT → Client CRM backfill.
 *
 * - Only links when an active Client CRM row exists with the same email
 * - Never auto-creates Client records (no duplicates / fake companies)
 * - Unmatched accounts are reported for Admin manual linking
 *
 * Dry-run by default. Apply with --apply
 *
 *   npx tsx apps/api/scripts/backfill-client-portal-links.ts
 *   npx tsx apps/api/scripts/backfill-client-portal-links.ts --apply
 */
import { prisma } from "@enterprise/database";

import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";

const apply = process.argv.includes("--apply");

type Candidate = {
  id: string;
  email: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
  status: string;
};

async function main() {
  const users = (await prisma.user.findMany({
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
      status: true,
    },
    orderBy: { createdAt: "asc" },
  })) as Candidate[];

  const matchable: Array<
    Candidate & { matchedClientId: string; matchedCompanyName: string }
  > = [];
  const needsAdminReview: Array<
    Candidate & { reason: string }
  > = [];

  for (const user of users) {
    const email = user.email.trim().toLowerCase();
    const matched = await prisma.client.findFirst({
      where: { email, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, companyName: true },
    });

    if (matched) {
      matchable.push({
        ...user,
        matchedClientId: matched.id,
        matchedCompanyName: matched.companyName,
      });
    } else {
      needsAdminReview.push({
        ...user,
        reason:
          "No active Client CRM row with the same email — do not auto-create; Admin must link manually.",
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        policy: "email-match-only-no-create",
        totals: {
          unlinkedCandidates: users.length,
          matchable: matchable.length,
          needsAdminReview: needsAdminReview.length,
        },
        matchable: matchable.map((u) => ({
          userId: u.id,
          email: u.email,
          status: u.status,
          matchedClientId: u.matchedClientId,
          matchedCompanyName: u.matchedCompanyName,
        })),
        needsAdminReview: needsAdminReview.map((u) => ({
          userId: u.id,
          email: u.email,
          status: u.status,
          reason: u.reason,
        })),
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log(
      "Re-run with --apply to link matchable accounts only (no Client create).",
    );
    return;
  }

  const linked: Array<Record<string, unknown>> = [];
  const failed: Array<Record<string, unknown>> = [];

  for (const user of matchable) {
    try {
      const result = await ensurePortalCompanyLink(
        user.id,
        { userId: "backfill", ipAddress: null, userAgent: "backfill-client-portal-links" },
        { createIfMissing: false },
      );
      if (!result?.companyId) {
        failed.push({
          userId: user.id,
          email: user.email,
          error: "ensurePortalCompanyLink returned null unexpectedly",
        });
        continue;
      }
      linked.push({
        userId: user.id,
        email: user.email,
        companyId: result.companyId,
        companyName: result.companyName,
        linkedByEmail: result.linkedByEmail,
        alreadyLinked: result.alreadyLinked,
        createdClient: result.createdClient,
      });
    } catch (error) {
      failed.push({
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const remaining = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { code: "CLIENT" },
      OR: [
        { companyId: null },
        { company: { is: null } },
        { company: { deletedAt: { not: null } } },
      ],
    },
    select: { id: true, email: true, status: true },
    orderBy: { email: "asc" },
  });

  const remainingMatchable: string[] = [];
  for (const user of remaining) {
    const matched = await prisma.client.findFirst({
      where: { email: user.email.trim().toLowerCase(), deletedAt: null },
      select: { id: true },
    });
    if (matched) remainingMatchable.push(user.email);
  }

  console.log(
    JSON.stringify(
      {
        applied: true,
        linkedCount: linked.length,
        failedCount: failed.length,
        linked,
        failed,
        remainingUnlinked: remaining.length,
        remainingUnlinkedEmails: remaining.map((u) => u.email),
        remainingEligibleMatchable: remainingMatchable.length,
        remainingEligibleMatchableEmails: remainingMatchable,
        needsAdminReviewCount: needsAdminReview.length,
        verification: {
          noEligibleMatchableLeft: remainingMatchable.length === 0,
          note:
            remaining.length > 0
              ? "Some CLIENT accounts remain unlinked because no matching Client CRM email exists — Admin linking required."
              : "All CLIENT accounts are linked.",
        },
      },
      null,
      2,
    ),
  );

  if (remainingMatchable.length > 0 || failed.length > 0) {
    process.exitCode = 1;
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
