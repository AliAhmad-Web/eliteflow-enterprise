/**
 * Parse a public env flag string into a boolean.
 * Empty / unset → defaultValue (safe OFF for AI UI flags).
 */
export function parseEnvFlag(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined) return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return defaultValue;

  switch (normalized) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return defaultValue;
  }
}
