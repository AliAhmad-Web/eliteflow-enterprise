/**
 * Business Query reasoning — safe short rationale strings.
 */

export function sanitizeBusinessQueryReason(
  value: string,
  max = 120,
): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function buildBusinessQueryReasons(input: {
  readonly intent?: string | null;
  readonly entity?: string | null;
  readonly filters?: readonly string[];
  readonly moduleName?: string | null;
  readonly extra?: readonly string[];
}): readonly string[] {
  const reasons: string[] = [];

  if (input.intent?.trim()) {
    reasons.push(`intent:${sanitizeBusinessQueryReason(input.intent, 40)}`);
  }
  if (input.entity?.trim()) {
    reasons.push(`entity:${sanitizeBusinessQueryReason(input.entity, 40)}`);
  }
  if (input.moduleName?.trim()) {
    reasons.push(
      `module:${sanitizeBusinessQueryReason(input.moduleName, 40)}`,
    );
  }
  for (const filter of input.filters ?? []) {
    if (filter.trim()) {
      reasons.push(`filter:${sanitizeBusinessQueryReason(filter, 40)}`);
    }
  }
  for (const extra of input.extra ?? []) {
    if (extra.trim()) {
      reasons.push(sanitizeBusinessQueryReason(extra));
    }
  }

  return Object.freeze(
    [...new Set(reasons.map((r) => sanitizeBusinessQueryReason(r)))].slice(
      0,
      12,
    ),
  );
}
