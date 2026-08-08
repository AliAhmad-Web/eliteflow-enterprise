-- Phase 3 Step 5 — TOTP MFA fields on users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "two_factor_secret" TEXT,
  ADD COLUMN IF NOT EXISTS "recovery_codes" JSONB,
  ADD COLUMN IF NOT EXISTS "two_factor_last_step" INTEGER,
  ADD COLUMN IF NOT EXISTS "mfa_enrollment_required" BOOLEAN NOT NULL DEFAULT false;

-- Soft-mark privileged roles for MFA enrollment (do not lock).
UPDATE "users" u
SET "mfa_enrollment_required" = true
FROM "roles" r
WHERE u."role_id" = r."id"
  AND r."code" IN ('SUPER_ADMIN', 'ADMIN')
  AND u."two_factor_enabled" = false
  AND u."deleted_at" IS NULL;
