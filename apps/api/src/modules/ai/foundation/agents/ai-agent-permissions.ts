/**
 * Immutable Enterprise Agent Permission model.
 * Defines agent permission boundaries — never executes tools or agents.
 * Safe fields only — never carries tokens, secrets, or database ids.
 */

export type AiAgentSecurityLevel =
  | "standard"
  | "elevated"
  | "enterprise"
  | "restricted";

/**
 * Frozen permission boundaries attached to pipeline state.
 */
export interface AiAgentPermissions {
  readonly allowedTools: readonly string[];
  readonly deniedTools: readonly string[];
  readonly allowedActions: readonly string[];
  readonly deniedActions: readonly string[];
  readonly allowedEntityTypes: readonly string[];
  readonly deniedEntityTypes: readonly string[];
  readonly securityLevel: AiAgentSecurityLevel;
  /** Safe human-readable rationale (no secrets / private permission keys). */
  readonly permissionReason: string;
}
