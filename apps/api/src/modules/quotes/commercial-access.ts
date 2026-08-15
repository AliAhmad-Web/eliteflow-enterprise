import { prisma } from "@enterprise/database";

const EMPTY_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Customer workspace unlocks only after the first installment (advance)
 * is paid via admin-verified payments, or the project is already started.
 */
export async function findClientUnlockedProjectIds(
  clientCompanyId: string | null | undefined,
): Promise<string[]> {
  if (!clientCompanyId) return [];

  const [started, paidFirst] = await Promise.all([
    prisma.project.findMany({
      where: {
        clientId: clientCompanyId,
        deletedAt: null,
        status: { in: ["IN_PROGRESS", "COMPLETED", "ON_HOLD"] },
      },
      select: { id: true },
    }),
    prisma.paymentScheduleItem.findMany({
      where: {
        sortOrder: 0,
        quote: {
          clientId: clientCompanyId,
          deletedAt: null,
          status: "APPROVED",
        },
        invoice: { deletedAt: null, paymentStatus: "PAID" },
      },
      select: { quote: { select: { projectId: true } } },
    }),
  ]);

  return [
    ...new Set([
      ...started.map((item) => item.id),
      ...paidFirst.map((item) => item.quote.projectId),
    ]),
  ];
}

export function clientProjectScopeFilter(
  clientCompanyId: string,
  unlockedProjectIds: string[],
) {
  return {
    clientId: clientCompanyId,
    id: {
      in: unlockedProjectIds.length > 0 ? unlockedProjectIds : [EMPTY_ID],
    },
  };
}
