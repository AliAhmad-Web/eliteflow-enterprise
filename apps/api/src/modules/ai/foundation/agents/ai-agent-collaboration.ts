/**
 * Immutable Enterprise Multi-Agent Collaboration model.
 * Describes which agents assist a request — never executes agents or tools.
 * Safe fields only — never carries tokens, secrets, or database ids.
 */

import type { AiAgentType } from "./ai-agent.js";

export type AiAgentCollaborationMode =
  | "solo"
  | "sequential"
  | "advisory"
  | "parallel-advisory";

export type AiAgentCollaborationRole = "primary" | "supporting";

/**
 * Public participant descriptor (display name + type only).
 */
export interface AiAgentCollaborationParticipant {
  readonly name: string;
  readonly type: AiAgentType;
  readonly role: AiAgentCollaborationRole;
}

/**
 * Frozen collaboration plan attached to pipeline state.
 */
export interface AiAgentCollaboration {
  readonly primaryAgent: AiAgentCollaborationParticipant;
  readonly supportingAgents: readonly AiAgentCollaborationParticipant[];
  readonly collaborationMode: AiAgentCollaborationMode;
  /** Safe human-readable rationale (no secrets / ids). */
  readonly collaborationReason: string;
  /** Ordered participant display names (primary last when advisory). */
  readonly executionOrder: readonly string[];
  /** Safe shared capability labels (actions / public tool keys). */
  readonly sharedCapabilities: readonly string[];
  /** 0–1 confidence in this collaboration plan. */
  readonly confidence: number;
}
