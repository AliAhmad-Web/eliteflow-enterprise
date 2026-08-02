/**
 * Memory telemetry events (safe metadata only).
 */

export interface AiMemoryTelemetryEvent {
  readonly name: string;
  readonly value: string;
  readonly at: string;
}

export interface AiMemoryTelemetry {
  readonly events: readonly AiMemoryTelemetryEvent[];
  readonly summary: string;
}

export function buildMemoryTelemetry(input: {
  readonly orchestrationSummary: string;
  readonly healthLevel?: string | null;
  readonly optimizationSummary?: string | null;
  readonly diagnosticCount?: number;
}): AiMemoryTelemetry {
  const at = new Date().toISOString();
  const events: AiMemoryTelemetryEvent[] = [
    Object.freeze({
      name: "memory.orchestration",
      value: input.orchestrationSummary.slice(0, 120),
      at,
    }),
  ];
  if (input.healthLevel) {
    events.push(
      Object.freeze({
        name: "memory.health",
        value: input.healthLevel,
        at,
      }),
    );
  }
  if (input.optimizationSummary) {
    events.push(
      Object.freeze({
        name: "memory.optimization",
        value: input.optimizationSummary.slice(0, 120),
        at,
      }),
    );
  }
  if (input.diagnosticCount != null) {
    events.push(
      Object.freeze({
        name: "memory.diagnostics",
        value: String(input.diagnosticCount),
        at,
      }),
    );
  }

  return Object.freeze({
    events: Object.freeze(events),
    summary: `${events.length} telemetry event(s)`,
  });
}
