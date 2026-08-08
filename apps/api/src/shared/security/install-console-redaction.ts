import { formatLogArgs } from "@enterprise/shared";

let installed = false;

/**
 * Patch console.* so all application / error / request log lines are scrubbed.
 * Idempotent — safe to call once at process bootstrap.
 */
export function installConsoleRedaction(): void {
  if (installed) return;
  installed = true;

  const methods = ["log", "info", "warn", "error", "debug"] as const;

  for (const method of methods) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...formatLogArgs(args));
    };
  }
}
