/**
 * Permission-filtered business context packet.
 * Context Engine populates metadata only — no CRM/project payloads yet.
 */

import type { AiFoundationSurface } from "./ai-execution-context.js";

/** Explicit entity reference (ids only until data injection ships). */
export interface AiContextEntityRef {
  readonly type: string;
  readonly id: string;
  readonly label?: string;
}

/** Minimized text snippet attached to a prompt (future). */
export interface AiContextSnippet {
  readonly type: string;
  readonly title?: string;
  readonly text: string;
  readonly sourcePermission?: string;
}

export interface AiContextIdentity {
  readonly userId: string;
  readonly role?: string | null;
  readonly email?: string | null;
}

export interface AiContextOrganization {
  /** OrganizationSettings.id when present; null if unavailable. */
  readonly organizationId: string | null;
  /** Logical key (e.g. "default") for single-tenant deployments. */
  readonly organizationKey?: string | null;
}

/**
 * Active business context for one execution.
 * Snippets stay empty until a later injection phase.
 */
export interface AiActiveContext {
  /** Current product module key (e.g. ai, clients, projects). */
  readonly module: string | null;
  readonly surface: AiFoundationSurface;
  readonly conversationId: string | null;
  readonly mode: string | null;
  readonly user: AiContextIdentity | null;
  readonly organization: AiContextOrganization | null;
  /** First permitted entity ref, if any. */
  readonly primaryEntity: AiContextEntityRef | null;
  readonly entities: readonly AiContextEntityRef[];
  readonly snippets: readonly AiContextSnippet[];
  readonly ambientText?: string | null;
}
