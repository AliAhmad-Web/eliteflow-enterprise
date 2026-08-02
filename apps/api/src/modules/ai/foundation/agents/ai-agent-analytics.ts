/**
 * Immutable Enterprise Agent Analytics model.
 * Runtime observability snapshot — never executes agents or tools.
 * Safe fields only — never carries tokens, secrets, prompts, or database ids.
 */

export interface AiAgentAnalyticsParticipant {
  readonly name: string;
  readonly type: string;
}

export interface AiAgentAnalyticsMetrics {
  readonly toolCount: number;
  readonly executedCount: number;
  readonly skippedCount: number;
  readonly failedCount: number;
  readonly supportingAgentCount: number;
  readonly plannedWaveCount: number;
  readonly allowedToolBoundaryCount: number;
}

/**
 * Frozen analytics attached to pipeline state after Tool Audit.
 */
export interface AiAgentAnalytics {
  readonly activeAgent: AiAgentAnalyticsParticipant | null;
  readonly supportingAgents: readonly AiAgentAnalyticsParticipant[];
  readonly executionStart: string;
  readonly executionEnd: string;
  readonly durationMs: number;
  readonly decisionConfidence: number | null;
  readonly selectedTools: readonly string[];
  readonly executedTools: readonly string[];
  readonly skippedTools: readonly string[];
  readonly securityLevel: string | null;
  readonly reasoningLevel: string | null;
  readonly responseMode: string | null;
  readonly collaborationMode: string | null;
  readonly success: boolean;
  readonly warnings: readonly string[];
  readonly metrics: AiAgentAnalyticsMetrics;
}
