export function seedLog(message: string): void {
  console.log(`[seed] ${message}`);
}

export function seedError(message: string, error?: unknown): never {
  console.error(`[seed] ERROR: ${message}`, error);
  process.exit(1);
}
