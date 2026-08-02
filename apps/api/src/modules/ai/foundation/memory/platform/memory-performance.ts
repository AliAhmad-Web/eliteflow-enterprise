/**
 * Memory performance metrics.
 */

export interface AiMemoryPerformanceMetrics {
  readonly subsystemCount: number;
  readonly enabledSubsystemCount: number;
  readonly optimizationGain: number;
  readonly retrievalMode: "adaptive" | "standard" | "off";
  readonly estimatedLatencyClass: "low" | "medium" | "high";
  readonly summary: string;
}

export function buildMemoryPerformanceMetrics(input: {
  readonly subsystemCount: number;
  readonly enabledSubsystemCount: number;
  readonly duplicatesRemoved: number;
  readonly staleRemoved: number;
  readonly adaptiveRetrieval: boolean;
  readonly retrievalEnabled: boolean;
}): AiMemoryPerformanceMetrics {
  const optimizationGain = Math.min(
    1,
    (input.duplicatesRemoved + input.staleRemoved) * 0.05,
  );
  const retrievalMode = !input.retrievalEnabled
    ? "off"
    : input.adaptiveRetrieval
      ? "adaptive"
      : "standard";
  const estimatedLatencyClass =
    input.enabledSubsystemCount <= 4
      ? "low"
      : input.enabledSubsystemCount <= 8
        ? "medium"
        : "high";

  return Object.freeze({
    subsystemCount: input.subsystemCount,
    enabledSubsystemCount: input.enabledSubsystemCount,
    optimizationGain: Math.round(optimizationGain * 1000) / 1000,
    retrievalMode,
    estimatedLatencyClass,
    summary: `Performance ${estimatedLatencyClass}; gain=${optimizationGain.toFixed(2)}; retrieval=${retrievalMode}`,
  });
}
