/**
 * Enterprise CSRF types (Phase 2 Step 2).
 */

export type CsrfFailureReason =
  | "CSRF_MISSING"
  | "CSRF_INVALID"
  | "CSRF_EXPIRED"
  | "CSRF_REPLAY"
  | "CSRF_SESSION_MISMATCH";

export interface CsrfBinding {
  sessionId: string | null;
  userId: string | null;
  tenantId: string | null;
}

export interface CsrfRecord extends CsrfBinding {
  /** SHA-256 hex of the raw token (never store raw token at rest). */
  tokenHash: string;
  expiresAt: number;
  /** When single-use mode is on, set after first successful validation. */
  consumedAt: number | null;
}

export interface CsrfIssueInput {
  binding?: Partial<CsrfBinding>;
  /** Replace / invalidate previous token hash if rotating. */
  previousToken?: string | null;
}

export interface CsrfIssueResult {
  token: string;
  expiresAt: number;
  binding: CsrfBinding;
}

export interface CsrfValidateInput {
  cookieToken: string | undefined;
  headerToken: string | undefined;
  binding?: Partial<CsrfBinding> | null;
}

export type CsrfValidateResult =
  | { ok: true; record: CsrfRecord }
  | { ok: false; reason: CsrfFailureReason };
