/**
 * Human confirmation types (Phase 2 Step 5).
 */

export const CONFIRMATION_RISK_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type ConfirmationRiskLevel =
  (typeof CONFIRMATION_RISK_LEVELS)[keyof typeof CONFIRMATION_RISK_LEVELS];

export type ConfirmationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "consumed";

export interface ProtectedActionDefinition {
  readonly actionKey: string;
  readonly action: string;
  readonly riskLevel: ConfirmationRiskLevel;
  readonly toolIds: readonly string[];
  readonly summaryTemplate: string;
}

export interface ConfirmationBinding {
  readonly userId: string;
  readonly sessionId: string | null;
  readonly tenantId: string | null;
  readonly toolId: string;
  readonly actionKey: string;
  readonly argumentsHash: string;
}

export interface HumanConfirmationRecord extends ConfirmationBinding {
  readonly confirmationId: string;
  readonly tokenHash: string;
  readonly action: string;
  readonly summary: string;
  readonly riskLevel: ConfirmationRiskLevel;
  /** Sanitized argument preview — never secrets. */
  readonly argumentPreview: Record<string, unknown>;
  /** Full args for re-execution after approval (server-side only). */
  readonly argumentsJson: string;
  readonly status: ConfirmationStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly consumedAt: number | null;
  readonly conversationId: string | null;
  readonly mode: string | null;
  readonly role: string | null;
  readonly permissions: readonly string[];
}

export interface ConfirmationRequiredPayload {
  readonly confirmationRequired: true;
  readonly confirmationId: string;
  readonly expiresAt: string;
  readonly action: string;
  readonly summary: string;
  readonly riskLevel: ConfirmationRiskLevel;
  readonly toolId: string;
}

export interface CreateConfirmationInput {
  readonly userId: string;
  readonly sessionId?: string | null;
  readonly tenantId?: string | null;
  readonly toolId: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly conversationId?: string | null;
  readonly mode?: string | null;
  readonly role?: string | null;
  readonly permissions?: readonly string[];
}

export interface ApproveConfirmationInput {
  readonly confirmationId: string;
  readonly userId: string;
  readonly sessionId?: string | null;
  readonly role?: string | null;
  readonly permissions?: readonly string[];
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
}
