/**
 * Proves Prisma rejects "__none__" on UUID columns (Client Calendar 500 root cause)
 * and accepts empty `id: { in: [] }` / attendee-only scopes.
 *
 * Run: npx tsx apps/api/scripts/reproduce-calendar-client-uuid-scope.ts
 */
import { prisma } from "@enterprise/database";

async function main() {
  try {
    await prisma.calendarEvent.findMany({ where: { id: "__none__" }, take: 1 });
    console.log("UNEXPECTED: __none__ did not throw");
    process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("REPRO_OK __none__ throws:", message.slice(0, 180));
  }

  const empty = await prisma.calendarEvent.findMany({
    where: { id: { in: [] } },
    take: 1,
  });
  console.log("SAFE_OK empty in[] =>", empty.length);

  const invitedOnly = await prisma.calendarEvent.findMany({
    where: {
      AND: [
        { isPrivate: false },
        {
          attendees: {
            some: { userId: "11111111-1111-4111-8111-111111111111" },
          },
        },
      ],
    },
    take: 1,
  });
  console.log("CLIENT_SCOPE_OK invited-only =>", invitedOnly.length);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
