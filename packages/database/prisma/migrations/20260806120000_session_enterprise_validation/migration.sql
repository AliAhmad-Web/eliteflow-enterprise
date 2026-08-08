-- Enterprise session validation: absolute expiry, fingerprint, revoke reasons
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "fingerprint_hash" VARCHAR(128);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at");

ALTER TYPE "session_revoked_reason" ADD VALUE IF NOT EXISTS 'ABSOLUTE_TIMEOUT';
ALTER TYPE "session_revoked_reason" ADD VALUE IF NOT EXISTS 'MFA_RESET';
ALTER TYPE "session_revoked_reason" ADD VALUE IF NOT EXISTS 'ACCOUNT_DISABLED';
