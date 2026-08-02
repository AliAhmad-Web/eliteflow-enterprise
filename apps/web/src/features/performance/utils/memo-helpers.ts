/**
 * Shared memo / equality helpers for Phase 2 opt-in memoization.
 * Pure utilities — importing them does not change runtime until call sites adopt them.
 */

/** Shallow equality for plain objects (own enumerable keys). */
export function shallowEqualObjects(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!Object.is(a[key], b[key])) return false;
  }

  return true;
}

/** Shallow equality for arrays (element identity). */
export function shallowEqualArrays(
  a: readonly unknown[] | null | undefined,
  b: readonly unknown[] | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Creates a memoized selector: recomputes only when `deps` change by shallow array equality.
 * Useful for expensive derived lists without changing output semantics.
 */
export function createMemoizedSelector<TDeps extends readonly unknown[], TResult>(
  selector: (...deps: TDeps) => TResult,
): (...deps: TDeps) => TResult {
  let lastDeps: TDeps | undefined;
  let lastResult: TResult | undefined;

  return (...deps: TDeps): TResult => {
    if (lastDeps && shallowEqualArrays(lastDeps, deps)) {
      return lastResult as TResult;
    }
    lastDeps = deps;
    lastResult = selector(...deps);
    return lastResult;
  };
}
