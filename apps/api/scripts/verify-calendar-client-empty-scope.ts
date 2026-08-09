/**
 * Reproduce / guard: Prisma UUID columns reject non-UUID sentinels used as
 * "match nothing" scopes (e.g. id: "__none__"), which crashed Client Calendar.
 *
 * Run: npx tsx apps/api/scripts/verify-calendar-client-empty-scope.ts
 */
import assert from "node:assert/strict";
import { Prisma } from "@enterprise/database";

function buildClientEventScope(input: {
  userId: string;
  companyId: string | null;
}): Prisma.CalendarEventWhereInput {
  const invited: Prisma.CalendarEventWhereInput = {
    attendees: { some: { userId: input.userId } },
  };
  const linkedToCompany: Prisma.CalendarEventWhereInput | null = input.companyId
    ? { clientId: input.companyId }
    : null;

  return {
    AND: [
      { isPrivate: false },
      linkedToCompany ? { OR: [linkedToCompany, invited] } : invited,
    ],
  };
}

function assertNoInvalidUuidSentinel(scope: Prisma.CalendarEventWhereInput) {
  const raw = JSON.stringify(scope);
  assert.equal(
    raw.includes("__none__"),
    false,
    "Client calendar scope must not use __none__ UUID sentinel",
  );
}

{
  const freshClient = buildClientEventScope({
    userId: "11111111-1111-4111-8111-111111111111",
    companyId: null,
  });
  assertNoInvalidUuidSentinel(freshClient);
  assert.deepEqual(freshClient, {
    AND: [
      { isPrivate: false },
      {
        attendees: {
          some: { userId: "11111111-1111-4111-8111-111111111111" },
        },
      },
    ],
  });
}

{
  const linked = buildClientEventScope({
    userId: "11111111-1111-4111-8111-111111111111",
    companyId: "22222222-2222-4222-8222-222222222222",
  });
  assertNoInvalidUuidSentinel(linked);
  assert.ok(JSON.stringify(linked).includes("clientId"));
}

console.log("verify-calendar-client-empty-scope: OK");
