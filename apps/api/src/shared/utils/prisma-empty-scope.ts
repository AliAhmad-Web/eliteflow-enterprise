/**
 * Match-nothing filter safe for Prisma `@db.Uuid` id columns.
 * Do NOT use string sentinels like `"__none__"` — they throw at query time and
 * surface as API 500 "An unexpected error occurred" (e.g. Client Calendar).
 */
export function emptyUuidIdScope(): { id: { in: string[] } } {
  return { id: { in: [] } };
}
