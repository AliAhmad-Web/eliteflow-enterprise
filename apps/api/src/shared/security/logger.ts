import {
  formatLogArgs,
  sanitizeForLogging,
  scrubSensitiveString,
} from "@enterprise/shared";

type LogMethod = (...args: unknown[]) => void;

function bind(
  method: "log" | "info" | "warn" | "error" | "debug",
): LogMethod {
  return (...args: unknown[]) => {
    const scrubbed = formatLogArgs(args);
    // eslint-disable-next-line no-console -- enterprise logger facade over console
    console[method](...scrubbed);
  };
}

/**
 * Application logger with automatic sensitive-data scrubbing.
 * Prefer this over raw console.* for API code paths.
 */
export const logger = {
  log: bind("log"),
  info: bind("info"),
  warn: bind("warn"),
  error: bind("error"),
  debug: bind("debug"),
  /** Scrub a single free-form line. */
  scrub(message: string): string {
    return scrubSensitiveString(message);
  },
  /** Deep-sanitize a structured payload. */
  sanitize<T>(payload: T): T {
    return sanitizeForLogging(payload);
  },
};
