/**
 * Working memory expiration helpers.
 */

export function isWorkingMemoryExpired(input: {
  readonly expiresAt: string | null;
  readonly now?: number;
}): boolean {
  if (!input.expiresAt) return false;
  const ts = Date.parse(input.expiresAt);
  if (Number.isNaN(ts)) return false;
  return ts <= (input.now ?? Date.now());
}

export function resolveWorkingMemoryExpiresAt(input: {
  readonly kind: string;
  readonly now?: number;
}): string | null {
  const now = input.now ?? Date.now();
  const ttlMs =
    input.kind === "objective"
      ? 60 * 60 * 1000
      : input.kind === "task"
        ? 45 * 60 * 1000
        : input.kind === "focus"
          ? 30 * 60 * 1000
          : 15 * 60 * 1000;
  return new Date(now + ttlMs).toISOString();
}

export function filterExpiredWorkingEntries<
  T extends { readonly expiresAt: string | null },
>(entries: readonly T[], now = Date.now()): readonly T[] {
  return Object.freeze(
    entries.filter((e) => !isWorkingMemoryExpired({ expiresAt: e.expiresAt, now })),
  );
}
